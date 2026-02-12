import Notification from '../models/Notification.js';
import NotificationReceipt from '../models/NotificationReceipt.js';
import recipientResolverService from './recipientResolverService.js';
import deliveryService from './deliveryService.js';
import { emitNotificationEvent } from '../socket.js';
import userServiceClient from '../clients/userServiceClient.js';

class NotificationService {
  async create(data, user) {
    if (user?.role === 'teacher') {
      const isDepartmentHead = user.isDepartmentHead;
      if (isDepartmentHead) {
        const allowed = ['batch', 'batch_students', 'department', 'department_students', 'department_teachers', 'department_staff', 'custom'];
        if (!allowed.includes(data.targetType)) {
          throw new Error('Department heads can only send notifications to batches, their departments, or specific users');
        }
        if (data.targetType.startsWith('batch') && (!data.targetBatchIds || !data.targetBatchIds.length)) {
          throw new Error('Target batch IDs are required');
        }
        if (data.targetType.startsWith('department') && (!data.targetDepartmentIds || !data.targetDepartmentIds.length)) {
          throw new Error('Target department IDs are required');
        }
        data.senderRole = 'department_head';
      } else {
        if (!['batch', 'batch_students'].includes(data.targetType)) {
          throw new Error('Teachers can only send notifications to their assigned batches');
        }
        if (!data.targetBatchIds || !data.targetBatchIds.length) {
          throw new Error('Target batch IDs are required');
        }
        data.senderRole = 'course_instructor';
      }
    } else if (['admin', 'super_admin'].includes(user?.role)) {
      data.senderRole = 'admin';
    }

    if (data.sendEmail) {
      const channels = new Set(data.deliveryChannels || ['socket']);
      channels.add('email');
      data.deliveryChannels = [...channels];
    }

    const notification = await Notification.create(data);
    return notification;
  }

  async update(id, data) {
    const notification = await Notification.findById(id);
    if (!notification) throw new Error('Notification not found');
    if (!['draft', 'scheduled'].includes(notification.status)) {
      throw new Error('Only draft or scheduled notifications can be updated');
    }

    if (data.sendEmail) {
      const channels = new Set(data.deliveryChannels || notification.deliveryChannels || ['socket']);
      channels.add('email');
      data.deliveryChannels = [...channels];
    }

    Object.assign(notification, data);
    await notification.save();
    return notification;
  }

  async delete(id) {
    const notification = await Notification.findById(id);
    if (!notification) throw new Error('Notification not found');
    notification.deletedAt = new Date();
    await notification.save();
  }

  async schedule(id, scheduleAt, user) {
    const notification = await Notification.findById(id);
    if (!notification) throw new Error('Notification not found');
    if (notification.status !== 'draft') throw new Error('Only draft notifications can be scheduled');

    if (user?.role === 'teacher' && notification.createdById !== user.id && notification.createdById !== user.sub) {
      throw new Error('Cannot schedule: you can only schedule your own notifications');
    }

    notification.status = 'scheduled';
    notification.scheduleAt = scheduleAt;
    await notification.save();
    return notification;
  }

  async cancel(id) {
    const notification = await Notification.findById(id);
    if (!notification) throw new Error('Notification not found');
    if (notification.status !== 'scheduled') throw new Error('Only scheduled notifications can be cancelled');
    notification.status = 'cancelled';
    await notification.save();
    return notification;
  }

  async publish(id, user) {
    const notification = await Notification.findById(id);
    if (!notification) throw new Error('Notification not found');
    if (!['draft', 'scheduled'].includes(notification.status)) throw new Error('Notification cannot be published');

    if (notification.status === 'scheduled' && notification.scheduleAt && notification.scheduleAt > new Date()) {
      throw new Error('Scheduled time not reached yet');
    }

    if (user?.role === 'teacher' && notification.createdById !== user.id && notification.createdById !== user.sub) {
      throw new Error('Cannot publish: you can only publish your own notifications');
    }

    if (notification.sendEmail && !notification.deliveryChannels?.includes('email')) {
      const channels = new Set(notification.deliveryChannels || ['socket']);
      channels.add('email');
      notification.deliveryChannels = [...channels];
    }

    // Update status immediately
    notification.status = 'published';
    notification.publishedAt = new Date();
    await notification.save();

    // Stream recipients to handle large volumes without memory crash
    const rooms = deliveryService.buildRooms(notification);
    emitNotificationEvent('notification.published', notification.toJSON(), rooms);

    let totalRecipients = 0;
    // Process in batches of 500
    await recipientResolverService.streamRecipients(notification, 500, async (batch) => {
      totalRecipients += batch.length;
      await deliveryService.deliverBatch(notification, batch);
    });

    // Update final count
    notification.totalRecipients = totalRecipients;
    await notification.save();

    return notification;
  }

  async publishDueScheduled() {
    const now = new Date();
    const due = await Notification.find({ status: 'scheduled', scheduleAt: { $lte: now } });
    for (const n of due) {
      try { await this.publish(n.id); }
      catch (err) { console.error('Scheduled publish failed', n.id, err.message); }
    }
    return due.length;
  }

  async list(filters = {}, options = {}) {
    const query = {};
    if (filters.status) query.status = filters.status;
    if (filters.targetType) query.targetType = filters.targetType;
    if (filters.createdById) query.createdById = filters.createdById;
    if (filters.search) query.title = { $regex: filters.search, $options: 'i' };
    if (filters.published) query.status = 'published';

    const limit = Number(options.limit || 20);
    const page = Number(options.page || 1);
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      Notification.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit),
      Notification.countDocuments(query)
    ]);

    return { items, total, page, pages: Math.ceil(total / limit) };
  }

  async listForUser(user, options = {}) {
    const userId = user.id || user.sub;
    const userRole = user.role;
    let userBatchId = user.batchId;
    let userDepartmentId = user.departmentId;
    let userFacultyId = user.facultyId;

    if (!userBatchId && !userDepartmentId && (userRole === 'student' || userRole === 'teacher')) {
      const userDetails = await userServiceClient.getUserById(userId, userRole);
      if (userDetails) {
        userBatchId = userDetails.batchId;
        userDepartmentId = userDetails.departmentId;
        userFacultyId = userDetails.facultyId;
      }
    }

    const targetConditions = [
      { status: 'published', targetType: 'all' },
    ];

    if (userRole === 'student') targetConditions.push({ status: 'published', targetType: 'students' });
    else if (userRole === 'teacher') targetConditions.push({ status: 'published', targetType: 'teachers' });
    else if (userRole === 'staff' || ['program_controller', 'admission', 'exam', 'finance', 'library', 'transport', 'hr', 'it', 'hostel'].includes(userRole)) {
      targetConditions.push({ status: 'published', targetType: 'staff' });
    }

    targetConditions.push({ status: 'published', targetUserIds: userId });

    if (userBatchId) {
      targetConditions.push(
        { status: 'published', targetType: 'batch', targetBatchIds: userBatchId },
        { status: 'published', targetType: 'batch_students', targetBatchIds: userBatchId }
      );
    }

    if (userDepartmentId) {
      targetConditions.push(
        { status: 'published', targetType: 'department', targetDepartmentIds: userDepartmentId },
        { status: 'published', targetType: 'department_students', targetDepartmentIds: userDepartmentId },
        { status: 'published', targetType: 'department_teachers', targetDepartmentIds: userDepartmentId },
        { status: 'published', targetType: 'department_staff', targetDepartmentIds: userDepartmentId }
      );
    }

    if (userFacultyId) {
      targetConditions.push(
        { status: 'published', targetType: 'faculty', targetFacultyIds: userFacultyId },
        { status: 'published', targetType: 'faculty_students', targetFacultyIds: userFacultyId },
        { status: 'published', targetType: 'faculty_teachers', targetFacultyIds: userFacultyId },
        { status: 'published', targetType: 'faculty_staff', targetFacultyIds: userFacultyId }
      );
    }

    const query = { $or: targetConditions, deletedAt: null };
    const limit = Number(options.limit || 50);
    const page = Number(options.page || 1);
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      Notification.find(query).sort({ publishedAt: -1, createdAt: -1 }).skip(skip).limit(limit).lean(),
      Notification.countDocuments(query)
    ]);

    // Batch fetch receipts
    const notificationIds = items.map(n => n._id);
    const receipts = await NotificationReceipt.find({ notificationId: { $in: notificationIds }, userId }).lean();
    const receiptMap = new Map();
    receipts.forEach(r => receiptMap.set(String(r.notificationId), r));

    const enhanced = items.map(n => {
      const receipt = receiptMap.get(String(n._id));
      return {
        ...n,
        id: n._id,
        isRead: !!receipt?.readAt,
        readAt: receipt?.readAt,
        status: receipt?.readAt ? 'read' : 'sent'
      };
    });

    return { notifications: enhanced, total, page, pages: Math.ceil(total / limit) };
  }

  async get(id) { return await Notification.findById(id); }

  async markRead(notificationId, user) {
    const userId = user.id || user.sub;
    let receipt = await NotificationReceipt.findOne({ notificationId, userId });

    // Check if already read to avoid double counting
    let alreadyRead = !!receipt?.readAt;
    if (!receipt) {
      receipt = await NotificationReceipt.create({ notificationId, userId, userRole: user.role, readAt: new Date() });
    } else if (!receipt.readAt) {
      receipt.readAt = new Date(); await receipt.save();
    }

    if (!alreadyRead) {
      await Notification.updateOne({ _id: notificationId }, { $inc: { readCount: 1 } });
      emitNotificationEvent('notification.read', { notificationId, userId }, [`user:${userId}`]);
    }

    return receipt;
  }

  async markAllRead(user) {
    const userId = user.id || user.sub;
    const result = await this.listForUser(user, { limit: 1000 });
    const unreadIds = result.notifications.filter(n => !n.isRead).map(n => n.id);

    if (unreadIds.length === 0) return { message: 'All already read' };

    const now = new Date();
    const bulkOps = unreadIds.map(id => ({
      updateOne: {
        filter: { notificationId: id, userId },
        update: { $set: { readAt: now, userRole: user.role } },
        upsert: true
      }
    }));

    await NotificationReceipt.bulkWrite(bulkOps);

    // Update read counts on unread notifications only
    await Notification.updateMany({ _id: { $in: unreadIds } }, { $inc: { readCount: 1 } });

    emitNotificationEvent('notification.read_all', { userId }, [`user:${userId}`]);
    return { count: unreadIds.length };
  }

  async acknowledge(notificationId, user) {
    const userId = user.id || user.sub;
    const notification = await Notification.findById(notificationId);
    if (!notification) throw new Error('Notification not found');
    if (!notification.requireAcknowledgment) throw new Error('Acknowledgment not required');

    let receipt = await NotificationReceipt.findOne({ notificationId, userId });
    if (!receipt) receipt = await NotificationReceipt.create({ notificationId, userId, userRole: user.role });

    if (!receipt.acknowledgedAt) {
      receipt.acknowledgedAt = new Date();
      await receipt.save();
      await Notification.updateOne({ _id: notificationId }, { $inc: { acknowledgmentCount: 1 } });
    }

    emitNotificationEvent('notification.ack', { notificationId, userId }, [`user:${userId}`]);
    return receipt;
  }

  async react(notificationId, user, reaction) {
    const userId = user.id || user.sub;
    if (!['like', 'helpful', 'important', 'noted'].includes(reaction)) throw new Error('Invalid reaction');

    let receipt = await NotificationReceipt.findOne({ notificationId, userId });
    if (!receipt) receipt = await NotificationReceipt.create({ notificationId, userId, userRole: user.role });

    const oldReaction = receipt.reaction;

    // Only update if changed
    if (oldReaction !== reaction) {
      receipt.reaction = reaction;
      await receipt.save();

      const updates = { [`reactionCounts.${reaction}`]: 1 };
      if (oldReaction) updates[`reactionCounts.${oldReaction}`] = -1;

      await Notification.updateOne({ _id: notificationId }, { $inc: updates });
    }

    emitNotificationEvent('notification.reaction', { notificationId, userId, reaction }, [`user:${userId}`]);
    return receipt;
  }

  async receipts(notificationId, options = {}) {
    const limit = Number(options.limit || 50); const page = Number(options.page || 1); const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      NotificationReceipt.find({ notificationId }).sort({ createdAt: -1 }).skip(skip).limit(limit),
      NotificationReceipt.countDocuments({ notificationId })
    ]);
    return { items, total, page, pages: Math.ceil(total / limit) };
  }
}

export default new NotificationService();

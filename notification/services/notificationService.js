import Notification from '../models/Notification.js';
import NotificationReceipt from '../models/NotificationReceipt.js';
import recipientResolverService from './recipientResolverService.js';
import deliveryService from './deliveryService.js';
import { emitNotificationEvent } from '../socket.js';

class NotificationService {
  async create(data, user) {
    if (user?.role === 'teacher') {
      if (data.targetType === 'department' && (!data.targetDepartmentIds?.includes(user.departmentId))) {
        throw new Error('Teachers can only target their own department');
      }
      if (data.targetType === 'batch' && (!data.targetBatchIds?.includes(user.batchId))) {
        throw new Error('Teachers can only target their own batch');
      }
    }
    const notification = await Notification.create(data);
    return notification;
  }

  async update(id, data) {
    const notification = await Notification.findById(id);
    if (!notification) throw new Error('Notification not found');
    if (!['draft','scheduled'].includes(notification.status)) {
      throw new Error('Only draft or scheduled notifications can be updated');
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
    if (user?.role === 'teacher') {
      if (notification.targetType === 'department' && !notification.targetDepartmentIds.includes(user.departmentId)) {
        throw new Error('Cannot schedule: not your department');
      }
      if (notification.targetType === 'batch' && !notification.targetBatchIds.includes(user.batchId)) {
        throw new Error('Cannot schedule: not your batch');
      }
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
    if (user?.role === 'teacher') {
      if (notification.targetType === 'department' && !notification.targetDepartmentIds.includes(user.departmentId)) {
        throw new Error('Cannot publish: not your department');
      }
      if (notification.targetType === 'batch' && !notification.targetBatchIds.includes(user.batchId)) {
        throw new Error('Cannot publish: not your batch');
      }
    }

    const recipients = await recipientResolverService.resolve(notification);
    notification.totalRecipients = recipients.length;
    notification.status = 'published';
    notification.publishedAt = new Date();
    await notification.save();

    if (recipients.length > 2000) {
      // Emit once
      const rooms = deliveryService.buildRooms(notification);
      emitNotificationEvent('notification.published', notification.toJSON(), rooms);
      await recipientResolverService.streamRecipients(notification, 1000, async (batch) => {
        await deliveryService.deliverBatch(notification, batch);
      });
    } else {
      await deliveryService.deliver(notification, recipients);
    }
    return notification;
  }

  async publishDueScheduled() {
    const now = new Date();
    const due = await Notification.find({ status: 'scheduled', scheduleAt: { $lte: now } });
    for (const n of due) {
      try { await this.publish(n.id); } catch (err) { console.error('Scheduled publish failed', n.id, err.message); }
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

  async get(id) {
    return await Notification.findById(id);
  }

  async markRead(notificationId, user) {
    let receipt = await NotificationReceipt.findOne({ notificationId, userId: user.id });
    if (!receipt) {
      receipt = await NotificationReceipt.create({ notificationId, userId: user.id, userRole: user.role, readAt: new Date() });
    } else if (!receipt.readAt) {
      receipt.readAt = new Date(); await receipt.save();
    }
    const notification = await Notification.findById(notificationId);
    if (notification) {
      notification.readCount = await NotificationReceipt.countDocuments({ notificationId, readAt: { $ne: null } });
      await notification.save();
    }
    emitNotificationEvent('notification.read', { notificationId, userId: user.id }, [ `user:${user.id}` ]);
    return receipt;
  }

  async acknowledge(notificationId, user) {
    const notification = await Notification.findById(notificationId);
    if (!notification) throw new Error('Notification not found');
    if (!notification.requireAcknowledgment) throw new Error('Acknowledgment not required');

    let receipt = await NotificationReceipt.findOne({ notificationId, userId: user.id });
    if (!receipt) receipt = await NotificationReceipt.create({ notificationId, userId: user.id, userRole: user.role });
    if (!receipt.acknowledgedAt) receipt.acknowledgedAt = new Date();
    await receipt.save();

    notification.acknowledgmentCount = await NotificationReceipt.countDocuments({ notificationId, acknowledgedAt: { $ne: null } });
    await notification.save();

    emitNotificationEvent('notification.ack', { notificationId, userId: user.id }, [ `user:${user.id}` ]);
    return receipt;
  }

  async react(notificationId, user, reaction) {
    if (!['like','helpful','important','noted'].includes(reaction)) throw new Error('Invalid reaction');
    let receipt = await NotificationReceipt.findOne({ notificationId, userId: user.id });
    if (!receipt) receipt = await NotificationReceipt.create({ notificationId, userId: user.id, userRole: user.role });
    receipt.reaction = reaction; await receipt.save();

    const notification = await Notification.findById(notificationId);
    if (notification) {
      const counts = {};
      for (const r of ['like','helpful','important','noted']) {
        counts[r] = await NotificationReceipt.countDocuments({ notificationId, reaction: r });
      }
      notification.reactionCounts = counts; await notification.save();
    }

    emitNotificationEvent('notification.reaction', { notificationId, userId: user.id, reaction }, [ `user:${user.id}` ]);
    return receipt;
  }

  async receipts(notificationId, options = {}) {
    const limit = Number(options.limit || 50); const page = Number(options.page || 1); const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      NotificationReceipt.find({ notificationId }).sort({ createdAt: -1 }).skip(skip).limit(limit),
      NotificationReceipt.countDocuments({ notificationId })
    ]);
    return { items, total, page, pages: Math.ceil(total/limit) };
  }
}

export default new NotificationService();

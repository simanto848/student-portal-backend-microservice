import NotificationReceipt from '../models/NotificationReceipt.js';
import { emitNotificationPublished } from '../socket.js';
import { EVENTS, publishEvent } from 'shared';

class DeliveryService {
  async deliver(notification, recipients) {
    const rooms = this.buildRooms(notification);
    emitNotificationPublished(notification.toJSON(), rooms);
    const receiptDocs = recipients.map(r => ({
      notificationId: notification.id,
      userId: r.id || r._id || r.userId,
      userRole: r.role || r.userRole || 'student'
    }));

    if (receiptDocs.length) {
      try {
        await NotificationReceipt.insertMany(receiptDocs, { ordered: false });
      } catch (err) {
        if (err.code !== 11000) console.error('Receipt insert error', err.message);
      }
    }

    if (notification.deliveryChannels?.includes('email') && notification.sendEmail) {
      const subset = recipients.slice(0, 200);
      for (const r of subset) {
        if (!r.email) continue;
        try {
          await publishEvent(EVENTS.SEND_EMAIL, {
            to: r.email,
            data: {
              title: notification.title,
              summary: notification.summary || '',
              content: notification.content,
              publishedAt: notification.publishedAt || new Date(),
              priority: notification.priority
            }
          });
        } catch (e) {
          console.error('Email event publish failed for', r.email, e.message);
        }
      }
    }
  }

  async deliverBatch(notification, batch) {
    const receiptDocs = batch.map(r => ({
      notificationId: notification.id,
      userId: r.id || r._id || r.userId,
      userRole: r.role || r.userRole || 'student'
    }));
    if (receiptDocs.length) {
      try { await NotificationReceipt.insertMany(receiptDocs, { ordered: false }); } catch (err) { if (err.code !== 11000) console.error('Receipt batch insert error', err.message); }
    }
    if (notification.deliveryChannels?.includes('email') && notification.sendEmail) {
      const subset = batch.slice(0, 200);
      for (const r of subset) {
        if (!r.email) continue;
        try {
          await publishEvent(EVENTS.SEND_EMAIL, {
            to: r.email,
            data: {
              title: notification.title,
              summary: notification.summary || '',
              content: notification.content,
              publishedAt: notification.publishedAt || new Date(),
              priority: notification.priority
            }
          });
        } catch (e) { console.error('Email batch event publish failed', e.message); }
      }
    }
  }

  buildRooms(notification) {
    switch (notification.targetType) {
      case 'all': return ['all'];
      case 'students': return ['role:student'];
      case 'teachers': return ['role:teacher'];
      case 'department': return notification.targetDepartmentIds.map(id => `department:${id}`);
      case 'batch': return notification.targetBatchIds.map(id => `batch:${id}`);
      case 'custom': return notification.targetUserIds.map(id => `user:${id}`);
      default: return [];
    }
  }
}

export default new DeliveryService();

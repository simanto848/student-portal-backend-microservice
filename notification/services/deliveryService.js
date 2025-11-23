import NotificationReceipt from '../models/NotificationReceipt.js';
import { emitNotificationPublished } from '../socket.js';

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

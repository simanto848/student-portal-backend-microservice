import { config } from 'shared';
import NotificationReceipt from '../models/NotificationReceipt.js';
import { emitNotificationPublished } from '../socket.js';
import emailService from '../utils/emailService.js';

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
        if (err.code !== 11000) console.error('[DeliveryService] Receipt insert error', err.message);
      }
    }

    const shouldSendEmail = notification.sendEmail || notification.deliveryChannels?.includes('email');
    if (shouldSendEmail) {
      // No more truncation - process all in batches
      await this.sendEmails(notification, recipients);
    }
  }

  async deliverBatch(notification, batch) {
    const receiptDocs = batch.map(r => ({
      notificationId: notification.id,
      userId: r.id || r._id || r.userId,
      userRole: r.role || r.userRole || 'student'
    }));

    if (receiptDocs.length) {
      try {
        await NotificationReceipt.insertMany(receiptDocs, { ordered: false });
      } catch (err) {
        if (err.code !== 11000) console.error('[DeliveryService] Receipt batch insert error', err.message);
      }
    }

    if (notification.sendEmail || notification.deliveryChannels?.includes('email')) {
      await this.sendEmails(notification, batch);
    }
  }

  async sendEmails(notification, recipients) {
    const recipientsWithEmail = recipients.filter(r => r.email);
    if (recipientsWithEmail.length === 0) {
      return { successful: 0, failed: 0 };
    }

    if (recipientsWithEmail.length > 500) {
      console.warn(`[DeliveryService] Sending email to ${recipientsWithEmail.length} recipients. This may take time.`);
    }

    const notificationData = {
      title: notification.title,
      summary: notification.summary || '',
      content: notification.content,
      publishedAt: notification.publishedAt || new Date(),
      priority: notification.priority || 'medium'
    };

    let successCount = 0;
    let failCount = 0;
    const errors = [];

    const batchSize = parseInt(config.email.batchSize) || 20;
    const delayBetweenBatches = parseInt(config.email.batchDelay) || 500;

    for (let i = 0; i < recipientsWithEmail.length; i += batchSize) {
      const batch = recipientsWithEmail.slice(i, i + batchSize);
      const batchPromises = batch.map(async (recipient) => {
        try {
          await emailService.sendNotificationEmail(recipient.email, notificationData);
          successCount++;
          return { success: true, email: recipient.email };
        } catch (error) {
          failCount++;
          if (failCount <= 5) errors.push({ email: recipient.email, error: error.message });
          return { success: false, email: recipient.email, error: error.message };
        }
      });

      await Promise.all(batchPromises);
      if (i + batchSize < recipientsWithEmail.length) {
        await new Promise(resolve => setTimeout(resolve, delayBetweenBatches));
      }
    }

    return { successful: successCount, failed: failCount, errors };
  }

  buildRooms(notification) {
    switch (notification.targetType) {
      case 'all': return ['all'];
      case 'students': return ['role:student'];
      case 'teachers': return ['role:teacher'];
      case 'staff': return ['role:staff'];
      case 'department':
      case 'department_students':
      case 'department_teachers':
      case 'department_staff':
        return (notification.targetDepartmentIds || []).map(id => `department:${id}`);
      case 'batch':
      case 'batch_students':
        return (notification.targetBatchIds || []).map(id => `batch:${id}`);
      case 'faculty':
      case 'faculty_students':
      case 'faculty_teachers':
      case 'faculty_staff':
        return (notification.targetFacultyIds || []).map(id => `faculty:${id}`);
      case 'custom':
        return (notification.targetUserIds || []).map(id => `user:${id}`);
      default:
        return [];
    }
  }
}

export default new DeliveryService();

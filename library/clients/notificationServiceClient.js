import axios from 'axios';
import jwt from 'jsonwebtoken';
import { config, createLogger } from 'shared';

const logger = createLogger('LIBRARY_NOTIF_CLIENT');

class NotificationServiceClient {
    constructor() {
        this.baseUrl = config.services.notification;
        this.jwtSecret = config.jwt.secret;
    }

    generateSystemToken() {
        return jwt.sign(
            {
                sub: 'system-library',
                id: 'system-library',
                role: 'admin',
                type: 'admin'
            },
            this.jwtSecret,
            { expiresIn: '1h' }
        );
    }

    async createAndPublish(payload) {
        try {
            const token = this.generateSystemToken();

            // 1. Create the notification
            const createRes = await axios.post(`${this.baseUrl}/notifications`, payload, {
                headers: { Authorization: `Bearer ${token}` }
            });

            const notificationId = createRes.data.data.id || createRes.data.data._id;

            // 2. Publish the notification
            await axios.post(`${this.baseUrl}/notifications/${notificationId}/publish`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });

            logger.info(`App notification sent: ${payload.title} to ${payload.targetUserIds.join(', ')}`);
            return true;
        } catch (error) {
            const errorMsg = error.response?.data?.message || error.response?.data || error.message;
            logger.error(`Failed to send app notification: ${errorMsg}`);
            return false;
        }
    }

    async sendDueReminder(userId, details) {
        const { bookTitle, author, daysUntilDue } = details;

        return await this.createAndPublish({
            title: `Book Due Reminder: ${bookTitle}`,
            content: `Friendly reminder: The book "${bookTitle}" by ${author} is due in ${daysUntilDue} days. Please return it to the library to avoid fines.`,
            targetType: 'custom',
            targetUserIds: [userId],
            priority: daysUntilDue <= 2 ? 'high' : 'medium',
            deliveryChannels: ['socket', 'database']
        });
    }

    async sendOverdueNotice(userId, details) {
        const { bookTitle, author, daysOverdue, totalFine } = details;

        return await this.createAndPublish({
            title: `OVERDUE: ${bookTitle}`,
            content: `URGENT: The book "${bookTitle}" by ${author} is ${daysOverdue} days overdue. Current accumulated fine: ${totalFine}. Please return it immediately.`,
            targetType: 'custom',
            targetUserIds: [userId],
            priority: 'high',
            deliveryChannels: ['socket', 'database']
        });
    }
}

export default new NotificationServiceClient();

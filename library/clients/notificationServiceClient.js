import axios from 'axios';
import jwt from 'jsonwebtoken';
import { createLogger } from 'shared';

const logger = createLogger('LIBRARY_NOTIF_CLIENT');

class NotificationServiceClient {
    constructor() {
        this.baseUrl = process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:8007';
        this.jwtSecret = process.env.JWT_SECRET || 'mysupersecrectkey';
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
            const createRes = await axios.post(`${this.baseUrl}/`, payload, {
                headers: { Authorization: `Bearer ${token}` }
            });

            const notificationId = createRes.data.data.id || createRes.data.data._id;

            // 2. Publish the notification
            await axios.post(`${this.baseUrl}/${notificationId}/publish`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });

            logger.info(`App notification sent: ${payload.title} to ${payload.targetUserIds.join(', ')}`);
            return true;
        } catch (error) {
            logger.error('Failed to send app notification:', error.response?.data || error.message);
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
}

export default new NotificationServiceClient();

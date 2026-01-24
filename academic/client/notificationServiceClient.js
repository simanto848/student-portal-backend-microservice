
import { createServiceClient, logger } from 'shared';

class NotificationServiceClient {
    constructor() {
        this.client = createServiceClient('notification');
    }

    async sendNotification(userId, title, message, type = 'info', targetType = 'user') {
        try {
            const payload = {
                title,
                message,
                type,
                recipientId: userId,
            };

            await this.client.post('/internal/notifications', payload);
        } catch (error) {
            logger.error('Failed to send notification:', error.message);
        }
    }
}

export default new NotificationServiceClient();

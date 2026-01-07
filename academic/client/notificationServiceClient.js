import axios from 'axios';

const NOTIFICATION_SERVICE_URL = process.env.NOTIFICATION_SERVICE_URL || 'http://notification:8004';

class NotificationServiceClient {
    async sendNotification(userId, title, message, type = 'info', targetType = 'user') {
        try {
            const payload = {
                title,
                message,
                type,
                recipientId: userId,
            };

            await axios.post(`${NOTIFICATION_SERVICE_URL}/internal/notifications`, payload);
        } catch (error) {
            console.error('Failed to send notification:', error.message);
        }
    }
}

export default new NotificationServiceClient();

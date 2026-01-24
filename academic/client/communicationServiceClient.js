
import { createServiceClient, logger } from 'shared';

class CommunicationServiceClient {
    constructor() {
        this.client = createServiceClient('communication');
    }

    async sendEmail(to, subject, template, data) {
        try {
            await this.client.post('/internal/email/send', {
                to,
                subject,
                template,
                data
            });
        } catch (error) {
            logger.error('Failed to send email:', error.message);
            // Non-blocking error
        }
    }

    async sendSimpleEmail(to, subject, text) {
        try {
            await this.client.post('/internal/email/send-raw', {
                to,
                subject,
                text
            });
        } catch (error) {
            logger.error('Failed to send simple email:', error.message);
        }
    }
}

export default new CommunicationServiceClient();

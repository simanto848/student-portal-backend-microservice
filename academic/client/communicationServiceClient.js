import axios from 'axios';

const COMMUNICATION_SERVICE_URL = process.env.COMMUNICATION_SERVICE_URL || 'http://communication:8005';

class CommunicationServiceClient {
    async sendEmail(to, subject, template, data) {
        try {
            await axios.post(`${COMMUNICATION_SERVICE_URL}/internal/email/send`, {
                to,
                subject,
                template,
                data
            });
        } catch (error) {
            console.error('Failed to send email:', error.message);
            // Non-blocking error
        }
    }

    async sendSimpleEmail(to, subject, text) {
        try {
            await axios.post(`${COMMUNICATION_SERVICE_URL}/internal/email/send-raw`, {
                to,
                subject,
                text
            });
        } catch (error) {
            console.error('Failed to send simple email:', error.message);
        }
    }
}

export default new CommunicationServiceClient();

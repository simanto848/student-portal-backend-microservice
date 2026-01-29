import axios from 'axios';
import jwt from 'jsonwebtoken';
import { createLogger, config } from 'shared';

const logger = createLogger('ENROLLMENT_NOTIF_CLIENT');

class NotificationServiceClient {
    constructor() {
        this.baseUrl = config.services.notification;
        this.jwtSecret = config.jwt.secret;
    }

    generateSystemToken() {
        return jwt.sign(
            {
                sub: 'system-enrollment',
                id: 'system-enrollment',
                role: 'admin',
                type: 'service'
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

            const notificationId = createRes.data.data?.id || createRes.data.data?._id;

            if (!notificationId) {
                logger.error('Failed to get notification ID from create response');
                return false;
            }

            // 2. Publish the notification
            await axios.post(`${this.baseUrl}/notifications/${notificationId}/publish`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });

            logger.info(`Notification sent: ${payload.title}`);
            return true;
        } catch (error) {
            const errorMsg = error.response?.data?.message || error.response?.data || error.message;
            logger.error(`Failed to send notification: ${errorMsg}`);
            return false;
        }
    }

    async sendResultReturnedNotification(teacherId, details) {
        const { courseName, courseCode, batchName, batchShift, semester, comment, workflowId, courseId, batchId } = details;

        const shiftPrefix = batchShift?.toLowerCase() === 'evening' ? 'E' : 'D';
        const formattedBatchName = `${shiftPrefix}-${batchName}`;

        const title = 'Result Returned by Exam Committee';
        const content = `Your submitted result for ${courseName} (${courseCode}) - ${formattedBatchName}, Semester ${semester} has been returned by the Exam Committee for review. Reason: ${comment || 'No comment provided'} Please review the feedback and make necessary corrections before resubmitting.`;

        return await this.createAndPublish({
            title,
            content,
            message: `Result for ${courseName} (${formattedBatchName}) has been returned. Reason: ${comment || 'No comment provided'}`,
            type: 'RESULT_RETURNED',
            targetType: 'custom',
            targetUserIds: [teacherId],
            targetUserRoles: ['teacher'],
            priority: 'high',
            sendEmail: true,
            deliveryChannels: ['socket', 'email'],
            redirectUrl: `/dashboard/teacher/courses/${courseId}/batches/${batchId}/results`,
            data: {
                workflowId,
                courseId,
                batchId,
                semester,
                returnedAt: new Date().toISOString()
            },
            senderRole: 'system',
            createdById: 'system-enrollment'
        });
    }

    async sendResultApprovedNotification(teacherId, details) {
        const { courseName, courseCode, batchName, batchShift, semester, workflowId, courseId, batchId } = details;
        const shiftPrefix = batchShift?.toLowerCase() === 'evening' ? 'E' : 'D';
        const formattedBatchName = `${shiftPrefix}-${batchName}`;

        const title = 'Result Approved by Exam Committee';
        const content = `Great news! Your submitted result for ${courseName} (${courseCode}) - ${formattedBatchName}, Semester ${semester} has been approved by the Exam Committee. The result is now ready for publication.`;

        return await this.createAndPublish({
            title,
            content,
            message: `Result for ${courseName} (${formattedBatchName}) has been approved by the Exam Committee.`,
            type: 'RESULT_APPROVED',
            targetType: 'custom',
            targetUserIds: [teacherId],
            priority: 'medium',
            sendEmail: true,
            deliveryChannels: ['socket', 'email'],
            redirectUrl: `/dashboard/teacher/courses/${courseId}/batches/${batchId}/results`,
            data: {
                workflowId,
                courseId,
                batchId,
                semester,
                approvedAt: new Date().toISOString()
            },
            senderRole: 'system',
            createdById: 'system-enrollment'
        });
    }

    async sendResultPublishedNotification(teacherId, details) {
        const { courseName, courseCode, batchName, batchShift, semester, workflowId, courseId, batchId } = details;
        const shiftPrefix = batchShift?.toLowerCase() === 'evening' ? 'E' : 'D';
        const formattedBatchName = `${shiftPrefix}-${batchName}`;

        const title = 'Result Published';
        const content = `The result for ${courseName} (${courseCode}) - ${formattedBatchName}, Semester ${semester} has been published. Students can now view their grades.`;

        return await this.createAndPublish({
            title,
            content,
            message: `Result for ${courseName} (${formattedBatchName}) has been published.`,
            type: 'RESULT_PUBLISHED',
            targetType: 'custom',
            targetUserIds: [teacherId],
            priority: 'medium',
            sendEmail: false,
            deliveryChannels: ['socket'],
            redirectUrl: `/dashboard/teacher/courses/${courseId}/batches/${batchId}/results`,
            data: {
                workflowId,
                courseId,
                batchId,
                semester,
                publishedAt: new Date().toISOString()
            },
            senderRole: 'system',
            createdById: 'system-enrollment'
        });
    }
}

export default new NotificationServiceClient();

import axios from 'axios';
import jwt from 'jsonwebtoken';
import { config } from 'shared';

class EnrollmentServiceClient {
    constructor() {
        // Use the gateway URL - all services communicate through gateway
        this.gatewayURL = config.services.gateway;
        this.client = axios.create({
            baseURL: this.gatewayURL,
            timeout: 10000
        });

        // Add auth header to all requests for service-to-service communication
        this.client.interceptors.request.use((config) => {
            const token = this.generateServiceToken();
            config.headers.Authorization = `Bearer ${token}`;
            return config;
        });
    }

    // Generate a service token for internal communication
    generateServiceToken() {
        return jwt.sign(
            {
                role: 'super_admin',
                sub: 'notification-service',
                type: 'service'
            },
            config.jwt.secret,
            { expiresIn: '1h' }
        );
    }

    // Get batches where teacher is course instructor
    async getInstructorBatches(teacherId) {
        try {
            console.log('Fetching instructor batches for:', teacherId, 'via gateway:', this.gatewayURL);
            // Use gateway route: /api/enrollment/batch-course-instructors/...
            const res = await this.client.get(`/api/enrollment/batch-course-instructors/instructor/${teacherId}/courses`);
            const assignments = res.data?.data || res.data || [];
            console.log('Instructor courses response:', { count: Array.isArray(assignments) ? assignments.length : 0, sample: assignments[0] });
            // Extract unique batch IDs
            const batchIds = [...new Set(
                (Array.isArray(assignments) ? assignments : [])
                    .filter(a => a.status === 'active')
                    .map(a => a.batchId)
            )];
            return batchIds;
        } catch (err) {
            console.error('getInstructorBatches failed:', {
                status: err.response?.status,
                data: err.response?.data,
                code: err.code,
                message: err.message
            });
            return [];
        }
    }

    // Get all course assignments for an instructor
    async getInstructorAssignments(teacherId) {
        try {
            const res = await this.client.get(`/api/enrollment/batch-course-instructors/instructor/${teacherId}/courses`);
            const assignments = res.data?.data || res.data || [];
            return Array.isArray(assignments) ? assignments.filter(a => a.status === 'active') : [];
        } catch (err) {
            console.error('getInstructorAssignments failed:', {
                status: err.response?.status,
                code: err.code,
                message: err.message
            });
            return [];
        }
    }
}

export default new EnrollmentServiceClient();

import axios from 'axios';
import jwt from 'jsonwebtoken';

class AcademicServiceClient {
    constructor() {
        this.baseURL = process.env.ACADEMIC_SERVICE_URL || 'http://localhost:8001';
        this.client = axios.create({
            baseURL: this.baseURL,
            timeout: 10000,
        });

        this.client.interceptors.request.use((config) => {
            const token = this.generateServiceToken();
            config.headers.Authorization = `Bearer ${token}`;
            return config;
        });
    }

    generateServiceToken() {
        return jwt.sign(
            {
                role: 'super_admin', // Use a high-privilege role for service-to-service calls
                sub: 'enrollment-service',
                type: 'service'
            },
            process.env.JWT_SECRET || 'fallback_secret', // Ensure this matches Academic Service's secret
            { expiresIn: '1h' }
        );
    }

    async verifyBatch(batchId) {
        try {
            const response = await this.client.get(`/batches/${batchId}`);
            return response.data;
        } catch (error) {
            if (error.response?.status === 404) {
                throw new Error('Batch not found');
            }
            console.error('Verify batch error:', error.message);
            throw new Error('Failed to verify batch');
        }
    }

    async verifyCourse(courseId) {
        try {
            const response = await this.client.get(`/courses/${courseId}`);
            return response.data;
        } catch (error) {
            if (error.response?.status === 404) {
                throw new Error('Course not found');
            }
            console.error('Verify course error:', error.message);
            throw new Error('Failed to verify course');
        }
    }

    async verifySession(sessionId) {
        try {
            const response = await this.client.get(`/sessions/${sessionId}`);
            return response.data;
        } catch (error) {
            if (error.response?.status === 404) {
                throw new Error('Session not found');
            }
            console.error('Verify session error:', error.message);
            throw new Error('Failed to verify session');
        }
    }

    async getSessionCourses(sessionId, semester, departmentId) {
        try {
            let url = `/session-courses?sessionId=${sessionId}`;
            if (semester) url += `&semester=${semester}`;
            if (departmentId) url += `&departmentId=${departmentId}`;

            console.log('[AcademicServiceClient] Fetching session courses:', { sessionId, semester, departmentId, url });
            const response = await this.client.get(url);
            console.log('[AcademicServiceClient] Session courses response:', response.data);
            return response.data;
        } catch (error) {
            console.error('[AcademicServiceClient] Failed to fetch session courses:', {
                url: error.config?.url,
                status: error.response?.status,
                message: error.response?.data?.message || error.message,
                data: error.response?.data
            });
            const errorMessage = error.response?.data?.message || error.message || 'Failed to fetch session courses';
            throw new Error(errorMessage);
        }
    }

    async getBatchDetails(batchId) {
        try {
            const response = await this.client.get(`/batches/${batchId}`);
            return response.data;
        } catch (error) {
            if (error.response?.status === 404) {
                throw new Error('Batch not found');
            }
            throw new Error('Failed to fetch batch details');
        }
    }

    async updateBatchSemester(batchId, semester) {
        try {
            const response = await this.client.patch(`/batches/${batchId}`, {
                currentSemester: semester
            });
            return response.data;
        } catch (error) {
            throw new Error('Failed to update batch semester');
        }
    }

    async getCourseDetails(courseId) {
        try {
            const response = await this.client.get(`/courses/${courseId}`);
            return response.data;
        } catch (error) {
            if (error.response?.status === 404) {
                throw new Error('Course not found');
            }
            throw new Error('Failed to fetch course details');
        }
    }
}

export default new AcademicServiceClient();
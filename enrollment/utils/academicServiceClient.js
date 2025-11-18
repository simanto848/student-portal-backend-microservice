import axios from 'axios';

class AcademicServiceClient {
    constructor() {
        this.baseURL = process.env.ACADEMIC_SERVICE_URL || 'http://localhost:8001';
        this.client = axios.create({
            baseURL: this.baseURL,
            timeout: 10000,
        });
    }

    async verifyBatch(batchId) {
        try {
            const response = await this.client.get(`/batches/${batchId}`);
            return response.data;
        } catch (error) {
            if (error.response?.status === 404) {
                throw new Error('Batch not found');
            }
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
            throw new Error('Failed to verify session');
        }
    }

    async getSessionCourses(sessionId, semester) {
        try {
            const response = await this.client.get(`/session-courses?sessionId=${sessionId}&semester=${semester}`);
            return response.data;
        } catch (error) {
            throw new Error('Failed to fetch session courses');
        }
    }
}

export default new AcademicServiceClient();

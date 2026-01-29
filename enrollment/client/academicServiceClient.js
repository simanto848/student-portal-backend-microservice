import axios from 'axios';
import jwt from 'jsonwebtoken';
import { config } from 'shared';

class AcademicServiceClient {
    constructor() {
        this.baseURL = config.services.academic;
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
                role: 'super_admin',
                sub: 'enrollment-service',
                type: 'service'
            },
            config.jwt.secret || 'fallback_secret',
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

    async getSessionCourses(sessionId, semester, departmentId) {
        try {
            let url = `/session-courses?sessionId=${sessionId}`;
            if (semester) url += `&semester=${semester}`;
            if (departmentId) url += `&departmentId=${departmentId}`;

            const response = await this.client.get(url);
            return response.data;
        } catch (error) {
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

    async checkExamCommitteeMembership(departmentId, teacherId, shift, batchId = null) {
        try {
            let url = `/exam-committees?departmentId=${departmentId}&teacherId=${teacherId}&shift=${shift}&status=true`;
            const response = await this.client.get(url);
            const members = response.data?.data || [];
            const isMember = members.some(member =>
                member.batchId === null || member.batchId === batchId
            );

            return { isMember, members };
        } catch (error) {
            throw new Error('Failed to verify exam committee membership');
        }
    }

    async getTeacherCommittees(teacherId) {
        try {
            const url = `/exam-committees?teacherId=${teacherId}&status=true`;
            const response = await this.client.get(url);
            return response.data?.data || [];
        } catch (error) {
            throw new Error('Failed to fetch teacher committees');
        }
    }
}

export default new AcademicServiceClient();
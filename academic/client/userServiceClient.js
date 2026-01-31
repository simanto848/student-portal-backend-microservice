
import { createServiceClient, config } from 'shared';
import jwt from 'jsonwebtoken';

class UserServiceClient {
    constructor() {
        this.client = createServiceClient('user');
    }

    generateServiceToken() {
        return jwt.sign(
            {
                role: 'super_admin',
                sub: 'academic-service',
                type: 'service'
            },
            config.jwt.secret,
            { expiresIn: '1h' }
        );
    }

    async getStudentById(studentId) {
        try {
            const token = this.generateServiceToken();
            const response = await this.client.get(`/students/${studentId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            return response.data;
        } catch (error) {
            if (error.response?.status === 404) {
                throw new Error('Student not found');
            }
            throw new Error('Failed to fetch student details');
        }
    }

    async getTeacherById(teacherId) {
        try {
            const token = this.generateServiceToken();
            const response = await this.client.get(`/teachers/${teacherId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            return response.data?.data || response.data;
        } catch (error) {
            return null;
        }
    }

    async getTeachersByIds(teacherIds) {
        try {
            if (!teacherIds || teacherIds.length === 0) return [];

            const token = this.generateServiceToken();
            try {
                const response = await this.client.post(`/teachers/bulk`,
                    { ids: teacherIds },
                    { headers: { Authorization: `Bearer ${token}` } }
                );
                return response.data?.data || response.data || [];
            } catch (bulkError) {
                console.log('[UserServiceClient] Bulk fetch not available, fetching individually');
                const results = await Promise.all(
                    teacherIds.map(id => this.getTeacherById(id))
                );
                return results.filter(Boolean);
            }
        } catch (error) {
            console.error('[UserServiceClient] Failed to get teachers:', error.message);
            return [];
        }
    }
}

export default new UserServiceClient();

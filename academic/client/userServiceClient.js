
import { createServiceClient, config } from 'shared';
import jwt from 'jsonwebtoken';

class UserServiceClient {
    constructor() {
        this.client = createServiceClient('user'); // Use central factory
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
            // Result is probably in response.data.data if using ApiResponse
            // But let's check assumptions or keep consistent with previous implementation returning response.data
            return response.data;
        } catch (error) {
            if (error.response?.status === 404) {
                throw new Error('Student not found');
            }
            throw new Error('Failed to fetch student details');
        }
    }
}

export default new UserServiceClient();

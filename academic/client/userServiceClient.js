import axios from 'axios';
import jwt from 'jsonwebtoken';

class UserServiceClient {
    constructor() {
        this.baseURL = process.env.USER_SERVICE_URL || 'http://localhost:8007';
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
                sub: 'academic-service',
                type: 'service'
            },
            process.env.JWT_SECRET || 'fallback_secret', // Ensure this matches User Service's secret
            { expiresIn: '1h' }
        );
    }

    async getStudentById(studentId) {
        try {
            const response = await this.client.get(`/students/${studentId}`);
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

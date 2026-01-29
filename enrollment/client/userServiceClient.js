import axios from 'axios';
import jwt from 'jsonwebtoken';
import { config } from 'shared';

class UserServiceClient {
    constructor() {
        this.baseURL = config.services.user;
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

    async verifyStudent(studentId) {
        try {
            const response = await this.client.get(`/students/${studentId}`);
            return response.data;
        } catch (error) {
            if (error.response?.status === 404) {
                throw new Error('Student not found');
            }

            throw new Error('Failed to verify student');
        }
    }

    async verifyTeacher(teacherId) {
        try {
            const response = await this.client.get(`/teachers/${teacherId}`);
            return response.data;
        } catch (error) {
            if (error.response?.status === 404) {
                throw new Error('Teacher not found');
            }

            throw new Error('Failed to verify teacher');
        }
    }

    async getStudentsByBatch(batchId) {
        try {
            const response = await this.client.get(`/students?batchId=${batchId}`);
            return response.data;
        } catch (error) {
            throw new Error('Failed to fetch students');
        }
    }

    async getBatchStudents(batchId) {
        try {
            const response = await this.client.get(`/students?batchId=${batchId}`);
            return response.data;
        } catch (error) {
            throw new Error('Failed to fetch batch students');
        }
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

    async getTeacherById(teacherId) {
        try {
            const response = await this.client.get(`/teachers/${teacherId}`);
            return response.data;
        } catch (error) {
            if (error.response?.status === 404) {
                throw new Error('Teacher not found');
            }

            throw new Error('Failed to fetch teacher details');
        }
    }
}

export default new UserServiceClient();
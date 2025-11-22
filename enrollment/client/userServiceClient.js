import axios from 'axios';

class UserServiceClient {
    constructor() {
        this.baseURL = process.env.USER_SERVICE_URL || 'http://localhost:8007';
        this.client = axios.create({
            baseURL: this.baseURL,
            timeout: 10000,
        });
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
}

export default new UserServiceClient();
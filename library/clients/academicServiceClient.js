import axios from 'axios';

class AcademicServiceClient {
    constructor() {
        this.baseURL = process.env.ACADEMIC_SERVICE_URL || 'http://localhost:8002';
        this.client = axios.create({
            baseURL: this.baseURL,
            timeout: 5000,
            headers: {
                'Content-Type': 'application/json',
            },
        });
    }

    // Department APIs
    async getDepartmentById(departmentId) {
        try {
            const response = await this.client.get(`/departments/${departmentId}`);
            return response.data;
        } catch (error) {
            throw this.handleError(error);
        }
    }

    // Error handler
    handleError(error) {
        if (error.response) {
            return new Error(error.response.data.message || 'Academic service error');
        } else if (error.request) {
            return new Error('Academic service is not responding');
        } else {
            return new Error(error.message || 'Error communicating with academic service');
        }
    }
}

export default new AcademicServiceClient();

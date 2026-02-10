import axios from 'axios';
import { config } from 'shared';

class AcademicServiceClient {
    constructor() {
        this.baseURL = config.services.academic;
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

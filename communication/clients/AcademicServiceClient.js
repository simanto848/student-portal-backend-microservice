import axios from 'axios';

class AcademicServiceClient {
    constructor() {
        this.baseURL = process.env.ACADEMIC_SERVICE_URL || 'http://localhost:8001';
        this.client = axios.create({
            baseURL: this.baseURL,
            timeout: 10000,
        });
    }

    async getBatchDetails(batchId) {
        try {
            const response = await this.client.get(`/batches/${batchId}`);
            return response.data;
        } catch (error) {
            console.error('Error fetching batch details:', error.message);
            return null;
        }
    }

    async getCourseDetails(courseId) {
        try {
            const response = await this.client.get(`/courses/${courseId}`);
            return response.data;
        } catch (error) {
            console.error('Error fetching course details:', error.message);
            return null;
        }
    }
}

export default new AcademicServiceClient();

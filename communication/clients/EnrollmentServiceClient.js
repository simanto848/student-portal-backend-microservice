import axios from 'axios';

class EnrollmentServiceClient {
    constructor() {
        this.baseURL = process.env.ENROLLMENT_SERVICE_URL || 'http://localhost:8003';
        this.client = axios.create({
            baseURL: this.baseURL,
            timeout: 10000,
        });
    }

    async isStudentEnrolled(studentId, batchId, courseId) {
        try {
            const response = await this.client.get(`/enrollments`, {
                params: { studentId, batchId, courseId, status: 'active' }
            });
            return response.data && response.data.length > 0;
        } catch (error) {
            console.error('Error checking student enrollment:', error.message);
            return false;
        }
    }

    async isInstructorAssigned(instructorId, batchId, courseId) {
        try {
            const response = await this.client.get(`/batch-course-instructors`, {
                params: { instructorId, batchId, courseId, status: 'active' }
            });
            return response.data && response.data.length > 0;
        } catch (error) {
            console.error('Error checking instructor assignment:', error.message);
            return false;
        }
    }
}

export default new EnrollmentServiceClient();

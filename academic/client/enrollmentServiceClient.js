import { createServiceClient, config } from 'shared';
import jwt from 'jsonwebtoken';

class EnrollmentServiceClient {
    constructor() {
        this.client = createServiceClient('enrollment');
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

    // Get all instructor assignments with optional filters
    async getAssignments(filters = {}) {
        try {
            const token = this.generateServiceToken();
            const params = new URLSearchParams();

            if (filters.batchId) params.append('batchId', filters.batchId);
            if (filters.courseId) params.append('courseId', filters.courseId);
            if (filters.instructorId) params.append('instructorId', filters.instructorId);
            if (filters.semester) params.append('semester', filters.semester.toString());
            if (filters.status) params.append('status', filters.status);

            const url = `/batch-course-instructors?${params.toString()}`;
            const response = await this.client.get(url, {
                headers: { Authorization: `Bearer ${token}` }
            });

            const data = response.data?.data || response.data || [];
            return data;
        } catch (error) {
            return [];
        }
    }

    // Get assignment for a specific batch, course, and semester
    async getAssignment(batchId, courseId, semester) {
        try {
            const assignments = await this.getAssignments({
                batchId,
                courseId,
                semester,
                status: 'active'
            });

            return assignments.length > 0 ? assignments[0] : null;
        } catch (error) {
            return null;
        }
    }

    // Get all assignments for a batch
    async getBatchAssignments(batchId, semester = null) {
        const filters = { batchId, status: 'active' };
        if (semester) filters.semester = semester;

        return this.getAssignments(filters);
    }

    // Get instructor details by ID
    async getInstructorCourses(instructorId) {
        try {
            const token = this.generateServiceToken();
            const response = await this.client.get(`/batch-course-instructors/instructor/${instructorId}/courses`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            return response.data?.data || response.data || [];
        } catch (error) {
            return [];
        }
    }
}

export default new EnrollmentServiceClient();

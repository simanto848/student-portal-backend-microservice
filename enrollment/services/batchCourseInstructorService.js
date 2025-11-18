import BatchCourseInstructor from '../models/BatchCourseInstructor.js';
import { ApiError } from '../utils/ApiResponser.js';
import userServiceClient from '../utils/userServiceClient.js';
import academicServiceClient from '../utils/academicServiceClient.js';

class BatchCourseInstructorService {
    // Assign a teacher to a batch-course
    async assignInstructor(data) {
        try {
            // Verify batch, course, session, and instructor exist
            await Promise.all([
                academicServiceClient.verifyBatch(data.batchId),
                academicServiceClient.verifyCourse(data.courseId),
                academicServiceClient.verifySession(data.sessionId),
                userServiceClient.verifyTeacher(data.instructorId),
            ]);

            // Check if assignment already exists
            const existingAssignment = await BatchCourseInstructor.findOne({
                batchId: data.batchId,
                courseId: data.courseId,
                semester: data.semester,
                deletedAt: null,
            });

            if (existingAssignment) {
                throw new ApiError(409, 'This course is already assigned to an instructor for this batch and semester');
            }

            const assignment = await BatchCourseInstructor.create(data);
            return assignment;
        } catch (error) {
            if (error instanceof ApiError) throw error;
            throw new ApiError(500, error.message || 'Failed to assign instructor');
        }
    }

    // Get assignment by ID
    async getAssignmentById(id) {
        const assignment = await BatchCourseInstructor.findById(id);
        if (!assignment) {
            throw new ApiError(404, 'Assignment not found');
        }
        return assignment;
    }

    // List assignments with filters
    async listAssignments(filters = {}) {
        const query = {};
        
        if (filters.batchId) query.batchId = filters.batchId;
        if (filters.courseId) query.courseId = filters.courseId;
        if (filters.instructorId) query.instructorId = filters.instructorId;
        if (filters.semester) query.semester = parseInt(filters.semester);
        if (filters.status) query.status = filters.status;

        const assignments = await BatchCourseInstructor.find(query).sort({ createdAt: -1 });
        return assignments;
    }

    // Update assignment
    async updateAssignment(id, data) {
        const assignment = await this.getAssignmentById(id);

        // If changing instructor, verify new instructor
        if (data.instructorId && data.instructorId !== assignment.instructorId) {
            await userServiceClient.verifyTeacher(data.instructorId);
            
            // Mark old assignment as reassigned
            if (assignment.status === 'active') {
                data.status = 'active';
            }
        }

        Object.assign(assignment, data);
        await assignment.save();
        return assignment;
    }

    // Delete assignment (soft delete)
    async deleteAssignment(id) {
        const assignment = await this.getAssignmentById(id);
        await assignment.softDelete();
        return assignment;
    }

    // Check if instructor is assigned to a course
    async isInstructorAssigned(instructorId, courseId, batchId) {
        const assignment = await BatchCourseInstructor.findOne({
            instructorId,
            courseId,
            batchId,
            status: 'active',
        });
        return !!assignment;
    }

    // Get all courses taught by an instructor
    async getInstructorCourses(instructorId, filters = {}) {
        const query = { instructorId };
        
        if (filters.batchId) query.batchId = filters.batchId;
        if (filters.semester) query.semester = parseInt(filters.semester);
        if (filters.status) query.status = filters.status;
        else query.status = 'active'; // Default to active assignments

        const assignments = await BatchCourseInstructor.find(query).sort({ semester: -1, createdAt: -1 });
        return assignments;
    }

    // Get all instructors for a specific batch-course
    async getCourseInstructors(batchId, courseId, semester) {
        const assignments = await BatchCourseInstructor.find({
            batchId,
            courseId,
            semester,
        }).sort({ assignedDate: -1 });
        return assignments;
    }
}

export default new BatchCourseInstructorService();

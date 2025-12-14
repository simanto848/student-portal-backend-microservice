import BatchCourseInstructor from '../models/BatchCourseInstructor.js';
import { ApiError } from 'shared';
import userServiceClient from '../client/userServiceClient.js';
import academicServiceClient from '../client/academicServiceClient.js';

class BatchCourseInstructorService {
    async assignInstructor(data) {
        try {
            await Promise.all([
                academicServiceClient.verifyBatch(data.batchId),
                academicServiceClient.verifyCourse(data.courseId),
                academicServiceClient.verifySession(data.sessionId),
                userServiceClient.verifyTeacher(data.instructorId),
            ]);

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

    async bulkAssign(assignments) {
        const results = [];
        const errors = [];

        for (const assignment of assignments) {
            try {
                const existing = await BatchCourseInstructor.findOne({
                    batchId: assignment.batchId,
                    courseId: assignment.courseId,
                    semester: assignment.semester,
                    deletedAt: null,
                    status: 'active'
                });

                if (existing) {
                    if (existing.instructorId !== assignment.instructorId) {
                        await userServiceClient.verifyTeacher(assignment.instructorId);
                        existing.instructorId = assignment.instructorId;
                        await existing.save();
                        results.push({ ...existing.toObject(), status: 'updated' });
                    } else {
                        results.push({ ...existing.toObject(), status: 'unchanged' });
                    }
                } else {
                    const newAssignment = await this.assignInstructor(assignment);
                    results.push({ ...newAssignment.toObject(), status: 'created' });
                }
            } catch (error) {
                errors.push({
                    courseId: assignment.courseId,
                    error: error.message
                });
            }
        }

        return { results, errors };
    }

    async getAssignmentById(id) {
        const assignment = await BatchCourseInstructor.findById(id);
        if (!assignment) {
            throw new ApiError(404, 'Assignment not found');
        }
        return assignment;
    }

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

    async updateAssignment(id, data) {
        const assignment = await this.getAssignmentById(id);
        if (data.instructorId && data.instructorId !== assignment.instructorId) {
            await userServiceClient.verifyTeacher(data.instructorId);
            if (assignment.status === 'active') {
                data.status = 'active';
            }
        }

        Object.assign(assignment, data);
        await assignment.save();
        return assignment;
    }

    async deleteAssignment(id) {
        const assignment = await this.getAssignmentById(id);
        await assignment.softDelete();
        return assignment;
    }

    async isInstructorAssigned(instructorId, courseId, batchId) {
        const assignment = await BatchCourseInstructor.findOne({
            instructorId,
            courseId,
            batchId,
            status: 'active',
        });
        return !!assignment;
    }

    async getInstructorCourses(instructorId, filters = {}) {
        const query = { instructorId };

        if (filters.batchId) query.batchId = filters.batchId;
        if (filters.semester) query.semester = parseInt(filters.semester);
        if (filters.status) query.status = filters.status;
        else query.status = 'active';

        const assignments = await BatchCourseInstructor.find(query).sort({ semester: -1, createdAt: -1 });

        return assignments;
    }

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
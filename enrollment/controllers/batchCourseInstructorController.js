import batchCourseInstructorService from '../services/batchCourseInstructorService.js';
import { ApiResponse } from 'shared';

class BatchCourseInstructorController {
    async assignInstructor(req, res, next) {
        try {
            const assignment = await batchCourseInstructorService.assignInstructor(req.body);
            return ApiResponse.created(res, assignment, 'Instructor assigned successfully');
        } catch (error) {
            next(error);
        }
    }

    async bulkAssign(req, res, next) {
        try {
            const { assignments } = req.body;
            if (!Array.isArray(assignments) || assignments.length === 0) {
                return ApiResponse.badRequest(res, 'Assignments array is required and must not be empty');
            }
            const result = await batchCourseInstructorService.bulkAssign(assignments);
            return ApiResponse.success(res, result, 'Bulk assignment processed');
        } catch (error) {
            next(error);
        }
    }

    async getAssignment(req, res, next) {
        try {
            const assignment = await batchCourseInstructorService.getAssignmentById(req.params.id);
            return ApiResponse.success(res, assignment);
        } catch (error) {
            next(error);
        }
    }

    async listAssignments(req, res, next) {
        try {
            const assignments = await batchCourseInstructorService.listAssignments(req.query);
            return ApiResponse.success(res, assignments);
        } catch (error) {
            next(error);
        }
    }

    async updateAssignment(req, res, next) {
        try {
            const assignment = await batchCourseInstructorService.updateAssignment(req.params.id, req.body);
            return ApiResponse.success(res, assignment, 'Assignment updated successfully');
        } catch (error) {
            next(error);
        }
    }

    async deleteAssignment(req, res, next) {
        try {
            await batchCourseInstructorService.deleteAssignment(req.params.id);
            return ApiResponse.success(res, null, 'Assignment deleted successfully');
        } catch (error) {
            next(error);
        }
    }

    async getInstructorCourses(req, res, next) {
        try {
            const instructorId = req.params.instructorId || req.user.id || req.user.sub; // JWT payload uses 'id' usually
            const assignments = await batchCourseInstructorService.getInstructorCourses(instructorId, req.query);
            return ApiResponse.success(res, assignments);
        } catch (error) {
            next(error);
        }
    }

    async getCourseInstructors(req, res, next) {
        try {
            const { batchId, courseId, semester } = req.query;
            const parsedSemester = semester ? parseInt(semester) : undefined;
            const assignments = await batchCourseInstructorService.getCourseInstructors(batchId, courseId, parsedSemester);
            return ApiResponse.success(res, assignments);
        } catch (error) {
            next(error);
        }
    }

    async cleanupMismatchedAssignments(req, res, next) {
        try {
            const { batchId } = req.params;
            if (!batchId) {
                return ApiResponse.badRequest(res, 'Batch ID is required');
            }
            const result = await batchCourseInstructorService.cleanupMismatchedAssignments(batchId);
            return ApiResponse.success(res, result, `Cleaned up ${result.deletedCount} mismatched assignments`);
        } catch (error) {
            next(error);
        }
    }
}

export default new BatchCourseInstructorController();
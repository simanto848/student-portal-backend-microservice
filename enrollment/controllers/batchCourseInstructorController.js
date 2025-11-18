import batchCourseInstructorService from '../services/batchCourseInstructorService.js';
import ApiResponse from '../utils/ApiResponser.js';

class BatchCourseInstructorController {
    // Assign instructor to batch-course
    async assignInstructor(req, res, next) {
        try {
            const assignment = await batchCourseInstructorService.assignInstructor(req.body);
            return ApiResponse.created(res, assignment, 'Instructor assigned successfully');
        } catch (error) {
            next(error);
        }
    }

    // Get assignment by ID
    async getAssignment(req, res, next) {
        try {
            const assignment = await batchCourseInstructorService.getAssignmentById(req.params.id);
            return ApiResponse.success(res, assignment);
        } catch (error) {
            next(error);
        }
    }

    // List assignments with filters
    async listAssignments(req, res, next) {
        try {
            const assignments = await batchCourseInstructorService.listAssignments(req.query);
            return ApiResponse.success(res, assignments);
        } catch (error) {
            next(error);
        }
    }

    // Update assignment
    async updateAssignment(req, res, next) {
        try {
            const assignment = await batchCourseInstructorService.updateAssignment(req.params.id, req.body);
            return ApiResponse.success(res, assignment, 'Assignment updated successfully');
        } catch (error) {
            next(error);
        }
    }

    // Delete assignment
    async deleteAssignment(req, res, next) {
        try {
            await batchCourseInstructorService.deleteAssignment(req.params.id);
            return ApiResponse.success(res, null, 'Assignment deleted successfully');
        } catch (error) {
            next(error);
        }
    }

    // Get instructor's courses
    async getInstructorCourses(req, res, next) {
        try {
            const instructorId = req.params.instructorId || req.user.id;
            const assignments = await batchCourseInstructorService.getInstructorCourses(instructorId, req.query);
            return ApiResponse.success(res, assignments);
        } catch (error) {
            next(error);
        }
    }

    // Get course instructors
    async getCourseInstructors(req, res, next) {
        try {
            const { batchId, courseId, semester } = req.query;
            const assignments = await batchCourseInstructorService.getCourseInstructors(batchId, courseId, parseInt(semester));
            return ApiResponse.success(res, assignments);
        } catch (error) {
            next(error);
        }
    }
}

export default new BatchCourseInstructorController();

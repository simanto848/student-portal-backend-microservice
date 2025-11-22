import enrollmentService from '../services/enrollmentService.js';
import ApiResponse from '../utils/ApiResponser.js';

class EnrollmentController {
    async enrollStudent(req, res, next) {
        try {
            const enrollment = await enrollmentService.enrollStudent(req.body);
            return ApiResponse.created(res, enrollment, 'Student enrolled successfully');
        } catch (error) {
            next(error);
        }
    }

    async bulkEnrollBatch(req, res, next) {
        try {
            const result = await enrollmentService.bulkEnrollBatch(req.body);
            return ApiResponse.created(res, result, 'Batch enrollment completed');
        } catch (error) {
            next(error);
        }
    }

    async getEnrollment(req, res, next) {
        try {
            const enrollment = await enrollmentService.getEnrollmentById(req.params.id);
            return ApiResponse.success(res, enrollment);
        } catch (error) {
            next(error);
        }
    }

    async listEnrollments(req, res, next) {
        try {
            const filters = { ...req.query };
            if (req.user.type === 'student') {
                filters.studentId = req.user.sub;
            }

            const enrollments = await enrollmentService.listEnrollments(filters);
            return ApiResponse.success(res, enrollments);
        } catch (error) {
            next(error);
        }
    }

    async updateEnrollment(req, res, next) {
        try {
            const enrollment = await enrollmentService.updateEnrollment(req.params.id, req.body);
            return ApiResponse.success(res, enrollment, 'Enrollment updated successfully');
        } catch (error) {
            next(error);
        }
    }

    async deleteEnrollment(req, res, next) {
        try {
            await enrollmentService.deleteEnrollment(req.params.id);
            return ApiResponse.success(res, null, 'Enrollment deleted successfully');
        } catch (error) {
            next(error);
        }
    }

    async getStudentSemesterEnrollments(req, res, next) {
        try {
            const { studentId, semester } = req.params;
            if (req.user.type === 'student' && req.user.sub !== studentId) {
                return ApiResponse.forbidden(res, 'You can only view your own enrollments');
            }

            const enrollments = await enrollmentService.getStudentSemesterEnrollments(studentId, parseInt(semester));
            return ApiResponse.success(res, enrollments);
        } catch (error) {
            next(error);
        }
    }

    async completeBatchSemester(req, res, next) {
        try {
            const { batchId, semester } = req.body;
            const result = await enrollmentService.completeBatchSemester(batchId, parseInt(semester));
            return ApiResponse.success(res, result, 'Batch semester completed successfully');
        } catch (error) {
            next(error);
        }
    }

    async progressBatchSemester(req, res, next) {
        try {
            const { batchId } = req.params;
            const result = await enrollmentService.progressBatchToNextSemester(batchId);
            return ApiResponse.success(res, result, 'Batch semester progressed successfully');
        } catch (error) {
            next(error);
        }
    }
}

export default new EnrollmentController();
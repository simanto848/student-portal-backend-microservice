import enrollmentService from '../services/enrollmentService.js';
import ApiResponse from '../utils/ApiResponser.js';

class EnrollmentController {
    // Enroll single student
    async enrollStudent(req, res, next) {
        try {
            const enrollment = await enrollmentService.enrollStudent(req.body);
            return ApiResponse.created(res, enrollment, 'Student enrolled successfully');
        } catch (error) {
            next(error);
        }
    }

    // Bulk enroll batch students
    async bulkEnrollBatch(req, res, next) {
        try {
            const result = await enrollmentService.bulkEnrollBatch(req.body);
            return ApiResponse.created(res, result, 'Batch enrollment completed');
        } catch (error) {
            next(error);
        }
    }

    // Get enrollment by ID
    async getEnrollment(req, res, next) {
        try {
            const enrollment = await enrollmentService.getEnrollmentById(req.params.id);
            return ApiResponse.success(res, enrollment);
        } catch (error) {
            next(error);
        }
    }

    // List enrollments with filters
    async listEnrollments(req, res, next) {
        try {
            // If student role, only show their enrollments
            const filters = { ...req.query };
            if (req.user.role === 'student') {
                filters.studentId = req.user.id;
            }
            
            const enrollments = await enrollmentService.listEnrollments(filters);
            return ApiResponse.success(res, enrollments);
        } catch (error) {
            next(error);
        }
    }

    // Update enrollment
    async updateEnrollment(req, res, next) {
        try {
            const enrollment = await enrollmentService.updateEnrollment(req.params.id, req.body);
            return ApiResponse.success(res, enrollment, 'Enrollment updated successfully');
        } catch (error) {
            next(error);
        }
    }

    // Delete enrollment
    async deleteEnrollment(req, res, next) {
        try {
            await enrollmentService.deleteEnrollment(req.params.id);
            return ApiResponse.success(res, null, 'Enrollment deleted successfully');
        } catch (error) {
            next(error);
        }
    }

    // Get student's semester enrollments
    async getStudentSemesterEnrollments(req, res, next) {
        try {
            const { studentId, semester } = req.params;
            
            // Students can only view their own enrollments
            if (req.user.role === 'student' && req.user.id !== studentId) {
                return ApiResponse.forbidden(res, 'You can only view your own enrollments');
            }

            const enrollments = await enrollmentService.getStudentSemesterEnrollments(studentId, parseInt(semester));
            return ApiResponse.success(res, enrollments);
        } catch (error) {
            next(error);
        }
    }

    // Complete batch semester
    async completeBatchSemester(req, res, next) {
        try {
            const { batchId, semester } = req.body;
            const result = await enrollmentService.completeBatchSemester(batchId, parseInt(semester));
            return ApiResponse.success(res, result, 'Batch semester completed successfully');
        } catch (error) {
            next(error);
        }
    }
}

export default new EnrollmentController();

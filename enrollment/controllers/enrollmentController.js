import ApiResponse from '../utils/ApiResponser.js';
import enrollmentService from '../services/enrollmentService.js';

class EnrollmentController {
    async getAll(req, res, next) {
        try {
            const { page, limit, search, ...filters } = req.query;
            const options = {};
            
            if (page || limit) {
                options.pagination = {
                    page: parseInt(page) || 1,
                    limit: parseInt(limit) || 10,
                };
            }

            if (search) {
                options.search = search;
            }

            if (Object.keys(filters).length > 0) {
                options.filters = filters;
            }

            const result = await enrollmentService.getAll(options);
            return ApiResponse.success(res, result, 'Enrollments retrieved successfully');
        } catch (error) {
            next(error);
        }
    }

    async getById(req, res, next) {
        try {
            const enrollment = await enrollmentService.getById(req.params.id);
            return ApiResponse.success(res, enrollment, 'Enrollment retrieved successfully');
        } catch (error) {
            next(error);
        }
    }

    async create(req, res, next) {
        try {
            const enrollment = await enrollmentService.create(req.body);
            return ApiResponse.created(res, enrollment, 'Enrollment created successfully');
        } catch (error) {
            next(error);
        }
    }

    async createBulk(req, res, next) {
        try {
            const { enrollments } = req.body;
            if (!Array.isArray(enrollments) || enrollments.length === 0) {
                return ApiResponse.badRequest(res, 'Enrollments array is required and must not be empty');
            }

            const created = await enrollmentService.createBulk(enrollments);
            return ApiResponse.created(res, created, `${created.length} enrollments created successfully`);
        } catch (error) {
            next(error);
        }
    }

    async update(req, res, next) {
        try {
            const enrollment = await enrollmentService.update(req.params.id, req.body);
            return ApiResponse.success(res, enrollment, 'Enrollment updated successfully');
        } catch (error) {
            next(error);
        }
    }

    async delete(req, res, next) {
        try {
            await enrollmentService.delete(req.params.id);
            return ApiResponse.success(res, null, 'Enrollment deleted successfully');
        } catch (error) {
            next(error);
        }
    }

    async restore(req, res, next) {
        try {
            const enrollment = await enrollmentService.restore(req.params.id);
            return ApiResponse.success(res, enrollment, 'Enrollment restored successfully');
        } catch (error) {
            next(error);
        }
    }

    async getByStudent(req, res, next) {
        try {
            const { studentId } = req.params;
            const { semester, sessionId } = req.query;
            const enrollments = await enrollmentService.getByStudent(studentId, { semester, sessionId });
            return ApiResponse.success(res, enrollments, 'Student enrollments retrieved successfully');
        } catch (error) {
            next(error);
        }
    }

    async getBySemester(req, res, next) {
        try {
            const { departmentId, semester } = req.params;
            const { sessionId } = req.query;
            const enrollments = await enrollmentService.getBySemester(departmentId, parseInt(semester), sessionId);
            return ApiResponse.success(res, enrollments, 'Semester enrollments retrieved successfully');
        } catch (error) {
            next(error);
        }
    }
}

export default new EnrollmentController();

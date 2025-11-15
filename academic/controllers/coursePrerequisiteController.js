import ApiResponse from '../utils/ApiResponser.js';
import coursePrerequisiteService from '../services/coursePrerequisiteService.js';

class CoursePrerequisiteController {
    async getAll(req, res, next) {
        try {
            const { page, limit, ...filters } = req.query;
            const options = {};
            if (page || limit) {
                options.pagination = {
                    page: parseInt(page) || 1,
                    limit: parseInt(limit) || 10,
                };
            }

            if (Object.keys(filters).length > 0) {
                options.filters = filters;
            }

            const result = await coursePrerequisiteService.getAll(options);
            return ApiResponse.success(res, result, 'Course prerequisites retrieved successfully');
        } catch (error) {
            next(error);
        }
    }

    async getById(req, res, next) {
        try {
            const item = await coursePrerequisiteService.getById(req.params.id);
            return ApiResponse.success(res, item, 'Course prerequisite retrieved successfully');
        } catch (error) {
            next(error);
        }
    }

    async create(req, res, next) {
        try {
            const created = await coursePrerequisiteService.create(req.body);
            return ApiResponse.created(res, created, 'Course prerequisite created successfully');
        } catch (error) {
            next(error);
        }
    }

    async delete(req, res, next) {
        try {
            await coursePrerequisiteService.delete(req.params.id);
            return ApiResponse.success(res, null, 'Course prerequisite deleted successfully');
        } catch (error) {
            next(error);
        }
    }

    async getPrerequisitesByCourse(req, res, next) {
        try {
            const { page, limit } = req.query;
            const options = {};
            if (page || limit) {
                options.pagination = {
                    page: parseInt(page) || 1,
                    limit: parseInt(limit) || 10,
                };
            }

            const result = await coursePrerequisiteService.getPrerequisitesByCourse(req.params.courseId, options);
            return ApiResponse.success(res, result, 'Prerequisites retrieved successfully');
        } catch (error) {
            next(error);
        }
    }
}

export default new CoursePrerequisiteController();

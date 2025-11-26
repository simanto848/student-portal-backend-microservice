import { ApiResponse } from 'shared';
import sessionCourseService from '../services/sessionCourseService.js';

class SessionCourseController {
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

            const result = await sessionCourseService.getAll(options);
            return ApiResponse.success(res, result, 'Session courses retrieved successfully');
        } catch (error) {
            next(error);
        }
    }

    async getById(req, res, next) {
        try {
            const sessionCourse = await sessionCourseService.getById(req.params.id);
            return ApiResponse.success(res, sessionCourse, 'Session course retrieved successfully');
        } catch (error) {
            next(error);
        }
    }

    async create(req, res, next) {
        try {
            const sessionCourse = await sessionCourseService.create(req.body);
            return ApiResponse.created(res, sessionCourse, 'Session course created successfully');
        } catch (error) {
            next(error);
        }
    }

    async update(req, res, next) {
        try {
            const sessionCourse = await sessionCourseService.update(req.params.id, req.body);
            return ApiResponse.success(res, sessionCourse, 'Session course updated successfully');
        } catch (error) {
            next(error);
        }
    }

    async delete(req, res, next) {
        try {
            await sessionCourseService.delete(req.params.id);
            return ApiResponse.success(res, null, 'Session course deleted successfully');
        } catch (error) {
            next(error);
        }
    }

    async getBatchSessionCourses(req, res, next) {
        try {
            const { page, limit } = req.query;
            const options = {};
            if (page || limit) {
                options.pagination = {
                    page: parseInt(page) || 1,
                    limit: parseInt(limit) || 100,
                };
            }

            const result = await sessionCourseService.getBatchSessionCourses(req.params.batchId, options);
            return ApiResponse.success(res, result, 'Batch session courses retrieved successfully');
        } catch (error) {
            next(error);
        }
    }

    async sync(req, res, next) {
        try {
            await sessionCourseService.sync(req.body);
            return ApiResponse.success(res, null, 'Session courses synced successfully');
        } catch (error) {
            next(error);
        }
    }
}

export default new SessionCourseController();


import { ApiResponse } from 'shared';
import courseScheduleService from '../services/courseScheduleService.js';

class CourseScheduleController {
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

            const result = await courseScheduleService.getAll(options);
            return ApiResponse.success(res, result, 'Course schedules retrieved successfully');
        } catch (error) {
            next(error);
        }
    }

    async getById(req, res, next) {
        try {
            const schedule = await courseScheduleService.getById(req.params.id);
            return ApiResponse.success(res, schedule, 'Course schedule retrieved successfully');
        } catch (error) {
            next(error);
        }
    }

    async create(req, res, next) {
        try {
            const schedule = await courseScheduleService.create(req.body);
            return ApiResponse.created(res, schedule, 'Course schedule created successfully');
        } catch (error) {
            next(error);
        }
    }

    async update(req, res, next) {
        try {
            const schedule = await courseScheduleService.update(req.params.id, req.body);
            return ApiResponse.success(res, schedule, 'Course schedule updated successfully');
        } catch (error) {
            next(error);
        }
    }

    async delete(req, res, next) {
        try {
            await courseScheduleService.delete(req.params.id);
            return ApiResponse.success(res, null, 'Course schedule deleted successfully');
        } catch (error) {
            next(error);
        }
    }

    async getScheduleByBatch(req, res, next) {
        try {
            const { page, limit } = req.query;
            const options = {};
            if (page || limit) {
                options.pagination = {
                    page: parseInt(page) || 1,
                    limit: parseInt(limit) || 100,
                };
            }

            const result = await courseScheduleService.getScheduleByBatch(req.params.batchId, options);
            return ApiResponse.success(res, result, 'Batch schedule retrieved successfully');
        } catch (error) {
            next(error);
        }
    }

    async getScheduleByTeacher(req, res, next) {
        try {
            const { page, limit } = req.query;
            const options = {};
            if (page || limit) {
                options.pagination = {
                    page: parseInt(page) || 1,
                    limit: parseInt(limit) || 100,
                };
            }

            const result = await courseScheduleService.getScheduleByTeacher(req.params.teacherId, options);
            return ApiResponse.success(res, result, 'Teacher schedule retrieved successfully');
        } catch (error) {
            next(error);
        }
    }
}

export default new CourseScheduleController();


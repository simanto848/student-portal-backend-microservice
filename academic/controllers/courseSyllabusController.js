import { ApiResponse } from 'shared';
import courseSyllabusService from '../services/courseSyllabusService.js';

class CourseSyllabusController {
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

            const result = await courseSyllabusService.getAll(options);
            return ApiResponse.success(res, result, 'Course syllabi retrieved successfully');
        } catch (error) {
            next(error);
        }
    }

    async getById(req, res, next) {
        try {
            const syllabus = await courseSyllabusService.getById(req.params.id);
            return ApiResponse.success(res, syllabus, 'Course syllabus retrieved successfully');
        } catch (error) {
            next(error);
        }
    }

    async create(req, res, next) {
        try {
            const syllabus = await courseSyllabusService.create(req.body);
            return ApiResponse.created(res, syllabus, 'Course syllabus created successfully');
        } catch (error) {
            next(error);
        }
    }

    async update(req, res, next) {
        try {
            const syllabus = await courseSyllabusService.update(req.params.id, req.body);
            return ApiResponse.success(res, syllabus, 'Course syllabus updated successfully');
        } catch (error) {
            next(error);
        }
    }

    async delete(req, res, next) {
        try {
            await courseSyllabusService.delete(req.params.id);
            return ApiResponse.success(res, null, 'Course syllabus deleted successfully');
        } catch (error) {
            next(error);
        }
    }

    async approveSyllabus(req, res, next) {
        try {
            const syllabus = await courseSyllabusService.approveSyllabus(
                req.params.id,
                req.body.approvedById
            );
            return ApiResponse.success(res, syllabus, 'Course syllabus approved successfully');
        } catch (error) {
            next(error);
        }
    }

    async publishSyllabus(req, res, next) {
        try {
            const syllabus = await courseSyllabusService.publishSyllabus(
                req.params.id,
                req.body.publishedById
            );
            return ApiResponse.success(res, syllabus, 'Course syllabus published successfully');
        } catch (error) {
            next(error);
        }
    }
}

export default new CourseSyllabusController();


import { ApiResponse } from 'shared';
import classroomService from '../services/classroomService.js';

class ClassroomController {
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

            const result = await classroomService.getAll(options);
            return ApiResponse.success(res, result, 'Classrooms retrieved successfully');
        } catch (error) {
            next(error);
        }
    }

    async getById(req, res, next) {
        try {
            const classroom = await classroomService.getById(req.params.id);
            return ApiResponse.success(res, classroom, 'Classroom retrieved successfully');
        } catch (error) {
            next(error);
        }
    }

    async create(req, res, next) {
        try {
            const classroom = await classroomService.create(req.body);
            return ApiResponse.created(res, classroom, 'Classroom created successfully');
        } catch (error) {
            next(error);
        }
    }

    async update(req, res, next) {
        try {
            const classroom = await classroomService.update(req.params.id, req.body);
            return ApiResponse.success(res, classroom, 'Classroom updated successfully');
        } catch (error) {
            next(error);
        }
    }

    async delete(req, res, next) {
        try {
            await classroomService.delete(req.params.id);
            return ApiResponse.success(res, null, 'Classroom deleted successfully');
        } catch (error) {
            next(error);
        }
    }
}

export default new ClassroomController();


import { ApiResponse } from 'shared';
import programService from '../services/programService.js';

class ProgramController {
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

            const result = await programService.getAll(options);
            return ApiResponse.success(res, result, 'Programs retrieved successfully');
        } catch (error) {
            next(error);
        }
    }

    async getById(req, res, next) {
        try {
            const program = await programService.getById(req.params.id);
            return ApiResponse.success(res, program, 'Program retrieved successfully');
        } catch (error) {
            next(error);
        }
    }

    async create(req, res, next) {
        try {
            const program = await programService.create(req.body);
            return ApiResponse.created(res, program, 'Program created successfully');
        } catch (error) {
            next(error);
        }
    }

    async update(req, res, next) {
        try {
            const program = await programService.update(req.params.id, req.body);
            return ApiResponse.success(res, program, 'Program updated successfully');
        } catch (error) {
            next(error);
        }
    }

    async delete(req, res, next) {
        try {
            await programService.delete(req.params.id);
            return ApiResponse.success(res, null, 'Program deleted successfully');
        } catch (error) {
            next(error);
        }
    }

    async getBatchesByProgram(req, res, next) {
        try {
            const { page, limit, search, ...filters } = req.query;
            const options = {
                pagination: {
                    page: parseInt(page) || 1,
                    limit: parseInt(limit) || 10,
                },
            };

            if (search) {
                options.search = search;
            }

            if (Object.keys(filters).length > 0) {
                options.filters = filters;
            }

            const result = await programService.getBatchesByProgram(req.params.id, options);
            return ApiResponse.success(res, result, 'Batches retrieved successfully');
        } catch (error) {
            next(error);
        }
    }
}

export default new ProgramController();


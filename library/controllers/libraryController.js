import { ApiResponse } from 'shared';
import libraryService from '../services/libraryService.js';

class LibraryController {
    async getAll(req, res, next) {
        try {
            const { page, limit, search, ...filters } = req.query;
            const options = {};
            if (page || limit) options.pagination = { page: parseInt(page) || 1, limit: parseInt(limit) || 10 };
            if (search) options.search = search;
            if (Object.keys(filters).length > 0) options.filters = filters;
            const result = await libraryService.getAll(options);
            return ApiResponse.success(res, result, 'Libraries retrieved successfully');
        } catch (error) {
            next(error);
        }
    }

    async getById(req, res, next) {
        try {
            const library = await libraryService.getById(req.params.id);
            return ApiResponse.success(res, library, 'Library retrieved successfully');
        } catch (error) {
            next(error);
        }
    }

    async create(req, res, next) {
        try {
            const library = await libraryService.create(req.validatedData || req.body);
            return ApiResponse.created(res, library, 'Library created successfully');
        } catch (error) {
            next(error);
        }
    }

    async update(req, res, next) {
        try {
            const library = await libraryService.update(req.params.id, req.validatedData || req.body);
            return ApiResponse.success(res, library, 'Library updated successfully');
        } catch (error) {
            next(error);
        }
    }

    async delete(req, res, next) {
        try {
            const result = await libraryService.delete(req.params.id);
            return ApiResponse.success(res, result, 'Library deleted successfully');
        } catch (error) {
            next(error);
        }
    }

    async restore(req, res, next) {
        try {
            const library = await libraryService.restore(req.params.id);
            return ApiResponse.success(res, library, 'Library restored successfully');
        } catch (error) {
            next(error);
        }
    }
}

export default new LibraryController();
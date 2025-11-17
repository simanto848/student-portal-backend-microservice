import ApiResponse from '../utils/ApiResponser.js';
import bookCopyService from '../services/bookCopyService.js';

class BookCopyController {
    async getAll(req, res, next) {
        try {
            const { page, limit, search, ...filters } = req.query;
            const options = {};
            if (page || limit) options.pagination = { page: parseInt(page) || 1, limit: parseInt(limit) || 10 };
            if (search) options.search = search;
            if (Object.keys(filters).length > 0) options.filters = filters;
            const result = await bookCopyService.getAll(options);
            return ApiResponse.success(res, result, 'Book copies retrieved successfully');
        } catch (error) {
            next(error);
        }
    }

    async getById(req, res, next) {
        try {
            const copy = await bookCopyService.getById(req.params.id);
            return ApiResponse.success(res, copy, 'Book copy retrieved successfully');
        } catch (error) {
            next(error);
        }
    }

    async create(req, res, next) {
        try {
            const copy = await bookCopyService.create(req.validatedData || req.body);
            return ApiResponse.created(res, copy, 'Book copy created successfully');
        } catch (error) {
            next(error);
        }
    }

    async update(req, res, next) {
        try {
            const copy = await bookCopyService.update(req.params.id, req.validatedData || req.body);
            return ApiResponse.success(res, copy, 'Book copy updated successfully');
        } catch (error) {
            next(error);
        }
    }

    async delete(req, res, next) {
        try {
            const result = await bookCopyService.delete(req.params.id);
            return ApiResponse.success(res, result, 'Book copy deleted successfully');
        } catch (error) {
            next(error);
        }
    }

    async restore(req, res, next) {
        try {
            const copy = await bookCopyService.restore(req.params.id);
            return ApiResponse.success(res, copy, 'Book copy restored successfully');
        } catch (error) {
            next(error);
        }
    }

    async getAvailableCopiesByBook(req, res, next) {
        try {
            const result = await bookCopyService.getAvailableCopiesByBook(req.params.bookId);
            return ApiResponse.success(res, result, 'Available copies retrieved successfully');
        } catch (error) {
            next(error);
        }
    }
}

export default new BookCopyController();
import ApiResponse from '../utils/ApiResponser.js';
import bookService from '../services/bookService.js';

class BookController {
    async getAll(req, res, next) {
        try {
            const { page, limit, search, ...filters } = req.query;
            const options = {};
            if (page || limit) options.pagination = { page: parseInt(page) || 1, limit: parseInt(limit) || 10 };
            if (search) options.search = search;
            if (Object.keys(filters).length > 0) options.filters = filters;
            const result = await bookService.getAll(options);
            return ApiResponse.success(res, result, 'Books retrieved successfully');
        } catch (error) { 
            next(error); 
        }
    }

    async getById(req, res, next) {
        try {
            const book = await bookService.getById(req.params.id);
            return ApiResponse.success(res, book, 'Book retrieved successfully');
        } catch (error) { 
            next(error); 
        }
    }

    async create(req, res, next) {
        try {
            const book = await bookService.create(req.validatedData || req.body);
            return ApiResponse.created(res, book, 'Book created successfully');
        } catch (error) { 
            next(error); 
        }
    }

    async update(req, res, next) {
        try {
            const book = await bookService.update(req.params.id, req.validatedData || req.body);
            return ApiResponse.success(res, book, 'Book updated successfully');
        } catch (error) { 
            next(error); 
        }
    }

    async delete(req, res, next) {
        try {
            const result = await bookService.delete(req.params.id);
            return ApiResponse.success(res, result, 'Book deleted successfully');
        } catch (error) { 
            next(error); 
        }
    }

    async restore(req, res, next) {
        try {
            const book = await bookService.restore(req.params.id);
            return ApiResponse.success(res, book, 'Book restored successfully');
        } catch (error) { 
            next(error); 
        }
    }

    async getAvailableBooks(req, res, next) {
        try {
            const { page, limit, search, ...filters } = req.query;
            const options = {};
            options.pagination = { page: parseInt(page) || 1, limit: parseInt(limit) || 10 };
            if (search) options.search = search;
            if (Object.keys(filters).length > 0) options.filters = filters;
            const result = await bookService.getAvailableBooks(options);
            return ApiResponse.success(res, result, 'Available books retrieved successfully');
        } catch (error) { 
            next(error); 
        }
    }
}

export default new BookController();

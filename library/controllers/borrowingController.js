import ApiResponse from '../utils/ApiResponser.js';
import borrowingService from '../services/borrowingService.js';

class BorrowingController {
    async borrowBook(req, res, next) {
        try {
            const borrowerId = req.user.id;
            const { copyId, notes } = req.validatedData || req.body;
            const processedById = req.user.id;

            const borrowing = await borrowingService.borrowBook(borrowerId, copyId, processedById, notes);
            return ApiResponse.created(res, borrowing, 'Book borrowed successfully');
        } catch (error) {
            next(error);
        }
    }

    async returnBook(req, res, next) {
        try {
            const { id } = req.params;
            const { notes } = req.validatedData || req.body;
            const processedById = req.user.id;

            const borrowing = await borrowingService.returnBook(id, processedById, notes);
            return ApiResponse.success(res, borrowing, 'Book returned successfully');
        } catch (error) {
            next(error);
        }
    }

    async getMyBorrowedBooks(req, res, next) {
        try {
            const borrowerId = req.user.id;
            const { page, limit, ...filters } = req.query;
            const options = {
                pagination: { page: parseInt(page) || 1, limit: parseInt(limit) || 10 }
            };
            if (Object.keys(filters).length > 0) options.filters = filters;

            const result = await borrowingService.getBorrowedBooksByUser(borrowerId, options);
            return ApiResponse.success(res, result, 'Borrowed books retrieved successfully');
        } catch (error) {
            next(error);
        }
    }

    async getMyOverdueBooks(req, res, next) {
        try {
            const borrowerId = req.user.id;
            const result = await borrowingService.getOverdueBooksByUser(borrowerId);
            return ApiResponse.success(res, result, 'Overdue books retrieved successfully');
        } catch (error) {
            next(error);
        }
    }

    async getMyBorrowingHistory(req, res, next) {
        try {
            const borrowerId = req.user.id;
            const { page, limit, ...filters } = req.query;
            const options = {
                pagination: { page: parseInt(page) || 1, limit: parseInt(limit) || 10 }
            };
            if (Object.keys(filters).length > 0) options.filters = filters;

            const result = await borrowingService.getBorrowingHistory(borrowerId, options);
            return ApiResponse.success(res, result, 'Borrowing history retrieved successfully');
        } catch (error) {
            next(error);
        }
    }

    async getAllBorrowings(req, res, next) {
        try {
            const { page, limit, ...filters } = req.query;
            const options = {
                pagination: { page: parseInt(page) || 1, limit: parseInt(limit) || 10 }
            };
            if (Object.keys(filters).length > 0) options.filters = filters;

            const result = await borrowingService.getAllBorrowings(options);
            return ApiResponse.success(res, result, 'All borrowings retrieved successfully');
        } catch (error) {
            next(error);
        }
    }

    async updateBorrowingStatus(req, res, next) {
        try {
            const { id } = req.params;
            const data = req.validatedData || req.body;

            const borrowing = await borrowingService.updateBorrowingStatus(id, data);
            return ApiResponse.success(res, borrowing, 'Borrowing status updated successfully');
        } catch (error) {
            next(error);
        }
    }

    async checkAndUpdateOverdue(req, res, next) {
        try {
            const result = await borrowingService.checkAndUpdateOverdueBooks();
            return ApiResponse.success(res, result, 'Overdue books checked and updated');
        } catch (error) {
            next(error);
        }
    }
}

export default new BorrowingController();
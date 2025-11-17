import BookTakenHistory from '../models/BookTakenHistory.js';
import BookCopy from '../models/BookCopy.js';
import Book from '../models/Book.js';
import Library from '../models/Library.js';
import { ApiError } from '../utils/ApiResponser.js';

class BorrowingService {
    async borrowBook(borrowerId, copyId, processedById, notes = '') {
        try {
            // Get the book copy with related data
            const copy = await BookCopy.findById(copyId)
                .populate('bookId')
                .populate('libraryId');

            if (!copy) throw new ApiError(404, 'Book copy not found');
            if (copy.status !== 'available') {
                throw new ApiError(400, 'This book copy is not available for borrowing');
            }

            const library = copy.libraryId;

            // Check if user has reached borrow limit
            const activeBorrowings = await BookTakenHistory.countDocuments({
                borrowerId,
                status: { $in: ['borrowed', 'overdue'] },
                deletedAt: null
            });

            if (activeBorrowings >= library.maxBorrowLimit) {
                throw new ApiError(400, `You have reached the maximum borrow limit of ${library.maxBorrowLimit} books`);
            }

            // Check if user has any overdue books with unpaid fines
            const overdueWithUnpaidFines = await BookTakenHistory.findOne({
                borrowerId,
                status: 'overdue',
                finePaid: false,
                fineAmount: { $gt: 0 },
                deletedAt: null
            });

            if (overdueWithUnpaidFines) {
                throw new ApiError(400, 'You have unpaid fines. Please clear them before borrowing new books');
            }

            // Calculate due date
            const borrowDate = new Date();
            const dueDate = new Date(borrowDate);
            dueDate.setDate(dueDate.getDate() + library.borrowDuration);

            // Create borrowing record
            const borrowing = new BookTakenHistory({
                borrowerId,
                bookId: copy.bookId._id || copy.bookId,
                copyId: copy._id,
                libraryId: library._id || library.id,
                borrowDate,
                dueDate,
                status: 'borrowed',
                fineAmount: 0,
                finePaid: false,
                notes,
                processedById
            });

            await borrowing.save();

            // Update copy status
            copy.status = 'borrowed';
            await copy.save();

            return borrowing.toJSON();
        } catch (error) {
            if (error.code === 11000 && error.message.includes('unique_copy_borrowing')) {
                throw new ApiError(400, 'This book copy is already borrowed');
            }
            throw error instanceof ApiError ? error : new ApiError(500, 'Error borrowing book: ' + error.message);
        }
    }

    async returnBook(borrowingId, processedById, notes = '') {
        try {
            const borrowing = await BookTakenHistory.findById(borrowingId)
                .populate('copyId')
                .populate('libraryId');

            if (!borrowing) throw new ApiError(404, 'Borrowing record not found');
            if (borrowing.status === 'returned') {
                throw new ApiError(400, 'This book has already been returned');
            }

            const returnDate = new Date();
            const dueDate = new Date(borrowing.dueDate);

            // Calculate fine if overdue
            let fineAmount = 0;
            if (returnDate > dueDate) {
                const daysOverdue = Math.ceil((returnDate - dueDate) / (1000 * 60 * 60 * 24));
                fineAmount = daysOverdue * borrowing.libraryId.finePerDay;
            }

            // Update borrowing record
            borrowing.returnDate = returnDate;
            borrowing.status = 'returned';
            borrowing.fineAmount = fineAmount;
            borrowing.notes = notes || borrowing.notes;
            if (processedById) borrowing.processedById = processedById;

            await borrowing.save();

            // Update copy status back to available
            const copy = await BookCopy.findById(borrowing.copyId);
            if (copy) {
                copy.status = 'available';
                await copy.save();
            }

            return borrowing.toJSON();
        } catch (error) {
            throw error instanceof ApiError ? error : new ApiError(500, 'Error returning book: ' + error.message);
        }
    }

    async getBorrowedBooksByUser(borrowerId, options = {}) {
        try {
            const { pagination, filters = {} } = options;
            const query = {
                borrowerId,
                status: { $in: ['borrowed', 'overdue'] },
                deletedAt: null,
                ...filters
            };

            if (pagination && (pagination.page || pagination.limit)) {
                const page = parseInt(pagination.page) || 1;
                const limit = parseInt(pagination.limit) || 10;
                const skip = (page - 1) * limit;

                const [borrowings, total] = await Promise.all([
                    BookTakenHistory.find(query)
                        .populate('bookId', 'title author isbn category')
                        .populate('copyId', 'copyNumber location condition')
                        .populate('libraryId', 'name code finePerDay')
                        .sort({ borrowDate: -1 })
                        .skip(skip)
                        .limit(limit)
                        .lean(),
                    BookTakenHistory.countDocuments(query),
                ]);

                // Add days until due and potential fine
                const borrowingsWithDetails = borrowings.map(b => {
                    const dueDate = new Date(b.dueDate);
                    const today = new Date();
                    const daysUntilDue = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));
                    const isOverdue = daysUntilDue < 0;
                    const potentialFine = isOverdue ? Math.abs(daysUntilDue) * (b.libraryId?.finePerDay || 0) : 0;

                    return {
                        ...b,
                        daysUntilDue,
                        isOverdue,
                        potentialFine
                    };
                });

                return {
                    borrowings: borrowingsWithDetails,
                    pagination: {
                        page,
                        limit,
                        total,
                        pages: Math.ceil(total / limit),
                    },
                };
            }

            const borrowings = await BookTakenHistory.find(query)
                .populate('bookId', 'title author isbn category')
                .populate('copyId', 'copyNumber location condition')
                .populate('libraryId', 'name code finePerDay')
                .sort({ borrowDate: -1 })
                .lean();

            const borrowingsWithDetails = borrowings.map(b => {
                const dueDate = new Date(b.dueDate);
                const today = new Date();
                const daysUntilDue = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));
                const isOverdue = daysUntilDue < 0;
                const potentialFine = isOverdue ? Math.abs(daysUntilDue) * (b.libraryId?.finePerDay || 0) : 0;

                return {
                    ...b,
                    daysUntilDue,
                    isOverdue,
                    potentialFine
                };
            });

            return { borrowings: borrowingsWithDetails };
        } catch (error) {
            throw new ApiError(500, 'Error fetching borrowed books: ' + error.message);
        }
    }

    async getOverdueBooksByUser(borrowerId, options = {}) {
        try {
            const query = {
                borrowerId,
                status: 'overdue',
                deletedAt: null
            };

            const borrowings = await BookTakenHistory.find(query)
                .populate('bookId', 'title author isbn category')
                .populate('copyId', 'copyNumber location')
                .populate('libraryId', 'name code finePerDay')
                .sort({ dueDate: 1 })
                .lean();

            // Calculate current fines
            const borrowingsWithFines = borrowings.map(b => {
                const dueDate = new Date(b.dueDate);
                const today = new Date();
                const daysOverdue = Math.ceil((today - dueDate) / (1000 * 60 * 60 * 24));
                const currentFine = daysOverdue * (b.libraryId?.finePerDay || 0);

                return {
                    ...b,
                    daysOverdue,
                    currentFine
                };
            });

            return { borrowings: borrowingsWithFines };
        } catch (error) {
            throw new ApiError(500, 'Error fetching overdue books: ' + error.message);
        }
    }

    async getBorrowingHistory(borrowerId, options = {}) {
        try {
            const { pagination, filters = {} } = options;
            const query = {
                borrowerId,
                deletedAt: null,
                ...filters
            };

            const page = parseInt(pagination?.page) || 1;
            const limit = parseInt(pagination?.limit) || 10;
            const skip = (page - 1) * limit;

            const [history, total] = await Promise.all([
                BookTakenHistory.find(query)
                    .populate('bookId', 'title author isbn category')
                    .populate('copyId', 'copyNumber')
                    .populate('libraryId', 'name code')
                    .sort({ borrowDate: -1 })
                    .skip(skip)
                    .limit(limit)
                    .lean(),
                BookTakenHistory.countDocuments(query),
            ]);

            return {
                history,
                pagination: {
                    page,
                    limit,
                    total,
                    pages: Math.ceil(total / limit),
                },
            };
        } catch (error) {
            throw new ApiError(500, 'Error fetching borrowing history: ' + error.message);
        }
    }

    async updateBorrowingStatus(id, data) {
        try {
            const borrowing = await BookTakenHistory.findById(id);
            if (!borrowing) throw new ApiError(404, 'Borrowing record not found');

            Object.assign(borrowing, data);
            await borrowing.save();
            return borrowing.toJSON();
        } catch (error) {
            throw error instanceof ApiError ? error : new ApiError(500, 'Error updating borrowing: ' + error.message);
        }
    }

    async getAllBorrowings(options = {}) {
        try {
            const { pagination, search, filters = {} } = options;
            const query = { deletedAt: null, ...filters };

            const page = parseInt(pagination?.page) || 1;
            const limit = parseInt(pagination?.limit) || 10;
            const skip = (page - 1) * limit;

            const [borrowings, total] = await Promise.all([
                BookTakenHistory.find(query)
                    .populate('bookId', 'title author isbn')
                    .populate('copyId', 'copyNumber')
                    .populate('libraryId', 'name code')
                    .sort({ borrowDate: -1 })
                    .skip(skip)
                    .limit(limit)
                    .lean(),
                BookTakenHistory.countDocuments(query),
            ]);

            return {
                borrowings,
                pagination: {
                    page,
                    limit,
                    total,
                    pages: Math.ceil(total / limit),
                },
            };
        } catch (error) {
            throw new ApiError(500, 'Error fetching all borrowings: ' + error.message);
        }
    }

    async checkAndUpdateOverdueBooks() {
        try {
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            // Find all borrowed books that are past due date
            const result = await BookTakenHistory.updateMany(
                {
                    status: 'borrowed',
                    dueDate: { $lt: today },
                    deletedAt: null
                },
                {
                    $set: { status: 'overdue' }
                }
            );

            return {
                message: 'Overdue status updated',
                updatedCount: result.modifiedCount
            };
        } catch (error) {
            throw new ApiError(500, 'Error updating overdue books: ' + error.message);
        }
    }
}

export default new BorrowingService();
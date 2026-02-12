import BookTakenHistory from '../models/BookTakenHistory.js';
import Book from '../models/Book.js';
import BookCopy from '../models/BookCopy.js';
import Library from '../models/Library.js';
import Reservation from '../models/BookReservation.js';
import libraryService from './libraryService.js';
import userServiceClient from '../clients/userServiceClient.js';
import { ApiError } from 'shared';
import { parsePagination, buildPaginationMeta } from '../utils/paginationHelper.js';
import { calcBorrowingDetails, calcOverdueDetails } from '../utils/fineCalculator.js';
import { populateUsers } from '../utils/userPopulator.js';
import { buildSearchFilter } from '../utils/searchHelper.js';

const BORROW_POPULATE = [
    {
        path: 'copyId',
        select: 'copyNumber location condition bookId',
        populate: { path: 'bookId', select: 'title author isbn category' },
    },
    { path: 'libraryId', select: 'name code finePerDay' },
];

class BorrowingService {
    async borrowBook({ userType, borrowerId, copyId, bookId, libraryId, processedById, notes = '', dueDate: customDueDate }, token) {
        try {
            await userServiceClient.validateUser(userType, borrowerId, token);

            let finalCopyId = copyId;
            if (!finalCopyId && bookId) {
                const availableCopy = await BookCopy.findOne({
                    bookId,
                    status: 'available',
                    deletedAt: null,
                });
                if (!availableCopy) throw new ApiError(404, 'No available copies for this book');
                finalCopyId = availableCopy._id;
            }

            const copy = await BookCopy.findOne({ _id: finalCopyId, deletedAt: null }).lean();
            if (!copy) throw new ApiError(404, 'Book copy not found');

            const finalLibraryId = libraryId || copy.libraryId;
            if (!finalLibraryId) throw new ApiError(400, 'Library ID is required and could not be determined from copy');

            if (copy.status !== 'available') {
                if (copy.status === 'reserved') {
                    const reservation = await Reservation.findOne({
                        copyId: copy._id,
                        userId: borrowerId,
                        status: { $in: ['pending', 'fulfilled'] },
                        deletedAt: null,
                    });
                    if (!reservation) {
                        throw new ApiError(400, 'This book copy is reserved for another user');
                    }
                } else {
                    throw new ApiError(400, 'This book copy is not available for borrowing');
                }
            }

            const library = await Library.findOne({ _id: finalLibraryId, deletedAt: null }).lean();
            if (!library) throw new ApiError(404, 'Library not found');

            const activeBorrowings = await BookTakenHistory.countDocuments({
                borrowerId,
                status: { $in: ['borrowed', 'overdue'] },
                deletedAt: null,
            });
            if (activeBorrowings >= library.maxBorrowLimit) {
                throw new ApiError(400, `You have reached the maximum borrow limit of ${library.maxBorrowLimit} books`);
            }

            const overdueWithUnpaidFines = await BookTakenHistory.findOne({
                borrowerId,
                status: 'overdue',
                finePaid: false,
                fineAmount: { $gt: 0 },
                deletedAt: null,
            });
            if (overdueWithUnpaidFines) {
                throw new ApiError(400, 'You have unpaid fines. Please clear them before borrowing new books');
            }

            const borrowDate = new Date();
            const dueDate = customDueDate
                ? new Date(customDueDate)
                : await libraryService.calculateDueDate(finalLibraryId, borrowDate, library.borrowDuration);

            const borrowing = new BookTakenHistory({
                userType,
                borrowerId,
                copyId: copy._id,
                libraryId: finalLibraryId,
                borrowDate,
                dueDate,
                status: 'borrowed',
                fineAmount: 0,
                finePaid: false,
                notes,
                processedById,
            });

            await borrowing.save();
            await BookCopy.updateOne({ _id: copyId }, { $set: { status: 'borrowed' } });

            return borrowing.toJSON();
        } catch (error) {
            if (error.code === 11000 && (error.message.includes('unique_copy_borrowing') || error.message.includes('unique_active_copy_borrowing'))) {
                throw new ApiError(400, 'This book copy is already borrowed');
            }
            throw error instanceof ApiError ? error : new ApiError(500, 'Error borrowing book: ' + error.message);
        }
    }

    async returnBook(borrowingId, processedById, notes = '') {
        try {
            const borrowing = await BookTakenHistory.findOne({ _id: borrowingId, deletedAt: null })
                .populate('copyId')
                .populate('libraryId');

            if (!borrowing) throw new ApiError(404, 'Borrowing record not found');
            if (borrowing.status === 'returned') {
                throw new ApiError(400, 'This book has already been returned');
            }

            const returnDate = new Date();
            const dueDate = new Date(borrowing.dueDate);

            let fineAmount = 0;
            if (returnDate > dueDate) {
                const daysOverdue = Math.ceil((returnDate - dueDate) / (1000 * 60 * 60 * 24));
                fineAmount = daysOverdue * borrowing.libraryId.finePerDay;
            }

            borrowing.returnDate = returnDate;
            borrowing.status = 'returned';
            borrowing.fineAmount = fineAmount;
            borrowing.notes = notes || borrowing.notes;
            if (processedById) borrowing.processedById = processedById;

            await borrowing.save();
            const copyId = borrowing.copyId._id || borrowing.copyId;
            const copy = await BookCopy.findById(copyId);
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
                ...filters,
            };

            const enrichWithDetails = (borrowings) =>
                borrowings.map((b) => ({ ...b, ...calcBorrowingDetails(b) }));

            if (pagination && (pagination.page || pagination.limit)) {
                const { page, limit, skip } = parsePagination(pagination);

                const [borrowings, total] = await Promise.all([
                    BookTakenHistory.find(query)
                        .populate(BORROW_POPULATE)
                        .sort({ borrowDate: -1 })
                        .skip(skip)
                        .limit(limit)
                        .lean(),
                    BookTakenHistory.countDocuments(query),
                ]);

                return {
                    borrowings: enrichWithDetails(borrowings),
                    pagination: buildPaginationMeta(total, page, limit),
                };
            }

            const borrowings = await BookTakenHistory.find(query)
                .populate(BORROW_POPULATE)
                .sort({ borrowDate: -1 })
                .lean();

            return { borrowings: enrichWithDetails(borrowings) };
        } catch (error) {
            throw new ApiError(500, 'Error fetching borrowed books: ' + error.message);
        }
    }

    async getOverdueBooksByUser(borrowerId) {
        try {
            const query = {
                borrowerId,
                status: 'overdue',
                deletedAt: null,
            };

            const borrowings = await BookTakenHistory.find(query)
                .populate(BORROW_POPULATE)
                .sort({ dueDate: 1 })
                .lean();

            const borrowingsWithFines = borrowings.map((b) => ({
                ...b,
                ...calcOverdueDetails(b),
            }));

            return { borrowings: borrowingsWithFines };
        } catch (error) {
            throw new ApiError(500, 'Error fetching overdue books: ' + error.message);
        }
    }

    async getBorrowingHistory(borrowerId, options = {}) {
        try {
            const { pagination, filters = {} } = options;
            const query = { borrowerId, deletedAt: null, ...filters };
            const { page, limit, skip } = parsePagination(pagination);

            const [history, total] = await Promise.all([
                BookTakenHistory.find(query)
                    .populate([
                        {
                            path: 'copyId',
                            select: 'copyNumber bookId',
                            populate: { path: 'bookId', select: 'title author isbn category' },
                        },
                        { path: 'libraryId', select: 'name code' },
                    ])
                    .sort({ borrowDate: -1 })
                    .skip(skip)
                    .limit(limit)
                    .lean(),
                BookTakenHistory.countDocuments(query),
            ]);

            return {
                history,
                pagination: buildPaginationMeta(total, page, limit),
            };
        } catch (error) {
            throw new ApiError(500, 'Error fetching borrowing history: ' + error.message);
        }
    }

    async updateBorrowingStatus(id, data) {
        try {
            const borrowing = await BookTakenHistory.findOne({ _id: id, deletedAt: null });
            if (!borrowing) throw new ApiError(404, 'Borrowing record not found');

            Object.assign(borrowing, data);
            await borrowing.save();
            return borrowing.toJSON();
        } catch (error) {
            throw error instanceof ApiError ? error : new ApiError(500, 'Error updating borrowing: ' + error.message);
        }
    }

    async getBorrowingById(id, token) {
        try {
            const borrowing = await BookTakenHistory.findOne({ _id: id, deletedAt: null })
                .populate(BORROW_POPULATE)
                .lean();

            if (!borrowing) throw new ApiError(404, 'Borrowing record not found');

            const [populated] = await populateUsers([borrowing], 'borrowerId', token);
            return { ...populated, borrower: populated.user };
        } catch (error) {
            throw error instanceof ApiError ? error : new ApiError(500, 'Error fetching borrowing: ' + error.message);
        }
    }

    async getAllBorrowings(options = {}, token) {
        try {
            const { pagination, search, filters = {} } = options;
            const query = { deletedAt: null, ...filters };

            if (search) {
                query.$or = await buildSearchFilter(search, token, {
                    copyField: 'copyId',
                    userField: 'borrowerId',
                });
            }

            const { page, limit, skip } = parsePagination(pagination);

            const [borrowings, total] = await Promise.all([
                BookTakenHistory.find(query)
                    .populate([
                        {
                            path: 'copyId',
                            select: 'copyNumber bookId',
                            populate: { path: 'bookId', select: 'title author isbn' },
                        },
                        { path: 'libraryId', select: 'name code' },
                    ])
                    .sort({ borrowDate: -1 })
                    .skip(skip)
                    .limit(limit)
                    .lean(),
                BookTakenHistory.countDocuments(query),
            ]);

            const populatedBorrowings = await populateUsers(borrowings, 'borrowerId', token);
            const withBorrower = populatedBorrowings.map((b) => ({ ...b, borrower: b.user }));

            return {
                borrowings: withBorrower,
                pagination: buildPaginationMeta(total, page, limit),
            };
        } catch (error) {
            throw new ApiError(500, 'Error fetching all borrowings: ' + error.message);
        }
    }

    async checkAndUpdateOverdueBooks() {
        try {
            const now = new Date();
            const result = await BookTakenHistory.updateMany(
                {
                    status: 'borrowed',
                    dueDate: { $lt: now },
                    deletedAt: null,
                },
                { $set: { status: 'overdue' } }
            );

            return {
                message: 'Overdue status updated',
                updatedCount: result.modifiedCount,
            };
        } catch (error) {
            throw new ApiError(500, 'Error updating overdue books: ' + error.message);
        }
    }
}

export default new BorrowingService();
import BookTakenHistory from '../models/BookTakenHistory.js';
import BookCopy from '../models/BookCopy.js';
import Library from '../models/Library.js';
import Reservation from '../models/BookReservation.js';
import userServiceClient from '../clients/userServiceClient.js';
import academicServiceClient from '../clients/academicServiceClient.js';
import { ApiError } from 'shared';

class BorrowingService {
    async borrowBook({ userType, borrowerId, copyId, libraryId, processedById, notes = '' }, token) {
        try {
            await userServiceClient.validateUser(userType, borrowerId, token);
            const copy = await BookCopy.findOne({ _id: copyId, deletedAt: null }).lean();

            if (!copy) throw new ApiError(404, 'Book copy not found');
            if (copy.status !== 'available') {
                // Check if it is reserved for this user
                if (copy.status === 'reserved') {
                    const reservation = await Reservation.findOne({
                        copyId: copy._id,
                        userId: borrowerId,
                        status: { $in: ['pending', 'fulfilled'] },
                        deletedAt: null
                    });

                    if (!reservation) {
                        throw new ApiError(400, 'This book copy is reserved for another user');
                    }
                } else {
                    throw new ApiError(400, 'This book copy is not available for borrowing');
                }
            }

            const library = await Library.findOne({ _id: libraryId, deletedAt: null }).lean();
            if (!library) throw new ApiError(404, 'Library not found');

            const activeBorrowings = await BookTakenHistory.countDocuments({
                borrowerId,
                status: { $in: ['borrowed', 'overdue'] },
                deletedAt: null
            });
            if (activeBorrowings >= library.maxBorrowLimit) {
                throw new ApiError(400, `You have reached the maximum borrow limit of ${library.maxBorrowLimit} books`);
            }

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

            const borrowDate = new Date();
            const dueDate = new Date(borrowDate);
            dueDate.setDate(dueDate.getDate() + library.borrowDuration);

            const borrowing = new BookTakenHistory({
                userType,
                borrowerId,
                copyId: copy._id,
                libraryId: library._id,
                borrowDate,
                dueDate,
                status: 'borrowed',
                fineAmount: 0,
                finePaid: false,
                notes,
                processedById
            });

            await borrowing.save();
            await BookCopy.updateOne(
                { _id: copyId },
                { $set: { status: 'borrowed' } }
            );

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
                ...filters
            };

            if (pagination && (pagination.page || pagination.limit)) {
                const page = parseInt(pagination.page) || 1;
                const limit = parseInt(pagination.limit) || 10;
                const skip = (page - 1) * limit;

                const [borrowings, total] = await Promise.all([
                    BookTakenHistory.find(query)
                        .populate({
                            path: 'copyId',
                            select: 'copyNumber location condition bookId',
                            populate: {
                                path: 'bookId',
                                select: 'title author isbn category'
                            }
                        })
                        .populate('libraryId', 'name code finePerDay')
                        .sort({ borrowDate: -1 })
                        .skip(skip)
                        .limit(limit)
                        .lean(),
                    BookTakenHistory.countDocuments(query),
                ]);

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
                .populate({
                    path: 'copyId',
                    select: 'copyNumber location condition bookId',
                    populate: {
                        path: 'bookId',
                        select: 'title author isbn category'
                    }
                })
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
                .populate({
                    path: 'copyId',
                    select: 'copyNumber location bookId',
                    populate: {
                        path: 'bookId',
                        select: 'title author isbn category'
                    }
                })
                .populate('libraryId', 'name code finePerDay')
                .sort({ dueDate: 1 })
                .lean();

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
                    .populate({
                        path: 'copyId',
                        select: 'copyNumber bookId',
                        populate: {
                            path: 'bookId',
                            select: 'title author isbn category'
                        }
                    })
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
            const borrowing = await BookTakenHistory.findOne({ _id: id, deletedAt: null });
            if (!borrowing) throw new ApiError(404, 'Borrowing record not found');

            Object.assign(borrowing, data);
            await borrowing.save();
            return borrowing.toJSON();
        } catch (error) {
            throw error instanceof ApiError ? error : new ApiError(500, 'Error updating borrowing: ' + error.message);
        }
    }

    async getAllBorrowings(options = {}, token) {
        try {
            const { pagination, search, filters = {} } = options;
            const query = { deletedAt: null, ...filters };

            const page = parseInt(pagination?.page) || 1;
            const limit = parseInt(pagination?.limit) || 10;
            const skip = (page - 1) * limit;

            const [borrowings, total] = await Promise.all([
                BookTakenHistory.find(query)
                    .populate({
                        path: 'copyId',
                        select: 'copyNumber bookId',
                        populate: {
                            path: 'bookId',
                            select: 'title author isbn'
                        }
                    })
                    .populate('libraryId', 'name code')
                    .sort({ borrowDate: -1 })
                    .skip(skip)
                    .limit(limit)
                    .lean(),
                BookTakenHistory.countDocuments(query),
            ]);

            const populatedBorrowings = await this.populateBorrowerDetails(borrowings, token);

            return {
                borrowings: populatedBorrowings,
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

    async populateBorrowerDetails(borrowings, token) {
        return await Promise.all(borrowings.map(async (borrowing) => {
            try {
                const user = await userServiceClient.validateUser(borrowing.userType, borrowing.borrowerId, token);
                let departmentName = null;

                if (user.departmentId) {
                    try {
                        const dept = await academicServiceClient.getDepartmentById(user.departmentId);
                        departmentName = dept.data?.name || dept.name;
                    } catch (err) {
                        // Ignore department fetch error
                    }
                }

                return {
                    ...borrowing,
                    borrower: {
                        id: user.id || user._id,
                        fullName: user.fullName,
                        email: user.email,
                        departmentId: user.departmentId,
                        departmentName,
                        registrationNumber: user.registrationNumber
                    }
                };
            } catch (error) {
                return {
                    ...borrowing,
                    borrower: {
                        id: borrowing.borrowerId,
                        fullName: 'Unknown User',
                        error: 'Failed to fetch user details'
                    }
                };
            }
        }));
    }

    async checkAndUpdateOverdueBooks() {
        try {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
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
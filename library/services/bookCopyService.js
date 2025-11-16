import BookCopy from '../models/BookCopy.js';
import Book from '../models/Book.js';
import Library from '../models/Library.js';
import { ApiError } from '../utils/ApiResponser.js';

class BookCopyService {
    async getAll(options = {}) {
        try {
            const { pagination, search, filters = {} } = options;
            const query = { deletedAt: null };

            if (search) {
                query.$or = [
                    { copyNumber: { $regex: search, $options: 'i' } },
                    { location: { $regex: search, $options: 'i' } },
                ];
            }

            Object.assign(query, filters);

            if (pagination && (pagination.page || pagination.limit)) {
                const page = parseInt(pagination.page) || 1;
                const limit = parseInt(pagination.limit) || 10;
                const skip = (page - 1) * limit;

                const [copies, total] = await Promise.all([
                    BookCopy.find(query)
                        .populate('bookId', 'title author isbn')
                        .populate('libraryId', 'name code')
                        .sort({ createdAt: -1 })
                        .skip(skip)
                        .limit(limit)
                        .lean(),
                    BookCopy.countDocuments(query),
                ]);

                return {
                    copies,
                    pagination: {
                        page,
                        limit,
                        total,
                        pages: Math.ceil(total / limit),
                    },
                };
            }

            const copies = await BookCopy.find(query)
                .populate('bookId', 'title author isbn')
                .populate('libraryId', 'name code')
                .sort({ createdAt: -1 })
                .lean();
            return { copies };
        } catch (error) {
            throw new ApiError(500, 'Error fetching book copies: ' + error.message);
        }
    }

    async getById(id) {
        try {
            const copy = await BookCopy.findById(id)
                .populate('bookId', 'title author isbn category')
                .populate('libraryId', 'name code')
                .lean();
            if (!copy) throw new ApiError(404, 'Book copy not found');
            return copy;
        } catch (error) {
            throw error instanceof ApiError ? error : new ApiError(500, 'Error fetching book copy: ' + error.message);
        }
    }

    async create(data) {
        try {
            // Verify book and library exist
            const [book, library] = await Promise.all([
                Book.findById(data.bookId),
                Library.findById(data.libraryId)
            ]);

            if (!book) throw new ApiError(404, 'Book not found');
            if (!library) throw new ApiError(404, 'Library not found');

            const copy = new BookCopy(data);
            await copy.save();
            return copy.toJSON();
        } catch (error) {
            if (error.code === 11000) {
                throw new ApiError(409, 'A copy with this number already exists in this library');
            }
            throw error instanceof ApiError ? error : new ApiError(500, 'Error creating book copy: ' + error.message);
        }
    }

    async update(id, data) {
        try {
            const copy = await BookCopy.findById(id);
            if (!copy) throw new ApiError(404, 'Book copy not found');

            // Verify book and library if being updated
            if (data.bookId && data.bookId !== copy.bookId) {
                const book = await Book.findById(data.bookId);
                if (!book) throw new ApiError(404, 'Book not found');
            }
            if (data.libraryId && data.libraryId !== copy.libraryId) {
                const library = await Library.findById(data.libraryId);
                if (!library) throw new ApiError(404, 'Library not found');
            }

            Object.assign(copy, data);
            await copy.save();
            return copy.toJSON();
        } catch (error) {
            if (error.code === 11000) {
                throw new ApiError(409, 'A copy with this number already exists in this library');
            }
            throw error instanceof ApiError ? error : new ApiError(500, 'Error updating book copy: ' + error.message);
        }
    }

    async delete(id) {
        try {
            const copy = await BookCopy.findById(id);
            if (!copy) throw new ApiError(404, 'Book copy not found');

            // Check if copy is currently borrowed
            if (copy.status === 'borrowed') {
                throw new ApiError(400, 'Cannot delete a borrowed book copy. Please return it first.');
            }

            await copy.softDelete();
            return { message: 'Book copy deleted successfully' };
        } catch (error) {
            throw error instanceof ApiError ? error : new ApiError(500, 'Error deleting book copy: ' + error.message);
        }
    }

    async restore(id) {
        try {
            const copy = await BookCopy.findOne({ _id: id, deletedAt: { $ne: null } });
            if (!copy) throw new ApiError(404, 'Deleted book copy not found');

            await copy.restore();
            return copy.toJSON();
        } catch (error) {
            throw error instanceof ApiError ? error : new ApiError(500, 'Error restoring book copy: ' + error.message);
        }
    }

    async getAvailableCopiesByBook(bookId) {
        try {
            const copies = await BookCopy.find({
                bookId,
                status: 'available',
                deletedAt: null
            })
                .populate('libraryId', 'name code')
                .lean();
            
            return { copies, count: copies.length };
        } catch (error) {
            throw new ApiError(500, 'Error fetching available copies: ' + error.message);
        }
    }
}

export default new BookCopyService();

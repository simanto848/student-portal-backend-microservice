import Book from '../models/Book.js';
import BookCopy from '../models/BookCopy.js';
import BookReservation from '../models/BookReservation.js';
import Library from '../models/Library.js';
import { ApiError } from 'shared';
import { parsePagination, buildPaginationMeta } from '../utils/paginationHelper.js';

class BookService {
    async getAll(options = {}) {
        try {
            const { pagination, search, filters = {} } = options;
            const query = { deletedAt: null };

            if (search) {
                query.$or = [
                    { title: { $regex: search, $options: 'i' } },
                    { author: { $regex: search, $options: 'i' } },
                    { isbn: { $regex: search, $options: 'i' } },
                    { category: { $regex: search, $options: 'i' } },
                    { subject: { $regex: search, $options: 'i' } },
                ];
            }

            Object.assign(query, filters);

            if (pagination && (pagination.page || pagination.limit)) {
                const { page, limit, skip } = parsePagination(pagination);

                const [books, total] = await Promise.all([
                    Book.find(query).populate('libraryId', 'name code').sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
                    Book.countDocuments(query),
                ]);

                return {
                    books,
                    pagination: buildPaginationMeta(total, page, limit),
                };
            }

            const books = await Book.find(query).populate('libraryId', 'name code').sort({ createdAt: -1 }).lean();
            return { books };
        } catch (error) {
            throw new ApiError(500, 'Error fetching books: ' + error.message);
        }
    }

    async getById(id) {
        try {
            const book = await Book.findById(id).populate('libraryId', 'name code').lean();
            if (!book) throw new ApiError(404, 'Book not found');

            const availableCopies = await BookCopy.countDocuments({
                bookId: id,
                status: 'available',
                deletedAt: null,
            });

            return { ...book, availableCopies };
        } catch (error) {
            throw error instanceof ApiError ? error : new ApiError(500, 'Error fetching book: ' + error.message);
        }
    }

    async create(data) {
        try {
            const { numberOfCopies = 0, copyCondition = 'excellent', copyLocation = '', ...bookData } = data;

            const library = await Library.findById(bookData.libraryId);
            if (!library) throw new ApiError(404, 'Library not found');

            const book = new Book(bookData);
            await book.save();

            if (numberOfCopies > 0) {
                await this.generateBulkCopies(book, library, numberOfCopies, copyCondition, copyLocation);
            }

            return book.toJSON();
        } catch (error) {
            if (error.code === 11000) {
                if (error.message.includes('isbn')) {
                    throw new ApiError(409, 'A book with this ISBN already exists');
                }
                throw new ApiError(409, 'A book with this title and author already exists in this library');
            }
            throw error instanceof ApiError ? error : new ApiError(500, 'Error creating book: ' + error.message);
        }
    }

    async generateCopies(bookId, numberOfCopies, condition = 'excellent', location = '') {
        try {
            const book = await Book.findById(bookId);
            if (!book) throw new ApiError(404, 'Book not found');

            const library = await Library.findById(book.libraryId);
            if (!library) throw new ApiError(404, 'Library not found');

            const generatedCopies = await this.generateBulkCopies(book, library, numberOfCopies, condition, location);
            return { message: `${generatedCopies.length} copies generated successfully`, copies: generatedCopies };
        } catch (error) {
            throw error instanceof ApiError ? error : new ApiError(500, 'Error generating copies: ' + error.message);
        }
    }

    async generateBulkCopies(book, library, count, condition = 'excellent', location = '') {
        const prefix = library.code || 'LIB';
        const identifier = book.isbn || book.title.substring(0, 3).toUpperCase();

        const existingNumbers = new Set(
            await BookCopy.find({ libraryId: library._id }).distinct('copyNumber')
        );

        const existingCopiesCount = await BookCopy.countDocuments({ bookId: book._id, libraryId: library._id });

        const copies = [];
        let offset = existingCopiesCount;

        for (let i = 1; i <= count; i++) {
            offset++;
            let copyNumber = `${prefix}-${identifier}-${offset}`;

            // Check collision in-memory
            while (existingNumbers.has(copyNumber)) {
                offset++;
                copyNumber = `${prefix}-${identifier}-${offset}`;
            }

            existingNumbers.add(copyNumber);
            copies.push({
                copyNumber,
                bookId: book._id,
                libraryId: library._id,
                status: 'available',
                condition,
                location,
                acquisitionDate: new Date(),
            });
        }

        return await BookCopy.insertMany(copies);
    }

    async update(id, data) {
        try {
            const book = await Book.findById(id);
            if (!book) throw new ApiError(404, 'Book not found');

            if (data.libraryId && data.libraryId !== book.libraryId) {
                const library = await Library.findById(data.libraryId);
                if (!library) throw new ApiError(404, 'Library not found');
            }

            Object.assign(book, data);
            await book.save();
            return book.toJSON();
        } catch (error) {
            if (error.code === 11000) {
                if (error.message.includes('isbn')) {
                    throw new ApiError(409, 'A book with this ISBN already exists');
                }
                throw new ApiError(409, 'A book with this title and author already exists in this library');
            }
            throw error instanceof ApiError ? error : new ApiError(500, 'Error updating book: ' + error.message);
        }
    }

    async delete(id) {
        try {
            const book = await Book.findById(id);
            if (!book) throw new ApiError(404, 'Book not found');

            await book.softDelete();
            return { message: 'Book deleted successfully' };
        } catch (error) {
            throw error instanceof ApiError ? error : new ApiError(500, 'Error deleting book: ' + error.message);
        }
    }

    async restore(id) {
        try {
            const book = await Book.findOne({ _id: id, deletedAt: { $ne: null } });
            if (!book) throw new ApiError(404, 'Deleted book not found');

            await book.restore();
            return book.toJSON();
        } catch (error) {
            throw error instanceof ApiError ? error : new ApiError(500, 'Error restoring book: ' + error.message);
        }
    }

    async getAvailableBooks(options = {}) {
        try {
            const { pagination, search, filters = {} } = options;
            const query = { deletedAt: null, status: 'active' };

            if (search) {
                query.$or = [
                    { title: { $regex: search, $options: 'i' } },
                    { author: { $regex: search, $options: 'i' } },
                    { category: { $regex: search, $options: 'i' } },
                    { subject: { $regex: search, $options: 'i' } },
                ];
            }

            Object.assign(query, filters);

            const { page, limit, skip } = parsePagination(pagination);

            const [books, total] = await Promise.all([
                Book.find(query)
                    .populate('libraryId', 'name code')
                    .sort({ createdAt: -1 })
                    .skip(skip)
                    .limit(limit)
                    .lean(),
                Book.countDocuments(query),
            ]);

            const bookIds = books.map((b) => b._id);
            const availabilityCounts = await BookCopy.aggregate([
                { $match: { bookId: { $in: bookIds }, status: 'available', deletedAt: null } },
                { $group: { _id: '$bookId', count: { $sum: 1 } } },
            ]);

            const availMap = new Map();
            for (const a of availabilityCounts) {
                availMap.set(String(a._id), a.count);
            }

            const booksWithAvailability = books.map((book) => ({
                ...book,
                availableCopies: availMap.get(String(book._id)) || 0,
            }));

            return {
                books: booksWithAvailability,
                pagination: buildPaginationMeta(total, page, limit),
            };
        } catch (error) {
            throw new ApiError(500, 'Error fetching available books: ' + error.message);
        }
    }

    async getBookStats(id) {
        try {
            const [totalCopies, availableCopies, reservationCount] = await Promise.all([
                BookCopy.countDocuments({ bookId: id, deletedAt: null }),
                BookCopy.countDocuments({ bookId: id, status: 'available', deletedAt: null }),
                BookReservation.countDocuments({
                    copyId: { $in: await BookCopy.find({ bookId: id, deletedAt: null }).distinct('_id') },
                    status: 'pending',
                    deletedAt: null,
                }),
            ]);
            return { totalCopies, availableCopies, reservationCount };
        } catch (error) {
            throw new ApiError(500, 'Error fetching book stats: ' + error.message);
        }
    }
}

export default new BookService();
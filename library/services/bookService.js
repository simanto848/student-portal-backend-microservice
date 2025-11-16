import Book from '../models/Book.js';
import BookCopy from '../models/BookCopy.js';
import Library from '../models/Library.js';
import { ApiError } from '../utils/ApiResponser.js';

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
                const page = parseInt(pagination.page) || 1;
                const limit = parseInt(pagination.limit) || 10;
                const skip = (page - 1) * limit;

                const [books, total] = await Promise.all([
                    Book.find(query).populate('libraryId', 'name code').sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
                    Book.countDocuments(query),
                ]);

                return {
                    books,
                    pagination: {
                        page,
                        limit,
                        total,
                        pages: Math.ceil(total / limit),
                    },
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
            
            // Get available copies count
            const availableCopies = await BookCopy.countDocuments({
                bookId: id,
                status: 'available',
                deletedAt: null
            });
            
            return { ...book, availableCopies };
        } catch (error) {
            throw error instanceof ApiError ? error : new ApiError(500, 'Error fetching book: ' + error.message);
        }
    }

    async create(data) {
        try {
            // Verify library exists
            const library = await Library.findById(data.libraryId);
            if (!library) throw new ApiError(404, 'Library not found');

            const book = new Book(data);
            await book.save();
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

    async update(id, data) {
        try {
            const book = await Book.findById(id);
            if (!book) throw new ApiError(404, 'Book not found');

            // If libraryId is being updated, verify it exists
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

            const page = parseInt(pagination?.page) || 1;
            const limit = parseInt(pagination?.limit) || 10;
            const skip = (page - 1) * limit;

            const books = await Book.find(query)
                .populate('libraryId', 'name code')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean();

            // For each book, get available copies count
            const booksWithAvailability = await Promise.all(
                books.map(async (book) => {
                    const availableCopies = await BookCopy.countDocuments({
                        bookId: book.id || book._id,
                        status: 'available',
                        deletedAt: null
                    });
                    return { ...book, availableCopies };
                })
            );

            const total = await Book.countDocuments(query);

            return {
                books: booksWithAvailability,
                pagination: {
                    page,
                    limit,
                    total,
                    pages: Math.ceil(total / limit),
                },
            };
        } catch (error) {
            throw new ApiError(500, 'Error fetching available books: ' + error.message);
        }
    }
}

export default new BookService();

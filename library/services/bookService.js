import Book from '../models/Book.js';
import BookCopy from '../models/BookCopy.js';
import BookReservation from '../models/BookReservation.js';
import Library from '../models/Library.js';
import { ApiError } from 'shared';

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
            const { numberOfCopies = 0, copyCondition = 'excellent', copyLocation = '', ...bookData } = data;

            // Verify library exists
            const library = await Library.findById(bookData.libraryId);
            if (!library) throw new ApiError(404, 'Library not found');

            const book = new Book(bookData);
            await book.save();

            // Automatically generate copies if requested
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
        const copies = [];
        // Get the current highest index for this book in this library to continue numbering
        const existingCopiesCount = await BookCopy.countDocuments({ bookId: book._id, libraryId: library._id });

        for (let i = 1; i <= count; i++) {
            const copyIndex = existingCopiesCount + i;
            const copyNumber = await this.generateCopyNumber(book, library, copyIndex);
            copies.push({
                copyNumber,
                bookId: book._id,
                libraryId: library._id,
                status: 'available',
                condition: condition,
                location: location,
                acquisitionDate: new Date(),
            });
        }
        return await BookCopy.insertMany(copies);
    }

    async generateCopyNumber(book, library, index) {
        const prefix = library.code || 'LIB';
        const identifier = book.isbn || book.title.substring(0, 3).toUpperCase();
        let copyNumber = `${prefix}-${identifier}-${index}`;

        // Check if copy number already exists (in case of overlaps or existing records)
        let exists = await BookCopy.findOne({ copyNumber, libraryId: library._id });
        let offset = index;
        while (exists) {
            offset++;
            copyNumber = `${prefix}-${identifier}-${offset}`;
            exists = await BookCopy.findOne({ copyNumber, libraryId: library._id });
        }

        return copyNumber;
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

    async getBookStats(id) {
        try {
            const [totalCopies, availableCopies, reservationCount] = await Promise.all([
                BookCopy.countDocuments({ bookId: id, deletedAt: null }),
                BookCopy.countDocuments({ bookId: id, status: 'available', deletedAt: null }),
                BookReservation.countDocuments({
                    copyId: { $in: await BookCopy.find({ bookId: id, deletedAt: null }).distinct('_id') },
                    status: 'pending',
                    deletedAt: null
                })
            ]);
            return { totalCopies, availableCopies, reservationCount };
        } catch (error) {
            throw new ApiError(500, 'Error fetching book stats: ' + error.message);
        }
    }
}

export default new BookService();
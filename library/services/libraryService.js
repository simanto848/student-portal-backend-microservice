import Library from '../models/Library.js';
import { ApiError } from '../utils/ApiResponser.js';

class LibraryService {
    async getAll(options = {}) {
        try {
            const { pagination, search, filters = {} } = options;
            const query = { deletedAt: null };

            if (search) {
                query.$or = [
                    { name: { $regex: search, $options: 'i' } },
                    { code: { $regex: search, $options: 'i' } },
                    { email: { $regex: search, $options: 'i' } },
                ];
            }

            Object.assign(query, filters);

            if (pagination && (pagination.page || pagination.limit)) {
                const page = parseInt(pagination.page) || 1;
                const limit = parseInt(pagination.limit) || 10;
                const skip = (page - 1) * limit;

                const [libraries, total] = await Promise.all([
                    Library.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
                    Library.countDocuments(query),
                ]);

                return {
                    libraries,
                    pagination: {
                        page,
                        limit,
                        total,
                        pages: Math.ceil(total / limit),
                    },
                };
            }

            const libraries = await Library.find(query).sort({ createdAt: -1 }).lean();
            return { libraries };
        } catch (error) {
            throw new ApiError(500, 'Error fetching libraries: ' + error.message);
        }
    }

    async getById(id) {
        try {
            const library = await Library.findOne({ _id: id, deletedAt: null }).lean();
            if (!library) throw new ApiError(404, 'Library not found');
            return library;
        } catch (error) {
            throw error instanceof ApiError ? error : new ApiError(500, 'Error fetching library: ' + error.message);
        }
    }

    async create(data) {
        try {
            const existingLibrary = await Library.findOne({
                code: data.code.toUpperCase(),
                deletedAt: null
            });

            if (existingLibrary) {
                throw new ApiError(409, 'A library with this code already exists');
            }

            const library = new Library(data);
            await library.save();
            return library.toJSON();
        } catch (error) {
            if (error.code === 11000) {
                throw new ApiError(409, 'A library with this code already exists');
            }
            throw error instanceof ApiError ? error : new ApiError(500, 'Error creating library: ' + error.message);
        }
    }

    async update(id, data) {
        try {
            const library = await Library.findOne({ _id: id, deletedAt: null });
            if (!library) throw new ApiError(404, 'Library not found');

            if (data.code && data.code.toUpperCase() !== library.code) {
                const existingLibrary = await Library.findOne({
                    code: data.code.toUpperCase(),
                    deletedAt: null,
                    _id: { $ne: id }
                });

                if (existingLibrary) {
                    throw new ApiError(409, 'A library with this code already exists');
                }
            }

            Object.assign(library, data);
            await library.save();
            return library.toJSON();
        } catch (error) {
            if (error.code === 11000) {
                throw new ApiError(409, 'A library with this code already exists');
            }
            throw error instanceof ApiError ? error : new ApiError(500, 'Error updating library: ' + error.message);
        }
    }

    async delete(id) {
        try {
            const library = await Library.findOne({ _id: id, deletedAt: null });
            if (!library) throw new ApiError(404, 'Library not found');

            await library.softDelete();
            return { message: 'Library deleted successfully' };
        } catch (error) {
            throw error instanceof ApiError ? error : new ApiError(500, 'Error deleting library: ' + error.message);
        }
    }

    async restore(id) {
        try {
            const library = await Library.findOne({ _id: id, deletedAt: { $ne: null } });
            if (!library) throw new ApiError(404, 'Deleted library not found');

            await library.restore();
            return library.toJSON();
        } catch (error) {
            throw error instanceof ApiError ? error : new ApiError(500, 'Error restoring library: ' + error.message);
        }
    }
}

export default new LibraryService();
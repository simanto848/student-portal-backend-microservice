import Library from '../models/Library.js';
import { ApiError } from 'shared';

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

    /**
     * Calculates the due date based on borrow duration and library operating hours.
     * If the target due date falls on an off day, it moves it to the next available working day.
     * 
     * @param {string} libraryId 
     * @param {Date} startDate 
     * @param {number} durationInDays 
     * @returns {Promise<Date>}
     */
    async calculateDueDate(libraryId, startDate, durationInDays) {
        const library = await Library.findById(libraryId).lean();
        if (!library) throw new ApiError(404, 'Library not found');

        let dueDate = new Date(startDate);
        dueDate.setDate(dueDate.getDate() + durationInDays);

        // Utility to get day config
        const getDayConfig = (date) => {
            const dayName = new Intl.DateTimeFormat('en-US', { weekday: 'long' }).format(date).toLowerCase();
            return library.operatingHours?.[dayName];
        };

        const maxIterations = 30;
        let iterations = 0;

        while (iterations < maxIterations) {
            const dayConfig = getDayConfig(dueDate);

            // 1. Check if the day is closed
            if (library.operatingHours && Object.keys(library.operatingHours).length > 0 && dayConfig && dayConfig.isOpen === false) {
                dueDate.setDate(dueDate.getDate() + 1);
                dueDate.setHours(0, 0, 0, 0); // Reset time when moving to next day
                iterations++;
                continue;
            }

            // 2. Check if the time is "off-time"
            // If the library has closing hours and we are past them
            if (dayConfig && dayConfig.close) {
                const [closeHours, closeMinutes] = dayConfig.close.split(':').map(Number);
                const closeTime = new Date(dueDate);
                closeTime.setHours(closeHours, closeMinutes, 0, 0);

                if (dueDate > closeTime) {
                    // We are past closing time, so give extra day
                    dueDate.setDate(dueDate.getDate() + 1);
                    dueDate.setHours(0, 0, 0, 0); // Reset time to start of next day and re-evaluate
                    iterations++;
                    continue;
                }
            }

            // If we are here, the day is open and we are not past closing time
            break;
        }

        // Finalize the time to the library's closing time on the finalized due date
        const finalDayConfig = getDayConfig(dueDate);
        if (finalDayConfig && finalDayConfig.close) {
            const [hours, minutes] = finalDayConfig.close.split(':').map(Number);
            dueDate.setHours(hours, minutes, 0, 0);
        } else {
            dueDate.setHours(23, 59, 59, 999);
        }

        return dueDate;
    }
}

export default new LibraryService();
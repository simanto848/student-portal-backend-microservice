import BookReservation from '../models/BookReservation.js';
import BookCopy from '../models/BookCopy.js';
import Library from '../models/Library.js';
import userServiceClient from '../clients/userServiceClient.js';
import { ApiError } from 'shared';
import { parsePagination, buildPaginationMeta } from '../utils/paginationHelper.js';
import { populateUsers } from '../utils/userPopulator.js';
import { buildSearchFilter } from '../utils/searchHelper.js';

const RESERVATION_POPULATE = [
    {
        path: 'copyId',
        select: 'copyNumber location condition bookId',
        populate: { path: 'bookId', select: 'title author isbn category' },
    },
    { path: 'libraryId', select: 'name code' },
];

class ReservationService {
    async createReservation({ userType, userId, copyId, libraryId, notes = '' }, token) {
        try {
            await userServiceClient.validateUser(userType, userId, token);
            const copy = await BookCopy.findOne({ _id: copyId, deletedAt: null }).lean();
            if (!copy) throw new ApiError(404, 'Book copy not found');
            if (copy.status !== 'available') {
                throw new ApiError(400, 'This book copy is not available for reservation');
            }

            const library = await Library.findOne({ _id: libraryId, deletedAt: null }).lean();
            if (!library) throw new ApiError(404, 'Library not found');

            const bookCopies = await BookCopy.find({ bookId: copy.bookId, deletedAt: null }).select('_id').lean();
            const copyIds = bookCopies.map((c) => c._id);

            const existingReservation = await BookReservation.findOne({
                userId,
                copyId: { $in: copyIds },
                status: 'pending',
                deletedAt: null,
            });

            if (existingReservation) {
                throw new ApiError(400, 'You already have an active reservation for this book');
            }

            const activeReservations = await BookReservation.countDocuments({
                userId,
                status: 'pending',
                deletedAt: null,
            });
            if (activeReservations >= library.maxBorrowLimit) {
                throw new ApiError(400, `You have reached the maximum reservation limit of ${library.maxBorrowLimit} books`);
            }

            const expiryDate = this._calculateExpiryDate(library);

            const reservation = new BookReservation({
                userType,
                userId,
                copyId: copy._id,
                libraryId: library._id,
                reservationDate: new Date(),
                expiryDate,
                status: 'pending',
                notes,
            });

            await reservation.save();
            await BookCopy.updateOne({ _id: copyId }, { $set: { status: 'reserved' } });
            return reservation.toJSON();
        } catch (error) {
            if (error.code === 11000 && error.message.includes('unique_active_reservation')) {
                throw new ApiError(400, 'This book copy is already reserved by another user');
            }
            throw error instanceof ApiError ? error : new ApiError(500, 'Error creating reservation: ' + error.message);
        }
    }

    _calculateExpiryDate(library) {
        const reservationDate = new Date();
        const reservationHoldDays = library.reservationHoldDays || 2;
        const operatingHours = library.operatingHours || {};
        const daysMap = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

        if (Object.keys(operatingHours).length === 0) {
            const d = new Date(reservationDate);
            d.setDate(d.getDate() + reservationHoldDays);
            return d;
        }

        let expiryDate = new Date(reservationDate);
        let operationalDaysCounted = 0;
        let daysAdded = 0;
        const MAX_LOOKAHEAD = 30;

        while (operationalDaysCounted < reservationHoldDays && daysAdded < MAX_LOOKAHEAD) {
            daysAdded++;
            const checkDate = new Date(reservationDate);
            checkDate.setDate(reservationDate.getDate() + daysAdded);

            const dayName = daysMap[checkDate.getDay()];
            const dayConfig = operatingHours[dayName];
            const isOpen = dayConfig ? dayConfig.isOpen : false;

            if (isOpen) {
                operationalDaysCounted++;
                expiryDate = new Date(checkDate);

                if (dayConfig.close) {
                    const [hours, minutes] = dayConfig.close.split(':').map(Number);
                    expiryDate.setHours(hours, minutes, 0, 0);
                } else {
                    expiryDate.setHours(23, 59, 59, 999);
                }
            }
        }

        if (operationalDaysCounted < reservationHoldDays) {
            expiryDate = new Date(reservationDate);
            expiryDate.setDate(expiryDate.getDate() + reservationHoldDays);
        }

        return expiryDate;
    }

    async cancelReservation(reservationId, userId, notes = '') {
        try {
            const reservation = await BookReservation.findOne({
                _id: reservationId,
                userId,
                deletedAt: null,
            });

            if (!reservation) throw new ApiError(404, 'Reservation not found');
            if (reservation.status !== 'pending') {
                throw new ApiError(400, 'Only pending reservations can be cancelled');
            }

            reservation.status = 'cancelled';
            if (notes) reservation.notes = notes;
            await reservation.save();

            const copy = await BookCopy.findById(reservation.copyId);
            if (copy && copy.status === 'reserved') {
                copy.status = 'available';
                await copy.save();
            }

            return reservation.toJSON();
        } catch (error) {
            throw error instanceof ApiError ? error : new ApiError(500, 'Error cancelling reservation: ' + error.message);
        }
    }

    async fulfillReservation(reservationId, pickupById, notes = '') {
        try {
            const reservation = await BookReservation.findOne({
                _id: reservationId,
                deletedAt: null,
            }).populate('copyId').populate('libraryId');

            if (!reservation) throw new ApiError(404, 'Reservation not found');
            if (reservation.status !== 'pending') {
                throw new ApiError(400, 'Only pending reservations can be fulfilled');
            }

            if (new Date() > new Date(reservation.expiryDate)) {
                reservation.status = 'expired';
                await reservation.save();

                const copyId = reservation.copyId._id || reservation.copyId;
                const copy = await BookCopy.findById(copyId);
                if (copy) {
                    copy.status = 'available';
                    await copy.save();
                }

                throw new ApiError(400, 'This reservation has expired');
            }

            reservation.status = 'fulfilled';
            reservation.fulfilledAt = new Date();
            reservation.pickupById = pickupById;
            if (notes) reservation.notes = notes;
            await reservation.save();

            return reservation.toJSON();
        } catch (error) {
            throw error instanceof ApiError ? error : new ApiError(500, 'Error fulfilling reservation: ' + error.message);
        }
    }

    async getMyReservations(userId, options = {}) {
        try {
            await this.checkAndExpireReservations();
            const { pagination, filters = {} } = options;
            const query = { userId, deletedAt: null, ...filters };
            const { page, limit, skip } = parsePagination(pagination);

            const [reservations, total] = await Promise.all([
                BookReservation.find(query)
                    .populate(RESERVATION_POPULATE)
                    .sort({ reservationDate: -1 })
                    .skip(skip)
                    .limit(limit)
                    .lean(),
                BookReservation.countDocuments(query),
            ]);

            const reservationsWithDetails = reservations.map((r) => {
                const expiryDate = new Date(r.expiryDate);
                const now = new Date();
                const hoursUntilExpiry = Math.ceil((expiryDate - now) / (1000 * 60 * 60));
                const isExpired = now > expiryDate;

                let copy = null;
                if (r.copyId && typeof r.copyId === 'object') {
                    let book = null;
                    if (r.copyId.bookId && typeof r.copyId.bookId === 'object') {
                        book = { ...r.copyId.bookId, id: r.copyId.bookId._id.toString() };
                    }
                    copy = {
                        ...r.copyId,
                        id: r.copyId._id.toString(),
                        book,
                        bookId: book ? book.id : r.copyId.bookId,
                    };
                }

                return {
                    ...r,
                    id: r._id.toString(),
                    copy,
                    copyId: copy ? copy.id : r.copyId,
                    hoursUntilExpiry,
                    isExpired,
                    canCancel: r.status === 'pending' && !isExpired,
                };
            });

            return {
                reservations: reservationsWithDetails,
                pagination: buildPaginationMeta(total, page, limit),
            };
        } catch (error) {
            throw new ApiError(500, 'Error fetching reservations: ' + error.message);
        }
    }

    async getReservationById(id, token) {
        try {
            const reservation = await BookReservation.findOne({ _id: id, deletedAt: null })
                .populate([
                    {
                        path: 'copyId',
                        select: 'copyNumber location bookId',
                        populate: { path: 'bookId', select: 'title author isbn' },
                    },
                    { path: 'libraryId', select: 'name code' },
                ])
                .lean();

            if (!reservation) throw new ApiError(404, 'Reservation not found');

            const [populated] = await populateUsers([reservation], 'userId', token);
            return populated;
        } catch (error) {
            throw error instanceof ApiError ? error : new ApiError(500, 'Error fetching reservation: ' + error.message);
        }
    }

    async getAllReservations(options = {}, token) {
        try {
            await this.checkAndExpireReservations();
            const { pagination, search, filters = {} } = options;
            const query = { deletedAt: null, ...filters };

            if (search) {
                query.$or = await buildSearchFilter(search, token, {
                    copyField: 'copyId',
                    userField: 'userId',
                });
            }

            const { page, limit, skip } = parsePagination(pagination);

            const [rawReservations, total] = await Promise.all([
                BookReservation.find(query)
                    .populate([
                        {
                            path: 'copyId',
                            select: 'copyNumber location bookId',
                            populate: { path: 'bookId', select: 'title author isbn' },
                        },
                        { path: 'libraryId', select: 'name code' },
                    ])
                    .sort({ reservationDate: -1 })
                    .skip(skip)
                    .limit(limit)
                    .lean(),
                BookReservation.countDocuments(query),
            ]);

            const reservations = await populateUsers(rawReservations, 'userId', token);

            return {
                reservations,
                pagination: buildPaginationMeta(total, page, limit),
            };
        } catch (error) {
            throw new ApiError(500, 'Error fetching all reservations: ' + error.message);
        }
    }

    async updateReservationStatus(id, data) {
        try {
            const reservation = await BookReservation.findOne({ _id: id, deletedAt: null });
            if (!reservation) throw new ApiError(404, 'Reservation not found');

            Object.assign(reservation, data);
            await reservation.save();
            return reservation.toJSON();
        } catch (error) {
            throw error instanceof ApiError ? error : new ApiError(500, 'Error updating reservation: ' + error.message);
        }
    }

    async checkAndExpireReservations() {
        try {
            const now = new Date();

            const expiredReservations = await BookReservation.find({
                status: 'pending',
                expiryDate: { $lt: now },
                deletedAt: null,
            }).select('copyId').lean();

            if (expiredReservations.length === 0) {
                return { message: 'No expired reservations', expiredCount: 0 };
            }

            const copyIds = expiredReservations.map((r) => r.copyId);
            const result = await BookReservation.updateMany(
                { status: 'pending', expiryDate: { $lt: now }, deletedAt: null },
                { $set: { status: 'expired' } }
            );

            await BookCopy.updateMany(
                { _id: { $in: copyIds }, status: 'reserved' },
                { $set: { status: 'available' } }
            );

            return {
                message: 'Expired reservations processed',
                expiredCount: result.modifiedCount,
            };
        } catch (error) {
            throw new ApiError(500, 'Error checking expired reservations: ' + error.message);
        }
    }
}

export default new ReservationService();

import BookReservation from '../models/BookReservation.js';
import BookCopy from '../models/BookCopy.js';
import Library from '../models/Library.js';
import userServiceClient from '../clients/userServiceClient.js';
import { ApiError } from '../utils/ApiResponser.js';

class ReservationService {
    async createReservation({ userType, userId, copyId, libraryId, notes = '' }) {
        try {
            await userServiceClient.validateUser(userType, userId);
            const copy = await BookCopy.findOne({ _id: copyId, deletedAt: null }).lean();
            if (!copy) throw new ApiError(404, 'Book copy not found');
            if (copy.status !== 'available') {
                throw new ApiError(400, 'This book copy is not available for reservation');
            }

            const library = await Library.findOne({ _id: libraryId, deletedAt: null }).lean();
            if (!library) throw new ApiError(404, 'Library not found');

            const existingReservation = await BookReservation.findOne({
                userId,
                copyId,
                status: 'pending',
                deletedAt: null
            });
            if (existingReservation) {
                throw new ApiError(400, 'You already have an active reservation for this book copy');
            }

            const activeReservations = await BookReservation.countDocuments({
                userId,
                status: 'pending',
                deletedAt: null
            });
            if (activeReservations >= library.maxBorrowLimit) {
                throw new ApiError(400, `You have reached the maximum reservation limit of ${library.maxBorrowLimit} books`);
            }

            const reservationDate = new Date();
            const expiryDate = new Date(reservationDate);
            const reservationHoldDays = library.reservationHoldDays || 2;
            expiryDate.setDate(expiryDate.getDate() + reservationHoldDays);

            const reservation = new BookReservation({
                userType,
                userId,
                copyId: copy._id,
                libraryId: library._id,
                reservationDate,
                expiryDate,
                status: 'pending',
                notes
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

    async cancelReservation(reservationId, userId, notes = '') {
        try {
            const reservation = await BookReservation.findOne({
                _id: reservationId,
                userId,
                deletedAt: null
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
                deletedAt: null
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

            // Copy status will be changed to 'borrowed' when the actual borrowing record is created
            // For now, keep it as 'reserved' or you can change it to 'borrowed' here if you want

            return reservation.toJSON();
        } catch (error) {
            throw error instanceof ApiError ? error : new ApiError(500, 'Error fulfilling reservation: ' + error.message);
        }
    }

    async getMyReservations(userId, options = {}) {
        try {
            const { pagination, filters = {} } = options;
            const query = {
                userId,
                deletedAt: null,
                ...filters
            };

            const page = parseInt(pagination?.page) || 1;
            const limit = parseInt(pagination?.limit) || 10;
            const skip = (page - 1) * limit;

            const [reservations, total] = await Promise.all([
                BookReservation.find(query)
                    .populate({
                        path: 'copyId',
                        select: 'copyNumber location condition bookId',
                        populate: {
                            path: 'bookId',
                            select: 'title author isbn category'
                        }
                    })
                    .populate('libraryId', 'name code')
                    .sort({ reservationDate: -1 })
                    .skip(skip)
                    .limit(limit)
                    .lean(),
                BookReservation.countDocuments(query),
            ]);

            const reservationsWithDetails = reservations.map(r => {
                const expiryDate = new Date(r.expiryDate);
                const now = new Date();
                const hoursUntilExpiry = Math.ceil((expiryDate - now) / (1000 * 60 * 60));
                const isExpired = now > expiryDate;

                return {
                    ...r,
                    hoursUntilExpiry,
                    isExpired,
                    canCancel: r.status === 'pending' && !isExpired
                };
            });

            return {
                reservations: reservationsWithDetails,
                pagination: {
                    page,
                    limit,
                    total,
                    pages: Math.ceil(total / limit),
                },
            };
        } catch (error) {
            throw new ApiError(500, 'Error fetching reservations: ' + error.message);
        }
    }

    async getAllReservations(options = {}) {
        try {
            const { pagination, filters = {} } = options;
            const query = { deletedAt: null, ...filters };

            const page = parseInt(pagination?.page) || 1;
            const limit = parseInt(pagination?.limit) || 10;
            const skip = (page - 1) * limit;

            const [reservations, total] = await Promise.all([
                BookReservation.find(query)
                    .populate({
                        path: 'copyId',
                        select: 'copyNumber bookId',
                        populate: {
                            path: 'bookId',
                            select: 'title author isbn'
                        }
                    })
                    .populate('libraryId', 'name code')
                    .sort({ reservationDate: -1 })
                    .skip(skip)
                    .limit(limit)
                    .lean(),
                BookReservation.countDocuments(query),
            ]);

            return {
                reservations,
                pagination: {
                    page,
                    limit,
                    total,
                    pages: Math.ceil(total / limit),
                },
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
                deletedAt: null
            });

            let expiredCount = 0;
            
            for (const reservation of expiredReservations) {
                reservation.status = 'expired';
                await reservation.save();
                const copy = await BookCopy.findById(reservation.copyId);
                if (copy && copy.status === 'reserved') {
                    copy.status = 'available';
                    await copy.save();
                }

                expiredCount++;
            }

            return {
                message: 'Expired reservations processed',
                expiredCount
            };
        } catch (error) {
            throw new ApiError(500, 'Error checking expired reservations: ' + error.message);
        }
    }
}

export default new ReservationService();

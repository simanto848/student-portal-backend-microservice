import BookReservation from "../models/BookReservation.js";
import Book from "../models/Book.js";
import BookCopy from "../models/BookCopy.js";
import Library from '../models/Library.js';
import userServiceClient from '../clients/userServiceClient.js';
import academicServiceClient from '../clients/academicServiceClient.js';
import { ApiError } from "shared";
import fs from 'fs';

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

            // Find all copy IDs for this book to check for existing reservations across all copies
            const bookCopies = await BookCopy.find({ bookId: copy.bookId, deletedAt: null }).select('_id').lean();
            const copyIds = bookCopies.map(c => c._id);

            const existingReservation = await BookReservation.findOne({
                userId,
                copyId: { $in: copyIds },
                status: 'pending',
                deletedAt: null
            });

            if (existingReservation) {
                throw new ApiError(400, 'You already have an active reservation for this book');
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

            return reservation.toJSON();
        } catch (error) {
            throw error instanceof ApiError ? error : new ApiError(500, 'Error fulfilling reservation: ' + error.message);
        }
    }

    async getMyReservations(userId, options = {}) {
        try {
            await this.checkAndExpireReservations();
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

                // Transform populated fields to match frontend interface
                let copy = null;
                if (r.copyId && typeof r.copyId === 'object') {
                    let book = null;
                    if (r.copyId.bookId && typeof r.copyId.bookId === 'object') {
                        book = {
                            ...r.copyId.bookId,
                            id: r.copyId.bookId._id.toString()
                        };
                    }

                    copy = {
                        ...r.copyId,
                        id: r.copyId._id.toString(),
                        book,
                        bookId: book ? book.id : r.copyId.bookId
                    };
                }

                return {
                    ...r,
                    id: r._id.toString(),
                    copy,
                    copyId: copy ? copy.id : r.copyId, // Ensure string ID
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



    async getReservationById(id, token) {
        try {
            const reservation = await BookReservation.findOne({ _id: id, deletedAt: null })
                .populate({
                    path: 'copyId',
                    select: 'copyNumber location bookId',
                    populate: {
                        path: 'bookId',
                        select: 'title author isbn'
                    }
                })
                .populate('libraryId', 'name code')
                .lean();

            if (!reservation) throw new ApiError(404, 'Reservation not found');

            const [reservationWithUser] = await this.populateUserDetails([reservation], token);
            return reservationWithUser;
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
                const logData = `[${new Date().toISOString()}] Search: "${search}"\n`;
                fs.appendFileSync('/tmp/library_search_debug.log', logData);

                console.log(`[ReservationService] Performing search for: "${search}"`);
                const bookIds = await Book.find({
                    $or: [
                        { title: { $regex: search, $options: 'i' } },
                        { author: { $regex: search, $options: 'i' } },
                        { isbn: { $regex: search, $options: 'i' } }
                    ]
                }).distinct('_id');

                const copyIds = await BookCopy.find({
                    $or: [
                        { bookId: { $in: bookIds } },
                        { copyNumber: { $regex: search, $options: 'i' } }
                    ]
                }).distinct('_id');

                // Search Users (All roles to be thorough)
                const [students, teachers, staffs, admins] = await Promise.all([
                    userServiceClient.searchUsers(search, 'student', token),
                    userServiceClient.searchUsers(search, 'teacher', token),
                    userServiceClient.searchUsers(search, 'staff', token),
                    userServiceClient.searchUsers(search, 'admin', token)
                ]);

                const userIds = [
                    ...students.map(u => u.id || u._id),
                    ...teachers.map(u => u.id || u._id),
                    ...staffs.map(u => u.id || u._id),
                    ...admins.map(u => u.id || u._id)
                ].filter(Boolean);

                const resultLog = `Found Users: ${userIds.length} (${userIds.join(', ')})\n`;
                fs.appendFileSync('/tmp/library_search_debug.log', resultLog);

                console.log(`[ReservationService] Search results: ${bookIds.length} books, ${copyIds.length} copies, ${userIds.length} users`);

                query.$or = [
                    { copyId: { $in: copyIds } },
                    { userId: { $in: userIds } }
                ];
            }

            const page = parseInt(pagination?.page) || 1;
            const limit = parseInt(pagination?.limit) || 10;
            const skip = (page - 1) * limit;

            const [rawReservations, total] = await Promise.all([
                BookReservation.find(query)
                    .populate({
                        path: 'copyId',
                        select: 'copyNumber location bookId',
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

            const reservations = await this.populateUserDetails(rawReservations, token);

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

    async populateUserDetails(reservations, token) {
        return await Promise.all(reservations.map(async (reservation) => {
            try {
                const user = await userServiceClient.validateUser(reservation.userType, reservation.userId, token);
                let departmentName = user.department?.name || user.departmentName || null;

                if (!departmentName && user.departmentId) {
                    try {
                        const dept = await academicServiceClient.getDepartmentById(user.departmentId);
                        departmentName = dept.data?.name || dept.name;
                    } catch (err) {
                        // Ignore department fetch error
                    }
                }

                return {
                    ...reservation,
                    user: {
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
                    ...reservation,
                    user: {
                        id: reservation.userId,
                        fullName: 'Unknown User',
                        error: 'Failed to fetch user details'
                    }
                };
            }
        }));
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

import ApiResponse from '../utils/ApiResponser.js';
import reservationService from '../services/reservationService.js';

class ReservationController {
    async createReservation(req, res, next) {
        try {
            const { copyId, libraryId, notes } = req.validatedData || req.body;
            const userId = req.user?.sub || req.user?.id;
            const rawType = req.user?.type || req.user?.userType || req.user?.role;
            const staffRoles = [
                'program_controller','admission','exam','finance','library','transport','hr','it','hostel','hostel_warden','hostel_supervisor','maintenance'
            ];

            const typeMapping = {
                student: 'student',
                teacher: 'teacher',
                faculty: 'teacher',
                staff: 'staff',
                admin: 'admin'
            };

            let normalizedType = typeMapping[rawType];
            if (!normalizedType && staffRoles.includes(rawType)) {
                normalizedType = 'staff';
            }

            if (!normalizedType) {
                return ApiResponse.badRequest(res, `Unsupported user type '${rawType}'.`);
            }

            const reservation = await reservationService.createReservation({
                userType: normalizedType,
                userId,
                copyId,
                libraryId,
                notes
            });
            
            return ApiResponse.created(res, reservation, 'Book reserved successfully');
        } catch (error) {
            next(error);
        }
    }

    async cancelReservation(req, res, next) {
        try {
            const { id } = req.params;
            const { notes } = req.validatedData || req.body || {};
            const userId = req.user?.sub || req.user?.id;

            const reservation = await reservationService.cancelReservation(id, userId, notes);
            return ApiResponse.success(res, reservation, 'Reservation cancelled successfully');
        } catch (error) {
            next(error);
        }
    }

    async fulfillReservation(req, res, next) {
        try {
            const { id } = req.params;
            const { notes } = req.validatedData || req.body || {};
            const pickupById = req.user?.sub || req.user?.id;

            const reservation = await reservationService.fulfillReservation(id, pickupById, notes);
            return ApiResponse.success(res, reservation, 'Reservation fulfilled successfully');
        } catch (error) {
            next(error);
        }
    }

    async getMyReservations(req, res, next) {
        try {
            const userId = req.user?.sub || req.user?.id;
            const { page, limit, status, ...filters } = req.query;
            
            const options = {
                pagination: { page: parseInt(page) || 1, limit: parseInt(limit) || 10 }
            };
            
            if (status) filters.status = status;
            if (Object.keys(filters).length > 0) options.filters = filters;

            const result = await reservationService.getMyReservations(userId, options);
            return ApiResponse.success(res, result, 'Reservations retrieved successfully');
        } catch (error) {
            next(error);
        }
    }

    async getAllReservations(req, res, next) {
        try {
            const { page, limit, ...filters } = req.query;
            const options = {
                pagination: { page: parseInt(page) || 1, limit: parseInt(limit) || 10 }
            };
            if (Object.keys(filters).length > 0) options.filters = filters;

            const result = await reservationService.getAllReservations(options);
            return ApiResponse.success(res, result, 'All reservations retrieved successfully');
        } catch (error) {
            next(error);
        }
    }

    async updateReservationStatus(req, res, next) {
        try {
            const { id } = req.params;
            const data = req.validatedData || req.body;

            const reservation = await reservationService.updateReservationStatus(id, data);
            return ApiResponse.success(res, reservation, 'Reservation updated successfully');
        } catch (error) {
            next(error);
        }
    }

    async checkExpiredReservations(req, res, next) {
        try {
            const result = await reservationService.checkAndExpireReservations();
            return ApiResponse.success(res, result, 'Expired reservations checked and processed');
        } catch (error) {
            next(error);
        }
    }
}

export default new ReservationController();

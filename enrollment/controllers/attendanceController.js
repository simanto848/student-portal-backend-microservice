import attendanceService from '../services/attendanceService.js';
import ApiResponse from '../utils/ApiResponser.js';

class AttendanceController {
    async markAttendance(req, res, next) {
        try {
            const attendance = await attendanceService.markAttendance(req.body, req.user.sub);
            return ApiResponse.created(res, attendance, 'Attendance marked successfully');
        } catch (error) {
            next(error);
        }
    }

    async bulkMarkAttendance(req, res, next) {
        try {
            const result = await attendanceService.bulkMarkAttendance(req.body, req.user.sub);
            return ApiResponse.created(res, result, 'Bulk attendance marked successfully');
        } catch (error) {
            next(error);
        }
    }

    async getAttendance(req, res, next) {
        try {
            const attendance = await attendanceService.getAttendanceById(req.params.id);
            if (req.user.type === 'student' && attendance.studentId !== req.user.sub) {
                return ApiResponse.forbidden(res, 'You can only view your own attendance');
            }

            return ApiResponse.success(res, attendance);
        } catch (error) {
            next(error);
        }
    }

    async listAttendance(req, res, next) {
        try {
            const filters = { ...req.query };
            if (req.user.type === 'student') {
                filters.studentId = req.user.sub;
            }

            const attendance = await attendanceService.listAttendance(filters);
            return ApiResponse.success(res, attendance);
        } catch (error) {
            next(error);
        }
    }

    async updateAttendance(req, res, next) {
        try {
            const attendance = await attendanceService.updateAttendance(req.params.id, req.body, req.user.sub);
            return ApiResponse.success(res, attendance, 'Attendance updated successfully');
        } catch (error) {
            next(error);
        }
    }

    async deleteAttendance(req, res, next) {
        try {
            await attendanceService.deleteAttendance(req.params.id, req.user.sub);
            return ApiResponse.success(res, null, 'Attendance deleted successfully');
        } catch (error) {
            next(error);
        }
    }

    async getStudentAttendanceStats(req, res, next) {
        try {
            const { studentId, courseId } = req.params;
            if (req.user.type === 'student' && req.user.sub !== studentId) {
                return ApiResponse.forbidden(res, 'You can only view your own attendance statistics');
            }

            const stats = await attendanceService.getStudentAttendanceStats(studentId, courseId);
            return ApiResponse.success(res, stats);
        } catch (error) {
            next(error);
        }
    }

    async getCourseAttendanceReport(req, res, next) {
        try {
            const { courseId, batchId } = req.params;
            const report = await attendanceService.getCourseAttendanceReport(courseId, batchId, req.query);
            return ApiResponse.success(res, report);
        } catch (error) {
            next(error);
        }
    }
}

export default new AttendanceController();
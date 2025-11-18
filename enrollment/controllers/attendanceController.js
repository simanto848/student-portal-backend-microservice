import attendanceService from '../services/attendanceService.js';
import ApiResponse from '../utils/ApiResponser.js';

class AttendanceController {
    // Mark attendance for single student
    async markAttendance(req, res, next) {
        try {
            const attendance = await attendanceService.markAttendance(req.body, req.user.id);
            return ApiResponse.created(res, attendance, 'Attendance marked successfully');
        } catch (error) {
            next(error);
        }
    }

    // Bulk mark attendance
    async bulkMarkAttendance(req, res, next) {
        try {
            const result = await attendanceService.bulkMarkAttendance(req.body, req.user.id);
            return ApiResponse.created(res, result, 'Bulk attendance marked successfully');
        } catch (error) {
            next(error);
        }
    }

    // Get attendance by ID
    async getAttendance(req, res, next) {
        try {
            const attendance = await attendanceService.getAttendanceById(req.params.id);
            
            // Students can only view their own attendance
            if (req.user.role === 'student' && attendance.studentId !== req.user.id) {
                return ApiResponse.forbidden(res, 'You can only view your own attendance');
            }

            return ApiResponse.success(res, attendance);
        } catch (error) {
            next(error);
        }
    }

    // List attendance with filters
    async listAttendance(req, res, next) {
        try {
            const filters = { ...req.query };
            
            // Students can only view their own attendance
            if (req.user.role === 'student') {
                filters.studentId = req.user.id;
            }

            const attendance = await attendanceService.listAttendance(filters);
            return ApiResponse.success(res, attendance);
        } catch (error) {
            next(error);
        }
    }

    // Update attendance
    async updateAttendance(req, res, next) {
        try {
            const attendance = await attendanceService.updateAttendance(req.params.id, req.body, req.user.id);
            return ApiResponse.success(res, attendance, 'Attendance updated successfully');
        } catch (error) {
            next(error);
        }
    }

    // Delete attendance
    async deleteAttendance(req, res, next) {
        try {
            await attendanceService.deleteAttendance(req.params.id, req.user.id);
            return ApiResponse.success(res, null, 'Attendance deleted successfully');
        } catch (error) {
            next(error);
        }
    }

    // Get student attendance statistics
    async getStudentAttendanceStats(req, res, next) {
        try {
            const { studentId, courseId } = req.params;
            
            // Students can only view their own stats
            if (req.user.role === 'student' && req.user.id !== studentId) {
                return ApiResponse.forbidden(res, 'You can only view your own attendance statistics');
            }

            const stats = await attendanceService.getStudentAttendanceStats(studentId, courseId);
            return ApiResponse.success(res, stats);
        } catch (error) {
            next(error);
        }
    }

    // Get course attendance report
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

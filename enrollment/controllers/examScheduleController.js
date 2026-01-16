import examScheduleService from '../services/examScheduleService.js';
import { ApiResponse } from 'shared';

class ExamScheduleController {
    async createSchedule(req, res, next) {
        try {
            const schedule = await examScheduleService.createSchedule(req.body, req.user);
            return ApiResponse.success(res, schedule, 'Exam schedule created successfully');
        } catch (error) {
            next(error);
        }
    }

    async getSchedules(req, res, next) {
        try {
            const schedules = await examScheduleService.getSchedules(req.query);
            return ApiResponse.success(res, schedules);
        } catch (error) {
            next(error);
        }
    }

    async updateSchedule(req, res, next) {
        try {
            const { id } = req.params;
            const schedule = await examScheduleService.updateSchedule(id, req.body, req.user);
            return ApiResponse.success(res, schedule, 'Exam schedule updated successfully');
        } catch (error) {
            next(error);
        }
    }

    async deleteSchedule(req, res, next) {
        try {
            const { id } = req.params;
            await examScheduleService.deleteSchedule(id, req.user);
            return ApiResponse.success(res, null, 'Exam schedule deleted successfully');
        } catch (error) {
            next(error);
        }
    }
}

export default new ExamScheduleController();

import ExamSchedule from '../models/ExamSchedule.js';
import { ApiError } from 'shared';

class ExamScheduleService {
    async createSchedule(data, user) {
        if (user.role !== 'exam_controller') {
            throw new ApiError(403, 'Only Exam Controller can create schedules');
        }
        return ExamSchedule.create({
            ...data,
            createdBy: user.sub
        });
    }

    async getSchedules(query) {
        const { batchId, semester, examType, startDate, endDate } = query;
        const filter = {};
        if (batchId) filter.batchId = batchId;
        if (semester) filter.semester = semester;
        if (examType) filter.examType = examType;
        if (startDate && endDate) {
            filter.date = { $gte: new Date(startDate), $lte: new Date(endDate) };
        }
        return ExamSchedule.find(filter).sort({ date: 1 });
    }

    async updateSchedule(id, data, user) {
        if (user.role !== 'exam_controller') {
            throw new ApiError(403, 'Only Exam Controller can update schedules');
        }
        const schedule = await ExamSchedule.findByIdAndUpdate(id, data, { new: true });
        if (!schedule) throw new ApiError(404, 'Schedule not found');
        return schedule;
    }

    async deleteSchedule(id, user) {
        if (user.role !== 'exam_controller') {
            throw new ApiError(403, 'Only Exam Controller can delete schedules');
        }
        const schedule = await ExamSchedule.findByIdAndDelete(id);
        if (!schedule) throw new ApiError(404, 'Schedule not found');
    }
}

export default new ExamScheduleService();

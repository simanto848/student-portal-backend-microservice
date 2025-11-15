import CourseSchedule from '../models/CourseSchedule.js';
import Batch from '../models/Batch.js';
import SessionCourse from '../models/SessionCourse.js';
import { ApiError } from '../utils/ApiResponser.js';

// Helper to compare time strings HH:MM
const timeToMinutes = (t) => {
	if (!/^\d{2}:\d{2}$/.test(t)) return null;
	const [h, m] = t.split(':').map(Number);
	return h * 60 + m;
};

class CourseScheduleService {
	async getAll(options = {}) {
		const { filters = {}, pagination = {}, search } = options;
		const { page = 1, limit = 10 } = pagination;
		const query = { ...filters };

		if (search) {
			query.$or = [
				{ dayOfWeek: { $regex: search, $options: 'i' } },
				{ roomNumber: { $regex: search, $options: 'i' } },
				{ building: { $regex: search, $options: 'i' } },
				{ teacherId: { $regex: search, $options: 'i' } },
			];
		}

		const skip = (page - 1) * limit;
		const [schedules, total] = await Promise.all([
			CourseSchedule.find(query)
				.populate('batchId', 'name year programId departmentId')
				.populate('sessionCourseId', 'sessionId courseId semester departmentId')
				.sort({ startDate: -1, dayOfWeek: 1, startTime: 1 })
				.skip(skip)
				.limit(parseInt(limit)),
			CourseSchedule.countDocuments(query),
		]);

		return {
			data: schedules,
			pagination: {
				page: parseInt(page),
				limit: parseInt(limit),
				total,
				pages: Math.ceil(total / limit),
			},
		};
	}

	async getById(id) {
		const schedule = await CourseSchedule.findById(id)
			.populate('batchId', 'name year programId departmentId')
			.populate('sessionCourseId', 'sessionId courseId semester departmentId');
		if (!schedule) throw new ApiError(404, 'Course schedule not found');
		return schedule;
	}

	async create(payload) {
		const [batch, sessionCourse] = await Promise.all([
			Batch.findById(payload.batchId),
			SessionCourse.findById(payload.sessionCourseId),
		]);
		if (!batch) throw new ApiError(404, 'Batch not found');
		if (!sessionCourse) throw new ApiError(404, 'Session course not found');

		// Basic time validation
		const startM = timeToMinutes(payload.startTime);
		const endM = timeToMinutes(payload.endTime);
		if (startM === null || endM === null) {
			throw new ApiError(400, 'Invalid time format. Use HH:MM');
		}
		if (endM <= startM) {
			throw new ApiError(400, 'endTime must be greater than startTime');
		}

		// Overlap check for same batch/day
		const overlap = await CourseSchedule.findOne({
			batchId: payload.batchId,
			dayOfWeek: payload.dayOfWeek,
			deletedAt: null,
			$or: [
				{ startTime: payload.startTime },
				{ endTime: payload.endTime },
				{
					$and: [
						{ startTime: { $lt: payload.endTime } },
						{ endTime: { $gt: payload.startTime } },
					],
				},
			],
		});
		if (overlap) throw new ApiError(409, 'Schedule overlaps with an existing class for this batch');

		const schedule = await CourseSchedule.create(payload);
		return await CourseSchedule.findById(schedule._id)
			.populate('batchId', 'name year programId departmentId')
			.populate('sessionCourseId', 'sessionId courseId semester departmentId');
	}

	async update(id, payload) {
		const schedule = await CourseSchedule.findById(id);
		if (!schedule) throw new ApiError(404, 'Course schedule not found');

		if (payload.batchId && payload.batchId !== schedule.batchId) {
			const batch = await Batch.findById(payload.batchId);
			if (!batch) throw new ApiError(404, 'Batch not found');
		}
		if (payload.sessionCourseId && payload.sessionCourseId !== schedule.sessionCourseId) {
			const sc = await SessionCourse.findById(payload.sessionCourseId);
			if (!sc) throw new ApiError(404, 'Session course not found');
		}

		if (payload.startTime || payload.endTime) {
			const startT = payload.startTime || schedule.startTime;
			const endT = payload.endTime || schedule.endTime;
			const startM = timeToMinutes(startT);
			const endM = timeToMinutes(endT);
			if (startM === null || endM === null) {
				throw new ApiError(400, 'Invalid time format. Use HH:MM');
			}
			if (endM <= startM) throw new ApiError(400, 'endTime must be greater than startTime');
		}

		Object.assign(schedule, payload);
		await schedule.save();
		return await CourseSchedule.findById(id)
			.populate('batchId', 'name year programId departmentId')
			.populate('sessionCourseId', 'sessionId courseId semester departmentId');
	}

	async delete(id) {
		const schedule = await CourseSchedule.findById(id);
		if (!schedule) throw new ApiError(404, 'Course schedule not found');
		await schedule.softDelete();
		return true;
	}

	async getScheduleByBatch(batchId, options = {}) {
		const batch = await Batch.findById(batchId);
		if (!batch) throw new ApiError(404, 'Batch not found');
		const { pagination = {} } = options;
		const { page = 1, limit = 10 } = pagination;
		const skip = (page - 1) * limit;
		const query = { batchId };
		const [schedules, total] = await Promise.all([
			CourseSchedule.find(query)
				.populate('sessionCourseId', 'sessionId courseId semester departmentId')
				.sort({ dayOfWeek: 1, startTime: 1 })
				.skip(skip)
				.limit(parseInt(limit)),
			CourseSchedule.countDocuments(query),
		]);
		return {
			data: schedules,
			pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / limit) },
		};
	}

	async getScheduleByTeacher(teacherId, options = {}) {
		const { pagination = {} } = options;
		const { page = 1, limit = 10 } = pagination;
		const skip = (page - 1) * limit;
		const query = { teacherId };
		const [schedules, total] = await Promise.all([
			CourseSchedule.find(query)
				.populate('batchId', 'name year programId departmentId')
				.populate('sessionCourseId', 'sessionId courseId semester departmentId')
				.sort({ dayOfWeek: 1, startTime: 1 })
				.skip(skip)
				.limit(parseInt(limit)),
			CourseSchedule.countDocuments(query),
		]);
		return {
			data: schedules,
			pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / limit) },
		};
	}
}

export default new CourseScheduleService();


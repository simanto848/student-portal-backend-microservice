import CourseSchedule from '../models/CourseSchedule.js';
import Batch from '../models/Batch.js';
import SessionCourse from '../models/SessionCourse.js';
import enrollmentServiceClient from '../client/enrollmentServiceClient.js';
import { ApiError } from 'shared';

const timeToMinutes = (t) => {
	if (!/^\d{2}:\d{2}$/.test(t)) return null;
	const [h, m] = t.split(':').map(Number);
	return h * 60 + m;
};

class CourseScheduleService {
	async checkOverlap({ batchId, teacherId, classroomId, daysOfWeek, startTime, endTime, excludeScheduleId = null }) {
		const query = {
			daysOfWeek: { $in: daysOfWeek },
			deletedAt: null,
			status: 'active',
			isActive: true,
			$or: [
				{ startTime: startTime },
				{ endTime: endTime },
				{
					$and: [
						{ startTime: { $lt: endTime } },
						{ endTime: { $gt: startTime } },
					],
				},
			],
		};

		if (excludeScheduleId) {
			query._id = { $ne: excludeScheduleId };
		}

		const conflictConditions = [
			{ batchId: batchId },
			{ classroomId: classroomId }
		];

		if (teacherId) {
			conflictConditions.push({ teacherId: teacherId });
		}

		const conflicts = await CourseSchedule.find({
			...query,
			$or: conflictConditions
		}).populate('batchId classroomId teacherId');


		for (const conflict of conflicts) {
			if (conflict.batchId._id.toString() === batchId.toString()) {
				throw new ApiError(409, `Schedule overlaps with an existing class for batch ${conflict.batchId.name}`);
			}
			if (teacherId && conflict.teacherId && conflict.teacherId._id.toString() === teacherId.toString()) {
				throw new ApiError(409, `Teacher ${conflict.teacherId.fullName} is already booked at this time`);
			}
			if (classroomId && conflict.classroomId && conflict.classroomId._id.toString() === classroomId.toString()) {
				throw new ApiError(409, `Room ${conflict.classroomId.roomNumber} is already occupied at this time`);
			}
		}
	}

	async getAll(options = {}) {
		const { filters = {}, pagination, search } = options;
		const query = { ...filters };

		if (search) {
			query.$or = [
				{ daysOfWeek: { $in: [search] } },
				{ classroomId: { $regex: search, $options: 'i' } },
				{ building: { $regex: search, $options: 'i' } },
				{ teacherId: { $regex: search, $options: 'i' } },
			];
		}

		if (pagination && (pagination.page || pagination.limit)) {
			const { page = 1, limit = 10 } = pagination;
			const skip = (page - 1) * limit;
			const [schedules, total] = await Promise.all([
				CourseSchedule.find(query)
					.populate({
						path: 'batchId',
						select: 'name year programId departmentId shift',
						populate: { path: 'departmentId', select: 'name shortName' }
					})
					.populate({
						path: 'sessionCourseId',
						select: 'sessionId courseId semester departmentId',
						populate: [
							{ path: 'courseId', select: 'name code credits' },
							{ path: 'sessionId', select: 'name' },
							{ path: 'departmentId', select: 'name shortName' }
						]
					})
					.populate('classroomId', 'roomNumber buildingName floor capacity')
					.sort({ startDate: -1, startTime: 1 })
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
		} else {
			const schedules = await CourseSchedule.find(query)
				.populate({
					path: 'batchId',
					select: 'name year programId departmentId shift',
					populate: { path: 'departmentId', select: 'name shortName' }
				})
				.populate({
					path: 'sessionCourseId',
					select: 'sessionId courseId semester departmentId',
					populate: [
						{ path: 'courseId', select: 'name code credits' },
						{ path: 'sessionId', select: 'name' },
						{ path: 'departmentId', select: 'name shortName' }
					]
				})
				.populate('classroomId', 'roomNumber buildingName floor capacity')
				.sort({ startDate: -1, startTime: 1 });

			return {
				data: schedules,
				total: schedules.length,
			};
		}
	}

	async getById(id) {
		const schedule = await CourseSchedule.findById(id)
			.populate({
				path: 'batchId',
				select: 'name year programId departmentId shift',
				populate: { path: 'departmentId', select: 'name shortName' }
			})
			.populate({
				path: 'sessionCourseId',
				select: 'sessionId courseId semester departmentId',
				populate: [
					{ path: 'courseId', select: 'name code credits' },
					{ path: 'sessionId', select: 'name' },
					{ path: 'departmentId', select: 'name shortName' }
				]
			})
			.populate('classroomId', 'roomNumber buildingName floor capacity');
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

		const startM = timeToMinutes(payload.startTime);
		const endM = timeToMinutes(payload.endTime);
		if (startM === null || endM === null) {
			throw new ApiError(400, 'Invalid time format. Use HH:MM');
		}
		if (endM <= startM) {
			throw new ApiError(400, 'endTime must be greater than startTime');
		}

		await this.checkOverlap({
			batchId: payload.batchId,
			teacherId: payload.teacherId,
			classroomId: payload.classroomId,
			daysOfWeek: payload.daysOfWeek,
			startTime: payload.startTime,
			endTime: payload.endTime
		});

		const schedule = await CourseSchedule.create(payload);
		return CourseSchedule.findById(schedule._id)
			.populate({
				path: 'batchId',
				select: 'name year programId departmentId shift',
				populate: { path: 'departmentId', select: 'name shortName' }
			})
			.populate({
				path: 'sessionCourseId',
				select: 'sessionId courseId semester departmentId',
				populate: [
					{ path: 'courseId', select: 'name code credits' },
					{ path: 'sessionId', select: 'name' },
					{ path: 'departmentId', select: 'name shortName' }
				]
			})
			.populate('classroomId', 'roomNumber buildingName floor capacity');
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

		// overlap check
		const checkBatchId = payload.batchId || schedule.batchId;
		const checkTeacherId = payload.teacherId === undefined ? schedule.teacherId : payload.teacherId; // undefined means no update, null means remove
		const checkClassroomId = payload.classroomId === undefined ? schedule.classroomId : payload.classroomId;
		const checkDays = payload.daysOfWeek || schedule.daysOfWeek;
		const checkStart = payload.startTime || schedule.startTime;
		const checkEnd = payload.endTime || schedule.endTime;

		await this.checkOverlap({
			batchId: checkBatchId,
			teacherId: checkTeacherId,
			classroomId: checkClassroomId,
			daysOfWeek: checkDays,
			startTime: checkStart,
			endTime: checkEnd,
			excludeScheduleId: id
		});

		if (payload.sessionId === '' || payload.sessionId === undefined || payload.sessionId === null) {
			delete payload.sessionId;
		}

		Object.assign(schedule, payload);
		await schedule.save();
		return CourseSchedule.findById(id)
			.populate({
				path: 'batchId',
				select: 'name year programId departmentId shift',
				populate: { path: 'departmentId', select: 'name shortName' }
			})
			.populate({
				path: 'sessionCourseId',
				select: 'sessionId courseId semester departmentId',
				populate: [
					{ path: 'courseId', select: 'name code credits' },
					{ path: 'sessionId', select: 'name' },
					{ path: 'departmentId', select: 'name shortName' }
				]
			})
			.populate('classroomId', 'roomNumber buildingName floor capacity');
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
				.populate({
					path: 'sessionCourseId',
					select: 'sessionId courseId semester departmentId',
					populate: [
						{ path: 'courseId', select: 'name code credits' },
						{ path: 'sessionId', select: 'name' },
						{ path: 'departmentId', select: 'name shortName' }
					]
				})
				.populate('classroomId', 'roomNumber buildingName floor capacity')
				.sort({ startTime: 1 })
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

		const activeAssignments = await enrollmentServiceClient.getInstructorCourses(teacherId);
		const activeCourseKeys = new Set(
			activeAssignments.map(a => `${a.batchId}_${a.courseId?._id || a.courseId}`)
		);

		if (activeAssignments.length === 0) {
			return {
				data: [],
				pagination: { page: parseInt(page), limit: parseInt(limit), total: 0, pages: 0 },
			};
		}

		const allSchedules = await CourseSchedule.find(query)
			.populate({
				path: 'batchId',
				select: 'name year programId departmentId shift',
				populate: { path: 'departmentId', select: 'name shortName' }
			})
			.populate({
				path: 'sessionCourseId',
				select: 'sessionId courseId semester departmentId',
				populate: [
					{ path: 'courseId', select: 'name code credits' },
					{ path: 'sessionId', select: 'name' },
					{ path: 'departmentId', select: 'name shortName' }
				]
			})
			.populate('classroomId', 'roomNumber buildingName floor capacity')
			.sort({ startTime: 1 });

		const filteredSchedules = allSchedules.filter(schedule => {
			const batchId = schedule.batchId?._id || schedule.batchId;
			const courseId = schedule.sessionCourseId?.courseId?._id || schedule.sessionCourseId?.courseId;
			const key = `${batchId}_${courseId}`;
			return activeCourseKeys.has(key);
		});

		const total = filteredSchedules.length;
		const paginatedSchedules = filteredSchedules.slice(skip, skip + parseInt(limit));

		return {
			data: paginatedSchedules,
			pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / limit) },
		};
	}
}

export default new CourseScheduleService();

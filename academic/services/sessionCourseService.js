import SessionCourse from '../models/SessionCourse.js';
import Session from '../models/Session.js';
import Course from '../models/Course.js';
import Department from '../models/Department.js';
import Batch from '../models/Batch.js';
import { ApiError } from '../utils/ApiResponser.js';

class SessionCourseService {
	async getAll(options = {}) {
		const { filters = {}, pagination = {} } = options; // no generic search field per design
		const { page = 1, limit = 10 } = pagination;
		const query = { ...filters };

		const skip = (page - 1) * limit;
		const [items, total] = await Promise.all([
			SessionCourse.find(query)
				.populate('sessionId', 'name year')
				.populate('courseId', 'name code departmentId')
				.populate('departmentId', 'name shortName')
				.sort({ createdAt: -1 })
				.skip(skip)
				.limit(parseInt(limit)),
			SessionCourse.countDocuments(query),
		]);

		return {
			data: items,
			pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / limit) },
		};
	}

	async getById(id) {
		const sc = await SessionCourse.findById(id)
			.populate('sessionId', 'name year')
			.populate('courseId', 'name code departmentId')
			.populate('departmentId', 'name shortName');
		if (!sc) throw new ApiError(404, 'Session course not found');
		return sc;
	}

	async create(payload) {
		const [session, course, department] = await Promise.all([
			Session.findById(payload.sessionId),
			Course.findById(payload.courseId),
			Department.findById(payload.departmentId),
		]);
		if (!session) throw new ApiError(404, 'Session not found');
		if (!course) throw new ApiError(404, 'Course not found');
		if (!department) throw new ApiError(404, 'Department not found');

		// Uniqueness (sessionId, courseId, semester, departmentId)
		const existing = await SessionCourse.findOne({
			sessionId: payload.sessionId,
			courseId: payload.courseId,
			semester: payload.semester,
			departmentId: payload.departmentId,
		});
		if (existing) throw new ApiError(409, 'Session course for this semester already exists');

		const sc = await SessionCourse.create(payload);
		return await SessionCourse.findById(sc._id)
			.populate('sessionId', 'name year')
			.populate('courseId', 'name code departmentId')
			.populate('departmentId', 'name shortName');
	}

	async update(id, payload) {
		const sc = await SessionCourse.findById(id);
		if (!sc) throw new ApiError(404, 'Session course not found');

		if (payload.sessionId && payload.sessionId !== sc.sessionId) {
			const session = await Session.findById(payload.sessionId);
			if (!session) throw new ApiError(404, 'Session not found');
		}
		if (payload.courseId && payload.courseId !== sc.courseId) {
			const course = await Course.findById(payload.courseId);
			if (!course) throw new ApiError(404, 'Course not found');
		}
		if (payload.departmentId && payload.departmentId !== sc.departmentId) {
			const department = await Department.findById(payload.departmentId);
			if (!department) throw new ApiError(404, 'Department not found');
		}

		// Check prospective uniqueness if relevant fields changed
		const prospective = {
			sessionId: payload.sessionId || sc.sessionId,
			courseId: payload.courseId || sc.courseId,
			semester: payload.semester || sc.semester,
			departmentId: payload.departmentId || sc.departmentId,
		};
		const duplicate = await SessionCourse.findOne({
			_id: { $ne: id },
			...prospective,
		});
		if (duplicate) throw new ApiError(409, 'Another session course with these details already exists');

		Object.assign(sc, payload);
		await sc.save();
		return await SessionCourse.findById(id)
			.populate('sessionId', 'name year')
			.populate('courseId', 'name code departmentId')
			.populate('departmentId', 'name shortName');
	}

	async delete(id) {
		const sc = await SessionCourse.findById(id);
		if (!sc) throw new ApiError(404, 'Session course not found');
		await sc.softDelete();
		return true;
	}

	async getBatchSessionCourses(batchId, options = {}) {
		const batch = await Batch.findById(batchId);
		if (!batch) throw new ApiError(404, 'Batch not found');
		// Infer session + department relation as batch-based
		const { pagination = {} } = options;
		const { page = 1, limit = 10 } = pagination;
		const skip = (page - 1) * limit;

		const query = { sessionId: batch.sessionId, departmentId: batch.departmentId };
		const [items, total] = await Promise.all([
			SessionCourse.find(query)
				.populate('courseId', 'name code')
				.populate('sessionId', 'name year')
				.populate('departmentId', 'name shortName')
				.sort({ semester: 1, createdAt: -1 })
				.skip(skip)
				.limit(parseInt(limit)),
			SessionCourse.countDocuments(query),
		]);
		return {
			data: items,
			pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / limit) },
		};
	}
}

export default new SessionCourseService();


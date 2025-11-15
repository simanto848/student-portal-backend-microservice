import CourseSyllabus from '../models/CourseSyllabus.js';
import SessionCourse from '../models/SessionCourse.js';
import { ApiError } from '../utils/ApiResponser.js';

const VALID_STATUS_FLOW = {
	Draft: ['Pending Approval'],
	'Pending Approval': ['Approved'],
	Approved: ['Published'],
	Published: ['Archived'],
	Archived: [],
};

class CourseSyllabusService {
	async getAll(options = {}) {
		const { filters = {}, pagination = {}, search } = options;
		const { page = 1, limit = 10 } = pagination;
		const query = { ...filters };
		if (search) {
			query.$or = [
				{ overview: { $regex: search, $options: 'i' } },
				{ objectives: { $regex: search, $options: 'i' } },
				{ version: { $regex: search, $options: 'i' } },
			];
		}

		const skip = (page - 1) * limit;
		const [syllabi, total] = await Promise.all([
			CourseSyllabus.find(query)
				.populate('sessionCourseId', 'sessionId courseId semester departmentId')
				.sort({ createdAt: -1 })
				.skip(skip)
				.limit(parseInt(limit)),
			CourseSyllabus.countDocuments(query),
		]);

		return {
			data: syllabi,
			pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / limit) },
		};
	}

	async getById(id) {
		const syllabus = await CourseSyllabus.findById(id)
			.populate('sessionCourseId', 'sessionId courseId semester departmentId');
		if (!syllabus) throw new ApiError(404, 'Course syllabus not found');
		return syllabus;
	}

	async create(payload) {
		const sessionCourse = await SessionCourse.findById(payload.sessionCourseId);
		if (!sessionCourse) throw new ApiError(404, 'Session course not found');
		const syllabus = await CourseSyllabus.create(payload);
		return await CourseSyllabus.findById(syllabus._id)
			.populate('sessionCourseId', 'sessionId courseId semester departmentId');
	}

	async update(id, payload) {
		const syllabus = await CourseSyllabus.findById(id);
		if (!syllabus) throw new ApiError(404, 'Course syllabus not found');

		if (payload.sessionCourseId && payload.sessionCourseId !== syllabus.sessionCourseId) {
			const sc = await SessionCourse.findById(payload.sessionCourseId);
			if (!sc) throw new ApiError(404, 'Session course not found');
		}

		// Prevent direct status manipulation outside dedicated methods
		if (payload.status && payload.status !== syllabus.status) {
			throw new ApiError(400, 'Status must be changed via approve/publish/archive methods');
		}

		Object.assign(syllabus, payload);
		await syllabus.save();
		return await CourseSyllabus.findById(id)
			.populate('sessionCourseId', 'sessionId courseId semester departmentId');
	}

	async delete(id) {
		const syllabus = await CourseSyllabus.findById(id);
		if (!syllabus) throw new ApiError(404, 'Course syllabus not found');
		await syllabus.softDelete();
		return true;
	}

	async approveSyllabus(id, approvedById) {
		const syllabus = await CourseSyllabus.findById(id);
		if (!syllabus) throw new ApiError(404, 'Course syllabus not found');
		if (syllabus.status !== 'Pending Approval') {
			throw new ApiError(400, 'Syllabus must be in Pending Approval status to approve');
		}
		syllabus.status = 'Approved';
		syllabus.approvedById = approvedById || syllabus.approvedById;
		syllabus.approvedAt = new Date();
		await syllabus.save();
		return syllabus;
	}

	async publishSyllabus(id, publishedById) {
		const syllabus = await CourseSyllabus.findById(id);
		if (!syllabus) throw new ApiError(404, 'Course syllabus not found');
		if (syllabus.status !== 'Approved') {
			throw new ApiError(400, 'Syllabus must be Approved before publishing');
		}
		syllabus.status = 'Published';
		syllabus.publishedById = publishedById || syllabus.publishedById;
		syllabus.publishedAt = new Date();
		await syllabus.save();
		return syllabus;
	}

	async archiveSyllabus(id) {
		const syllabus = await CourseSyllabus.findById(id);
		if (!syllabus) throw new ApiError(404, 'Course syllabus not found');
		if (syllabus.status !== 'Published') {
			throw new ApiError(400, 'Only Published syllabi can be archived');
		}
		syllabus.status = 'Archived';
		await syllabus.save();
		return syllabus;
	}

	async changeStatus(id, nextStatus, actorId) {
		// Generic flow method (optional use)
		const syllabus = await CourseSyllabus.findById(id);
		if (!syllabus) throw new ApiError(404, 'Course syllabus not found');
		const allowed = VALID_STATUS_FLOW[syllabus.status] || [];
		if (!allowed.includes(nextStatus)) {
			throw new ApiError(400, `Invalid status transition from ${syllabus.status} to ${nextStatus}`);
		}
		syllabus.status = nextStatus;
		if (nextStatus === 'Approved') {
			syllabus.approvedById = actorId;
			syllabus.approvedAt = new Date();
		} else if (nextStatus === 'Published') {
			syllabus.publishedById = actorId;
			syllabus.publishedAt = new Date();
		}
		await syllabus.save();
		return syllabus;
	}
}

export default new CourseSyllabusService();


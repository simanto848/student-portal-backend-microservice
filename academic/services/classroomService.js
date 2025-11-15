import Classroom from '../models/Classroom.js';
import { ApiError } from '../utils/ApiResponser.js';

class ClassroomService {
	async getAll(options = {}) {
		const { filters = {}, pagination = {}, search } = options;
		const { page = 1, limit = 10 } = pagination;
		const query = { ...filters };

		if (search) {
			query.$or = [
				{ roomNumber: { $regex: search, $options: 'i' } },
				{ buildingName: { $regex: search, $options: 'i' } },
				{ facilities: { $regex: search, $options: 'i' } },
			];
		}

		const skip = (page - 1) * limit;
		const [classrooms, total] = await Promise.all([
			Classroom.find(query)
				.sort({ createdAt: -1 })
				.skip(skip)
				.limit(parseInt(limit)),
			Classroom.countDocuments(query),
		]);

		return {
			data: classrooms,
			pagination: {
				page: parseInt(page),
				limit: parseInt(limit),
				total,
				pages: Math.ceil(total / limit),
			},
		};
	}

	async getById(id) {
		const classroom = await Classroom.findById(id);
		if (!classroom) throw new ApiError(404, 'Classroom not found');
		return classroom;
	}

	async create(payload) {
		if (payload.roomNumber) {
			const existing = await Classroom.findOne({ roomNumber: payload.roomNumber });
			if (existing) throw new ApiError(409, 'Classroom with this room number already exists');
		}
		const classroom = await Classroom.create(payload);
		return classroom;
	}

	async update(id, payload) {
		const classroom = await Classroom.findById(id);
		if (!classroom) throw new ApiError(404, 'Classroom not found');

		if (payload.roomNumber && payload.roomNumber !== classroom.roomNumber) {
			const existing = await Classroom.findOne({ roomNumber: payload.roomNumber, _id: { $ne: id } });
			if (existing) throw new ApiError(409, 'Classroom with this room number already exists');
		}

		Object.assign(classroom, payload);
		await classroom.save();
		return classroom;
	}

	async delete(id) {
		const classroom = await Classroom.findById(id);
		if (!classroom) throw new ApiError(404, 'Classroom not found');
		await classroom.softDelete();
		return true;
	}
}

export default new ClassroomService();


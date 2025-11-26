import Classroom from '../models/Classroom.js';
import Department from '../models/Department.js';
import { ApiError } from 'shared';

class ClassroomService {
	async getAll(options = {}) {
		const { filters = {}, pagination, search } = options;
		const query = { ...filters };

		if (search) {
			query.$or = [
				{ roomNumber: { $regex: search, $options: 'i' } },
				{ buildingName: { $regex: search, $options: 'i' } },
				{ facilities: { $regex: search, $options: 'i' } },
			];
		}

		if (pagination && (pagination.page || pagination.limit)) {
			const { page = 1, limit = 10 } = pagination;
			const skip = (page - 1) * limit;
			const [classrooms, total] = await Promise.all([
				Classroom.find(query)
					.populate('departmentId', 'name id')
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
		} else {
			const classrooms = await Classroom.find(query)
				.populate('departmentId', 'name id')
				.sort({ createdAt: -1 });

			return {
				data: classrooms,
				total: classrooms.length,
			};
		}
	}

	async getById(id) {
		const classroom = await Classroom.findById(id).populate('departmentId', 'name id');
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

		if (payload.departmentId) {
			const department = await Department.findById(payload.departmentId);
			if (!department) throw new ApiError(404, 'Department not found');
		}

		Object.assign(classroom, payload);
		await classroom.save();
		
		// Populate department details before returning
		await classroom.populate('departmentId', 'name id');
		
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


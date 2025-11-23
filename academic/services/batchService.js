import Batch from '../models/Batch.js';
import Program from '../models/Program.js';
import Department from '../models/Department.js';
import Session from '../models/Session.js';
import { ApiError } from '../utils/ApiResponser.js';

class BatchService {
    async getAll(options = {}) {
        const { filters = {}, pagination, search } = options;
        const query = { ...filters };

        if (search) {
            const yearNum = Number.isNaN(Number(search)) ? null : Number(search);
            query.$or = [
                { name: { $regex: search, $options: 'i' } },
                ...(yearNum !== null ? [{ year: yearNum }] : []),
            ];
        }

        if (pagination && (pagination.page || pagination.limit)) {
            const { page = 1, limit = 10 } = pagination;
            const skip = (page - 1) * limit;
            const [batches, total] = await Promise.all([
                Batch.find(query)
                    .populate('programId', 'name shortName')
                    .populate('departmentId', 'name shortName')
                    .populate('sessionId', 'name year')
                    .populate('counselorId', 'fullName email registrationNumber')
                    .sort({ createdAt: -1 })
                    .skip(skip)
                    .limit(parseInt(limit)),
                Batch.countDocuments(query),
            ]);

            return {
                data: batches,
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total,
                    pages: Math.ceil(total / limit),
                },
            };
        } else {
            const batches = await Batch.find(query)
                .populate('programId', 'name shortName')
                .populate('departmentId', 'name shortName')
                .populate('sessionId', 'name year')
                .populate('counselorId', 'fullName email registrationNumber')
                .sort({ createdAt: -1 });

            return {
                data: batches,
                total: batches.length,
            };
        }
    }

    async getById(id) {
        const batch = await Batch.findById(id)
            .populate('programId', 'name shortName')
            .populate('departmentId', 'name shortName')
            .populate('sessionId', 'name year')
            .populate('counselorId', 'fullName email registrationNumber');

        if (!batch) {
            throw new ApiError(404, 'Batch not found');
        }
        return batch;
    }

    async create(payload) {
        const [program, department, session] = await Promise.all([
            Program.findById(payload.programId),
            Department.findById(payload.departmentId),
            Session.findById(payload.sessionId),
        ]);
        if (!program) throw new ApiError(404, 'Program not found');
        if (!department) throw new ApiError(404, 'Department not found');
        if (!session) throw new ApiError(404, 'Session not found');

        if (payload.name) {
            const existing = await Batch.findOne({ name: payload.name });
            if (existing) throw new ApiError(409, 'Batch with this name already exists');
        }

        const batch = await Batch.create(payload);
        return await Batch.findById(batch._id)
            .populate('programId', 'name shortName')
            .populate('departmentId', 'name shortName')
            .populate('sessionId', 'name year')
            .populate('counselorId', 'fullName email registrationNumber');
    }

    async update(id, payload) {
        const batch = await Batch.findById(id);
        if (!batch) throw new ApiError(404, 'Batch not found');

        if (payload.programId && payload.programId !== batch.programId) {
            const program = await Program.findById(payload.programId);
            if (!program) throw new ApiError(404, 'Program not found');
        }
        if (payload.departmentId && payload.departmentId !== batch.departmentId) {
            const department = await Department.findById(payload.departmentId);
            if (!department) throw new ApiError(404, 'Department not found');
        }
        if (payload.sessionId && payload.sessionId !== batch.sessionId) {
            const session = await Session.findById(payload.sessionId);
            if (!session) throw new ApiError(404, 'Session not found');
        }

        if (payload.name) {
            const existing = await Batch.findOne({ _id: { $ne: id }, name: payload.name });
            if (existing) throw new ApiError(409, 'Batch with this name already exists');
        }

        Object.assign(batch, payload);
        await batch.save();
        return await Batch.findById(id)
            .populate('programId', 'name shortName')
            .populate('departmentId', 'name shortName')
            .populate('sessionId', 'name year')
            .populate('counselorId', 'fullName email registrationNumber');
    }

    async delete(id) {
        const batch = await Batch.findById(id);
        if (!batch) throw new ApiError(404, 'Batch not found');
        await batch.softDelete();
        return true;
    }

    async assignCounselor(id, counselorId) {
        const batch = await Batch.findById(id);
        if (!batch) throw new ApiError(404, 'Batch not found');
        batch.counselorId = counselorId;
        await batch.save();
        return await Batch.findById(id)
            .populate('programId', 'name shortName')
            .populate('departmentId', 'name shortName')
            .populate('sessionId', 'name year')
            .populate('counselorId', 'fullName email registrationNumber');
    }

    async updateSemester(id, semester) {
        const batch = await Batch.findById(id);
        if (!batch) throw new ApiError(404, 'Batch not found');
        if (typeof semester !== 'number' || semester < 1) {
            throw new ApiError(400, 'Semester must be a positive integer');
        }
        if (semester < batch.currentSemester) {
            throw new ApiError(400, 'Cannot decrease current semester');
        }
        if (semester > 20) {
            throw new ApiError(400, 'Semester exceeds allowed maximum');
        }
        batch.currentSemester = semester;
        await batch.save();
        return batch;
    }

    async assignClassRepresentative(id, studentId) {
        const batch = await Batch.findById(id);
        if (!batch) throw new ApiError(404, 'Batch not found');

        // TODO: inject StudentService to verify.
        batch.classRepresentativeId = studentId;
        await batch.save();
        return await Batch.findById(id)
            .populate('programId', 'name shortName')
            .populate('departmentId', 'name shortName')
            .populate('sessionId', 'name year')
            .populate('counselorId', 'fullName email registrationNumber')
            .populate('classRepresentativeId', 'fullName email registrationNumber');
    }

    async removeClassRepresentative(id) {
        const batch = await Batch.findById(id);
        if (!batch) throw new ApiError(404, 'Batch not found');
        
        batch.classRepresentativeId = null;
        await batch.save();
        return await Batch.findById(id)
            .populate('programId', 'name shortName')
            .populate('departmentId', 'name shortName')
            .populate('sessionId', 'name year')
            .populate('counselorId', 'fullName email registrationNumber');
    }
}

export default new BatchService();


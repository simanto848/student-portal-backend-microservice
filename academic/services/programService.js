import Program from '../models/Program.js';
import Department from '../models/Department.js';
import Batch from '../models/Batch.js';
import { ApiError } from '../utils/ApiResponser.js';

class ProgramService {
    async getAll(options = {}) {
        const { filters = {}, pagination = {}, search } = options;
        const { page = 1, limit = 10 } = pagination;
        const query = { ...filters };
        if (search) {
            query.$or = [
                { name: { $regex: search, $options: 'i' } },
                { shortName: { $regex: search, $options: 'i' } },
                { description: { $regex: search, $options: 'i' } },
            ];
        }

        const skip = (page - 1) * limit;
        const [programs, total] = await Promise.all([
            Program.find(query)
                .populate('departmentId', 'name shortName email facultyId')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(parseInt(limit)),
            Program.countDocuments(query),
        ]);

        return {
            data: programs,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / limit),
            },
        };
    }

    async getById(id) {
        const program = await Program.findById(id)
            .populate({
                path: 'departmentId',
                select: 'name shortName email facultyId',
                populate: {
                    path: 'facultyId',
                    select: 'name email'
                }
            });

        if (!program) {
            throw new ApiError(404, 'Program not found');
        }

        const batchesCount = await Batch.countDocuments({ programId: id, deletedAt: null});

        return { ...program.toJSON(), batchesCount };
    }

    async create(payload) {
        const department = await Department.findById(payload.departmentId);
        if (!department) {
            throw new ApiError(404, 'Department not found');
        }

        const existingProgram = await Program.findOne({
            $or: [
                { name: payload.name },
                { shortName: payload.shortName },
            ],
        });

        if (existingProgram) {
            const conflictField = existingProgram.name === payload.name ? 'name' : 'short name';
            throw new ApiError(409, `Program with this ${conflictField} already exists`);
        }

        const program = await Program.create(payload);
        return await Program.findById(program._id).populate('departmentId', 'name shortName email');
    }

    async update(id, payload) {
        const program = await Program.findById(id);
        if (!program) {
            throw new ApiError(404, 'Program not found');
        }

        if (payload.departmentId && payload.departmentId !== program.departmentId) {
            const department = await Department.findById(payload.departmentId);
            if (!department) {
                throw new ApiError(404, 'Department not found');
            }
        }

        if (payload.name || payload.shortName) {
            const conflictQuery = { _id: { $ne: id }, $or: [] };
            if (payload.name) {
                conflictQuery.$or.push({ name: payload.name });
            }
            if (payload.shortName) {
                conflictQuery.$or.push({ shortName: payload.shortName });
            }

            if (conflictQuery.$or.length > 0) {
                const existingProgram = await Program.findOne(conflictQuery);
                if (existingProgram) {
                    const conflictField =
                        existingProgram.name === payload.name ? 'name' : 'short name';
                    throw new ApiError(409, `Program with this ${conflictField} already exists`);
                }
            }
        }

        Object.assign(program, payload);
        await program.save();

        return await Program.findById(id).populate('departmentId', 'name shortName email');
    }

    async delete(id) {
        const program = await Program.findById(id);
        if (!program) {
            throw new ApiError(404, 'Program not found');
        }

        const batchesCount = await Batch.countDocuments({ programId: id, deletedAt: null });
        if (batchesCount > 0) {
            throw new ApiError(400, `Cannot delete program. ${batchesCount} batch(es) are associated with this program`);
        }

        await program.softDelete();
        return true;
    }

    async getBatchesByProgram(programId, options = {}) {
        const program = await Program.findById(programId);
        if (!program) {
            throw new ApiError(404, 'Program not found');
        }

        const { filters = {}, pagination = {}, search } = options;
        const { page = 1, limit = 10 } = pagination;
        const query = { programId, ...filters };
        if (search) {
            query.$or = [
                { name: { $regex: search, $options: 'i' } },
            ];
        }

        const skip = (page - 1) * limit;
        const [batches, total] = await Promise.all([
            Batch.find(query)
                .populate('sessionId', 'name year')
                .populate('counselorId', 'fullName email')
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
    }
}

export default new ProgramService();


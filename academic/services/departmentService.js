import Department from '../models/Department.js';
import Faculty from '../models/Faculty.js';
import Program from '../models/Program.js';
import { ApiError } from 'shared';

class DepartmentService {
    async getAll(options = {}) {
        const { filters = {}, pagination, search } = options;
        const query = { ...filters };
        if (search) {
            query.$or = [
                { name: { $regex: search, $options: 'i' } },
                { shortName: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } },
                { phone: { $regex: search, $options: 'i' } },
            ];
        }

        if (pagination && (pagination.page || pagination.limit)) {
            const { page = 1, limit = 10 } = pagination;
            const skip = (page - 1) * limit;
            const [departments, total] = await Promise.all([
                Department.find(query)
                    .populate('facultyId', 'name email')
                    .sort({ createdAt: -1 })
                    .skip(skip)
                    .limit(parseInt(limit)),
                Department.countDocuments(query),
            ]);

            return {
                data: departments,
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total,
                    pages: Math.ceil(total / limit),
                },
            };
        } else {
            const departments = await Department.find(query)
                .populate('facultyId', 'name email')
                .sort({ createdAt: -1 });

            return {
                data: departments,
                total: departments.length,
            };
        }
    }

    async getById(id) {
        const department = await Department.findById(id)
            .populate('facultyId', 'name email');

        if (!department) {
            throw new ApiError(404, 'Department not found');
        }

        const programsCount = await Program.countDocuments({departmentId: id, deletedAt: null});
        return {...department.toJSON(), programsCount,};
    }

    async create(payload) {
        const faculty = await Faculty.findById(payload.facultyId);
        if (!faculty) {
            throw new ApiError(404, 'Faculty not found');
        }

        const existingDepartment = await Department.findOne({
            $or: [
                { name: payload.name },
                { shortName: payload.shortName },
                { email: payload.email },
            ],
        });
        if (existingDepartment) {
            const conflictField =
                existingDepartment.name === payload.name ? 'name' :
                existingDepartment.shortName === payload.shortName ? 'short name' : 'email';

            throw new ApiError(409, `Department with this ${conflictField} already exists`);
        }

        const department = await Department.create(payload);
        return department;
    }

    async update(id, payload) {
        const department = await Department.findById(id);
        if (!department) {
            throw new ApiError(404, 'Department not found');
        }

        if (payload.facultyId && payload.facultyId !== department.facultyId) {
            const faculty = await Faculty.findById(payload.facultyId);
            if (!faculty) {
                throw new ApiError(404, 'Faculty not found');
            }
        }

        if (payload.name || payload.shortName || payload.email) {
            const conflictQuery = { _id: { $ne: id }, $or: [] };

            if (payload.name) {
                conflictQuery.$or.push({ name: payload.name });
            }
            if (payload.shortName) {
                conflictQuery.$or.push({ shortName: payload.shortName });
            }
            if (payload.email) {
                conflictQuery.$or.push({ email: payload.email });
            }

            if (conflictQuery.$or.length > 0) {
                const existingDepartment = await Department.findOne(conflictQuery);
                if (existingDepartment) {
                    const conflictField =
                        existingDepartment.name === payload.name ? 'name' :
                        existingDepartment.shortName === payload.shortName ? 'short name' : 'email';

                    throw new ApiError(409, `Department with this ${conflictField} already exists`);
                }
            }
        }

        Object.assign(department, payload);
        await department.save();

        return department;
    }

    async delete(id) {
        const department = await Department.findById(id);
        if (!department) {
            throw new ApiError(404, 'Department not found');
        }

        const programsCount = await Program.countDocuments({ departmentId: id, deletedAt: null });
        if (programsCount > 0) {
            throw new ApiError(400, `Cannot delete department with ${programsCount} active program(s)`);
        }

        await department.softDelete();
        return true;
    }

    async getProgramsByDepartment(departmentId, options = {}) {
        const { filters = {}, pagination, search } = options;
        const department = await Department.findById(departmentId);
        if (!department) {
            throw new ApiError(404, 'Department not found');
        }

        const query = { departmentId, ...filters};
        if (search) {
            query.$or = [
                { name: { $regex: search, $options: 'i' } },
                { shortName: { $regex: search, $options: 'i' } },
            ];
        }

        if (pagination && (pagination.page || pagination.limit)) {
            const { page = 1, limit = 10 } = pagination;
            const skip = (page - 1) * limit;
            const [programs, total] = await Promise.all([
                Program.find(query).sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit)),
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
        } else {
            const programs = await Program.find(query).sort({ createdAt: -1 });

            return {
                data: programs,
                total: programs.length,
            };
        }
    }

    async assignDepartmentHead(departmentId, headId, isActingHead = false) {
        const department = await Department.findById(departmentId);
        if (!department) {
            throw new ApiError(404, 'Department not found');
        }

        department.departmentHeadId = headId;
        department.isActingHead = isActingHead;
        await department.save();

        return department;
    }

    async removeDepartmentHead(departmentId) {
        const department = await Department.findById(departmentId);
        if (!department) {
            throw new ApiError(404, 'Department not found');
        }

        department.departmentHeadId = null;
        department.isActingHead = false;
        await department.save();

        return department;
    }
}

export default new DepartmentService();


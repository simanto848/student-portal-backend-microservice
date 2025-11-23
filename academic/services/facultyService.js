import Faculty from '../models/Faculty.js';
import Department from '../models/Department.js';
import { ApiError } from '../utils/ApiResponser.js';

class FacultyService {
    async getAll(options = {}) {
        const { filters = {}, pagination, search } = options;

        const query = { ...filters };
        if (search) {
            query.$or = [
                { name: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } },
                { phone: { $regex: search, $options: 'i' } },
            ];
        }

        if (pagination && (pagination.page || pagination.limit)) {
            const { page = 1, limit = 10 } = pagination;
            const skip = (page - 1) * limit;
            const [faculties, total] = await Promise.all([
                Faculty.find(query)
                    .populate('deanId', 'fullName email registrationNumber')
                    .sort({ createdAt: -1 })
                    .skip(skip)
                    .limit(parseInt(limit)),
                Faculty.countDocuments(query),
            ]);

            return {
                data: faculties,
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total,
                    pages: Math.ceil(total / limit),
                },
            };
        } else {
            const faculties = await Faculty.find(query)
                .populate('deanId', 'fullName email registrationNumber')
                .sort({ createdAt: -1 });

            return {
                data: faculties,
                total: faculties.length,
            };
        }
    }

    async getById(id) {
        const faculty = await Faculty.findById(id).populate('deanId', 'fullName email registrationNumber designation');
        if (!faculty) {
            throw new ApiError(404, 'Faculty not found');
        }

        const departmentsCount = await Department.countDocuments({
            facultyId: id,
            deletedAt: null
        });

        return {
            ...faculty.toJSON(),
            departmentsCount,
        };
    }

    async create(payload) {
        const existingFaculty = await Faculty.findOne({
            $or: [
                { name: payload.name },
                { email: payload.email },
                ...(payload.phone ? [{ phone: payload.phone }] : []),
            ],
        });

        if (existingFaculty) {
            const conflictField = existingFaculty.name === payload.name ? 'name' :
                                  existingFaculty.email === payload.email ? 'email' : 'phone';
            throw new ApiError(409, `Faculty with this ${conflictField} already exists`);
        }

        const faculty = await Faculty.create(payload);
        return faculty;
    }

    async update(id, payload) {
        const faculty = await Faculty.findById(id);
        if (!faculty) {
            throw new ApiError(404, 'Faculty not found');
        }

        if (payload.name || payload.email || payload.phone) {
            const conflictQuery = {
                _id: { $ne: id },
                $or: [],
            };

            if (payload.name) {
                conflictQuery.$or.push({ name: payload.name });
            }
            if (payload.email) {
                conflictQuery.$or.push({ email: payload.email });
            }
            if (payload.phone) {
                conflictQuery.$or.push({ phone: payload.phone });
            }

            if (conflictQuery.$or.length > 0) {
                const existingFaculty = await Faculty.findOne(conflictQuery);
                if (existingFaculty) {
                    const conflictField =
                        existingFaculty.name === payload.name ? 'name' :
                        existingFaculty.email === payload.email ? 'email' : 'phone';

                    throw new ApiError(409, `Faculty with this ${conflictField} already exists`);
                }
            }
        }

        Object.assign(faculty, payload);
        await faculty.save();

        return faculty;
    }

    async delete(id) {
        const faculty = await Faculty.findById(id);
        if (!faculty) {
            throw new ApiError(404, 'Faculty not found');
        }

        const departmentsCount = await Department.countDocuments({facultyId: id, deletedAt: null});
        if (departmentsCount > 0) {
            throw new ApiError(400, `Cannot delete faculty with ${departmentsCount} active department(s)`);
        }

        await faculty.softDelete();
        return true;
    }

    async getDepartmentsByFaculty(facultyId, options = {}) {
        const { filters = {}, pagination, search } = options;
        const faculty = await Faculty.findById(facultyId);
        if (!faculty) {
            throw new ApiError(404, 'Faculty not found');
        }

        const query = { facultyId, ...filters };
        if (search) {
            query.$or = [
                { name: { $regex: search, $options: 'i' } },
                { shortName: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } },
            ];
        }

        // If pagination is provided, use it; otherwise return all data
        if (pagination && (pagination.page || pagination.limit)) {
            const { page = 1, limit = 10 } = pagination;
            const skip = (page - 1) * limit;
            const [departments, total] = await Promise.all([
                Department.find(query)
                    .populate('departmentHeadId', 'fullName email')
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
            // Return all data without pagination
            const departments = await Department.find(query)
                .populate('departmentHeadId', 'fullName email')
                .sort({ createdAt: -1 });

            return {
                data: departments,
                total: departments.length,
            };
        }
    }

    async assignDean(facultyId, deanId) {
        const faculty = await Faculty.findById(facultyId);
        if (!faculty) {
            throw new ApiError(404, 'Faculty not found');
        }

        faculty.deanId = deanId;
        await faculty.save();

        return faculty;
    }

    async removeDean(facultyId) {
        const faculty = await Faculty.findById(facultyId);
        if (!faculty) {
            throw new ApiError(404, 'Faculty not found');
        }

        faculty.deanId = null;
        await faculty.save();

        return faculty;
    }
}

export default new FacultyService();


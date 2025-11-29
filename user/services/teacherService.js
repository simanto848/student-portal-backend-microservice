import Teacher from '../models/Teacher.js';
import Profile from '../models/Profile.js';
import { ApiError } from 'shared';
import academicServiceClient from '../clients/academicServiceClient.js';
import PasswordGenerator from '../utils/passwordGenerator.js';
import emailService from '../utils/emailService.js';

class TeacherService {
    async getAll(options = {}) {
        try {
            const { pagination, search, filters = {} } = options;
            const query = { deletedAt: null };
            if (search) {
                query.$or = [
                    { fullName: { $regex: search, $options: 'i' } },
                    { email: { $regex: search, $options: 'i' } },
                    { registrationNumber: { $regex: search, $options: 'i' } },
                ];
            }
            Object.assign(query, filters);

            if (pagination && (pagination.page || pagination.limit)) {
                const page = parseInt(pagination.page) || 1;
                const limit = parseInt(pagination.limit) || 10;
                const skip = (page - 1) * limit;

                const [teachers, total] = await Promise.all([
                    Teacher.find(query).select('-password').populate('profile').sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
                    Teacher.countDocuments(query),
                ]);

                const teachersWithDept = await Promise.all(teachers.map(async (teacher) => {
                    if (teacher.departmentId) {
                        try {
                            const dept = await academicServiceClient.getDepartmentById(teacher.departmentId);
                            teacher.department = dept.data || dept;
                        } catch (e) {
                            console.error(`Failed to fetch department for teacher ${teacher._id}:`, e.message);
                        }
                    }
                    return teacher;
                }));

                return { teachers: teachersWithDept, pagination: { page, limit, total, pages: Math.ceil(total / limit) } };
            }

            const teachers = await Teacher.find(query).select('-password').populate('profile').sort({ createdAt: -1 }).lean();
            
            const teachersWithDept = await Promise.all(teachers.map(async (teacher) => {
                if (teacher.departmentId) {
                    try {
                        const dept = await academicServiceClient.getDepartmentById(teacher.departmentId);
                        teacher.department = dept.data || dept;
                    } catch (e) {
                        console.error(`Failed to fetch department for teacher ${teacher._id}:`, e.message);
                    }
                }
                return teacher;
            }));

            return { teachers: teachersWithDept };
        } catch (error) {
            throw new ApiError(500, 'Error fetching teachers: ' + error.message);
        }
    }

    async getById(id) {
        try {
            const teacher = await Teacher.findById(id).select('-password').populate('profile').lean();
            if (!teacher) throw new ApiError(404, 'Teacher not found');
            if (teacher.departmentId) {
                try {
                    const dept = await academicServiceClient.getDepartmentById(teacher.departmentId);
                    teacher.department = dept.data || dept;
                } catch (e) {}
            }
            return teacher;
        } catch (error) {
            throw error instanceof ApiError ? error : new ApiError(500, 'Error fetching teacher: ' + error.message);
        }
    }

    async create(data) {
        try {
            const dept = await academicServiceClient.getDepartmentById(data.departmentId);
            const deptShort = (dept.data?.shortName || dept.shortName || '').toUpperCase();
            const registrationNumber = PasswordGenerator.generateTeacherRegistrationNumber(deptShort);
            const temporaryPassword = PasswordGenerator.generate(12);

            try {
                await emailService.sendWelcomeEmailWithCredentials(data.email, {
                    fullName: data.fullName,
                    email: data.email,
                    temporaryPassword,
                });
            } catch (emailError) {
                throw new ApiError(500, 'Failed to send welcome email. Teacher creation aborted: ' + emailError.message);
            }

            const teacherPayload = {
                email: data.email,
                fullName: data.fullName,
                departmentId: data.departmentId,
                password: temporaryPassword,
                registrationNumber,
                designation: data.designation,
                joiningDate: data.joiningDate,
                registeredIpAddress: Array.isArray(data.registeredIpAddress) ? data.registeredIpAddress : [],
            };

            const [existingEmail, existingReg] = await Promise.all([
                Teacher.findOne({ email: teacherPayload.email, deletedAt: null }),
                Teacher.findOne({ registrationNumber: teacherPayload.registrationNumber, deletedAt: null }),
            ]);
            if (existingEmail) throw new ApiError(409, 'Teacher with this email already exists');
            if (existingReg) throw new ApiError(409, 'Registration number already exists');

            const teacher = await Teacher.create(teacherPayload);
            if (data.profile && typeof data.profile === 'object') {
                try {
                    const pf = await Profile.create({ ...data.profile, user: teacher._id });
                    await Teacher.findByIdAndUpdate(teacher._id, { $set: { profile: pf._id } }, { new: true, runValidators: false });
                } catch (profileError) {
                    console.error('Teacher profile creation failed:', profileError.message);
                }
            }

            return await Teacher.findById(teacher._id).select('-password').populate('profile').lean();
        } catch (error) {
            throw error instanceof ApiError ? error : new ApiError(500, 'Error creating teacher: ' + error.message);
        }
    }

    async update(id, payload) {
        try {
            delete payload.password; delete payload.email; delete payload.registrationNumber;
            if (payload.departmentId) {
                await academicServiceClient.getDepartmentById(payload.departmentId);
            }

            const existing = await Teacher.findById(id);
            if (!existing) throw new ApiError(404, 'Teacher not found');
            if (payload.profile && typeof payload.profile === 'object') {
                if (existing.profile) {
                    await Profile.findByIdAndUpdate(existing.profile, { $set: payload.profile }, { new: true, runValidators: true });
                } else {
                    const pf = await Profile.create({ ...payload.profile, user: undefined });
                    payload.profile = pf._id;
                }
            }

            const updated = await Teacher.findByIdAndUpdate(id, { $set: payload }, { new: true, runValidators: true }).select('-password').populate('profile');
            if (!updated) throw new ApiError(404, 'Teacher not found');
            return updated;
        } catch (error) {
            throw error instanceof ApiError ? error : new ApiError(500, 'Error updating teacher: ' + error.message);
        }
    }

    async delete(id) {
        try {
            const t = await Teacher.findById(id);
            if (!t) throw new ApiError(404, 'Teacher not found');
            await t.softDelete();
            return { message: 'Teacher deleted successfully' };
        } catch (error) {
            throw error instanceof ApiError ? error : new ApiError(500, 'Error deleting teacher: ' + error.message);
        }
    }

    async getDeletedTeachers() {
        try {
            const teachers = await Teacher.find({ deletedAt: { $ne: null } })
                .select('-password')
                .populate('profile')
                .lean();

            const teachersWithDept = await Promise.all(teachers.map(async (teacher) => {
                if (teacher.departmentId) {
                    try {
                        const dept = await academicServiceClient.getDepartmentById(teacher.departmentId);
                        teacher.department = dept.data || dept;
                    } catch (e) {
                        console.error(`Failed to fetch department for teacher ${teacher._id}:`, e.message);
                    }
                }
                return teacher;
            }));

            return teachersWithDept;
        } catch (error) {
            throw error instanceof ApiError ? error : new ApiError(500, 'Error getting deleted teachers: ' + error.message);
        }
    }

    async deletePermanently(id) {
        try {
            const t = await Teacher.findOne({ _id: id, deletedAt: { $ne: null } });
            if (!t) throw new ApiError(404, 'Teacher not found');
            await t.deleteOne();
            return { message: 'Teacher deleted permanently successfully' };
        } catch (error) {
            throw error instanceof ApiError ? error : new ApiError(500, 'Error deleting teacher permanently: ' + error.message);
        }
    }

    async restore(id) {
        try {
            const t = await Teacher.findOne({ _id: id, deletedAt: { $ne: null } });
            if (!t) throw new ApiError(404, 'Teacher not found');
            await t.restore();
            return { message: 'Teacher restored successfully' };
        } catch (error) {
            throw error instanceof ApiError ? error : new ApiError(500, 'Error restoring teacher: ' + error.message);
        }
    }

    async addRegisteredIp(teacherId, ipAddress) {
        try {
            const t = await Teacher.findById(teacherId);
            if (!t) throw new ApiError(404, 'Teacher not found');
            if (t.registeredIpAddress.includes(ipAddress)) {
                throw new ApiError(409, 'IP address already registered');
            }

            t.registeredIpAddress.push(ipAddress);
            await t.save({ validateModifiedOnly: true });
            return await Teacher.findById(teacherId).select('-password').populate('profile').lean();
        } catch (error) {
            if (error instanceof ApiError) throw error;
            throw new ApiError(500, 'Error adding registered IP: ' + error.message);
        }
    }

    async removeRegisteredIp(teacherId, ipAddress) {
        try {
            const t = await Teacher.findById(teacherId);
            if (!t) throw new ApiError(404, 'Teacher not found');
            if (!t.registeredIpAddress.includes(ipAddress)) {
                throw new ApiError(404, 'IP address not found in registered list');
            }

            t.registeredIpAddress = t.registeredIpAddress.filter(ip => ip !== ipAddress);
            await t.save({ validateModifiedOnly: true });
            return await Teacher.findById(teacherId).select('-password').populate('profile').lean();
        } catch (error) {
            if (error instanceof ApiError) throw error;
            throw new ApiError(500, 'Error removing registered IP: ' + error.message);
        }
    }

    async updateRegisteredIps(teacherId, ipAddresses) {
        try {
            const t = await Teacher.findByIdAndUpdate(
                teacherId,
                { $set: { registeredIpAddress: ipAddresses } },
                { new: true, runValidators: false }
            ).select('-password').populate('profile');
            if (!t) throw new ApiError(404, 'Teacher not found');
            return t;
        } catch (error) {
            if (error instanceof ApiError) throw error;
            throw new ApiError(500, 'Error updating registered IPs: ' + error.message);
        }
    }
}

export default new TeacherService();

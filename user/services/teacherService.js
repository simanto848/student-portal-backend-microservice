import Teacher from '../models/Teacher.js';
import Profile from '../models/Profile.js';
import { ApiError } from 'shared';
import academicServiceClient from '../clients/academicServiceClient.js';
import PasswordGenerator from '../utils/passwordGenerator.js';
import emailService from '../utils/emailService.js';
import BaseUserService from './BaseUserService.js';

class TeacherService extends BaseUserService {
    constructor() {
        super(Teacher, 'Teacher');
    }

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

                const uniqueDeptIds = [...new Set(teachers.map(t => t.departmentId).filter(Boolean))];
                let deptMap = {};
                if (uniqueDeptIds.length > 0) {
                    try {
                        const depts = await academicServiceClient.getDepartmentsByIds(uniqueDeptIds);
                        depts.forEach(d => { if (d) deptMap[d.id || d._id] = d; });
                    } catch (e) {
                        console.error("Failed to batch fetch departments:", e.message);
                    }
                }

                const teachersWithDept = teachers.map(teacher => {
                    if (teacher.departmentId && deptMap[teacher.departmentId]) {
                        teacher.department = deptMap[teacher.departmentId];
                    }
                    return teacher;
                });

                return { teachers: teachersWithDept, pagination: { page, limit, total, pages: Math.ceil(total / limit) } };
            }

            const teachers = await Teacher.find(query).select('-password').populate('profile').sort({ createdAt: -1 }).lean();

            const uniqueDeptIds = [...new Set(teachers.map(t => t.departmentId).filter(Boolean))];
            let deptMap = {};
            if (uniqueDeptIds.length > 0) {
                try {
                    const depts = await academicServiceClient.getDepartmentsByIds(uniqueDeptIds);
                    depts.forEach(d => { if (d) deptMap[d.id || d._id] = d; });
                } catch (e) {
                    console.error("Failed to batch fetch departments:", e.message);
                }
            }

            const teachersWithDept = teachers.map(teacher => {
                if (teacher.departmentId && deptMap[teacher.departmentId]) {
                    teacher.department = deptMap[teacher.departmentId];
                }
                return teacher;
            });

            return { teachers: teachersWithDept };
        } catch (error) {
            throw new ApiError(500, 'Error fetching teachers: ' + error.message);
        }
    }

    async getById(id) {
        try {
            const teacher = await super.getById(id);
            if (teacher.departmentId) {
                try {
                    const dept = await academicServiceClient.getDepartmentById(teacher.departmentId);
                    teacher.department = dept.data || dept;
                } catch (e) { }
            }
            return teacher;
        } catch (error) {
            throw error instanceof ApiError ? error : new ApiError(500, 'Error fetching teacher: ' + error.message);
        }
    }

    async getByIds(ids) {
        try {
            if (!ids || ids.length === 0) return [];

            const teachers = await Teacher.find({
                _id: { $in: ids },
                deletedAt: null
            }).select('-password').populate('profile').lean();

            // Fetch departments for all teachers
            const uniqueDeptIds = [...new Set(teachers.map(t => t.departmentId).filter(Boolean))];
            let deptMap = {};
            if (uniqueDeptIds.length > 0) {
                try {
                    const depts = await academicServiceClient.getDepartmentsByIds(uniqueDeptIds);
                    depts.forEach(d => { if (d) deptMap[d.id || d._id] = d; });
                } catch (e) {
                    console.error("Failed to batch fetch departments:", e.message);
                }
            }

            const teachersWithDept = teachers.map(teacher => {
                if (teacher.departmentId && deptMap[teacher.departmentId]) {
                    teacher.department = deptMap[teacher.departmentId];
                }
                return teacher;
            });

            return teachersWithDept;
        } catch (error) {
            throw new ApiError(500, 'Error fetching teachers by IDs: ' + error.message);
        }
    }

    async create(data) {
        try {
            const dept = await academicServiceClient.getDepartmentById(data.departmentId);
            const deptShort = (dept.data?.shortName || dept.shortName || '').toUpperCase();
            const registrationNumber = PasswordGenerator.generateTeacherRegistrationNumber(deptShort);
            const temporaryPassword = PasswordGenerator.generate(12);

            // Email sending moved to after teacher creation

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

            // Send welcome email non-blockingly
            emailService.sendWelcomeEmailWithCredentials(data.email, {
                fullName: data.fullName,
                email: data.email,
                temporaryPassword,
            }).catch(emailError => {
                console.error('Failed to send welcome email:', emailError.message);
            });

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
                    delete payload.profile;
                } else {
                    // Check if profile exists for this user but wasn't linked
                    let pf = await Profile.findOne({ user: id });

                    if (pf) {
                        // Update existing unlinked profile
                        pf = await Profile.findByIdAndUpdate(pf._id, { $set: payload.profile }, { new: true, runValidators: true });
                    } else {
                        const nameParts = existing.fullName ? existing.fullName.split(' ') : ['Unknown'];
                        const firstName = payload.profile.firstName || nameParts[0];
                        const lastName = payload.profile.lastName || (nameParts.length > 1 ? nameParts.slice(1).join(' ') : nameParts[0]);

                        pf = await Profile.create({
                            firstName,
                            lastName,
                            ...payload.profile,
                            user: id
                        });
                    }
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
}

export default new TeacherService();

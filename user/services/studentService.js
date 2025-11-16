import Student from '../models/Student.js';
import StudentProfile from '../models/StudentProfile.js';
import { ApiError } from '../utils/ApiResponser.js';
import academicServiceClient from '../clients/academicServiceClient.js';
import PasswordGenerator from '../utils/passwordGenerator.js';
import emailService from '../utils/emailService.js';

class StudentService {
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

                const [students, total] = await Promise.all([
                    Student.find(query).select('-password').populate('profile').sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
                    Student.countDocuments(query),
                ]);

                return {
                    students,
                    pagination: {
                        page,
                        limit,
                        total,
                        pages: Math.ceil(total / limit),
                    },
                };
            }

            const students = await Student.find(query).select('-password').populate('profile').sort({ createdAt: -1 }).lean();
            return { students };
        } catch (error) {
            throw new ApiError(500, 'Error fetching students: ' + error.message);
        }
    }

    async getById(id) {
        try {
            const student = await Student.findById(id).select('-password').populate('profile').lean();
            if (!student) throw new ApiError(404, 'Student not found');
            return student;
        } catch (error) {
            throw error instanceof ApiError ? error : new ApiError(500, 'Error fetching student: ' + error.message);
        }
    }

    async create(data) {
        try {
            const [dept, program, batchResp, sessionResp] = await Promise.all([
                academicServiceClient.getDepartmentById(data.departmentId),
                academicServiceClient.getProgramById(data.programId),
                academicServiceClient.getBatchById(data.batchId),
                academicServiceClient.getSessionById(data.sessionId),
            ]);

            const batch = batchResp.data || batchResp;
            const session = sessionResp.data || sessionResp;

            const deptShort = (dept.data?.shortName || dept.shortName || '').toUpperCase();
            const batchName = (batch.name || '').toUpperCase();
            const yearShort = String(batch.year || session.year || new Date().getFullYear()).slice(-2);
            const unique = PasswordGenerator.generateUniqueNumber();
            const registrationNumber = `${deptShort}-${batchName}-${yearShort}-${unique}`;

            const temporaryPassword = PasswordGenerator.generate(12);

            // Send welcome email with credentials; fail if email fails
            try {
                await emailService.sendWelcomeEmailWithCredentials(data.email, {
                    fullName: data.fullName,
                    email: data.email,
                    temporaryPassword,
                });
            } catch (emailError) {
                throw new ApiError(500, 'Failed to send welcome email. Student creation aborted: ' + emailError.message);
            }

            const studentPayload = {
                email: data.email,
                fullName: data.fullName,
                password: temporaryPassword,
                registrationNumber,
                departmentId: data.departmentId,
                programId: data.programId,
                batchId: data.batchId,
                sessionId: data.sessionId,
                currentSemester: 1,
                admissionDate: data.admissionDate || new Date(),
            };

            const [existingEmail, existingReg] = await Promise.all([
                Student.findOne({ email: studentPayload.email, deletedAt: null }),
                Student.findOne({ registrationNumber: studentPayload.registrationNumber, deletedAt: null }),
            ]);
            if (existingEmail) throw new ApiError(409, 'Student with this email already exists');
            if (existingReg) throw new ApiError(409, 'Registration number already exists');

            const student = await Student.create(studentPayload);

            await academicServiceClient.updateBatchCurrentStudents(data.batchId, +1);

            // Optional studentProfile creation AFTER student exists
            if (data.studentProfile && typeof data.studentProfile === 'object') {
                try {
                    const createdProfile = await StudentProfile.create({ ...data.studentProfile, studentId: student._id });
                    await Student.findByIdAndUpdate(student._id, { $set: { profile: createdProfile._id } }, { new: true, runValidators: false });
                } catch (profileError) {
                    // Do not fail the whole operation; log and proceed
                    console.error('Student profile creation failed:', profileError.message);
                }
            }

            return await Student.findById(student._id).select('-password').populate('profile').lean();
        } catch (error) {
            throw error instanceof ApiError ? error : new ApiError(500, 'Error creating student: ' + error.message);
        }
    }

    async update(id, payload) {
        try {
            // Disallow protected fields
            delete payload.password; delete payload.registrationNumber; delete payload.email;

            // If moving to new batch, adjust counts
            const existing = await Student.findById(id);
            if (!existing) throw new ApiError(404, 'Student not found');

            if (payload.batchId && payload.batchId !== existing.batchId) {
                await academicServiceClient.updateBatchCurrentStudents(existing.batchId, -1);
                await academicServiceClient.updateBatchCurrentStudents(payload.batchId, +1);
            }

            // If profile object included, upsert
            if (payload.profile && typeof payload.profile === 'object') {
                if (existing.profile) {
                    await StudentProfile.findByIdAndUpdate(existing.profile, { $set: payload.profile }, { new: true, runValidators: true });
                } else {
                    const profile = await StudentProfile.create({ ...payload.profile, studentId: undefined });
                    payload.profile = profile._id;
                }
            }

            const updated = await Student.findByIdAndUpdate(id, { $set: payload }, { new: true, runValidators: true }).select('-password').populate('profile');
            if (!updated) throw new ApiError(404, 'Student not found');
            return updated;
        } catch (error) {
            throw error instanceof ApiError ? error : new ApiError(500, 'Error updating student: ' + error.message);
        }
    }

    async delete(id) {
        try {
            const st = await Student.findById(id);
            if (!st) throw new ApiError(404, 'Student not found');
            await st.softDelete();
            // Decrement batch count
            await academicServiceClient.updateBatchCurrentStudents(st.batchId, -1);
            return { message: 'Student deleted successfully' };
        } catch (error) {
            throw error instanceof ApiError ? error : new ApiError(500, 'Error deleting student: ' + error.message);
        }
    }

    async restore(id) {
        try {
            const st = await Student.findOne({ _id: id, deletedAt: { $ne: null } });
            if (!st) throw new ApiError(404, 'Deleted student not found');
            await st.restore();
            // Increment batch count back
            await academicServiceClient.updateBatchCurrentStudents(st.batchId, +1);
            const restored = await Student.findById(id).select('-password').populate('profile').lean();
            return restored;
        } catch (error) {
            throw error instanceof ApiError ? error : new ApiError(500, 'Error restoring student: ' + error.message);
        }
    }
}

export default new StudentService();

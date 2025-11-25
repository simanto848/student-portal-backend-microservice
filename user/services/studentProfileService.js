import StudentProfile from '../models/StudentProfile.js';
import Student from '../models/Student.js';
import { ApiError } from 'shared';

class StudentProfileService {
    async getByStudentId(studentId) {
        try {
            const student = await Student.findById(studentId);
            if (!student) {
                throw new ApiError(404, 'Student not found');
            }

            const profile = await StudentProfile.findOne({ studentId }).lean();
            if (!profile) {
                throw new ApiError(404, 'Student profile not found');
            }

            return profile;
        } catch (error) {
            throw error instanceof ApiError ? error : new ApiError(500, 'Error fetching student profile: ' + error.message);
        }
    }

    async create(data) {
        try {
            const student = await Student.findById(data.studentId);
            if (!student) {
                throw new ApiError(404, 'Student not found');
            }

            const existingProfile = await StudentProfile.findOne({ studentId: data.studentId, deletedAt: null });
            if (existingProfile) {
                throw new ApiError(409, 'Student profile already exists');
            }

            const profile = await StudentProfile.create(data);
            return profile;
        } catch (error) {
            throw error instanceof ApiError ? error : new ApiError(500, 'Error creating student profile: ' + error.message);
        }
    }

    async update(studentId, payload) {
        try {
            const student = await Student.findById(studentId);
            if (!student) {
                throw new ApiError(404, 'Student not found');
            }

            const profile = await StudentProfile.findOneAndUpdate(
                { studentId },
                { $set: payload },
                { new: true, runValidators: true }
            );

            if (!profile) {
                throw new ApiError(404, 'Student profile not found');
            }

            return profile;
        } catch (error) {
            throw error instanceof ApiError ? error : new ApiError(500, 'Error updating student profile: ' + error.message);
        }
    }

    async upsert(studentId, payload) {
        try {
            const student = await Student.findById(studentId);
            if (!student) {
                throw new ApiError(404, 'Student not found');
            }

            const profile = await StudentProfile.findOneAndUpdate(
                { studentId },
                { $set: { ...payload, studentId } },
                { new: true, upsert: true, runValidators: true }
            );

            return profile;
        } catch (error) {
            throw error instanceof ApiError ? error : new ApiError(500, 'Error upserting student profile: ' + error.message);
        }
    }

    async delete(studentId) {
        try {
            const profile = await StudentProfile.findOne({ studentId });
            if (!profile) {
                throw new ApiError(404, 'Student profile not found');
            }

            await profile.softDelete();
            return { message: 'Student profile deleted successfully' };
        } catch (error) {
            throw error instanceof ApiError ? error : new ApiError(500, 'Error deleting student profile: ' + error.message);
        }
    }

    async restore(studentId) {
        try {
            const profile = await StudentProfile.findOne({ studentId, deletedAt: { $ne: null } });
            if (!profile) {
                throw new ApiError(404, 'Deleted student profile not found');
            }

            await profile.restore();
            return await StudentProfile.findOne({ studentId }).lean();
        } catch (error) {
            throw error instanceof ApiError ? error : new ApiError(500, 'Error restoring student profile: ' + error.message);
        }
    }

    async addEducationRecord(studentId, educationData) {
        try {
            const profile = await StudentProfile.findOne({ studentId });
            if (!profile) {
                throw new ApiError(404, 'Student profile not found');
            }

            profile.educationRecords.push(educationData);
            await profile.save();

            return profile;
        } catch (error) {
            throw error instanceof ApiError ? error : new ApiError(500, 'Error adding education record: ' + error.message);
        }
    }

    async removeEducationRecord(studentId, recordIndex) {
        try {
            const profile = await StudentProfile.findOne({ studentId });
            if (!profile) {
                throw new ApiError(404, 'Student profile not found');
            }

            if (recordIndex < 0 || recordIndex >= profile.educationRecords.length) {
                throw new ApiError(400, 'Invalid education record index');
            }

            profile.educationRecords.splice(recordIndex, 1);
            await profile.save();

            return profile;
        } catch (error) {
            throw error instanceof ApiError ? error : new ApiError(500, 'Error removing education record: ' + error.message);
        }
    }

    async updateEducationRecord(studentId, recordIndex, educationData) {
        try {
            const profile = await StudentProfile.findOne({ studentId });
            if (!profile) {
                throw new ApiError(404, 'Student profile not found');
            }

            if (recordIndex < 0 || recordIndex >= profile.educationRecords.length) {
                throw new ApiError(400, 'Invalid education record index');
            }

            Object.assign(profile.educationRecords[recordIndex], educationData);
            await profile.save();

            return profile;
        } catch (error) {
            throw error instanceof ApiError ? error : new ApiError(500, 'Error updating education record: ' + error.message);
        }
    }
}

export default new StudentProfileService();
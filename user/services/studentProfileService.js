import StudentProfile from '../models/StudentProfile.js';
import Student from '../models/Student.js';
import { ApiError } from '../utils/ApiResponser.js';

class StudentProfileService {
    /**
     * Get student profile by student ID
     */
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

    /**
     * Create a new student profile
     */
    async create(data) {
        try {
            // Check if student exists
            const student = await Student.findById(data.studentId);
            if (!student) {
                throw new ApiError(404, 'Student not found');
            }

            // Check if profile already exists
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

    /**
     * Update student profile
     */
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

    /**
     * Create or update student profile (upsert)
     */
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

    /**
     * Delete student profile (soft delete)
     */
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

    /**
     * Restore soft-deleted student profile
     */
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

    /**
     * Add an education record to student profile
     */
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

    /**
     * Remove an education record from student profile by index
     */
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

    /**
     * Update a specific education record by index
     */
    async updateEducationRecord(studentId, recordIndex, educationData) {
        try {
            const profile = await StudentProfile.findOne({ studentId });
            if (!profile) {
                throw new ApiError(404, 'Student profile not found');
            }

            if (recordIndex < 0 || recordIndex >= profile.educationRecords.length) {
                throw new ApiError(400, 'Invalid education record index');
            }

            // Update the specific record
            Object.assign(profile.educationRecords[recordIndex], educationData);
            await profile.save();

            return profile;
        } catch (error) {
            throw error instanceof ApiError ? error : new ApiError(500, 'Error updating education record: ' + error.message);
        }
    }
}

export default new StudentProfileService();

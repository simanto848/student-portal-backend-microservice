import Teacher from '../models/Teacher.js';
import Profile from '../models/Profile.js';
import { ApiError } from 'shared';

class TeacherProfileService {
    async getByTeacherId(teacherId) {
        try {
            const teacher = await Teacher.findById(teacherId).populate('profile').lean();
            if (!teacher) {
                throw new ApiError(404, 'Teacher not found');
            }
            if (!teacher.profile) {
                return null;
            }
            return teacher.profile;
        } catch (error) {
            if (error instanceof ApiError) throw error;
            throw new ApiError(500, 'Error fetching teacher profile: ' + error.message);
        }
    }

    async create(teacherId, profileData) {
        try {
            const teacher = await Teacher.findById(teacherId);
            if (!teacher) {
                throw new ApiError(404, 'Teacher not found');
            }

            if (teacher.profile) {
                throw new ApiError(409, 'Teacher profile already exists. Use update instead.');
            }

            const profile = await Profile.create({
                user: teacherId,
                ...profileData,
            });

            teacher.profile = profile._id;
            await teacher.save();

            return profile;
        } catch (error) {
            if (error instanceof ApiError) throw error;
            throw new ApiError(500, 'Error creating teacher profile: ' + error.message);
        }
    }

    async update(teacherId, updateData) {
        try {
            const teacher = await Teacher.findById(teacherId).populate('profile');
            if (!teacher) {
                throw new ApiError(404, 'Teacher not found');
            }

            if (!teacher.profile) {
                throw new ApiError(404, 'Teacher profile not found. Use create instead.');
            }

            const profile = await Profile.findByIdAndUpdate(
                teacher.profile._id,
                { $set: updateData },
                { new: true, runValidators: true }
            );

            return profile;
        } catch (error) {
            if (error instanceof ApiError) throw error;
            throw new ApiError(500, 'Error updating teacher profile: ' + error.message);
        }
    }

    async upsert(teacherId, profileData) {
        try {
            const teacher = await Teacher.findById(teacherId).populate('profile');
            if (!teacher) {
                throw new ApiError(404, 'Teacher not found');
            }

            let profile;
            if (teacher.profile) {
                profile = await Profile.findByIdAndUpdate(
                    teacher.profile._id,
                    { $set: profileData },
                    { new: true, runValidators: true }
                );
            } else {
                profile = await Profile.create({
                    user: teacherId,
                    ...profileData,
                });
                teacher.profile = profile._id;
                await teacher.save();
            }

            return profile;
        } catch (error) {
            if (error instanceof ApiError) throw error;
            throw new ApiError(500, 'Error saving teacher profile: ' + error.message);
        }
    }

    async delete(teacherId) {
        try {
            const teacher = await Teacher.findById(teacherId);
            if (!teacher) {
                throw new ApiError(404, 'Teacher not found');
            }

            if (!teacher.profile) {
                throw new ApiError(404, 'Teacher profile not found');
            }

            await Profile.findByIdAndDelete(teacher.profile);
            teacher.profile = null;
            await teacher.save();

            return { message: 'Teacher profile deleted successfully' };
        } catch (error) {
            if (error instanceof ApiError) throw error;
            throw new ApiError(500, 'Error deleting teacher profile: ' + error.message);
        }
    }
}

export default new TeacherProfileService();


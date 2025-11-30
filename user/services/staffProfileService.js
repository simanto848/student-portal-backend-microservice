import Staff from '../models/Staff.js';
import Profile from '../models/Profile.js';
import { ApiError } from 'shared';

class StaffProfileService {
    async getByStaffId(staffId) {
        try {
            const staff = await Staff.findById(staffId).populate('profile').lean();
            if (!staff) {
                throw new ApiError(404, 'Staff not found');
            }
            if (!staff.profile) {
                return null;
            }
            return staff.profile;
        } catch (error) {
            if (error instanceof ApiError) throw error;
            throw new ApiError(500, 'Error fetching staff profile: ' + error.message);
        }
    }

    async create(staffId, profileData) {
        try {
            const staff = await Staff.findById(staffId);
            if (!staff) {
                throw new ApiError(404, 'Staff not found');
            }

            if (staff.profile) {
                throw new ApiError(409, 'Staff profile already exists. Use update instead.');
            }

            const profile = await Profile.create({
                user: staffId,
                ...profileData,
            });

            staff.profile = profile._id;
            await staff.save();

            return profile;
        } catch (error) {
            if (error instanceof ApiError) throw error;
            throw new ApiError(500, 'Error creating staff profile: ' + error.message);
        }
    }

    async update(staffId, updateData) {
        try {
            const staff = await Staff.findById(staffId).populate('profile');
            if (!staff) {
                throw new ApiError(404, 'Staff not found');
            }

            if (!staff.profile) {
                throw new ApiError(404, 'Staff profile not found. Use create instead.');
            }

            const profile = await Profile.findByIdAndUpdate(
                staff.profile._id,
                { $set: updateData },
                { new: true, runValidators: true }
            );

            return profile;
        } catch (error) {
            if (error instanceof ApiError) throw error;
            throw new ApiError(500, 'Error updating staff profile: ' + error.message);
        }
    }

    async upsert(staffId, profileData) {
        try {
            const staff = await Staff.findById(staffId).populate('profile');
            if (!staff) {
                throw new ApiError(404, 'Staff not found');
            }

            let profile;
            if (staff.profile) {
                profile = await Profile.findByIdAndUpdate(
                    staff.profile._id,
                    { $set: profileData },
                    { new: true, runValidators: true }
                );
            } else {
                profile = await Profile.create({
                    user: staffId,
                    ...profileData,
                });
                staff.profile = profile._id;
                await staff.save();
            }

            return profile;
        } catch (error) {
            if (error instanceof ApiError) throw error;
            throw new ApiError(500, 'Error saving staff profile: ' + error.message);
        }
    }

    async delete(staffId) {
        try {
            const staff = await Staff.findById(staffId);
            if (!staff) {
                throw new ApiError(404, 'Staff not found');
            }

            if (!staff.profile) {
                throw new ApiError(404, 'Staff profile not found');
            }

            await Profile.findByIdAndDelete(staff.profile);
            staff.profile = null;
            await staff.save();

            return { message: 'Staff profile deleted successfully' };
        } catch (error) {
            if (error instanceof ApiError) throw error;
            throw new ApiError(500, 'Error deleting staff profile: ' + error.message);
        }
    }
}

export default new StaffProfileService();

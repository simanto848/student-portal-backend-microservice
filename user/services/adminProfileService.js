import Admin from '../models/Admin.js';
import Profile from '../models/Profile.js';
import { ApiError } from 'shared';

class AdminProfileService {
    async getByAdminId(adminId) {
        try {
            const admin = await Admin.findById(adminId).populate('profile').lean();
            if (!admin) {
                throw new ApiError(404, 'Admin not found');
            }
            if (!admin.profile) {
                return null;
            }
            return admin.profile;
        } catch (error) {
            if (error instanceof ApiError) throw error;
            throw new ApiError(500, 'Error fetching admin profile: ' + error.message);
        }
    }

    async create(adminId, profileData) {
        try {
            const admin = await Admin.findById(adminId);
            if (!admin) {
                throw new ApiError(404, 'Admin not found');
            }

            if (admin.profile) {
                throw new ApiError(409, 'Admin profile already exists. Use update instead.');
            }

            const profile = await Profile.create({
                user: adminId,
                ...profileData,
            });

            admin.profile = profile._id;
            await admin.save();

            return profile;
        } catch (error) {
            if (error instanceof ApiError) throw error;
            throw new ApiError(500, 'Error creating admin profile: ' + error.message);
        }
    }

    async update(adminId, updateData) {
        try {
            const admin = await Admin.findById(adminId).populate('profile');
            if (!admin) {
                throw new ApiError(404, 'Admin not found');
            }

            if (!admin.profile) {
                throw new ApiError(404, 'Admin profile not found. Use create instead.');
            }

            const profile = await Profile.findByIdAndUpdate(
                admin.profile._id,
                { $set: updateData },
                { new: true, runValidators: true }
            );

            return profile;
        } catch (error) {
            if (error instanceof ApiError) throw error;
            throw new ApiError(500, 'Error updating admin profile: ' + error.message);
        }
    }

    async upsert(adminId, profileData) {
        try {
            const admin = await Admin.findById(adminId).populate('profile');
            if (!admin) {
                throw new ApiError(404, 'Admin not found');
            }

            let profile;
            if (admin.profile) {
                profile = await Profile.findByIdAndUpdate(
                    admin.profile._id,
                    { $set: profileData },
                    { new: true, runValidators: true }
                );
            } else {
                profile = await Profile.create({
                    user: adminId,
                    ...profileData,
                });
                admin.profile = profile._id;
                await admin.save();
            }

            return profile;
        } catch (error) {
            if (error instanceof ApiError) throw error;
            throw new ApiError(500, 'Error saving admin profile: ' + error.message);
        }
    }

    async delete(adminId) {
        try {
            const admin = await Admin.findById(adminId);
            if (!admin) {
                throw new ApiError(404, 'Admin not found');
            }

            if (!admin.profile) {
                throw new ApiError(404, 'Admin profile not found');
            }

            await Profile.findByIdAndDelete(admin.profile);
            admin.profile = null;
            await admin.save();

            return { message: 'Admin profile deleted successfully' };
        } catch (error) {
            if (error instanceof ApiError) throw error;
            throw new ApiError(500, 'Error deleting admin profile: ' + error.message);
        }
    }
}

export default new AdminProfileService();


import Admin from '../models/Admin.js';
import { ApiError } from '../utils/ApiResponser.js';
import PasswordGenerator from '../utils/passwordGenerator.js';
import emailService from '../utils/emailService.js';
import mongoose from 'mongoose';

class AdminService {
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

            if (filters.role) {
                query.role = filters.role;
            }

            if (pagination && (pagination.page || pagination.limit)) {
                const page = parseInt(pagination.page) || 1;
                const limit = parseInt(pagination.limit) || 10;
                const skip = (page - 1) * limit;

                const [admins, total] = await Promise.all([
                    Admin.find(query)
                        .select('-password')
                        .populate('profile')
                        .sort({ createdAt: -1 })
                        .skip(skip)
                        .limit(limit)
                        .lean(),
                    Admin.countDocuments(query),
                ]);

                return {
                    admins,
                    pagination: {
                        page,
                        limit,
                        total,
                        pages: Math.ceil(total / limit),
                    },
                };
            }

            const admins = await Admin.find(query).select('-password').populate('profile').sort({ createdAt: -1 }).lean();
            return { admins };
        } catch (error) {
            throw new ApiError(500, 'Error fetching admins: ' + error.message);
        }
    }

    async getById(adminId) {
        try {
            const admin = await Admin.findById(adminId).select('-password').populate('profile').lean();
            if (!admin) {
                throw new ApiError(404, 'Admin not found');
            }

            return admin;
        } catch (error) {
            if (error instanceof ApiError) throw error;
            throw new ApiError(500, 'Error fetching admin: ' + error.message);
        }
    }

    async create(adminData) {
        try {
            if (!adminData.registrationNumber) {
                adminData.registrationNumber = PasswordGenerator.generateAdminRegistrationNumber();
            }

            const existingAdmin = await Admin.findOne({ email: adminData.email, deletedAt: null });
            if (existingAdmin) {
                throw new ApiError(409, 'Admin with this email already exists');
            }

            const existingRegNumber = await Admin.findOne({ registrationNumber: adminData.registrationNumber, deletedAt: null });
            if (existingRegNumber) {
                throw new ApiError(409, 'Registration number already exists');
            }

            const temporaryPassword = PasswordGenerator.generate(12);
            adminData.password = temporaryPassword;

            try {
                await emailService.sendWelcomeEmailWithCredentials(adminData.email, {
                    fullName: adminData.fullName,
                    email: adminData.email,
                    temporaryPassword: temporaryPassword,
                });
            } catch (emailError) {
                throw new ApiError(500, 'Failed to send welcome email. Admin creation aborted: ' + emailError.message);
            }

            const admin = await Admin.create(adminData);
            const createdAdmin = await Admin.findById(admin._id).select('-password').lean();
            return createdAdmin;
        } catch (error) {
            if (error instanceof ApiError) throw error;
            if (error.code === 11000) {
                const field = Object.keys(error.keyPattern)[0];
                throw new ApiError(409, `Admin with this ${field} already exists`);
            }
            throw new ApiError(500, 'Error creating admin: ' + error.message);
        }
    }

    async update(adminId, updateData) {
        try {
            delete updateData.password;
            delete updateData.email;
            delete updateData.registrationNumber;

            const admin = await Admin.findByIdAndUpdate(
                adminId,
                { $set: updateData },
                { new: true, runValidators: true }
            ).select('-password').populate('profile');

            if (!admin) {
                throw new ApiError(404, 'Admin not found');
            }

            return admin;
        } catch (error) {
            if (error instanceof ApiError) throw error;
            throw new ApiError(500, 'Error updating admin: ' + error.message);
        }
    }

    async delete(adminId) {
        try {
            const admin = await Admin.findById(adminId);
            if (!admin) {
                throw new ApiError(404, 'Admin not found');
            }

            await admin.softDelete();
            return { message: 'Admin deleted successfully' };
        } catch (error) {
            if (error instanceof ApiError) throw error;
            throw new ApiError(500, 'Error deleting admin: ' + error.message);
        }
    }

    async updateRole(adminId, newRole) {
        try {
            const admin = await Admin.findByIdAndUpdate(
                adminId,
                { $set: { role: newRole } },
                { new: true, runValidators: true }
            ).select('-password').populate('profile');

            if (!admin) {
                throw new ApiError(404, 'Admin not found');
            }

            return admin;
        } catch (error) {
            if (error instanceof ApiError) throw error;
            throw new ApiError(500, 'Error updating admin role: ' + error.message);
        }
    }

    async getStatistics() {
        try {
            const [total, superAdmins, admins, moderators] = await Promise.all([
                Admin.countDocuments({ deletedAt: null }),
                Admin.countDocuments({ role: 'super_admin', deletedAt: null }),
                Admin.countDocuments({ role: 'admin', deletedAt: null }),
                Admin.countDocuments({ role: 'moderator', deletedAt: null }),
            ]);

            return {
                total,
                byRole: {
                    super_admin: superAdmins,
                    admin: admins,
                    moderator: moderators,
                },
            };
        } catch (error) {
            throw new ApiError(500, 'Error fetching admin statistics: ' + error.message);
        }
    }

    async addRegisteredIp(adminId, ipAddress) {
        try {
            const admin = await Admin.findById(adminId);
            if (!admin) {
                throw new ApiError(404, 'Admin not found');
            }

            if (admin.registeredIpAddress.includes(ipAddress)) {
                throw new ApiError(409, 'IP address already registered');
            }

            admin.registeredIpAddress.push(ipAddress);
            await admin.save({ validateModifiedOnly: true });

            const updatedAdmin = await Admin.findById(adminId).select('-password').populate('profile').lean();
            return updatedAdmin;
        } catch (error) {
            if (error instanceof ApiError) throw error;
            throw new ApiError(500, 'Error adding registered IP: ' + error.message);
        }
    }

    async removeRegisteredIp(adminId, ipAddress) {
        try {
            const admin = await Admin.findById(adminId);
            if (!admin) {
                throw new ApiError(404, 'Admin not found');
            }

            if (!admin.registeredIpAddress.includes(ipAddress)) {
                throw new ApiError(404, 'IP address not found in registered list');
            }

            admin.registeredIpAddress = admin.registeredIpAddress.filter(ip => ip !== ipAddress);
            await admin.save({ validateModifiedOnly: true });

            const updatedAdmin = await Admin.findById(adminId).select('-password').populate('profile').lean();
            return updatedAdmin;
        } catch (error) {
            if (error instanceof ApiError) throw error;
            throw new ApiError(500, 'Error removing registered IP: ' + error.message);
        }
    }

    async updateRegisteredIps(adminId, ipAddresses) {
        try {
            const admin = await Admin.findByIdAndUpdate(
                adminId,
                { $set: { registeredIpAddress: ipAddresses } },
                { new: true, runValidators: false }
            ).select('-password').populate('profile');

            if (!admin) {
                throw new ApiError(404, 'Admin not found');
            }

            return admin;
        } catch (error) {
            if (error instanceof ApiError) throw error;
            throw new ApiError(500, 'Error updating registered IPs: ' + error.message);
        }
    }
}

export default new AdminService();

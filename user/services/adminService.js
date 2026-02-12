import Admin from '../models/Admin.js';
import Profile from '../models/Profile.js';
import { ApiError } from 'shared';
import PasswordGenerator from '../utils/passwordGenerator.js';
import emailService from '../utils/emailService.js';
import mongoose from 'mongoose';
import BaseUserService from './BaseUserService.js';

class AdminService extends BaseUserService {
    constructor() {
        super(Admin, 'Admin');
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
            let profileData = null;
            if (adminData.profile && typeof adminData.profile === 'object') {
                profileData = adminData.profile;
                delete adminData.profile;
            }

            const admin = await Admin.create(adminData);
            if (profileData) {
                try {
                    const nameParts = adminData.fullName ? adminData.fullName.split(' ') : ['Unknown'];
                    const firstName = profileData.firstName || nameParts[0];
                    const lastName = profileData.lastName || (nameParts.length > 1 ? nameParts.slice(1).join(' ') : nameParts[0]);

                    const profile = await Profile.create({
                        firstName,
                        lastName,
                        ...profileData,
                        user: admin._id
                    });

                    await Admin.findByIdAndUpdate(admin._id, { $set: { profile: profile._id } });
                } catch (profileError) {
                    console.error('Failed to create admin profile:', profileError.message);
                }
            }

            emailService.sendWelcomeEmailWithCredentials(adminData.email, {
                fullName: adminData.fullName,
                email: adminData.email,
                temporaryPassword: temporaryPassword,
            }).catch(emailError => {
                console.error('Failed to send welcome email:', emailError.message);
            });

            const createdAdmin = await Admin.findById(admin._id).select('-password').populate('profile').lean();
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

            Object.keys(updateData).forEach(key => {
                if (updateData[key] === undefined || updateData[key] === null || updateData[key] === '') {
                    delete updateData[key];
                }
            });

            const existing = await Admin.findById(adminId);
            if (!existing) {
                throw new ApiError(404, 'Admin not found');
            }

            if (updateData.profile && typeof updateData.profile === 'object') {
                if (existing.profile) {
                    await Profile.findByIdAndUpdate(
                        typeof existing.profile === 'string' ? existing.profile : existing.profile._id,
                        { $set: updateData.profile },
                        { new: true, runValidators: true }
                    );
                    delete updateData.profile;
                } else {
                    let pf = await Profile.findOne({ user: adminId });

                    if (pf) {
                        pf = await Profile.findByIdAndUpdate(pf._id, { $set: updateData.profile }, { new: true, runValidators: true });
                    } else {
                        const nameParts = existing.fullName ? existing.fullName.split(' ') : ['Unknown'];
                        const firstName = updateData.profile.firstName || nameParts[0];
                        const lastName = updateData.profile.lastName || (nameParts.length > 1 ? nameParts.slice(1).join(' ') : nameParts[0]);

                        pf = await Profile.create({
                            firstName,
                            lastName,
                            ...updateData.profile,
                            user: adminId
                        });
                    }
                    updateData.profile = pf._id;
                }
            }

            const admin = await Admin.findByIdAndUpdate(
                adminId,
                { $set: updateData },
                { new: true, runValidators: true }
            ).select('-password').populate('profile');

            return admin;
        } catch (error) {
            if (error instanceof ApiError) throw error;
            throw new ApiError(500, 'Error updating admin: ' + error.message);
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

    async blockUser(userType, userId, blockedBy, reason, currentUserRole) {
        try {
            const modelMap = {
                student: mongoose.model('Student'),
                teacher: mongoose.model('Teacher'),
                staff: mongoose.model('Staff'),
                admin: mongoose.model('Admin'),
            };

            const Model = modelMap[userType.toLowerCase()];
            if (!Model) {
                throw new ApiError(400, 'Invalid user type');
            }

            const user = await Model.findById(userId);
            if (!user) {
                throw new ApiError(404, 'User not found');
            }

            if (user.isBlocked) {
                throw new ApiError(400, 'User is already blocked');
            }

            if (currentUserRole !== 'super_admin') {
                if (userType === 'admin') {
                    if (currentUserRole === 'admin') {
                        if (user.role === 'admin' || user.role === 'super_admin') {
                            throw new ApiError(403, 'Admins can only block moderators and regular users');
                        }
                    } else if (currentUserRole === 'moderator') {
                        throw new ApiError(403, 'Moderators can only block regular users');
                    }
                }
            }

            if (userType === 'admin' && user.role === 'super_admin') {
                throw new ApiError(403, 'Cannot block a super admin');
            }

            user.isBlocked = true;
            user.blockedAt = new Date();
            user.blockedBy = blockedBy;
            user.blockReason = reason;

            await user.save({ validateModifiedOnly: true });

            return {
                id: user._id,
                fullName: user.fullName,
                email: user.email,
                userType,
                isBlocked: true,
                blockedAt: user.blockedAt,
                blockReason: reason,
            };
        } catch (error) {
            if (error instanceof ApiError) throw error;
            throw new ApiError(500, 'Error blocking user: ' + error.message);
        }
    }

    async unblockUser(userType, userId, currentUserRole) {
        try {
            const modelMap = {
                student: mongoose.model('Student'),
                teacher: mongoose.model('Teacher'),
                staff: mongoose.model('Staff'),
                admin: mongoose.model('Admin'),
            };

            const Model = modelMap[userType.toLowerCase()];
            if (!Model) {
                throw new ApiError(400, 'Invalid user type');
            }

            const user = await Model.findById(userId);
            if (!user) {
                throw new ApiError(404, 'User not found');
            }

            if (!user.isBlocked) {
                throw new ApiError(400, 'User is not blocked');
            }

            if (currentUserRole !== 'super_admin') {
                if (userType === 'admin') {
                    if (currentUserRole === 'admin') {
                        if (user.role === 'admin' || user.role === 'super_admin') {
                            throw new ApiError(403, 'Admins can only unblock moderators and regular users');
                        }
                    } else if (currentUserRole === 'moderator') {
                        throw new ApiError(403, 'Moderators can only unblock regular users');
                    }
                }
            }

            user.isBlocked = false;
            user.blockedAt = null;
            user.blockedBy = null;
            user.blockReason = null;

            await user.save({ validateModifiedOnly: true });

            return {
                id: user._id,
                fullName: user.fullName,
                email: user.email,
                userType,
                isBlocked: false,
            };
        } catch (error) {
            if (error instanceof ApiError) throw error;
            throw new ApiError(500, 'Error unblocking user: ' + error.message);
        }
    }

    async getUserDetails(userType, userId) {
        try {
            const modelMap = {
                student: mongoose.model('Student'),
                teacher: mongoose.model('Teacher'),
                staff: mongoose.model('Staff'),
                admin: mongoose.model('Admin'),
            };

            const Model = modelMap[userType.toLowerCase()];
            if (!Model) {
                throw new ApiError(400, 'Invalid user type');
            }

            const user = await Model.findById(userId)
                .select('-password -refreshToken -twoFactorSecret')
                .populate('profile')
                .lean();

            if (!user) {
                throw new ApiError(404, 'User not found');
            }

            const details = {
                ...user,
                userType,
            };

            details.loginSummary = {
                lastLoginAt: user.lastLoginAt,
                lastLoginIp: user.lastLoginIp,
                registeredIps: user.registeredIpAddress || [],
            };

            details.accountStatus = {
                isActive: user.isActive,
                isBlocked: user.isBlocked || false,
                blockedAt: user.blockedAt,
                blockedBy: user.blockedBy,
                blockReason: user.blockReason,
                twoFactorEnabled: user.twoFactorEnabled,
                emailUpdatesEnabled: user.emailUpdatesEnabled,
            };

            return details;
        } catch (error) {
            if (error instanceof ApiError) throw error;
            throw new ApiError(500, 'Error fetching user details: ' + error.message);
        }
    }

    async getAllUsers(options = {}) {
        try {
            const { search, userType, isBlocked, page = 1, limit = 20 } = options;
            const skip = (page - 1) * limit;

            const userTypes = userType ? [userType] : ['student', 'teacher', 'staff', 'admin'];
            const results = [];
            let totalCount = 0;
            for (const type of userTypes) {
                const modelMap = {
                    student: mongoose.model('Student'),
                    teacher: mongoose.model('Teacher'),
                    staff: mongoose.model('Staff'),
                    admin: mongoose.model('Admin'),
                };

                const Model = modelMap[type];
                if (!Model) continue;

                const query = { deletedAt: null };
                if (search) {
                    query.$or = [
                        { fullName: { $regex: search, $options: 'i' } },
                        { email: { $regex: search, $options: 'i' } },
                    ];
                }

                if (typeof isBlocked === 'boolean') {
                    query.isBlocked = isBlocked;
                }

                const [users, count] = await Promise.all([
                    Model.find(query)
                        .select('fullName email isActive isBlocked lastLoginAt createdAt')
                        .sort({ createdAt: -1 })
                        .skip(skip)
                        .limit(limit)
                        .lean(),
                    Model.countDocuments(query),
                ]);

                results.push(...users.map(u => ({ ...u, userType: type })));
                totalCount += count;
            }

            results.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

            return {
                users: results.slice(0, limit),
                pagination: {
                    page,
                    limit,
                    total: totalCount,
                    pages: Math.ceil(totalCount / limit),
                },
            };
        } catch (error) {
            throw new ApiError(500, 'Error fetching users: ' + error.message);
        }
    }
}

export default new AdminService();

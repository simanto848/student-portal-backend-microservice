import Staff from '../models/Staff.js';
import Profile from '../models/Profile.js';
import { ApiError } from 'shared';
import PasswordGenerator from '../utils/passwordGenerator.js';
import emailService from '../utils/emailService.js';
import academicServiceClient from '../clients/academicServiceClient.js';
import mongoose from 'mongoose';

class StaffService {
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

            if (filters.departmentId) {
                query.departmentId = filters.departmentId;
            }

            if (pagination && (pagination.page || pagination.limit)) {
                const page = parseInt(pagination.page) || 1;
                const limit = parseInt(pagination.limit) || 10;
                const skip = (page - 1) * limit;

                const [staffMembers, total] = await Promise.all([
                    Staff.find(query).select('-password').populate('profile').sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
                    Staff.countDocuments(query),
                ]);

                const staffWithDetails = await Promise.all(
                    staffMembers.map(async (staff) => {
                        if (staff.departmentId) {
                            try {
                                const departmentResponse = await academicServiceClient.getDepartmentById(staff.departmentId);
                                staff.department = departmentResponse.data;
                            } catch (error) {
                                console.error('Error fetching department:', error.message);
                                staff.department = null;
                            }
                        }
                        return staff;
                    })
                );

                return {
                    staff: staffWithDetails,
                    pagination: {
                        page,
                        limit,
                        total,
                        pages: Math.ceil(total / limit),
                    },
                };
            }

            const staffMembers = await Staff.find(query).select('-password').populate('profile').sort({ createdAt: -1 }).lean();
            const staffWithDetails = await Promise.all(
                staffMembers.map(async (staff) => {
                    if (staff.departmentId) {
                        try {
                            const departmentResponse = await academicServiceClient.getDepartmentById(staff.departmentId);
                            staff.department = departmentResponse.data;
                        } catch (error) {
                            console.error('Error fetching department:', error.message);
                            staff.department = null;
                        }
                    }
                    return staff;
                })
            );

            return { staff: staffWithDetails };
        } catch (error) {
            throw new ApiError(500, 'Error fetching staff: ' + error.message);
        }
    }

    async getById(staffId) {
        try {
            const staff = await Staff.findById(staffId)
                .select('-password')
                .populate('profile')
                .lean();

            if (!staff) {
                throw new ApiError(404, 'Staff not found');
            }

            if (staff.departmentId) {
                try {
                    const departmentResponse = await academicServiceClient.getDepartmentById(staff.departmentId);
                    staff.department = departmentResponse.data;
                } catch (error) {
                    console.error('Error fetching department:', error.message);
                    staff.department = null;
                }
            }

            return staff;
        } catch (error) {
            if (error instanceof ApiError) throw error;
            throw new ApiError(500, 'Error fetching staff: ' + error.message);
        }
    }

    async create(staffData) {
        try {
            let departmentShortName = null;
            if (staffData.departmentId) {
                try {
                    const departmentResponse = await academicServiceClient.getDepartmentById(staffData.departmentId);
                    departmentShortName = departmentResponse.data.shortName;
                } catch (error) {
                    throw new ApiError(400, 'Invalid department ID');
                }
            }

            if (!staffData.registrationNumber) {
                if (departmentShortName) {
                    staffData.registrationNumber = PasswordGenerator.generateStaffRegistrationNumber(departmentShortName);
                } else {
                    staffData.registrationNumber = PasswordGenerator.generateRegistrationNumber('STF');
                }
            }

            const existingStaff = await Staff.findOne({ email: staffData.email, deletedAt: null });
            if (existingStaff) {
                throw new ApiError(409, 'Staff with this email already exists');
            }

            const existingRegNumber = await Staff.findOne({ registrationNumber: staffData.registrationNumber, deletedAt: null });
            if (existingRegNumber) {
                throw new ApiError(409, 'Registration number already exists');
            }

            const temporaryPassword = PasswordGenerator.generate(12);
            staffData.password = temporaryPassword;

            try {
                await emailService.sendWelcomeEmailWithCredentials(staffData.email, {
                    fullName: staffData.fullName,
                    email: staffData.email,
                    temporaryPassword: temporaryPassword,
                });
            } catch (emailError) {
                throw new ApiError(500, 'Failed to send welcome email. Staff creation aborted: ' + emailError.message);
            }

            const staff = await Staff.create(staffData);
            const createdStaff = await Staff.findById(staff._id).select('-password').lean();
            return createdStaff;
        } catch (error) {
            if (error instanceof ApiError) throw error;
            if (error.code === 11000) {
                const field = Object.keys(error.keyPattern)[0];
                throw new ApiError(409, `Staff with this ${field} already exists`);
            }
            throw new ApiError(500, 'Error creating staff: ' + error.message);
        }
    }

    async update(staffId, updateData) {
        try {
            delete updateData.password;
            delete updateData.email;
            delete updateData.registrationNumber;

            // Remove undefined or null fields
            Object.keys(updateData).forEach(key => {
                if (updateData[key] === undefined || updateData[key] === null || updateData[key] === '') {
                    delete updateData[key];
                }
            });

            if (updateData.departmentId) {
                try {
                    await academicServiceClient.getDepartmentById(updateData.departmentId);
                } catch (error) {
                    throw new ApiError(400, 'Invalid department ID');
                }
            }

            const existing = await Staff.findById(staffId);
            if (!existing) throw new ApiError(404, 'Staff not found');

            if (updateData.profile && typeof updateData.profile === 'object') {
                if (existing.profile) {
                    await Profile.findByIdAndUpdate(existing.profile, { $set: updateData.profile }, { new: true, runValidators: true });
                } else {
                    // Check if profile exists for this user but wasn't linked
                    let pf = await Profile.findOne({ user: staffId });

                    if (pf) {
                        // Update existing unlinked profile
                        pf = await Profile.findByIdAndUpdate(pf._id, { $set: updateData.profile }, { new: true, runValidators: true });
                    } else {
                        const nameParts = existing.fullName ? existing.fullName.split(' ') : ['Unknown'];
                        const firstName = updateData.profile.firstName || nameParts[0];
                        const lastName = updateData.profile.lastName || (nameParts.length > 1 ? nameParts.slice(1).join(' ') : nameParts[0]);

                        pf = await Profile.create({
                            firstName,
                            lastName,
                            ...updateData.profile,
                            user: staffId
                        });
                    }
                    updateData.profile = pf._id;
                }
            }

            const staff = await Staff.findByIdAndUpdate(
                staffId,
                { $set: updateData },
                { new: true, runValidators: true }
            ).select('-password').populate('profile');

            return staff;
        } catch (error) {
            if (error instanceof ApiError) throw error;
            throw new ApiError(500, 'Error updating staff: ' + error.message);
        }
    }

    async delete(staffId) {
        try {
            const staff = await Staff.findById(staffId);
            if (!staff) {
                throw new ApiError(404, 'Staff not found');
            }

            await staff.softDelete();
            return { message: 'Staff deleted successfully' };
        } catch (error) {
            if (error instanceof ApiError) throw error;
            throw new ApiError(500, 'Error deleting staff: ' + error.message);
        }
    }

    async getDeletedStaffs() {
        try {
            const staffs = await Staff.find({ deletedAt: { $ne: null } }).select('-password').populate('profile');
            return staffs;
        } catch (error) {
            if (error instanceof ApiError) throw error;
            throw new ApiError(500, 'Error fetching deleted staffs: ' + error.message);
        }
    }

    async deletePermanently(staffId) {
        try {
            const staff = await Staff.findByIdAndDelete(staffId);
            if (!staff) {
                throw new ApiError(404, 'Staff not found');
            }
            return { message: 'Staff deleted permanently successfully' };
        } catch (error) {
            if (error instanceof ApiError) throw error;
            throw new ApiError(500, 'Error deleting staff permanently: ' + error.message);
        }
    }

    async restore(staffId) {
        try {
            const staff = await Staff.findById(staffId);
            if (!staff) throw new ApiError(404, 'Staff not found');
            await staff.restore();
            return { message: 'Staff restored successfully' };
        } catch (error) {
            throw error instanceof ApiError ? error : new ApiError(500, 'Error restoring staff: ' + error.message);
        }
    }

    async updateRole(staffId, newRole) {
        try {
            const staff = await Staff.findByIdAndUpdate(
                staffId,
                { $set: { role: newRole } },
                { new: true, runValidators: true }
            ).select('-password').populate('profile');

            if (!staff) {
                throw new ApiError(404, 'Staff not found');
            }

            return staff;
        } catch (error) {
            if (error instanceof ApiError) throw error;
            throw new ApiError(500, 'Error updating staff role: ' + error.message);
        }
    }

    async getByDepartment(departmentId, options = {}) {
        try {
            try {
                await academicServiceClient.getDepartmentById(departmentId);
            } catch (error) {
                throw new ApiError(400, 'Invalid department ID');
            }

            const { pagination, search } = options;
            const baseQuery = { departmentId: departmentId, deletedAt: null };

            if (search) {
                baseQuery.$or = [
                    { fullName: { $regex: search, $options: 'i' } },
                    { email: { $regex: search, $options: 'i' } },
                    { registrationNumber: { $regex: search, $options: 'i' } },
                ];
            }

            if (pagination && (pagination.page || pagination.limit)) {
                const page = parseInt(pagination.page) || 1;
                const limit = parseInt(pagination.limit) || 10;
                const skip = (page - 1) * limit;

                const [staffMembers, total] = await Promise.all([
                    Staff.find(baseQuery)
                        .select('-password')
                        .populate('profile')
                        .sort({ createdAt: -1 })
                        .skip(skip)
                        .limit(limit)
                        .lean(),
                    Staff.countDocuments(baseQuery),
                ]);

                return {
                    staff: staffMembers,
                    pagination: {
                        page,
                        limit,
                        total,
                        pages: Math.ceil(total / limit),
                    },
                };
            }

            const staffMembers = await Staff.find(baseQuery).select('-password').populate('profile').sort({ createdAt: -1 }).lean();
            return { staff: staffMembers };
        } catch (error) {
            if (error instanceof ApiError) throw error;
            throw new ApiError(500, 'Error fetching staff by department: ' + error.message);
        }
    }

    async getStatistics() {
        try {
            const total = await Staff.countDocuments({ deletedAt: null });
            const byRole = await Staff.aggregate([
                { $match: { deletedAt: null } },
                { $group: { _id: '$role', count: { $sum: 1 } } },
            ]);

            const roleStats = {};
            byRole.forEach(item => {
                roleStats[item._id] = item.count;
            });

            const byDepartment = await Staff.aggregate([
                { $match: { deletedAt: null, departmentId: { $ne: null } } },
                { $group: { _id: '$departmentId', count: { $sum: 1 } } },
            ]);

            return {
                total,
                byRole: roleStats,
                byDepartment: byDepartment.map(item => ({
                    departmentId: item._id,
                    count: item.count,
                })),
            };
        } catch (error) {
            throw new ApiError(500, 'Error fetching staff statistics: ' + error.message);
        }
    }

    async addRegisteredIp(staffId, ipAddress) {
        try {
            const staff = await Staff.findById(staffId);
            if (!staff) {
                throw new ApiError(404, 'Staff not found');
            }

            if (staff.registeredIpAddress.includes(ipAddress)) {
                throw new ApiError(409, 'IP address already registered');
            }

            staff.registeredIpAddress.push(ipAddress);
            await staff.save({ validateModifiedOnly: true });

            const updatedStaff = await Staff.findById(staffId).select('-password').populate('profile').lean();
            return updatedStaff;
        } catch (error) {
            if (error instanceof ApiError) throw error;
            throw new ApiError(500, 'Error adding registered IP: ' + error.message);
        }
    }

    async removeRegisteredIp(staffId, ipAddress) {
        try {
            const staff = await Staff.findById(staffId);
            if (!staff) {
                throw new ApiError(404, 'Staff not found');
            }

            if (!staff.registeredIpAddress.includes(ipAddress)) {
                throw new ApiError(404, 'IP address not found in registered list');
            }

            staff.registeredIpAddress = staff.registeredIpAddress.filter(ip => ip !== ipAddress);
            await staff.save({ validateModifiedOnly: true });

            const updatedStaff = await Staff.findById(staffId).select('-password').populate('profile').lean();
            return updatedStaff;
        } catch (error) {
            if (error instanceof ApiError) throw error;
            throw new ApiError(500, 'Error removing registered IP: ' + error.message);
        }
    }

    async updateRegisteredIps(staffId, ipAddresses) {
        try {
            const staff = await Staff.findByIdAndUpdate(
                staffId,
                { $set: { registeredIpAddress: ipAddresses } },
                { new: true, runValidators: false }
            ).select('-password').populate('profile');

            if (!staff) {
                throw new ApiError(404, 'Staff not found');
            }

            return staff;
        } catch (error) {
            if (error instanceof ApiError) throw error;
            throw new ApiError(500, 'Error updating registered IPs: ' + error.message);
        }
    }
}

export default new StaffService();

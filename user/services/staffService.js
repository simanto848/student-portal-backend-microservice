import Staff from '../models/Staff.js';
import Profile from '../models/Profile.js';
import { ApiError } from 'shared';
import PasswordGenerator from '../utils/passwordGenerator.js';
import emailService from '../utils/emailService.js';
import academicServiceClient from '../clients/academicServiceClient.js';
import BaseUserService from './BaseUserService.js';

class StaffService extends BaseUserService {
    constructor() {
        super(Staff, 'Staff');
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

                const uniqueDeptIds = [...new Set(staffMembers.map(s => s.departmentId).filter(Boolean))];
                let deptMap = {};
                if (uniqueDeptIds.length > 0) {
                    try {
                        const depts = await academicServiceClient.getDepartmentsByIds(uniqueDeptIds);
                        depts.forEach(d => { if (d) deptMap[d.id || d._id] = d; });
                    } catch (e) {
                        console.error("Failed to batch fetch departments:", e.message);
                    }
                }

                const staffWithDetails = staffMembers.map(staff => {
                    if (staff.departmentId && deptMap[staff.departmentId]) {
                        staff.department = deptMap[staff.departmentId];
                    }
                    return staff;
                });

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
            const uniqueDeptIds = [...new Set(staffMembers.map(s => s.departmentId).filter(Boolean))];
            let deptMap = {};
            if (uniqueDeptIds.length > 0) {
                try {
                    const depts = await academicServiceClient.getDepartmentsByIds(uniqueDeptIds);
                    depts.forEach(d => { if (d) deptMap[d.id || d._id] = d; });
                } catch (e) {
                    console.error("Failed to batch fetch departments:", e.message);
                }
            }

            const staffWithDetails = staffMembers.map(staff => {
                if (staff.departmentId && deptMap[staff.departmentId]) {
                    staff.department = deptMap[staff.departmentId];
                }
                return staff;
            });

            return { staff: staffWithDetails };
        } catch (error) {
            throw new ApiError(500, 'Error fetching staff: ' + error.message);
        }
    }

    async getById(staffId) {
        try {
            const staff = await super.getById(staffId);
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

            let profileData = null;
            if (staffData.profile && typeof staffData.profile === 'object') {
                profileData = staffData.profile;
                delete staffData.profile;
            }

            const staff = await Staff.create(staffData);
            if (profileData) {
                try {
                    const nameParts = staffData.fullName ? staffData.fullName.split(' ') : ['Unknown'];
                    const firstName = profileData.firstName || nameParts[0];
                    const lastName = profileData.lastName || (nameParts.length > 1 ? nameParts.slice(1).join(' ') : nameParts[0]);

                    const profile = await Profile.create({
                        firstName,
                        lastName,
                        ...profileData,
                        user: staff._id
                    });

                    await Staff.findByIdAndUpdate(staff._id, { profile: profile._id });
                } catch (profileError) {
                    console.error('Failed to create profile:', profileError.message);
                }
            }

            emailService.sendWelcomeEmailWithCredentials(staffData.email, {
                fullName: staffData.fullName,
                email: staffData.email,
                temporaryPassword: temporaryPassword,
            }).catch(emailError => {
                console.error('Failed to send welcome email:', emailError.message);
            });

            const createdStaff = await Staff.findById(staff._id).select('-password').populate('profile').lean();
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
                    delete updateData.profile;
                } else {
                    let pf = await Profile.findOne({ user: staffId });

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
}

export default new StaffService();

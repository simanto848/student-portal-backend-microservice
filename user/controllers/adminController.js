import { ApiResponse } from 'shared';
import adminService from '../services/adminService.js';

class AdminController {
    async getAll(req, res, next) {
        try {
            const { page, limit, search, ...filters } = req.query;
            const options = {};
            if (page || limit) {
                options.pagination = {
                    page: parseInt(page) || 1,
                    limit: parseInt(limit) || 10,
                };
            }

            if (search) {
                options.search = search;
            }

            if (Object.keys(filters).length > 0) {
                options.filters = filters;
            }

            const result = await adminService.getAll(options);
            return ApiResponse.success(res, result, 'Admins retrieved successfully');
        } catch (error) {
            next(error);
        }
    }

    async getById(req, res, next) {
        try {
            const admin = await adminService.getById(req.params.id);
            return ApiResponse.success(res, admin, 'Admin retrieved successfully');
        } catch (error) {
            next(error);
        }
    }

    async create(req, res, next) {
        try {
            const admin = await adminService.create(req.body);
            return ApiResponse.created(res, admin, 'Admin created successfully');
        } catch (error) {
            next(error);
        }
    }

    async update(req, res, next) {
        try {
            const admin = await adminService.update(req.params.id, req.body);
            return ApiResponse.success(res, admin, 'Admin updated successfully');
        } catch (error) {
            next(error);
        }
    }

    async delete(req, res, next) {
        try {
            await adminService.delete(req.params.id);
            return ApiResponse.success(res, null, 'Admin deleted successfully');
        } catch (error) {
            next(error);
        }
    }

    async getDeletedAdmins(req, res, next) {
        try {
            const admins = await adminService.getDeletedAdmins();
            return ApiResponse.success(res, admins, 'Admins retrieved successfully');
        } catch (error) {
            next(error);
        }
    }

    async deletePermanently(req, res, next) {
        try {
            await adminService.deletePermanently(req.params.id);
            return ApiResponse.success(res, null, 'Admin deleted permanently successfully');
        } catch (error) {
            next(error);
        }
    }

    async restore(req, res, next) {
        try {
            const admin = await adminService.restore(req.params.id);
            return ApiResponse.success(res, admin, 'Admin restored successfully');
        } catch (error) {
            next(error);
        }
    }

    async updateRole(req, res, next) {
        try {
            const { role } = req.body;
            const admin = await adminService.updateRole(req.params.id, role);
            return ApiResponse.success(res, admin, 'Admin role updated successfully');
        } catch (error) {
            next(error);
        }
    }

    async getStatistics(req, res, next) {
        try {
            const statistics = await adminService.getStatistics();
            return ApiResponse.success(res, statistics, 'Admin statistics retrieved successfully');
        } catch (error) {
            next(error);
        }
    }

    async addRegisteredIp(req, res, next) {
        try {
            const { ipAddress } = req.body;
            const admin = await adminService.addRegisteredIp(req.params.id, ipAddress);
            return ApiResponse.success(res, admin, 'IP address added successfully');
        } catch (error) {
            next(error);
        }
    }

    async removeRegisteredIp(req, res, next) {
        try {
            const { ipAddress } = req.body;
            const admin = await adminService.removeRegisteredIp(req.params.id, ipAddress);
            return ApiResponse.success(res, admin, 'IP address removed successfully');
        } catch (error) {
            next(error);
        }
    }

    async updateRegisteredIps(req, res, next) {
        try {
            const { ipAddresses } = req.body;
            const admin = await adminService.updateRegisteredIps(req.params.id, ipAddresses);
            return ApiResponse.success(res, admin, 'Registered IP addresses updated successfully');
        } catch (error) {
            next(error);
        }
    }

    // Admin manage user methods
    async blockUser(req, res, next) {
        try {
            const { userType, userId, reason } = req.body;
            const result = await adminService.blockUser(userType, userId, req.user.id, reason, req.user.role);
            return ApiResponse.success(res, result, 'User blocked successfully');
        } catch (error) {
            next(error);
        }
    }

    async unblockUser(req, res, next) {
        try {
            const { userType, userId } = req.body;
            const result = await adminService.unblockUser(userType, userId, req.user.role);
            return ApiResponse.success(res, result, 'User unblocked successfully');
        } catch (error) {
            next(error);
        }
    }

    async getUserDetails(req, res, next) {
        try {
            const { userType } = req.query;
            const result = await adminService.getUserDetails(userType, req.params.id);
            return ApiResponse.success(res, result, 'User details retrieved successfully');
        } catch (error) {
            next(error);
        }
    }

    async getAllUsers(req, res, next) {
        try {
            const { page, limit, search, userType, isBlocked } = req.query;
            const result = await adminService.getAllUsers({
                page: parseInt(page) || 1,
                limit: parseInt(limit) || 20,
                search,
                userType,
                isBlocked: isBlocked === 'true' ? true : isBlocked === 'false' ? false : undefined,
            });
            return ApiResponse.success(res, result, 'Users retrieved successfully');
        } catch (error) {
            next(error);
        }
    }
}

export default new AdminController();

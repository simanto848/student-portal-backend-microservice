import ApiResponse from '../utils/ApiResponser.js';
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
            return ApiResponse.noContent(res);
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
}

export default new AdminController();


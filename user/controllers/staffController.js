import ApiResponse from '../utils/ApiResponser.js';
import staffService from '../services/staffService.js';

class StaffController {
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

            const result = await staffService.getAll(options);
            return ApiResponse.success(res, result, 'Staff members retrieved successfully');
        } catch (error) {
            next(error);
        }
    }

    async getById(req, res, next) {
        try {
            const staff = await staffService.getById(req.params.id);
            return ApiResponse.success(res, staff, 'Staff member retrieved successfully');
        } catch (error) {
            next(error);
        }
    }

    async create(req, res, next) {
        try {
            const staff = await staffService.create(req.body);
            return ApiResponse.created(res, staff, 'Staff member created successfully');
        } catch (error) {
            next(error);
        }
    }

    async update(req, res, next) {
        try {
            const staff = await staffService.update(req.params.id, req.body);
            return ApiResponse.success(res, staff, 'Staff member updated successfully');
        } catch (error) {
            next(error);
        }
    }

    async delete(req, res, next) {
        try {
            await staffService.delete(req.params.id);
            return ApiResponse.noContent(res);
        } catch (error) {
            next(error);
        }
    }

    async restore(req, res, next) {
        try {
            const staff = await staffService.restore(req.params.id);
            return ApiResponse.success(res, staff, 'Staff member restored successfully');
        } catch (error) {
            next(error);
        }
    }

    async updateRole(req, res, next) {
        try {
            const { role } = req.body;
            const staff = await staffService.updateRole(req.params.id, role);
            return ApiResponse.success(res, staff, 'Staff role updated successfully');
        } catch (error) {
            next(error);
        }
    }

    async getByDepartment(req, res, next) {
        try {
            const { page, limit, search } = req.query;
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

            const result = await staffService.getByDepartment(req.params.departmentId, options);
            return ApiResponse.success(res, result, 'Staff members retrieved successfully');
        } catch (error) {
            next(error);
        }
    }

    async getStatistics(req, res, next) {
        try {
            const statistics = await staffService.getStatistics();
            return ApiResponse.success(res, statistics, 'Staff statistics retrieved successfully');
        } catch (error) {
            next(error);
        }
    }
}

export default new StaffController();

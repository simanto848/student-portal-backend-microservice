import ApiResponse from '../utils/ApiResponser.js';
import departmentService from '../services/departmentService.js';

class DepartmentController {
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

            const result = await departmentService.getAll(options);
            return ApiResponse.success(res, result, 'Departments retrieved successfully');
        } catch (error) {
            next(error);
        }
    }

    async getById(req, res, next) {
        try {
            const department = await departmentService.getById(req.params.id);
            return ApiResponse.success(res, department, 'Department retrieved successfully');
        } catch (error) {
            next(error);
        }
    }

    async create(req, res, next) {
        try {
            const department = await departmentService.create(req.body);
            return ApiResponse.created(res, department, 'Department created successfully');
        } catch (error) {
            next(error);
        }
    }

    async update(req, res, next) {
        try {
            const department = await departmentService.update(req.params.id, req.body);
            return ApiResponse.success(res, department, 'Department updated successfully');
        } catch (error) {
            next(error);
        }
    }

    async delete(req, res, next) {
        try {
            await departmentService.delete(req.params.id);
            return ApiResponse.noContent(res);
        } catch (error) {
            next(error);
        }
    }

    async getProgramsByDepartment(req, res, next) {
        try {
            const { page, limit, search, ...filters } = req.query;
            const options = {
                pagination: {
                    page: parseInt(page) || 1,
                    limit: parseInt(limit) || 10,
                },
            };

            if (search) {
                options.search = search;
            }

            if (Object.keys(filters).length > 0) {
                options.filters = filters;
            }

            const result = await departmentService.getProgramsByDepartment(req.params.id, options);
            return ApiResponse.success(res, result, 'Programs retrieved successfully');
        } catch (error) {
            next(error);
        }
    }

    async assignDepartmentHead(req, res, next) {
        try {
            const { headId, isActingHead } = req.body;
            const department = await departmentService.assignDepartmentHead(
                req.params.id,
                headId,
                isActingHead || false
            );

            return ApiResponse.success(res, department, 'Department head assigned successfully');
        } catch (error) {
            next(error);
        }
    }

    async removeDepartmentHead(req, res, next) {
        try {
            const department = await departmentService.removeDepartmentHead(req.params.id);
            return ApiResponse.success(res, department, 'Department head removed successfully');
        } catch (error) {
            next(error);
        }
    }
}

export default new DepartmentController();


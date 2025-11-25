import { ApiResponse } from 'shared';
import facultyService from '../services/facultyService.js';

class FacultyController {
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

            const result = await facultyService.getAll(options);
            return ApiResponse.success(res, result, 'Faculties retrieved successfully');
        } catch (error) {
            next(error);
        }
    }

    async getById(req, res, next) {
        try {
            const faculty = await facultyService.getById(req.params.id);

            return ApiResponse.success(res, faculty, 'Faculty retrieved successfully');
        } catch (error) {
            next(error);
        }
    }

    async create(req, res, next) {
        try {
            const faculty = await facultyService.create(req.body);
            return ApiResponse.created(res, faculty, 'Faculty created successfully');
        } catch (error) {
            next(error);
        }
    }

    async update(req, res, next) {
        try {
            const faculty = await facultyService.update(req.params.id, req.body);

            return ApiResponse.success(res, faculty, 'Faculty updated successfully');
        } catch (error) {
            next(error);
        }
    }

    async delete(req, res, next) {
        try {
            await facultyService.delete(req.params.id);
            return ApiResponse.noContent(res);
        } catch (error) {
            next(error);
        }
    }

    async getDepartmentsByFaculty(req, res, next) {
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

            const result = await facultyService.getDepartmentsByFaculty(req.params.id, options);
            return ApiResponse.success(res, result, 'Departments retrieved successfully');
        } catch (error) {
            next(error);
        }
    }

    async assignDean(req, res, next) {
        try {
            const { deanId } = req.body;
            const faculty = await facultyService.assignDean(req.params.id, deanId);
            return ApiResponse.success(res, faculty, 'Dean assigned successfully');
        } catch (error) {
            next(error);
        }
    }

    async removeDean(req, res, next) {
        try {
            const faculty = await facultyService.removeDean(req.params.id);
            return ApiResponse.success(res, faculty, 'Dean removed successfully');
        } catch (error) {
            next(error);
        }
    }
}

export default new FacultyController();


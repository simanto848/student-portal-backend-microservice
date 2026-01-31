import { ApiResponse } from 'shared';
import teacherService from '../services/teacherService.js';

class TeacherController {
    async getAll(req, res, next) {
        try {
            const { page, limit, search, ...filters } = req.query;
            const options = {};
            if (page || limit) options.pagination = { page: parseInt(page) || 1, limit: parseInt(limit) || 10 };
            if (search) options.search = search;
            if (Object.keys(filters).length > 0) options.filters = filters;
            const result = await teacherService.getAll(options);
            return ApiResponse.success(res, result, 'Teachers retrieved successfully');
        } catch (error) { next(error); }
    }

    async getById(req, res, next) {
        try { const t = await teacherService.getById(req.params.id); return ApiResponse.success(res, t, 'Teacher retrieved successfully'); }
        catch (error) { next(error); }
    }

    async getByIds(req, res, next) {
        try {
            const { ids } = req.body;
            if (!ids || !Array.isArray(ids) || ids.length === 0) {
                return ApiResponse.success(res, [], 'No IDs provided');
            }
            const teachers = await teacherService.getByIds(ids);
            return ApiResponse.success(res, teachers, 'Teachers retrieved successfully');
        } catch (error) { next(error); }
    }

    async create(req, res, next) {
        try { const t = await teacherService.create(req.validatedData || req.body); return ApiResponse.created(res, t, 'Teacher created successfully'); }
        catch (error) { next(error); }
    }

    async update(req, res, next) {
        try { const t = await teacherService.update(req.params.id, req.validatedData || req.body); return ApiResponse.success(res, t, 'Teacher updated successfully'); }
        catch (error) { next(error); }
    }

    async delete(req, res, next) {
        try { const r = await teacherService.delete(req.params.id); return ApiResponse.success(res, r, 'Teacher deleted successfully'); }
        catch (error) { next(error); }
    }

    async getDeletedTeachers(req, res, next) {
        try {
            const st = await teacherService.getDeletedTeachers();
            return ApiResponse.success(res, st, 'Deleted teachers retrieved successfully');
        } catch (error) {
            next(error);
        }
    }
    
    async deletePermanently(req, res, next) {
        try {
            const r = await teacherService.deletePermanently(req.params.id);
            return ApiResponse.success(res, r, 'Teacher deleted permanently successfully');
        } catch (error) { next(error); }
    }

    async restore(req, res, next) {
        try {
            const r = await teacherService.restore(req.params.id);
            return ApiResponse.success(res, r, 'Teacher restored successfully');
        } catch (error) { next(error); }
    }

    async addRegisteredIp(req, res, next) {
        try {
            const { ipAddress } = req.body;
            const teacher = await teacherService.addRegisteredIp(req.params.id, ipAddress);
            return ApiResponse.success(res, teacher, 'IP address added successfully');
        } catch (error) { next(error); }
    }

    async removeRegisteredIp(req, res, next) {
        try {
            const { ipAddress } = req.body;
            const teacher = await teacherService.removeRegisteredIp(req.params.id, ipAddress);
            return ApiResponse.success(res, teacher, 'IP address removed successfully');
        } catch (error) { next(error); }
    }

    async updateRegisteredIps(req, res, next) {
        try {
            const { ipAddresses } = req.body;
            const teacher = await teacherService.updateRegisteredIps(req.params.id, ipAddresses);
            return ApiResponse.success(res, teacher, 'Registered IP addresses updated successfully');
        } catch (error) { next(error); }
    }
}

export default new TeacherController();

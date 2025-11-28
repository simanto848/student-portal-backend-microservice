import { ApiResponse } from 'shared';
import adminProfileService from '../services/adminProfileService.js';

class AdminProfileController {
    async getByAdminId(req, res, next) {
        try {
            const profile = await adminProfileService.getByAdminId(req.params.adminId);
            return ApiResponse.success(res, profile, 'Admin profile retrieved successfully');
        } catch (error) {
            next(error);
        }
    }

    async create(req, res, next) {
        try {
            const data = req.validatedData || req.body;
            const profile = await adminProfileService.create(req.params.adminId, data);
            return ApiResponse.created(res, profile, 'Admin profile created successfully');
        } catch (error) {
            next(error);
        }
    }

    async update(req, res, next) {
        try {
            const profile = await adminProfileService.update(req.params.adminId, req.validatedData || req.body);
            return ApiResponse.success(res, profile, 'Admin profile updated successfully');
        } catch (error) {
            next(error);
        }
    }

    async upsert(req, res, next) {
        try {
            const data = req.validatedData || req.body;
            const profile = await adminProfileService.upsert(req.params.adminId, data);
            return ApiResponse.success(res, profile, 'Admin profile saved successfully');
        } catch (error) {
            next(error);
        }
    }

    async delete(req, res, next) {
        try {
            const result = await adminProfileService.delete(req.params.adminId);
            return ApiResponse.success(res, result, 'Admin profile deleted successfully');
        } catch (error) {
            next(error);
        }
    }
}

export default new AdminProfileController();


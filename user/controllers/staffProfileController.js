import { ApiResponse } from 'shared';
import staffProfileService from '../services/staffProfileService.js';

class StaffProfileController {
    async getByStaffId(req, res, next) {
        try {
            const profile = await staffProfileService.getByStaffId(req.params.id);
            return ApiResponse.success(res, profile, 'Staff profile retrieved successfully');
        } catch (error) {
            next(error);
        }
    }

    async create(req, res, next) {
        try {
            const profile = await staffProfileService.create(req.params.id, req.validatedData || req.body);
            return ApiResponse.created(res, profile, 'Staff profile created successfully');
        } catch (error) {
            next(error);
        }
    }

    async update(req, res, next) {
        try {
            const profile = await staffProfileService.update(req.params.id, req.validatedData || req.body);
            return ApiResponse.success(res, profile, 'Staff profile updated successfully');
        } catch (error) {
            next(error);
        }
    }

    async upsert(req, res, next) {
        try {
            const profile = await staffProfileService.upsert(req.params.id, req.validatedData || req.body);
            return ApiResponse.success(res, profile, 'Staff profile saved successfully');
        } catch (error) {
            next(error);
        }
    }

    async delete(req, res, next) {
        try {
            const result = await staffProfileService.delete(req.params.id);
            return ApiResponse.success(res, result, 'Staff profile deleted successfully');
        } catch (error) {
            next(error);
        }
    }
}

export default new StaffProfileController();

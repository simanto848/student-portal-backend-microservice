import { ApiResponse } from 'shared';
import teacherProfileService from '../services/teacherProfileService.js';

class TeacherProfileController {
    async getByTeacherId(req, res, next) {
        try {
            const profile = await teacherProfileService.getByTeacherId(req.params.teacherId);
            return ApiResponse.success(res, profile, 'Teacher profile retrieved successfully');
        } catch (error) {
            next(error);
        }
    }

    async create(req, res, next) {
        try {
            const data = req.validatedData || req.body;
            const profile = await teacherProfileService.create(req.params.teacherId, data);
            return ApiResponse.created(res, profile, 'Teacher profile created successfully');
        } catch (error) {
            next(error);
        }
    }

    async update(req, res, next) {
        try {
            const profile = await teacherProfileService.update(req.params.teacherId, req.validatedData || req.body);
            return ApiResponse.success(res, profile, 'Teacher profile updated successfully');
        } catch (error) {
            next(error);
        }
    }

    async upsert(req, res, next) {
        try {
            const data = req.validatedData || req.body;
            const profile = await teacherProfileService.upsert(req.params.teacherId, data);
            return ApiResponse.success(res, profile, 'Teacher profile saved successfully');
        } catch (error) {
            next(error);
        }
    }

    async delete(req, res, next) {
        try {
            const result = await teacherProfileService.delete(req.params.teacherId);
            return ApiResponse.success(res, result, 'Teacher profile deleted successfully');
        } catch (error) {
            next(error);
        }
    }
}

export default new TeacherProfileController();


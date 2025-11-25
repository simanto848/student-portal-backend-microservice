import { ApiResponse } from 'shared';
import studentProfileService from '../services/studentProfileService.js';

class StudentProfileController {
    async getByStudentId(req, res, next) {
        try {
            const profile = await studentProfileService.getByStudentId(req.params.studentId);
            return ApiResponse.success(res, profile, 'Student profile retrieved successfully');
        } catch (error) {
            next(error);
        }
    }

    async create(req, res, next) {
        try {
            const data = { ...req.validatedData || req.body, studentId: req.params.studentId };
            const profile = await studentProfileService.create(data);
            return ApiResponse.created(res, profile, 'Student profile created successfully');
        } catch (error) {
            next(error);
        }
    }

    async update(req, res, next) {
        try {
            const profile = await studentProfileService.update(req.params.studentId, req.validatedData || req.body);
            return ApiResponse.success(res, profile, 'Student profile updated successfully');
        } catch (error) {
            next(error);
        }
    }

    async upsert(req, res, next) {
        try {
            const data = { ...req.validatedData || req.body, studentId: req.params.studentId };
            const profile = await studentProfileService.upsert(req.params.studentId, data);
            return ApiResponse.success(res, profile, 'Student profile saved successfully');
        } catch (error) {
            next(error);
        }
    }

    async delete(req, res, next) {
        try {
            const result = await studentProfileService.delete(req.params.studentId);
            return ApiResponse.success(res, result, 'Student profile deleted successfully');
        } catch (error) {
            next(error);
        }
    }

    async restore(req, res, next) {
        try {
            const profile = await studentProfileService.restore(req.params.studentId);
            return ApiResponse.success(res, profile, 'Student profile restored successfully');
        } catch (error) {
            next(error);
        }
    }

    async addEducationRecord(req, res, next) {
        try {
            const profile = await studentProfileService.addEducationRecord(
                req.params.studentId,
                req.validatedData || req.body
            );
            return ApiResponse.success(res, profile, 'Education record added successfully');
        } catch (error) {
            next(error);
        }
    }

    async removeEducationRecord(req, res, next) {
        try {
            const recordIndex = parseInt(req.params.index);
            if (isNaN(recordIndex)) {
                return ApiResponse.badRequest(res, 'Invalid record index');
            }

            const profile = await studentProfileService.removeEducationRecord(req.params.studentId, recordIndex);
            return ApiResponse.success(res, profile, 'Education record removed successfully');
        } catch (error) {
            next(error);
        }
    }

    async updateEducationRecord(req, res, next) {
        try {
            const recordIndex = parseInt(req.params.index);
            if (isNaN(recordIndex)) {
                return ApiResponse.badRequest(res, 'Invalid record index');
            }

            const profile = await studentProfileService.updateEducationRecord(
                req.params.studentId,
                recordIndex,
                req.validatedData || req.body
            );
            return ApiResponse.success(res, profile, 'Education record updated successfully');
        } catch (error) {
            next(error);
        }
    }
}

export default new StudentProfileController();
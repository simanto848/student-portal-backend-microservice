import { ApiResponse, ApiError } from 'shared';
import studentService from '../services/studentService.js';

class StudentController {
    async getAll(req, res, next) {
        try {
            const { page, limit, search, ...filters } = req.query;
            const options = {};
            if (page || limit) options.pagination = { page: parseInt(page) || 1, limit: parseInt(limit) || 10 };
            if (search) options.search = search;
            if (Object.keys(filters).length > 0) options.filters = filters;

            const result = await studentService.getAll(options);
            return ApiResponse.success(res, result, 'Students retrieved successfully');
        } catch (error) { next(error); }
    }

    async getById(req, res, next) {
        try {
            const st = await studentService.getById(req.params.id);
            return ApiResponse.success(res, st, 'Student retrieved successfully');
        } catch (error) {
            next(error);
        }
    }

    async create(req, res, next) {
        try {
            const st = await studentService.create(req.validatedData || req.body);
            return ApiResponse.created(res, st, 'Student created successfully');
        } catch (error) {
            next(error);
        }
    }

    async update(req, res, next) {
        try {
            const { role } = req.user;
            const studentId = req.params.id;

            if (role === 'admission_staff') {
                const student = await studentService.getById(studentId);
                if (student.enrollmentStatus === 'enrolled') {
                    throw new ApiError(403, 'Admission Staff cannot update enrolled students. Please contact Admin.');
                }
            }

            const st = await studentService.update(studentId, req.validatedData || req.body);
            return ApiResponse.success(res, st, 'Student updated successfully');
        } catch (error) {
            next(error);
        }
    }

    async delete(req, res, next) {
        try {
            const { role } = req.user;
            if (role === 'admission_staff') {
                throw new ApiError(403, 'Admission Staff cannot delete students. Please contact Admin.');
            }
            const r = await studentService.delete(req.params.id);
            return ApiResponse.success(res, r, 'Student deleted successfully');
        } catch (error) {
            next(error);
        }
    }

    async restore(req, res, next) {
        try {
            const { role } = req.user;
            if (role === 'admission_staff') {
                throw new ApiError(403, 'Admission Staff cannot restore students. Please contact Admin.');
            }
            const st = await studentService.restore(req.params.id);
            return ApiResponse.success(res, st, 'Student restored successfully');
        } catch (error) {
            next(error);
        }
    }

    async getDeletedStudents(req, res, next) {
        try {
            const st = await studentService.getDeletedStudents();
            return ApiResponse.success(res, st, 'Deleted students retrieved successfully');
        } catch (error) {
            next(error);
        }
    }

    async deletePermanently(req, res, next) {
        try {
            const { role } = req.user;
            if (role === 'admission_staff') {
                throw new ApiError(403, 'Admission Staff cannot permanently delete students. Please contact Admin.');
            }
            const r = await studentService.deletePermanently(req.params.id);
            return ApiResponse.success(res, r, 'Student deleted permanently successfully');
        } catch (error) {
            next(error);
        }
    }
}

export default new StudentController();


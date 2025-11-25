import courseGradeService from '../services/courseGradeService.js';
import { ApiResponse } from 'shared';

class CourseGradeController {
    async calculateGrade(req, res, next) {
        try {
            const grade = await courseGradeService.calculateStudentGrade(req.body, req.user.sub);
            return ApiResponse.created(res, grade, 'Grade calculated successfully');
        } catch (error) {
            next(error);
        }
    }

    async autoCalculateGrade(req, res, next) {
        try {
            const grade = await courseGradeService.autoCalculateGrade(req.params.enrollmentId, req.user.sub);
            return ApiResponse.success(res, grade, 'Grade auto-calculated successfully');
        } catch (error) {
            next(error);
        }
    }

    async updateGrade(req, res, next) {
        try {
            const grade = await courseGradeService.updateGrade(req.params.id, req.body, req.user.sub);
            return ApiResponse.success(res, grade, 'Grade updated successfully');
        } catch (error) {
            next(error);
        }
    }

    async publishGrade(req, res, next) {
        try {
            const grade = await courseGradeService.publishGrade(req.params.id, req.user.sub);
            return ApiResponse.success(res, grade, 'Grade published successfully');
        } catch (error) {
            next(error);
        }
    }

    async unpublishGrade(req, res, next) {
        try {
            const grade = await courseGradeService.unpublishGrade(req.params.id, req.user.sub);
            return ApiResponse.success(res, grade, 'Grade unpublished successfully');
        } catch (error) {
            next(error);
        }
    }

    async deleteGrade(req, res, next) {
        try {
            await courseGradeService.deleteGrade(req.params.id, req.user.sub);
            return ApiResponse.success(res, null, 'Grade deleted successfully');
        } catch (error) {
            next(error);
        }
    }

    async listGrades(req, res, next) {
        try {
            const filters = { ...req.query };
            if (req.user.type === 'student') {
                filters.studentId = req.user.sub;
                filters.isPublished = 'true';
            }
            const grades = await courseGradeService.listGrades(filters);
            return ApiResponse.success(res, grades);
        } catch (error) {
            next(error);
        }
    }

    async getGrade(req, res, next) {
        try {
            const grade = await courseGradeService.getGradeById(req.params.id);
            if (req.user.type === 'student' && (grade.studentId !== req.user.sub || !grade.isPublished)) {
                return ApiResponse.forbidden(res, 'You can only view your own published grades');
            }
            return ApiResponse.success(res, grade);
        } catch (error) {
            next(error);
        }
    }

    async getStudentSemesterGrades(req, res, next) {
        try {
            const { studentId, semester } = req.params;
            if (req.user.type === 'student' && req.user.sub !== studentId) {
                return ApiResponse.forbidden(res, 'You can only view your own grades');
            }
            const grades = await courseGradeService.getStudentSemesterGrades(studentId, parseInt(semester));
            return ApiResponse.success(res, grades);
        } catch (error) {
            next(error);
        }
    }

    async calculateSemesterGPA(req, res, next) {
        try {
            const { studentId, semester } = req.params;
            if (req.user.type === 'student' && req.user.sub !== studentId) {
                return ApiResponse.forbidden(res, 'You can only view your own GPA');
            }
            const result = await courseGradeService.calculateSemesterGPA(studentId, parseInt(semester));
            return ApiResponse.success(res, result);
        } catch (error) {
            next(error);
        }
    }

    async calculateCGPA(req, res, next) {
        try {
            const { studentId } = req.params;
            if (req.user.type === 'student' && req.user.sub !== studentId) {
                return ApiResponse.forbidden(res, 'You can only view your own CGPA');
            }
            const result = await courseGradeService.calculateCGPA(studentId);
            return ApiResponse.success(res, result);
        } catch (error) {
            next(error);
        }
    }

    async getCourseGradeStats(req, res, next) {
        try {
            const { courseId, batchId, semester } = req.query;
            const stats = await courseGradeService.getCourseGradeStats(courseId, batchId, parseInt(semester), req.user.sub);
            return ApiResponse.success(res, stats);
        } catch (error) {
            next(error);
        }
    }
}

export default new CourseGradeController();
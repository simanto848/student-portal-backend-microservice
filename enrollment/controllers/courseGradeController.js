import courseGradeService from '../services/courseGradeService.js';
import ApiResponse from '../utils/ApiResponser.js';

class CourseGradeController {
    // Calculate student grade
    async calculateGrade(req, res, next) {
        try {
            const grade = await courseGradeService.calculateStudentGrade(req.body, req.user.id);
            return ApiResponse.created(res, grade, 'Grade calculated successfully');
        } catch (error) {
            next(error);
        }
    }

    // Auto-calculate grade from assessment submissions
    async autoCalculateGrade(req, res, next) {
        try {
            const { enrollmentId } = req.params;
            const grade = await courseGradeService.autoCalculateGrade(enrollmentId, req.user.id);
            return ApiResponse.success(res, grade, 'Grade auto-calculated successfully');
        } catch (error) {
            next(error);
        }
    }

    // Get grade by ID
    async getGrade(req, res, next) {
        try {
            const grade = await courseGradeService.getGradeById(req.params.id);
            
            // Students can only view their published grades
            if (req.user.role === 'student') {
                if (grade.studentId !== req.user.id) {
                    return ApiResponse.forbidden(res, 'You can only view your own grades');
                }
                if (!grade.isPublished) {
                    return ApiResponse.forbidden(res, 'Grade is not yet published');
                }
            }

            return ApiResponse.success(res, grade);
        } catch (error) {
            next(error);
        }
    }

    // List grades with filters
    async listGrades(req, res, next) {
        try {
            const filters = { ...req.query };
            
            // Students can only view their own published grades
            if (req.user.role === 'student') {
                filters.studentId = req.user.id;
                filters.isPublished = 'true';
            }

            const grades = await courseGradeService.listGrades(filters);
            return ApiResponse.success(res, grades);
        } catch (error) {
            next(error);
        }
    }

    // Update grade
    async updateGrade(req, res, next) {
        try {
            const grade = await courseGradeService.updateGrade(req.params.id, req.body, req.user.id);
            return ApiResponse.success(res, grade, 'Grade updated successfully');
        } catch (error) {
            next(error);
        }
    }

    // Publish grade
    async publishGrade(req, res, next) {
        try {
            const grade = await courseGradeService.publishGrade(req.params.id, req.user.id);
            return ApiResponse.success(res, grade, 'Grade published successfully');
        } catch (error) {
            next(error);
        }
    }

    // Unpublish grade
    async unpublishGrade(req, res, next) {
        try {
            const grade = await courseGradeService.unpublishGrade(req.params.id, req.user.id);
            return ApiResponse.success(res, grade, 'Grade unpublished successfully');
        } catch (error) {
            next(error);
        }
    }

    // Delete grade
    async deleteGrade(req, res, next) {
        try {
            await courseGradeService.deleteGrade(req.params.id, req.user.id);
            return ApiResponse.success(res, null, 'Grade deleted successfully');
        } catch (error) {
            next(error);
        }
    }

    // Get student's semester grades
    async getStudentSemesterGrades(req, res, next) {
        try {
            const { studentId, semester } = req.params;
            
            // Students can only view their own grades
            if (req.user.role === 'student' && req.user.id !== studentId) {
                return ApiResponse.forbidden(res, 'You can only view your own grades');
            }

            const grades = await courseGradeService.getStudentSemesterGrades(studentId, parseInt(semester));
            return ApiResponse.success(res, grades);
        } catch (error) {
            next(error);
        }
    }

    // Calculate semester GPA
    async calculateSemesterGPA(req, res, next) {
        try {
            const { studentId, semester } = req.params;
            
            // Students can only view their own GPA
            if (req.user.role === 'student' && req.user.id !== studentId) {
                return ApiResponse.forbidden(res, 'You can only view your own GPA');
            }

            const gpaData = await courseGradeService.calculateSemesterGPA(studentId, parseInt(semester));
            return ApiResponse.success(res, gpaData);
        } catch (error) {
            next(error);
        }
    }

    // Get course grade statistics (instructor only)
    async getCourseGradeStats(req, res, next) {
        try {
            const { courseId, batchId, semester } = req.query;
            const stats = await courseGradeService.getCourseGradeStats(courseId, batchId, parseInt(semester), req.user.id);
            return ApiResponse.success(res, stats);
        } catch (error) {
            next(error);
        }
    }
}

export default new CourseGradeController();

import CourseGrade from '../models/CourseGrade.js';
import CourseEnrollment from '../models/CourseEnrollment.js';
import AssessmentSubmission from '../models/AssessmentSubmission.js';
import Assessment from '../models/Assessment.js';
import BatchCourseInstructor from '../models/BatchCourseInstructor.js';
import { ApiError } from '../utils/ApiResponser.js';
import { Course } from '../models/external/Academic.js';

class CourseGradeService {
    async calculateStudentGrade(data, instructorId) {
        try {
            const enrollment = await CourseEnrollment.findById(data.enrollmentId);
            if (!enrollment) {
                throw new ApiError(404, 'Enrollment not found');
            }

            const assignment = await BatchCourseInstructor.findOne({
                batchId: enrollment.batchId,
                courseId: enrollment.courseId,
                instructorId,
                status: 'active',
            });

            if (!assignment) {
                throw new ApiError(403, 'You are not assigned to teach this course');
            }

            const existingGrade = await CourseGrade.findOne({
                studentId: data.studentId,
                courseId: data.courseId,
                semester: data.semester,
                deletedAt: null,
            });

            let grade;
            if (existingGrade) {
                Object.assign(existingGrade, {
                    totalMarksObtained: data.totalMarksObtained,
                    totalMarks: data.totalMarks,
                    remarks: data.remarks,
                    calculatedBy: instructorId,
                    calculatedAt: new Date(),
                });
                existingGrade.calculateGrade();
                grade = await existingGrade.save();
            } else {
                grade = await CourseGrade.create({
                    ...data,
                    calculatedBy: instructorId,
                    calculatedAt: new Date(),
                });
                grade.calculateGrade();
                await grade.save();
            }

            return grade;
        } catch (error) {
            if (error instanceof ApiError) throw error;
            throw new ApiError(500, error.message || 'Failed to calculate grade');
        }
    }

    async autoCalculateGrade(enrollmentId, instructorId) {
        try {
            const enrollment = await CourseEnrollment.findById(enrollmentId);
            if (!enrollment) {
                throw new ApiError(404, 'Enrollment not found');
            }

            const assignment = await BatchCourseInstructor.findOne({
                batchId: enrollment.batchId,
                courseId: enrollment.courseId,
                instructorId,
                status: 'active',
            });

            if (!assignment) {
                throw new ApiError(403, 'You are not assigned to teach this course');
            }

            const assessments = await Assessment.find({
                courseId: enrollment.courseId,
                batchId: enrollment.batchId,
                semester: enrollment.semester,
                status: 'graded',
            });

            if (assessments.length === 0) {
                throw new ApiError(400, 'No graded assessments found for this course');
            }

            const submissions = await AssessmentSubmission.find({
                studentId: enrollment.studentId,
                assessmentId: { $in: assessments.map(a => a._id) },
                status: 'graded',
            });

            let totalWeightedMarks = 0;
            let totalWeightage = 0;

            for (const assessment of assessments) {
                const submission = submissions.find(s => s.assessmentId.toString() === assessment._id.toString());

                if (submission && submission.marksObtained != null) {
                    const percentage = (submission.marksObtained / assessment.totalMarks) * 100;
                    totalWeightedMarks += (percentage * assessment.weightage) / 100;
                    totalWeightage += assessment.weightage;
                }
            }

            const finalPercentage = totalWeightage > 0 ? (totalWeightedMarks / totalWeightage) * 100 : 0;
            let grade = await CourseGrade.findOne({
                studentId: enrollment.studentId,
                courseId: enrollment.courseId,
                semester: enrollment.semester,
                deletedAt: null,
            });

            const gradeData = {
                totalMarksObtained: finalPercentage,
                totalMarks: 100,
                calculatedBy: instructorId,
                calculatedAt: new Date(),
            };

            if (grade) {
                Object.assign(grade, gradeData);
                grade.calculateGrade();
                await grade.save();
            } else {
                grade = await CourseGrade.create({
                    studentId: enrollment.studentId,
                    enrollmentId: enrollment._id,
                    courseId: enrollment.courseId,
                    batchId: enrollment.batchId,
                    semester: enrollment.semester,
                    ...gradeData,
                });
                grade.calculateGrade();
                await grade.save();
            }

            return grade;
        } catch (error) {
            if (error instanceof ApiError) throw error;
            throw new ApiError(500, error.message || 'Failed to auto-calculate grade');
        }
    }

    async getGradeById(id) {
        const grade = await CourseGrade.findById(id);
        if (!grade) {
            throw new ApiError(404, 'Grade not found');
        }
        return grade;
    }

    async listGrades(filters = {}) {
        const query = {};

        if (filters.studentId) query.studentId = filters.studentId;
        if (filters.courseId) query.courseId = filters.courseId;
        if (filters.batchId) query.batchId = filters.batchId;
        if (filters.semester) query.semester = parseInt(filters.semester);
        if (filters.isPublished !== undefined) {
            query.isPublished = filters.isPublished === 'true';
        }

        const grades = await CourseGrade.find(query).sort({ createdAt: -1 });
        return grades;
    }

    async updateGrade(id, data, instructorId) {
        const grade = await this.getGradeById(id);
        const assignment = await BatchCourseInstructor.findOne({
            batchId: grade.batchId,
            courseId: grade.courseId,
            instructorId,
            status: 'active',
        });

        if (!assignment) {
            throw new ApiError(403, 'You are not assigned to teach this course');
        }

        Object.assign(grade, data);
        if (data.totalMarksObtained !== undefined || data.totalMarks !== undefined) {
            grade.calculateGrade();
        }
        await grade.save();
        return grade;
    }

    async publishGrade(id, instructorId) {
        const grade = await this.getGradeById(id);
        const assignment = await BatchCourseInstructor.findOne({
            batchId: grade.batchId,
            courseId: grade.courseId,
            instructorId,
            status: 'active',
        });

        if (!assignment) {
            throw new ApiError(403, 'You are not assigned to teach this course');
        }

        if (grade.isPublished) {
            throw new ApiError(400, 'Grade is already published');
        }

        grade.isPublished = true;
        grade.publishedAt = new Date();
        await grade.save();
        return grade;
    }

    async unpublishGrade(id, instructorId) {
        const grade = await this.getGradeById(id);
        const assignment = await BatchCourseInstructor.findOne({
            batchId: grade.batchId,
            courseId: grade.courseId,
            instructorId,
            status: 'active',
        });

        if (!assignment) {
            throw new ApiError(403, 'You are not assigned to teach this course');
        }

        grade.isPublished = false;
        grade.publishedAt = null;
        await grade.save();
        return grade;
    }

    async deleteGrade(id, instructorId) {
        const grade = await this.getGradeById(id);
        const assignment = await BatchCourseInstructor.findOne({
            batchId: grade.batchId,
            courseId: grade.courseId,
            instructorId,
            status: 'active',
        });

        if (!assignment) {
            throw new ApiError(403, 'You are not assigned to teach this course');
        }

        await grade.softDelete();
        return grade;
    }

    async getStudentSemesterGrades(studentId, semester) {
        const grades = await CourseGrade.find({
            studentId,
            semester,
            isPublished: true,
        });
        return grades;
    }

    async calculateSemesterGPA(studentId, semester) {
        const grades = await CourseGrade.find({
            studentId,
            semester,
            isPublished: true,
        });

        if (grades.length === 0) {
            return {
                gpa: 0,
                totalCredits: 0,
                grades: [],
            };
        }

        let totalWeightedPoints = 0;
        let totalCredits = 0;
        const gradeDetails = [];

        for (const grade of grades) {
            const course = await Course.findById(grade.courseId);
            const credits = course ? course.credit : 0;
            
            if (credits > 0) {
                totalWeightedPoints += (grade.gradePoint || 0) * credits;
                totalCredits += credits;
            }
            
            gradeDetails.push({
                ...grade.toJSON(),
                courseCode: course ? course.code : 'UNKNOWN',
                courseName: course ? course.name : 'Unknown Course',
                credits
            });
        }

        const gpa = totalCredits > 0 ? (totalWeightedPoints / totalCredits).toFixed(2) : 0;

        return {
            gpa: parseFloat(gpa),
            totalCredits,
            totalCourses: grades.length,
            grades: gradeDetails,
        };
    }

    async calculateCGPA(studentId) {
        const grades = await CourseGrade.find({
            studentId,
            isPublished: true,
        });

        if (grades.length === 0) {
            return {
                cgpa: 0,
                totalCredits: 0,
                totalCourses: 0,
                semesterBreakdown: {}
            };
        }

        let totalWeightedPoints = 0;
        let totalCredits = 0;
        const semesterBreakdown = {};

        for (const grade of grades) {
            const course = await Course.findById(grade.courseId);
            const credits = course ? course.credit : 0;

            if (credits > 0) {
                totalWeightedPoints += (grade.gradePoint || 0) * credits;
                totalCredits += credits;
            }

            // Semester breakdown
            if (!semesterBreakdown[grade.semester]) {
                semesterBreakdown[grade.semester] = {
                    totalWeightedPoints: 0,
                    totalCredits: 0,
                    courses: 0
                };
            }
            semesterBreakdown[grade.semester].totalWeightedPoints += (grade.gradePoint || 0) * credits;
            semesterBreakdown[grade.semester].totalCredits += credits;
            semesterBreakdown[grade.semester].courses += 1;
        }

        const cgpa = totalCredits > 0 ? (totalWeightedPoints / totalCredits).toFixed(2) : 0;

        // Calculate GPA for each semester in breakdown
        Object.keys(semesterBreakdown).forEach(sem => {
            const data = semesterBreakdown[sem];
            data.gpa = data.totalCredits > 0 ? parseFloat((data.totalWeightedPoints / data.totalCredits).toFixed(2)) : 0;
            delete data.totalWeightedPoints; // Cleanup intermediate data
        });

        return {
            cgpa: parseFloat(cgpa),
            totalCredits,
            totalCourses: grades.length,
            semesterBreakdown
        };
    }

    async getCourseGradeStats(courseId, batchId, semester, instructorId) {
        const assignment = await BatchCourseInstructor.findOne({
            batchId,
            courseId,
            instructorId,
            status: 'active',
        });

        if (!assignment) {
            throw new ApiError(403, 'You are not assigned to teach this course');
        }

        const grades = await CourseGrade.find({
            courseId,
            batchId,
            semester,
        });

        if (grades.length === 0) {
            return {
                total: 0,
                published: 0,
                averageGPA: 0,
            };
        }

        const stats = {
            total: grades.length,
            published: grades.filter(g => g.isPublished).length,
            gradeDistribution: {},
            averagePercentage: 0,
            averageGPA: 0,
        };

        grades.forEach(grade => {
            const letter = grade.letterGrade || 'N/A';
            stats.gradeDistribution[letter] = (stats.gradeDistribution[letter] || 0) + 1;
        });

        const totalPercentage = grades.reduce((sum, g) => sum + (g.percentage || 0), 0);
        const totalGPA = grades.reduce((sum, g) => sum + (g.gradePoint || 0), 0);

        stats.averagePercentage = (totalPercentage / grades.length).toFixed(2);
        stats.averageGPA = (totalGPA / grades.length).toFixed(2);

        return stats;
    }
}

export default new CourseGradeService();
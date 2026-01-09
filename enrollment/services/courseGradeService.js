import CourseGrade from "../models/CourseGrade.js";
import CourseEnrollment from "../models/CourseEnrollment.js";
import AssessmentSubmission from "../models/AssessmentSubmission.js";
import Assessment from "../models/Assessment.js";
import BatchCourseInstructor from "../models/BatchCourseInstructor.js";
import { ApiError } from "shared";
import { Course } from "../models/external/Academic.js";
import academicClient from "../client/academicServiceClient.js";

class CourseGradeService {
    async calculateStudentGrade(data, instructorId) {
        try {
            const enrollment = await CourseEnrollment.findById(data.enrollmentId);
            if (!enrollment) {
                throw new ApiError(404, "Enrollment not found");
            }

            const assignment = await BatchCourseInstructor.findOne({
                batchId: enrollment.batchId,
                courseId: enrollment.courseId,
                instructorId,
                status: "active",
            });

            if (!assignment) {
                throw new ApiError(403, "You are not assigned to teach this course");
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
            throw new ApiError(500, error.message || "Failed to calculate grade");
        }
    }

    async autoCalculateGrade(enrollmentId, instructorId) {
        try {
            const enrollment = await CourseEnrollment.findById(enrollmentId);
            if (!enrollment) {
                throw new ApiError(404, "Enrollment not found");
            }

            const assignment = await BatchCourseInstructor.findOne({
                batchId: enrollment.batchId,
                courseId: enrollment.courseId,
                instructorId,
                status: "active",
            });

            if (!assignment) {
                throw new ApiError(403, "You are not assigned to teach this course");
            }

            const assessments = await Assessment.find({
                courseId: enrollment.courseId,
                batchId: enrollment.batchId,
                semester: enrollment.semester,
                status: "graded",
            });

            if (assessments.length === 0) {
                throw new ApiError(400, "No graded assessments found for this course");
            }

            const submissions = await AssessmentSubmission.find({
                studentId: enrollment.studentId,
                assessmentId: { $in: assessments.map((a) => a._id) },
                status: "graded",
            });

            let totalWeightedMarks = 0;
            let totalWeightage = 0;

            for (const assessment of assessments) {
                const submission = submissions.find(
                    (s) => s.assessmentId.toString() === assessment._id.toString()
                );

                if (submission && submission.marksObtained != null) {
                    const percentage =
                        (submission.marksObtained / assessment.totalMarks) * 100;
                    totalWeightedMarks += (percentage * assessment.weightage) / 100;
                    totalWeightage += assessment.weightage;
                }
            }

            const finalPercentage =
                totalWeightage > 0 ? (totalWeightedMarks / totalWeightage) * 100 : 0;
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
            throw new ApiError(
                500,
                error.message || "Failed to auto-calculate grade"
            );
        }
    }

    async getGradeById(id) {
        const grade = await CourseGrade.findById(id);
        if (!grade) {
            throw new ApiError(404, "Grade not found");
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
            query.isPublished = filters.isPublished === "true";
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
            status: "active",
        });

        if (!assignment) {
            throw new ApiError(403, "You are not assigned to teach this course");
        }

        Object.assign(grade, data);
        if (
            data.totalMarksObtained !== undefined ||
            data.totalMarks !== undefined
        ) {
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
            status: "active",
        });

        if (!assignment) {
            throw new ApiError(403, "You are not assigned to teach this course");
        }

        if (grade.isPublished) {
            throw new ApiError(400, "Grade is already published");
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
            status: "active",
        });

        if (!assignment) {
            throw new ApiError(403, "You are not assigned to teach this course");
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
            status: "active",
        });

        if (!assignment) {
            throw new ApiError(403, "You are not assigned to teach this course");
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
                courseCode: course ? course.code : "UNKNOWN",
                courseName: course ? course.name : "Unknown Course",
                credits,
            });
        }

        const gpa =
            totalCredits > 0 ? (totalWeightedPoints / totalCredits).toFixed(2) : 0;

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
                semesterBreakdown: {},
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
                    courses: 0,
                };
            }
            semesterBreakdown[grade.semester].totalWeightedPoints +=
                (grade.gradePoint || 0) * credits;
            semesterBreakdown[grade.semester].totalCredits += credits;
            semesterBreakdown[grade.semester].courses += 1;
        }

        const cgpa =
            totalCredits > 0 ? (totalWeightedPoints / totalCredits).toFixed(2) : 0;

        // Calculate GPA for each semester in breakdown
        Object.keys(semesterBreakdown).forEach((sem) => {
            const data = semesterBreakdown[sem];
            data.gpa =
                data.totalCredits > 0
                    ? parseFloat(
                        (data.totalWeightedPoints / data.totalCredits).toFixed(2)
                    )
                    : 0;
            delete data.totalWeightedPoints; // Cleanup intermediate data
        });

        return {
            cgpa: parseFloat(cgpa),
            totalCredits,
            totalCourses: grades.length,
            semesterBreakdown,
        };
    }

    async getCourseGradeStats(courseId, batchId, semester, instructorId) {
        const assignment = await BatchCourseInstructor.findOne({
            batchId,
            courseId,
            instructorId,
            status: "active",
        });

        if (!assignment) {
            throw new ApiError(403, "You are not assigned to teach this course");
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
            published: grades.filter((g) => g.isPublished).length,
            gradeDistribution: {},
            averagePercentage: 0,
            averageGPA: 0,
        };

        grades.forEach((grade) => {
            const letter = grade.letterGrade || "N/A";
            stats.gradeDistribution[letter] =
                (stats.gradeDistribution[letter] || 0) + 1;
        });

        const totalPercentage = grades.reduce(
            (sum, g) => sum + (g.percentage || 0),
            0
        );
        const totalGPA = grades.reduce((sum, g) => sum + (g.gradePoint || 0), 0);

        stats.averagePercentage = (totalPercentage / grades.length).toFixed(2);
        stats.averageGPA = (totalGPA / grades.length).toFixed(2);

        return stats;
    }

    async getMarkEntryConfig(courseId) {
        try {
            // Fetch course from Academic service
            const courseResponse = await academicClient.verifyCourse(courseId);
            const course = courseResponse?.data;

            if (!course) {
                throw new ApiError(404, "Course not found");
            }

            const courseType = course.courseType || "theory";
            let config = {
                courseId,
                courseType,
                totalMarks: 100,
                components: {},
            };

            if (courseType === "theory") {
                config.components = {
                    finalExam: { label: "Final Exam", maxMarks: 50, weight: 50 },
                    midterm: { label: "Midterm", maxMarks: 20, weight: 20 },
                    attendance: { label: "Attendance", maxMarks: 10, weight: 10 },
                    continuousAssessment: {
                        label: "Continuous Assessment",
                        maxMarks: 20,
                        weight: 20,
                    },
                };
            } else if (courseType === "lab") {
                config.totalMarks = 50;
                config.components = {
                    labReports: { label: "Lab Reports", maxMarks: 20, weight: 40 },
                    viva: { label: "Viva", maxMarks: 20, weight: 40 },
                    experiment: { label: "Experiment", maxMarks: 10, weight: 20 },
                };
            } else if (courseType === "combined") {
                config.components = {
                    theoryMarks: {
                        label: "Theory Component (60%)",
                        maxMarks: 60,
                        subcomponents: {
                            finalExam: { label: "Final Exam", maxMarks: 30, weight: 50 },
                            midterm: { label: "Midterm", maxMarks: 12, weight: 20 },
                            attendance: { label: "Attendance", maxMarks: 6, weight: 10 },
                            continuousAssessment: {
                                label: "Continuous Assessment",
                                maxMarks: 12,
                                weight: 20,
                            },
                        },
                    },
                    labMarks: {
                        label: "Lab Component (40%)",
                        maxMarks: 40,
                        subcomponents: {
                            labReports: { label: "Lab Reports", maxMarks: 16, weight: 40 },
                            viva: { label: "Viva", maxMarks: 16, weight: 40 },
                            experiment: { label: "Experiment", maxMarks: 8, weight: 20 },
                        },
                    },
                };
            }

            return config;
        } catch (error) {
            if (error instanceof ApiError) throw error;
            throw new ApiError(
                500,
                error.message || "Failed to fetch mark entry config"
            );
        }
    }

    async bulkSaveMarks(data, instructorId) {
        try {
            const { courseId, batchId, semester, entries } = data;

            // Verify instructor assignment
            const assignment = await BatchCourseInstructor.findOne({
                instructorId,
                courseId,
                batchId,
                status: "active",
            });

            if (!assignment) {
                throw new ApiError(403, "You are not assigned to teach this course");
            }

            // Get course to determine type
            const courseResponse = await academicClient.verifyCourse(courseId);
            const course = courseResponse?.data;
            if (!course) {
                throw new ApiError(404, "Course not found");
            }

            const courseType = course.courseType || "theory";
            const results = [];

            for (const entry of entries) {
                try {
                    const enrollment = await CourseEnrollment.findOne({
                        studentId: entry.studentId,
                        courseId,
                        batchId,
                        status: "active",
                    });

                    if (!enrollment) {
                        results.push({
                            studentId: entry.studentId,
                            success: false,
                            error: "Enrollment not found",
                        });
                        continue;
                    }

                    // Validate marks based on course type
                    const validationError = this.validateMarks(entry, courseType);
                    if (validationError) {
                        results.push({
                            studentId: entry.studentId,
                            success: false,
                            error: validationError,
                        });
                        continue;
                    }

                    // Find or create grade
                    let grade = await CourseGrade.findOne({
                        studentId: entry.studentId,
                        courseId,
                        batchId,
                        semester,
                        deletedAt: null,
                    });

                    if (!grade) {
                        grade = new CourseGrade({
                            studentId: entry.studentId,
                            enrollmentId: enrollment._id,
                            courseId,
                            batchId,
                            semester,
                            courseType,
                        });
                    }

                    // Update marks based on course type
                    if (courseType === "theory" || courseType === "combined") {
                        if (entry.theoryMarks) {
                            grade.theoryMarks = {
                                ...grade.theoryMarks,
                                ...entry.theoryMarks,
                            };
                        }
                    }

                    if (courseType === "lab" || courseType === "combined") {
                        if (entry.labMarks) {
                            grade.labMarks = {
                                ...grade.labMarks,
                                ...entry.labMarks,
                            };
                        }
                    }

                    if (courseType === "combined") {
                        if (entry.theoryWeightage !== undefined)
                            grade.theoryWeightage = entry.theoryWeightage;
                        if (entry.labWeightage !== undefined)
                            grade.labWeightage = entry.labWeightage;
                    }

                    grade.gradedBy = instructorId;
                    grade.gradedAt = new Date();
                    grade.status = "calculated";

                    // Calculate final grade
                    grade.calculateGrade();
                    await grade.save();

                    results.push({
                        studentId: entry.studentId,
                        success: true,
                        gradeId: grade._id,
                    });
                } catch (error) {
                    results.push({
                        studentId: entry.studentId,
                        success: false,
                        error: error.message || "Failed to save marks",
                    });
                }
            }

            return {
                courseId,
                batchId,
                semester,
                totalEntries: entries.length,
                successCount: results.filter((r) => r.success).length,
                failureCount: results.filter((r) => !r.success).length,
                results,
            };
        } catch (error) {
            if (error instanceof ApiError) throw error;
            throw new ApiError(500, error.message || "Failed to bulk save marks");
        }
    }

    validateMarks(entry, courseType) {
        if (courseType === "theory" || courseType === "combined") {
            if (entry.theoryMarks) {
                const theory = entry.theoryMarks;
                if (theory.finalExam !== undefined && theory.finalExam > 50)
                    return "Final Exam marks cannot exceed 50";
                if (theory.midterm !== undefined && theory.midterm > 20)
                    return "Midterm marks cannot exceed 20";
                if (theory.attendance !== undefined && theory.attendance > 10)
                    return "Attendance marks cannot exceed 10";
                if (
                    theory.continuousAssessment !== undefined &&
                    theory.continuousAssessment > 20
                )
                    return "Continuous Assessment marks cannot exceed 20";
            }
        }

        if (courseType === "lab" || courseType === "combined") {
            if (entry.labMarks) {
                const lab = entry.labMarks;
                if (lab.labReports !== undefined && lab.labReports > 20)
                    return "Lab Reports marks cannot exceed 20";
                if (lab.viva !== undefined && lab.viva > 20)
                    return "Viva marks cannot exceed 20";
                if (lab.experiment !== undefined && lab.experiment > 10)
                    return "Experiment marks cannot exceed 10";
                if (lab.attendance !== undefined && lab.attendance > 10)
                    return "Lab Attendance marks cannot exceed 10";
                if (lab.finalLab !== undefined && lab.finalLab > 30)
                    return "Final Lab marks cannot exceed 30";
            }
        }

        return null;
    }
}

export default new CourseGradeService();

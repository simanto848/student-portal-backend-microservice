import CourseEnrollment from '../models/CourseEnrollment.js';
import BatchCourseInstructor from '../models/BatchCourseInstructor.js';
import { ApiError } from '../utils/ApiResponser.js';
import userServiceClient from '../client/userServiceClient.js';
import academicServiceClient from '../client/academicServiceClient.js';

class EnrollmentService {
    async enrollStudent(data) {
        try {
            await Promise.all([
                userServiceClient.verifyStudent(data.studentId),
                academicServiceClient.verifyBatch(data.batchId),
                academicServiceClient.verifyCourse(data.courseId),
                academicServiceClient.verifySession(data.sessionId),
                userServiceClient.verifyTeacher(data.instructorId),
            ]);

            const assignment = await BatchCourseInstructor.findOne({
                batchId: data.batchId,
                courseId: data.courseId,
                semester: data.semester,
                instructorId: data.instructorId,
                status: 'active',
            });

            if (!assignment) {
                throw new ApiError(400, 'Instructor is not assigned to teach this course for this batch');
            }

            const existingEnrollment = await CourseEnrollment.findOne({
                studentId: data.studentId,
                courseId: data.courseId,
                semester: data.semester,
                deletedAt: null,
            });

            if (existingEnrollment) {
                throw new ApiError(409, 'Student is already enrolled in this course for this semester');
            }

            const enrollment = await CourseEnrollment.create(data);
            return enrollment;
        } catch (error) {
            if (error instanceof ApiError) throw error;
            throw new ApiError(500, error.message || 'Failed to enroll student');
        }
    }

    async bulkEnrollBatch(data) {
        try {
            const { batchId, semester, courses } = data;
            const batch = await academicServiceClient.verifyBatch(batchId);

            const studentsResponse = await userServiceClient.getStudentsByBatch(batchId);
            const students = studentsResponse.data || studentsResponse;

            if (!students || students.length === 0) {
                throw new ApiError(404, 'No students found in this batch');
            }

            const enrollments = [];
            const errors = [];

            for (const student of students) {
                for (const course of courses) {
                    try {
                        const assignment = await BatchCourseInstructor.findOne({
                            batchId,
                            courseId: course.courseId,
                            semester,
                            instructorId: course.instructorId,
                            status: 'active',
                        });

                        if (!assignment) {
                            errors.push({
                                studentId: student.id || student._id,
                                courseId: course.courseId,
                                error: 'Instructor not assigned to this course',
                            });
                            continue;
                        }

                        const existing = await CourseEnrollment.findOne({
                            studentId: student.id || student._id,
                            courseId: course.courseId,
                            semester,
                            deletedAt: null,
                        });

                        if (existing) {
                            continue;
                        }

                        const enrollment = await CourseEnrollment.create({
                            studentId: student.id || student._id,
                            batchId,
                            courseId: course.courseId,
                            sessionId: batch.data?.sessionId || batch.sessionId,
                            semester,
                            instructorId: course.instructorId,
                        });

                        enrollments.push(enrollment);
                    } catch (error) {
                        errors.push({
                            studentId: student.id || student._id,
                            courseId: course.courseId,
                            error: error.message,
                        });
                    }
                }
            }

            return {
                success: enrollments.length,
                failed: errors.length,
                enrollments,
                errors: errors.length > 0 ? errors : undefined,
            };
        } catch (error) {
            if (error instanceof ApiError) throw error;
            throw new ApiError(500, error.message || 'Failed to bulk enroll students');
        }
    }

    async getEnrollmentById(id) {
        const enrollment = await CourseEnrollment.findById(id);
        if (!enrollment) {
            throw new ApiError(404, 'Enrollment not found');
        }
        return enrollment;
    }

    async listEnrollments(filters = {}) {
        const query = {};

        if (filters.studentId) query.studentId = filters.studentId;
        if (filters.batchId) query.batchId = filters.batchId;
        if (filters.courseId) query.courseId = filters.courseId;
        if (filters.semester) query.semester = parseInt(filters.semester);
        if (filters.status) query.status = filters.status;

        const enrollments = await CourseEnrollment.find(query).sort({ createdAt: -1 });
        return enrollments;
    }

    async updateEnrollment(id, data) {
        const enrollment = await this.getEnrollmentById(id);
        Object.assign(enrollment, data);
        await enrollment.save();
        return enrollment;
    }

    async deleteEnrollment(id) {
        const enrollment = await this.getEnrollmentById(id);
        await enrollment.softDelete();
        return enrollment;
    }

    async getStudentSemesterEnrollments(studentId, semester) {
        const enrollments = await CourseEnrollment.find({
            studentId,
            semester,
        });
        return enrollments;
    }

    async completeBatchSemester(batchId, semester) {
        const result = await CourseEnrollment.updateMany(
            { batchId, semester, status: 'active' },
            { status: 'completed' }
        );
        return result;
    }

    async progressBatchToNextSemester(batchId) {
        try {
            const batchResponse = await academicServiceClient.getBatchDetails(batchId);
            const batch = batchResponse.data || batchResponse;
            if (!batch) {
                throw new ApiError(404, 'Batch not found');
            }

            const currentSemester = batch.currentSemester || 1;
            const nextSemester = currentSemester + 1;
            await this.completeBatchSemester(batchId, currentSemester);
            await academicServiceClient.updateBatchSemester(batchId, nextSemester);
            const sessionCoursesResponse = await academicServiceClient.getSessionCourses(
                batch.sessionId,
                nextSemester,
                batch.departmentId
            );
            const sessionCourses = sessionCoursesResponse.data || sessionCoursesResponse;

            if (!sessionCourses || sessionCourses.length === 0) {
                return {
                    message: `Batch progressed to semester ${nextSemester}, but no courses found for enrollment`,
                    previousSemester: currentSemester,
                    currentSemester: nextSemester,
                };
            }

            const studentsResponse = await userServiceClient.getBatchStudents(batchId);
            const students = studentsResponse.data || studentsResponse;

            const enrollments = [];
            const errors = [];

            for (const student of students) {
                for (const sessionCourse of sessionCourses) {
                    try {
                        const assignment = await BatchCourseInstructor.findOne({
                            batchId,
                            courseId: sessionCourse.courseId,
                            semester: nextSemester,
                            status: 'active',
                        });

                        const existing = await CourseEnrollment.findOne({
                            studentId: student.id || student._id,
                            courseId: sessionCourse.courseId,
                            semester: nextSemester,
                            deletedAt: null,
                        });

                        if (existing) {
                            continue;
                        }

                        const enrollment = await CourseEnrollment.create({
                            studentId: student.id || student._id,
                            batchId,
                            courseId: sessionCourse.courseId,
                            sessionId: batch.sessionId,
                            semester: nextSemester,
                            instructorId: assignment?.instructorId,
                            status: 'active',
                        });

                        enrollments.push(enrollment);
                    } catch (error) {
                        errors.push({
                            studentId: student.id || student._id,
                            courseId: sessionCourse.courseId,
                            error: error.message,
                        });
                    }
                }
            }

            return {
                message: `Batch progressed from semester ${currentSemester} to ${nextSemester}`,
                previousSemester: currentSemester,
                currentSemester: nextSemester,
                enrolledCount: enrollments.length,
                errorCount: errors.length,
                enrollments,
                errors: errors.length > 0 ? errors : undefined,
            };
        } catch (error) {
            if (error instanceof ApiError) throw error;
            throw new ApiError(500, error.message || 'Failed to progress batch semester');
        }
    }
}

export default new EnrollmentService();
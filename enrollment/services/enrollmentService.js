import CourseEnrollment from '../models/CourseEnrollment.js';
import BatchCourseInstructor from '../models/BatchCourseInstructor.js';
import { ApiError } from 'shared';
import userServiceClient from '../client/userServiceClient.js';
import academicServiceClient from '../client/academicServiceClient.js';

class EnrollmentService {
    async getBatchSemesterCourses(batchId, semester) {
        try {
            console.log('[EnrollmentService] getBatchSemesterCourses called:', { batchId, semester });

            // Get batch details to find session and department
            const batchResponse = await academicServiceClient.getBatchDetails(batchId);
            const batch = batchResponse.data || batchResponse;

            if (!batch) {
                throw new ApiError(404, 'Batch not found');
            }

            console.log('[EnrollmentService] Batch details:', batch);

            // Extract IDs - handle both populated objects and direct IDs
            const sessionId = typeof batch.sessionId === 'object' ? batch.sessionId.id || batch.sessionId._id : batch.sessionId;
            const departmentId = typeof batch.departmentId === 'object' ? batch.departmentId.id || batch.departmentId._id : batch.departmentId;

            console.log('[EnrollmentService] Extracted IDs:', { sessionId, departmentId, semester });

            // Get courses for this session, semester, and department
            const sessionCoursesResponse = await academicServiceClient.getSessionCourses(
                sessionId,
                semester,
                departmentId
            );

            console.log('[EnrollmentService] Session courses response:', sessionCoursesResponse);

            // Extract the courses array - handle nested structure
            let sessionCourses = [];
            if (sessionCoursesResponse?.data?.data) {
                // Structure: { success: true, data: { data: [...], total: 10 } }
                sessionCourses = sessionCoursesResponse.data.data;
            } else if (sessionCoursesResponse?.data && Array.isArray(sessionCoursesResponse.data)) {
                // Structure: { success: true, data: [...] }
                sessionCourses = sessionCoursesResponse.data;
            } else if (Array.isArray(sessionCoursesResponse)) {
                // Direct array
                sessionCourses = sessionCoursesResponse;
            }

            console.log('[EnrollmentService] Session courses found:', sessionCourses?.length || 0);

            if (!sessionCourses || sessionCourses.length === 0) {
                return [];
            }

            // Enrich with instructor assignments from BatchCourseInstructor
            const enrichedCourses = await Promise.all(
                sessionCourses.map(async (sc) => {
                    const assignment = await BatchCourseInstructor.findOne({
                        batchId,
                        courseId: sc.courseId,
                        semester,
                        status: 'active',
                    });

                    return {
                        courseId: sc.courseId,
                        sessionCourseId: sc.id || sc._id,
                        semester,
                        instructorId: assignment?.instructorId,
                        instructorAssigned: !!assignment,
                        assignmentId: assignment?.id || assignment?._id,
                    };
                })
            );

            return enrichedCourses;
        } catch (error) {
            console.error('[EnrollmentService] Error in getBatchSemesterCourses:', error);
            if (error instanceof ApiError) throw error;
            throw new ApiError(500, error.message || 'Failed to fetch batch semester courses');
        }
    }

    async enrollStudent(data) {
        try {
            const { studentId, batchId, sessionId, semester } = data;

            // Verify student, batch, and session
            await Promise.all([
                userServiceClient.verifyStudent(studentId),
                academicServiceClient.verifyBatch(batchId),
                academicServiceClient.verifySession(sessionId),
            ]);

            // Get all courses for this batch-semester
            const courses = await this.getBatchSemesterCourses(batchId, semester);

            if (!courses || courses.length === 0) {
                throw new ApiError(404, 'No courses found for this batch and semester');
            }

            const enrollments = [];
            const errors = [];
            const skipped = [];

            // Enroll student in each course
            for (const course of courses) {
                try {
                    // Check if already enrolled
                    const existingEnrollment = await CourseEnrollment.findOne({
                        studentId,
                        courseId: course.courseId,
                        semester,
                        deletedAt: null,
                    });

                    if (existingEnrollment) {
                        skipped.push({
                            courseId: course.courseId,
                            reason: 'Already enrolled',
                        });
                        continue;
                    }

                    // Create enrollment
                    const enrollment = await CourseEnrollment.create({
                        studentId,
                        batchId,
                        courseId: course.courseId,
                        sessionId,
                        semester,
                        instructorId: course.instructorId,
                        status: 'active',
                    });

                    enrollments.push(enrollment);
                } catch (error) {
                    errors.push({
                        courseId: course.courseId,
                        error: error.message,
                    });
                }
            }

            return {
                success: true,
                message: `Student enrolled in ${enrollments.length} courses`,
                totalCourses: courses.length,
                enrolled: enrollments.length,
                skipped: skipped.length,
                failed: errors.length,
                enrollments,
                skippedCourses: skipped.length > 0 ? skipped : undefined,
                errors: errors.length > 0 ? errors : undefined,
            };
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
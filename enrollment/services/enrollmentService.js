import CourseEnrollment from '../models/CourseEnrollment.js';
import BatchCourseInstructor from '../models/BatchCourseInstructor.js';
import { ApiError } from '../utils/ApiResponser.js';
import userServiceClient from '../utils/userServiceClient.js';
import academicServiceClient from '../utils/academicServiceClient.js';

class EnrollmentService {
    // Enroll a single student in a course
    async enrollStudent(data) {
        try {
            // Verify student, batch, course, session, and instructor exist
            await Promise.all([
                userServiceClient.verifyStudent(data.studentId),
                academicServiceClient.verifyBatch(data.batchId),
                academicServiceClient.verifyCourse(data.courseId),
                academicServiceClient.verifySession(data.sessionId),
                userServiceClient.verifyTeacher(data.instructorId),
            ]);

            // Verify instructor is assigned to this batch-course
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

            // Check if student is already enrolled
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

    // Bulk enroll all students in a batch for semester courses
    async bulkEnrollBatch(data) {
        try {
            const { batchId, semester, courses } = data;

            // Verify batch
            const batch = await academicServiceClient.verifyBatch(batchId);
            
            // Get all students in the batch
            const studentsResponse = await userServiceClient.getStudentsByBatch(batchId);
            const students = studentsResponse.data || studentsResponse;

            if (!students || students.length === 0) {
                throw new ApiError(404, 'No students found in this batch');
            }

            const enrollments = [];
            const errors = [];

            // Enroll each student in each course
            for (const student of students) {
                for (const course of courses) {
                    try {
                        // Verify instructor assignment
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

                        // Check if already enrolled
                        const existing = await CourseEnrollment.findOne({
                            studentId: student.id || student._id,
                            courseId: course.courseId,
                            semester,
                            deletedAt: null,
                        });

                        if (existing) {
                            // Skip already enrolled students
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

    // Get enrollment by ID
    async getEnrollmentById(id) {
        const enrollment = await CourseEnrollment.findById(id);
        if (!enrollment) {
            throw new ApiError(404, 'Enrollment not found');
        }
        return enrollment;
    }

    // List enrollments with filters
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

    // Update enrollment
    async updateEnrollment(id, data) {
        const enrollment = await this.getEnrollmentById(id);
        Object.assign(enrollment, data);
        await enrollment.save();
        return enrollment;
    }

    // Delete enrollment (soft delete)
    async deleteEnrollment(id) {
        const enrollment = await this.getEnrollmentById(id);
        await enrollment.softDelete();
        return enrollment;
    }

    // Get student's enrollments for a semester
    async getStudentSemesterEnrollments(studentId, semester) {
        const enrollments = await CourseEnrollment.find({
            studentId,
            semester,
        });
        return enrollments;
    }

    // Mark semester courses as completed for entire batch
    async completeBatchSemester(batchId, semester) {
        const result = await CourseEnrollment.updateMany(
            { batchId, semester, status: 'active' },
            { status: 'completed' }
        );
        return result;
    }
}

export default new EnrollmentService();

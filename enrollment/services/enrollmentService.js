import CourseEnrollment from "../models/CourseEnrollment.js";
import BatchCourseInstructor from "../models/BatchCourseInstructor.js";
import { ApiError } from "shared";
import userServiceClient from "../client/userServiceClient.js";
import academicServiceClient from "../client/academicServiceClient.js";

class EnrollmentService {
  async getBatchSemesterCourses(batchId, semester) {
    try {
      console.log("[EnrollmentService] getBatchSemesterCourses called:", {
        batchId,
        semester,
      });

      const batchResponse = await academicServiceClient.getBatchDetails(
        batchId
      );
      const batch = batchResponse.data || batchResponse;

      if (!batch) {
        throw new ApiError(404, "Batch not found");
      }

      const sessionId =
        typeof batch.sessionId === "object"
          ? batch.sessionId.id || batch.sessionId._id
          : batch.sessionId;
      const departmentId =
        typeof batch.departmentId === "object"
          ? batch.departmentId.id || batch.departmentId._id
          : batch.departmentId;

      const sessionCoursesResponse =
        await academicServiceClient.getSessionCourses(
          sessionId,
          semester,
          departmentId
        );

      let sessionCourses = [];
      if (sessionCoursesResponse?.data?.data) {
        sessionCourses = sessionCoursesResponse.data.data;
      } else if (
        sessionCoursesResponse?.data &&
        Array.isArray(sessionCoursesResponse.data)
      ) {
        sessionCourses = sessionCoursesResponse.data;
      } else if (Array.isArray(sessionCoursesResponse)) {
        sessionCourses = sessionCoursesResponse;
      }

      if (!sessionCourses || sessionCourses.length === 0) {
        return [];
      }

      const enrichedCourses = await Promise.all(
        sessionCourses.map(async (sc) => {
          const courseId =
            typeof sc.courseId === "object"
              ? sc.courseId.id || sc.courseId._id
              : sc.courseId;

          const assignment = await BatchCourseInstructor.findOne({
            batchId,
            courseId: courseId,
            semester,
            status: "active",
          });

          const [courseRes, instructorRes] = await Promise.all([
            academicServiceClient.getCourseDetails(courseId).catch(() => null),
            assignment?.instructorId
              ? userServiceClient.getTeacherById(assignment.instructorId).catch(() => null)
              : Promise.resolve(null)
          ]);

          return {
            courseId: courseId,
            sessionCourseId: sc.id || sc._id,
            semester,
            instructorId: assignment?.instructorId,
            instructorAssigned: !!assignment,
            assignmentId: assignment?.id || assignment?._id,
            course: courseRes?.data || courseRes,
            instructor: instructorRes?.data || instructorRes,
          };
        })
      );

      return enrichedCourses;
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new ApiError(
        500,
        error.message || "Failed to fetch batch semester courses"
      );
    }
  }

  async enrollStudent(data) {
    try {
      const { studentId, batchId, sessionId, semester } = data;

      await Promise.all([
        userServiceClient.verifyStudent(studentId),
        academicServiceClient.verifyBatch(batchId),
        academicServiceClient.verifySession(sessionId),
      ]);

      const courses = await this.getBatchSemesterCourses(batchId, semester);
      if (!courses || courses.length === 0) {
        throw new ApiError(404, "No courses found for this batch and semester");
      }

      const enrollments = [];
      const errors = [];
      const skipped = [];

      for (const course of courses) {
        try {
          const existingEnrollment = await CourseEnrollment.findOne({
            studentId,
            courseId: course.courseId,
            semester,
            deletedAt: null,
          });

          if (existingEnrollment) {
            skipped.push({
              courseId: course.courseId,
              reason: "Already enrolled",
            });
            continue;
          }

          const enrollment = await CourseEnrollment.create({
            studentId,
            batchId,
            courseId: course.courseId,
            sessionId,
            semester,
            instructorId: course.instructorId,
            status: "active",
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
      throw new ApiError(500, error.message || "Failed to enroll student");
    }
  }

  async bulkEnrollBatch(data) {
    try {
      const { batchId, semester, courses } = data;
      const batch = await academicServiceClient.verifyBatch(batchId);

      const studentsResponse = await userServiceClient.getStudentsByBatch(
        batchId
      );
      const students = studentsResponse.data || studentsResponse;

      if (!students || students.length === 0) {
        throw new ApiError(404, "No students found in this batch");
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
              status: "active",
            });

            if (!assignment) {
              errors.push({
                studentId: student.id || student._id,
                courseId: course.courseId,
                error: "Instructor not assigned to this course",
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
      throw new ApiError(
        500,
        error.message || "Failed to bulk enroll students"
      );
    }
  }

  async getEnrollmentById(id) {
    const enrollment = await CourseEnrollment.findById(id);
    if (!enrollment) {
      throw new ApiError(404, "Enrollment not found");
    }
    return enrollment;
  }

  async listEnrollments(filters = {}) {
    try {
      const query = {};

      if (filters.studentId) query.studentId = filters.studentId;
      if (filters.batchId) query.batchId = filters.batchId;
      if (filters.courseId) query.courseId = filters.courseId;
      if (filters.semester) query.semester = parseInt(filters.semester);
      if (filters.status) query.status = filters.status;

      const enrollments = await CourseEnrollment.find(query).sort({ createdAt: -1 });
      const missingInstructor = enrollments.filter((e) => !e.instructorId);
      if (missingInstructor.length > 0) {
        const keys = new Map();
        for (const e of missingInstructor) {
          const key = `${e.batchId}|${e.courseId}|${e.sessionId}|${e.semester}`;
          if (!keys.has(key)) {
            keys.set(key, {
              batchId: e.batchId,
              courseId: e.courseId,
              sessionId: e.sessionId,
              semester: e.semester,
              status: "active",
            });
          }
        }

        const assignments = keys.size ? await BatchCourseInstructor.find({ $or: Array.from(keys.values()) }) : [];
        const assignmentMap = new Map(
          assignments.map((a) => [
            `${a.batchId}|${a.courseId}|${a.sessionId}|${a.semester}`,
            a.instructorId,
          ])
        );

        for (const e of missingInstructor) {
          const key = `${e.batchId}|${e.courseId}|${e.sessionId}|${e.semester}`;
          const found = assignmentMap.get(key);
          if (found) {
            e.instructorId = found;
          }
        }
      }

      const enrichedEnrollments = await Promise.all(
        enrollments.map(async (enrollment) => {
          const enriched = enrollment.toObject();

          try {
            const studentResponse = await userServiceClient.getStudentById(
              enrollment.studentId
            );
            enriched.student = studentResponse.data || studentResponse;
          } catch (error) {
            enriched.student = null;
          }

          try {
            const batchResponse = await academicServiceClient.getBatchDetails(
              enrollment.batchId
            );
            enriched.batch = batchResponse.data || batchResponse;
          } catch (error) {
            enriched.batch = null;
          }

          try {
            const courseResponse = await academicServiceClient.getCourseDetails(
              enrollment.courseId
            );
            enriched.course = courseResponse.data || courseResponse;
          } catch (error) {
            enriched.course = null;
          }

          try {
            const sessionResponse = await academicServiceClient.verifySession(enrollment.sessionId);
            enriched.session = sessionResponse.data || sessionResponse;
          } catch (error) {
            enriched.session = null;
          }

          if (enriched.instructorId) {
            try {
              const instructorResponse = await userServiceClient.getTeacherById(
                enriched.instructorId
              );
              enriched.instructor =
                instructorResponse.data || instructorResponse;
            } catch (error) {
              enriched.instructor = null;
            }
          }

          return enriched;
        })
      );

      return {
        enrollments: enrichedEnrollments,
        total: enrichedEnrollments.length,
      };
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new ApiError(500, error.message || "Failed to fetch enrollments");
    }
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
      { batchId, semester, status: "active" },
      { status: "completed" }
    );
    return result;
  }

  async progressBatchToNextSemester(batchId) {
    try {
      const batchResponse = await academicServiceClient.getBatchDetails(batchId);
      const batch = batchResponse.data || batchResponse;
      if (!batch) {
        throw new ApiError(404, "Batch not found");
      }

      const currentSemester = batch.currentSemester || 1;
      const nextSemester = currentSemester + 1;
      await this.completeBatchSemester(batchId, currentSemester);
      await academicServiceClient.updateBatchSemester(batchId, nextSemester);
      const sessionCoursesResponse =
        await academicServiceClient.getSessionCourses(
          batch.sessionId,
          nextSemester,
          batch.departmentId
        );
      const sessionCourses =
        sessionCoursesResponse.data || sessionCoursesResponse;

      if (!sessionCourses || sessionCourses.length === 0) {
        return {
          message: `Batch progressed to semester ${nextSemester}, but no courses found for enrollment`,
          previousSemester: currentSemester,
          currentSemester: nextSemester,
        };
      }

      const studentsResponse = await userServiceClient.getBatchStudents(
        batchId
      );
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
              status: "active",
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
              status: "active",
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
      throw new ApiError(
        500,
        error.message || "Failed to progress batch semester"
      );
    }
  }
}

export default new EnrollmentService();

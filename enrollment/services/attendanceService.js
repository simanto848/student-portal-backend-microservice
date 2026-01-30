
import Attendance from "../models/Attendance.js";
import CourseEnrollment from "../models/CourseEnrollment.js";
import BatchCourseInstructor from "../models/BatchCourseInstructor.js";
import batchCourseInstructorService from "./batchCourseInstructorService.js";
import userServiceClient from "../client/userServiceClient.js";
import { ApiError } from "shared";

class AttendanceService {
  validateAttendanceDate(date) {
    const attendanceDate = new Date(date);
    const today = new Date();
    today.setHours(23, 59, 59, 999);

    if (attendanceDate > today) {
      throw new ApiError(400, "Cannot mark attendance for future dates.");
    }
  }

  async markAttendance(data, instructorId) {
    try {
      this.validateAttendanceDate(data.date);
      const enrollment = await CourseEnrollment.findById(data.enrollmentId);
      if (!enrollment) {
        throw new ApiError(404, "Enrollment not found");
      }

      const isAssigned = await batchCourseInstructorService.isInstructorAssigned(
        instructorId,
        enrollment.courseId,
        enrollment.batchId
      );

      if (!isAssigned) {
        throw new ApiError(403, "You are not assigned to teach this course");
      }

      const existingAttendance = await Attendance.findOne({
        studentId: enrollment.studentId,
        courseId: enrollment.courseId,
        date: new Date(new Date(data.date).setUTCHours(0, 0, 0, 0)),
        deletedAt: null,
      });

      if (existingAttendance) {
        throw new ApiError(409, "Attendance already marked for this date");
      }

      const attendance = await Attendance.create({
        enrollmentId: data.enrollmentId,
        studentId: enrollment.studentId,
        courseId: enrollment.courseId,
        batchId: enrollment.batchId,
        instructorId,
        date: data.date,
        status: data.status,
        remarks: data.remarks,
      });

      return attendance;
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new ApiError(500, error.message || "Failed to mark attendance");
    }
  }

  async bulkMarkAttendance(data, instructorId) {
    try {
      const { courseId, batchId, date, attendances } = data;
      this.validateAttendanceDate(date);

      const isAssigned = await batchCourseInstructorService.isInstructorAssigned(
        instructorId,
        courseId,
        batchId
      );

      if (!isAssigned) {
        throw new ApiError(403, "You are not assigned to teach this course");
      }
      const results = [];
      const errors = [];

      for (const record of attendances) {
        try {
          // Check if student has enrollment (optional)
          const enrollment = await CourseEnrollment.findOne({
            studentId: record.studentId,
            courseId,
            batchId,
          });

          // If no enrollment, verify student belongs to the batch
          if (!enrollment) {
            try {
              const studentData = await userServiceClient.getStudentById(record.studentId);
              const student = studentData?.data || studentData;
              const studentBatchId = typeof student?.batchId === 'object'
                ? (student.batchId.id || student.batchId._id)
                : student?.batchId;

              if (!student || studentBatchId !== batchId) {
                errors.push({
                  studentId: record.studentId,
                  error: "Student does not belong to this batch",
                });
                continue;
              }
            } catch (err) {
              errors.push({
                studentId: record.studentId,
                error: "Failed to verify student",
              });
              continue;
            }
          }

          const existing = await Attendance.findOne({
            studentId: record.studentId,
            courseId,
            date: new Date(new Date(date).setUTCHours(0, 0, 0, 0)),
            deletedAt: null,
          });

          if (existing) {
            Object.assign(existing, {
              status: record.status,
              remarks: record.remarks,
              instructorId,
            });
            await existing.save();
            results.push(existing);
          } else {
            const attendance = await Attendance.create({
              enrollmentId: enrollment?._id,
              studentId: record.studentId,
              courseId,
              batchId,
              instructorId,
              date: new Date(new Date(date).setUTCHours(0, 0, 0, 0)),
              status: record.status,
              remarks: record.remarks,
            });
            results.push(attendance);
          }
        } catch (error) {
          errors.push({
            studentId: record.studentId,
            error: error.message,
          });
        }
      }

      return {
        success: results.length,
        failed: errors.length,
        attendances: results,
        errors: errors.length > 0 ? errors : undefined,
      };
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new ApiError(500, error.message || "Failed to bulk mark attendance");
    }
  }

  async getAttendanceById(id) {
    const attendance = await Attendance.findById(id);
    if (!attendance) {
      throw new ApiError(404, "Attendance record not found");
    }
    return attendance;
  }

  async listAttendance(filters = {}) {
    const query = {};

    if (filters.studentId) query.studentId = filters.studentId;
    if (filters.courseId) query.courseId = filters.courseId;
    if (filters.batchId) query.batchId = filters.batchId;
    if (filters.status) query.status = filters.status;

    if (filters.startDate || filters.endDate) {
      query.date = {};
      if (filters.startDate) {
        query.date.$gte = new Date(filters.startDate);
      }
      if (filters.endDate) {
        query.date.$lte = new Date(filters.endDate);
      }
    }

    const attendance = await Attendance.find(query).sort({ date: -1 });
    return attendance;
  }

  async updateAttendance(id, data, instructorId) {
    const attendance = await this.getAttendanceById(id);
    const assignment = await BatchCourseInstructor.findOne({
      batchId: attendance.batchId,
      courseId: attendance.courseId,
      instructorId,
      status: "active",
    });

    if (!assignment) {
      throw new ApiError(403, "You are not assigned to teach this course");
    }

    if (data.date) {
      this.validateAttendanceDate(data.date);
    }

    Object.assign(attendance, data);
    await attendance.save();
    return attendance;
  }

  async deleteAttendance(id, instructorId) {
    const attendance = await this.getAttendanceById(id);
    const assignment = await BatchCourseInstructor.findOne({
      batchId: attendance.batchId,
      courseId: attendance.courseId,
      instructorId,
      status: "active",
    });

    if (!assignment) {
      throw new ApiError(403, "You are not assigned to teach this course");
    }

    await attendance.softDelete();
    return attendance;
  }

  async getStudentAttendanceStats(studentId, courseId) {
    const attendances = await Attendance.find({ studentId, courseId });

    const stats = {
      total: attendances.length,
      present: attendances.filter((a) => a.status === "present").length,
      absent: attendances.filter((a) => a.status === "absent").length,
      late: attendances.filter((a) => a.status === "late").length,
      excused: attendances.filter((a) => a.status === "excused").length,
    };

    stats.attendancePercentage =
      stats.total > 0
        ? (((stats.present + stats.late) / stats.total) * 100).toFixed(2)
        : 0;
    return stats;
  }

  async getCourseAttendanceReport(courseId, batchId, filters = {}) {
    const query = { courseId, batchId };

    if (filters.startDate) query.date = { $gte: new Date(filters.startDate) };
    if (filters.endDate)
      query.date = { ...query.date, $lte: new Date(filters.endDate) };

    const attendances = await Attendance.find(query).sort({
      date: -1,
      studentId: 1,
    });
    const studentAttendance = {};

    attendances.forEach((att) => {
      if (!studentAttendance[att.studentId]) {
        studentAttendance[att.studentId] = {
          studentId: att.studentId,
          records: [],
          stats: {
            total: 0,
            present: 0,
            absent: 0,
            late: 0,
            excused: 0,
          },
        };
      }

      studentAttendance[att.studentId].records.push(att);
      studentAttendance[att.studentId].stats.total++;
      studentAttendance[att.studentId].stats[att.status]++;
    });

    Object.values(studentAttendance).forEach((student) => {
      const { present, late, total } = student.stats;
      student.stats.attendancePercentage =
        total > 0 ? (((present + late) / total) * 100).toFixed(2) : 0;
    });

    return Object.values(studentAttendance);
  }
}

export default new AttendanceService();

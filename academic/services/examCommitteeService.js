import ExamCommittee from "../models/ExamCommittee.js";
import notificationServiceClient from "../client/notificationServiceClient.js";
import communicationServiceClient from "../client/communicationServiceClient.js";
import userServiceClient from "../client/userServiceClient.js";
import Department from "../models/Department.js";

class ExamCommitteeService {
  async addMember(departmentId, teacherId, shift, batchId = null) {
    const existing = await ExamCommittee.findOne({
      departmentId,
      teacherId,
      shift,
      batchId,
    });
    if (existing) {
      if (existing.status === false) {
        existing.status = true;
        return existing.save();
      }
      throw new Error("Teacher is already a member of this committee");
    }

    const newMember = await ExamCommittee.create({
      departmentId,
      teacherId,
      shift,
      batchId,
      status: true,
    });

    this.sendWelcomeNotification(teacherId, departmentId, shift);

    return newMember;
  }

  async sendWelcomeNotification(teacherId, departmentId, shift) {
    try {
      const [teacher, department] = await Promise.all([
        userServiceClient.getById(teacherId),
        Department.findById(departmentId)
      ]);

      const deptName = department ? department.name : "Department";
      const teacherEmail = teacher.email;
      const teacherName = teacher.fullName || "Teacher";

      // 1. System Notification
      await notificationServiceClient.sendNotification(
        teacherId,
        "Exam Committee Assignment",
        `You have been assigned to the Exam Committee for ${deptName} (${shift} Shift).`,
        "info"
      );

      // 2. Email Notification
      await communicationServiceClient.sendSimpleEmail(
        teacherEmail,
        "Exam Committee Assignment",
        `Dear ${teacherName},\n\nYou have been added to the Exam Committee of ${deptName} for the ${shift} shift.\n\nPlease log in to the portal to view details.\n\nBest Regards,\nStudent Portal Team`
      );

    } catch (error) {
      console.error("Failed to send exam committee notifications:", error.message);
    }
  }

  async removeMember(id) {
    const member = await ExamCommittee.findById(id);
    if (!member) throw new Error("Member not found");
    member.deletedAt = new Date();
    member.status = false;
    return member.save();
  }

  async updateMember(id, data) {
    const member = await ExamCommittee.findById(id);
    if (!member) throw new Error("Member not found");

    if (data.status !== undefined) member.status = data.status;
    if (data.shift !== undefined) member.shift = data.shift;
    if (data.batchId !== undefined) {
      member.batchId = data.batchId === "all" || data.batchId === "null" ? null : data.batchId;
    }

    return member.save();
  }

  async listMembers(departmentId, batchId = null, shift = null, teacherId = null, status = null) {
    const query = {};

    if (departmentId) query.departmentId = departmentId;
    if (batchId && batchId !== "all") query.batchId = batchId;
    if (shift && shift !== "all") query.shift = shift;
    if (teacherId) query.teacherId = teacherId;
    if (status !== null && status !== undefined) query.status = status === 'true';

    return ExamCommittee.find(query)
      .populate("departmentId", "name")
      .populate("batchId", "name");
  }

  async listDeletedMembers(departmentId) {
    return ExamCommittee.find({ departmentId, deletedAt: { $ne: null } })
      .setOptions({ includeDeleted: true })
      .sort({ deletedAt: -1 })
      .populate("departmentId", "name")
      .populate("batchId", "name");
  }

  async restoreMember(id) {
    const member = await ExamCommittee.findById(id).setOptions({ includeDeleted: true });
    if (!member) throw new Error("Member not found");

    member.deletedAt = null;
    member.status = true;
    return member.save();
  }
}

export default new ExamCommitteeService();

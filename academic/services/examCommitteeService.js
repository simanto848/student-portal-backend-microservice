import ExamCommittee from "../models/ExamCommittee.js";
import notificationServiceClient from "../client/notificationServiceClient.js";
import communicationServiceClient from "../client/communicationServiceClient.js";
import userServiceClient from "../client/userServiceClient.js";
import Department from "../models/Department.js"; // Assume local model

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
        // Was 'INACTIVE'
        existing.status = true; // Was 'ACTIVE'
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

    // Send Notifications (Non-blocking)
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
    member.status = false; // Soft delete - mark inactive
    return member.save();
  }

  async updateMember(id, data) {
    const member = await ExamCommittee.findById(id);
    if (!member) throw new Error("Member not found");

    if (data.status !== undefined) member.status = data.status;
    if (data.shift !== undefined) member.shift = data.shift;
    if (data.batchId !== undefined) {
      // Handle 'all' or specific batch logic if needed, but assuming ID or null
      member.batchId =
        data.batchId === "all" || data.batchId === "null" ? null : data.batchId;
    }

    return member.save();
  }

  async listMembers(departmentId, batchId = null, shift = null) {
    const query = {}; // Fetch all regardless of status (Active/Inactive)
    // Ensure not deleted (handled by pre-hook, but good to be explicit if using lean)
    // Soft delete hook handles 'deletedAt: null'

    if (departmentId) query.departmentId = departmentId;
    if (batchId && batchId !== "all") query.batchId = batchId;
    if (shift && shift !== "all") query.shift = shift;

    // Populate references for frontend display
    // Note: Teacher population might fail if Teacher model is not in this service's context.
    // Assuming Department and Batch are local.
    return ExamCommittee.find(query)
      .populate("departmentId", "name")
      .populate("batchId", "name");
    // .populate('teacherId', ...) - removed to avoid cross-service issues. Frontend handles ID mapping if needed.
  }

  async listDeletedMembers(departmentId) {
    // Requires includeDeleted: true option to bypass pre-find hook
    return ExamCommittee.find({ departmentId, deletedAt: { $ne: null } })
      .setOptions({ includeDeleted: true })
      .sort({ deletedAt: -1 })
      .populate("departmentId", "name")
      .populate("batchId", "name");
  }

  async restoreMember(id) {
    const member = await ExamCommittee.findById(id).setOptions({ includeDeleted: true });
    if (!member) throw new Error("Member not found");

    member.deletedAt = null; // Restore
    member.status = true;    // Reactivate
    return member.save();
  }
}

export default new ExamCommitteeService();

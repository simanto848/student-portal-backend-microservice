import ExamCommittee from "../models/ExamCommittee.js";

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

    return ExamCommittee.create({
      departmentId,
      teacherId,
      shift,
      batchId,
      status: true,
    });
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
}

export default new ExamCommitteeService();

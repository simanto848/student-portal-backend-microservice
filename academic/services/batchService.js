import Batch from "../models/Batch.js";
import Program from "../models/Program.js";
import Department from "../models/Department.js";
import Session from "../models/Session.js";
import Teacher from "../models/Teacher.js";
import { ApiError } from "shared";
import userServiceClient from "../client/userServiceClient.js";

class BatchService {
  async getAll(options = {}) {
    const { filters = {}, pagination, search } = options;
    const query = { ...filters };

    if (search) {
      const normalized = String(search).trim();
      const codeMatch = normalized.match(/^([dDeE])\s*-?\s*(\d+)$/);
      const yearNum = Number.isNaN(Number(normalized))
        ? null
        : Number(normalized);

      if (codeMatch) {
        query.shift = codeMatch[1].toLowerCase() === "e" ? "evening" : "day";
        query.name = codeMatch[2];
      } else {
        query.$or = [
          { name: { $regex: normalized, $options: "i" } },
          ...(yearNum !== null ? [{ year: yearNum }] : []),
        ];
      }
    }

    if (pagination && (pagination.page || pagination.limit)) {
      const { page = 1, limit = 10 } = pagination;
      const skip = (page - 1) * limit;
      const [batches, total] = await Promise.all([
        Batch.find(query)
          .populate("programId", "name shortName")
          .populate("departmentId", "name shortName")
          .populate("sessionId", "name year")
          .populate("sessionId", "name year")
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(parseInt(limit)),
        Batch.countDocuments(query),
      ]);

      return {
        data: batches,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit),
        },
      };
    } else {
      const batches = await Batch.find(query)
        .populate("programId", "name shortName")
        .populate("departmentId", "name shortName")
        .populate("sessionId", "name year")
        .populate("sessionId", "name year")

        .sort({ createdAt: -1 });

      return {
        data: batches,
        total: batches.length,
      };
    }
  }

  async getById(id) {
    const batch = await Batch.findById(id)
      .populate("programId", "name shortName")
      .populate("departmentId", "name shortName")
      .populate("sessionId", "name year")
      .populate("sessionId", "name year");

    if (!batch) {
      throw new ApiError(404, "Batch not found");
    }
    return batch;
  }

  async create(payload) {
    const [program, department, session] = await Promise.all([
      Program.findById(payload.programId),
      Department.findById(payload.departmentId),
      Session.findById(payload.sessionId),
    ]);
    if (!program) throw new ApiError(404, "Program not found");
    if (!department) throw new ApiError(404, "Department not found");
    if (!session) throw new ApiError(404, "Session not found");

    if (payload.name && payload.shift) {
      const existing = await Batch.findOne({
        name: payload.name,
        shift: payload.shift,
        programId: payload.programId,
        departmentId: payload.departmentId,
        sessionId: payload.sessionId,
      });
      if (existing)
        throw new ApiError(
          409,
          "Batch with this name and shift already exists"
        );
    }

    const batch = await Batch.create(payload);
    return await Batch.findById(batch._id)
      .populate("programId", "name shortName")
      .populate("departmentId", "name shortName")
      .populate("sessionId", "name year")
      .populate("sessionId", "name year");
  }

  async update(id, payload) {
    const batch = await Batch.findById(id);
    if (!batch) throw new ApiError(404, "Batch not found");

    if (payload.programId && payload.programId !== batch.programId) {
      const program = await Program.findById(payload.programId);
      if (!program) throw new ApiError(404, "Program not found");
    }
    if (payload.departmentId && payload.departmentId !== batch.departmentId) {
      const department = await Department.findById(payload.departmentId);
      if (!department) throw new ApiError(404, "Department not found");
    }
    if (payload.sessionId && payload.sessionId !== batch.sessionId) {
      const session = await Session.findById(payload.sessionId);
      if (!session) throw new ApiError(404, "Session not found");
    }

    if (
      payload.name ||
      payload.shift ||
      payload.programId ||
      payload.departmentId ||
      payload.sessionId
    ) {
      const nextName = payload.name ?? batch.name;
      const nextShift = payload.shift ?? batch.shift;
      const nextProgramId = payload.programId ?? batch.programId;
      const nextDepartmentId = payload.departmentId ?? batch.departmentId;
      const nextSessionId = payload.sessionId ?? batch.sessionId;

      const existing = await Batch.findOne({
        _id: { $ne: id },
        name: nextName,
        shift: nextShift,
        programId: nextProgramId,
        departmentId: nextDepartmentId,
        sessionId: nextSessionId,
      });
      if (existing)
        throw new ApiError(
          409,
          "Batch with this name and shift already exists"
        );
    }

    Object.assign(batch, payload);
    await batch.save();
    return await Batch.findById(id)
      .populate("programId", "name shortName")
      .populate("departmentId", "name shortName")
      .populate("sessionId", "name year")
      .populate("sessionId", "name year");
  }

  async delete(id) {
    const batch = await Batch.findById(id);
    if (!batch) throw new ApiError(404, "Batch not found");
    await batch.softDelete();
    return true;
  }

  async assignCounselor(id, counselorId) {
    const batch = await Batch.findById(id);
    if (!batch) throw new ApiError(404, "Batch not found");
    batch.counselorId = counselorId;
    await batch.save();
    return await Batch.findById(id)
      .populate("programId", "name shortName")
      .populate("departmentId", "name shortName")
      .populate("sessionId", "name year")
      .populate("sessionId", "name year");
  }

  async updateSemester(id, semester) {
    const batch = await Batch.findById(id);
    if (!batch) throw new ApiError(404, "Batch not found");
    if (typeof semester !== "number" || semester < 1) {
      throw new ApiError(400, "Semester must be a positive integer");
    }
    if (semester < batch.currentSemester) {
      throw new ApiError(400, "Cannot decrease current semester");
    }
    if (semester > 20) {
      throw new ApiError(400, "Semester exceeds allowed maximum");
    }
    batch.currentSemester = semester;
    await batch.save();
    return batch;
  }

  async assignClassRepresentative(id, studentId) {
    const batch = await Batch.findById(id);
    if (!batch) throw new ApiError(404, "Batch not found");

    // Verify student belongs to this batch
    try {
      const studentResponse = await userServiceClient.getStudentById(studentId);
      const student = studentResponse.data || studentResponse;

      if (student.batchId !== id) {
        throw new ApiError(400, "Student does not belong to this batch");
      }
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new ApiError(
        400,
        "Invalid student ID or student service unavailable"
      );
    }

    batch.classRepresentativeId = studentId;
    await batch.save();
    return await Batch.findById(id)
      .populate("programId", "name shortName")
      .populate("departmentId", "name shortName")
      .populate("sessionId", "name year")
      .populate("sessionId", "name year");
  }

  async removeClassRepresentative(id) {
    const batch = await Batch.findById(id);
    if (!batch) throw new ApiError(404, "Batch not found");

    batch.classRepresentativeId = null;
    await batch.save();
    return await Batch.findById(id)
      .populate("programId", "name shortName")
      .populate("departmentId", "name shortName")
      .populate("sessionId", "name year")
      .populate("sessionId", "name year");
  }

  async getDepartmentById(id) {
    const department = await Department.findById(id);
    if (!department) throw new ApiError(404, "Department not found");
    return department;
  }
}

export default new BatchService();

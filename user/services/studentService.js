import Student from "../models/Student.js";
import StudentProfile from "../models/StudentProfile.js";
import { ApiError } from "shared";
import academicServiceClient from "../clients/academicServiceClient.js";
import PasswordGenerator from "../utils/passwordGenerator.js";
import emailService from "../utils/emailService.js";
import { rabbitmq } from "shared";

class StudentService {
  async getAll(options = {}) {
    try {
      const { pagination, search, filters = {}, token } = options;
      const query = { deletedAt: null };

      if (search) {
        query.$or = [
          { fullName: { $regex: search, $options: "i" } },
          { email: { $regex: search, $options: "i" } },
          { registrationNumber: { $regex: search, $options: "i" } },
        ];
      }

      const normalizedFilters = { ...filters };
      const shiftRaw = normalizedFilters.shift;
      delete normalizedFilters.shift;

      if (shiftRaw) {
        const shift = String(shiftRaw).toLowerCase();
        if (shift !== "day" && shift !== "evening") {
          throw new ApiError(400, "Invalid shift. Allowed: day, evening");
        }

        const batchQuery = { shift };
        if (normalizedFilters.departmentId)
          batchQuery.departmentId = normalizedFilters.departmentId;
        if (normalizedFilters.programId)
          batchQuery.programId = normalizedFilters.programId;
        if (normalizedFilters.sessionId)
          batchQuery.sessionId = normalizedFilters.sessionId;

        const batchesResp = await academicServiceClient.getAllBatches(
          batchQuery,
          token
        );
        const batches =
          batchesResp?.data?.batches ||
          batchesResp?.data ||
          batchesResp?.batches ||
          batchesResp ||
          [];
        const batchIds = (Array.isArray(batches) ? batches : [])
          .map((b) => b?.id || b?._id)
          .filter(Boolean);

        if (normalizedFilters.batchId) {
          const requested = String(normalizedFilters.batchId);
          if (!batchIds.includes(requested)) {
            query.batchId = "__no_such_batch_for_shift__";
          }
        } else {
          query.batchId = { $in: batchIds.length ? batchIds : ["__none__"] };
        }
      }

      Object.assign(query, normalizedFilters);

      if (pagination && (pagination.page || pagination.limit)) {
        const page = parseInt(pagination.page) || 1;
        const limit = parseInt(pagination.limit) || 10;
        const skip = (page - 1) * limit;

        const [students, total] = await Promise.all([
          Student.find(query)
            .select("-password")
            .populate("profile")
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .lean(),
          Student.countDocuments(query),
        ]);

        const studentsWithDept = await Promise.all(students.map(async (student) => {
          if (student.departmentId) {
            try {
              const dept = await academicServiceClient.getDepartmentById(student.departmentId, token);
              student.department = dept.data || dept;
              student.departmentName = student.department?.name;
            } catch (e) {
              console.error(`Failed to fetch department for student ${student._id}:`, e.message);
            }
          }
          return student;
        }));

        return {
          students: studentsWithDept,
          pagination: {
            page,
            limit,
            total,
            pages: Math.ceil(total / limit),
          },
        };
      }

      const students = await Student.find(query)
        .select("-password")
        .populate("profile")
        .sort({ createdAt: -1 })
        .lean();

      const studentsWithDept = await Promise.all(students.map(async (student) => {
        if (student.departmentId) {
          try {
            const dept = await academicServiceClient.getDepartmentById(student.departmentId, token);
            student.department = dept.data || dept;
            student.departmentName = student.department?.name;
          } catch (e) {
            console.error(`Failed to fetch department for student ${student._id}:`, e.message);
          }
        }
        return student;
      }));

      return { students: studentsWithDept };
    } catch (error) {
      throw new ApiError(500, "Error fetching students: " + error.message);
    }
  }

  async getById(id) {
    try {
      const student = await Student.findById(id)
        .select("-password")
        .populate("profile")
        .lean();
      if (!student) throw new ApiError(404, "Student not found");

      if (student.departmentId) {
        try {
          const dept = await academicServiceClient.getDepartmentById(student.departmentId);
          student.department = dept.data || dept;
          student.departmentName = student.department?.name;
        } catch (e) {
          console.error(`Failed to fetch department for student ${id}:`, e.message);
        }
      }

      return student;
    } catch (error) {
      throw error instanceof ApiError
        ? error
        : new ApiError(500, "Error fetching student: " + error.message);
    }
  }

  async create(data, token) {
    try {
      const [dept, program, batchResp, sessionResp] = await Promise.all([
        academicServiceClient.getDepartmentById(data.departmentId, token),
        academicServiceClient.getProgramById(data.programId, token),
        academicServiceClient.getBatchById(data.batchId, token),
        academicServiceClient.getSessionById(data.sessionId, token),
      ]);

      const batch = batchResp.data || batchResp;
      const session = sessionResp.data || sessionResp;

      // Check if batch is full
      if (batch.currentStudents >= batch.maxStudents) {
        throw new ApiError(400, "Batch is full. Cannot add more students.");
      }

      const deptShort = (
        dept.data?.shortName ||
        dept.shortName ||
        ""
      ).toUpperCase();
      const batchName = (batch.name || "").toUpperCase();
      const shift = String(batch.shift || "").toLowerCase();
      const shiftPrefix = shift === "evening" ? "E" : "D";
      const batchCode = `${shiftPrefix}-${batchName}`;
      const yearShort = String(
        batch.year || session.year || new Date().getFullYear()
      ).slice(-2);
      const unique = PasswordGenerator.generateUniqueNumber();
      const registrationNumber = `${deptShort}-${batchCode}-${yearShort}-${unique}`;

      const temporaryPassword = PasswordGenerator.generate(12);

      // Email sending moved to after student creation

      const studentPayload = {
        email: data.email,
        fullName: data.fullName,
        password: temporaryPassword,
        registrationNumber,
        departmentId: data.departmentId,
        programId: data.programId,
        batchId: data.batchId,
        sessionId: data.sessionId,
        currentSemester: 1,
        admissionDate: data.admissionDate || new Date(),
      };

      const [existingEmail, existingReg] = await Promise.all([
        Student.findOne({ email: studentPayload.email, deletedAt: null }),
        Student.findOne({
          registrationNumber: studentPayload.registrationNumber,
          deletedAt: null,
        }),
      ]);
      if (existingEmail)
        throw new ApiError(409, "Student with this email already exists");
      if (existingReg)
        throw new ApiError(409, "Registration number already exists");

      const student = await Student.create(studentPayload);

      await academicServiceClient.updateBatchCurrentStudents(
        data.batchId,
        +1,
        token
      );
      try {
        const studentProfileData = data.studentProfile || data.profile || {};
        const createdProfile = await StudentProfile.create({
          ...studentProfileData,
          studentId: student._id,
        });
        await Student.findByIdAndUpdate(
          student._id,
          { $set: { profile: createdProfile._id } },
          { new: true, runValidators: false }
        );
      } catch (profileError) {
        console.error("Student profile creation failed:", profileError.message);
      }

      // Send welcome email non-blockingly
      emailService.sendWelcomeEmailWithCredentials(data.email, {
        fullName: data.fullName,
        email: data.email,
        temporaryPassword,
      }).catch(emailError => {
        console.error("Failed to send welcome email:", emailError.message);
      });

      // Publish event to RabbitMQ
      try {
        await rabbitmq.publishToQueue("student_created", {
          studentId: student._id,
          email: student.email,
          fullName: student.fullName,
          registrationNumber: student.registrationNumber,
        });
      } catch (mqError) {
        console.error("Failed to publish student_created event:", mqError);
      }

      return await Student.findById(student._id)
        .select("-password")
        .populate("profile")
        .lean();
    } catch (error) {
      throw error instanceof ApiError
        ? error
        : new ApiError(500, "Error creating student: " + error.message);
    }
  }

  async update(id, payload, token) {
    try {
      delete payload.password;
      delete payload.registrationNumber;
      delete payload.email;

      // Remove undefined or null fields
      Object.keys(payload).forEach((key) => {
        if (
          payload[key] === undefined ||
          payload[key] === null ||
          payload[key] === ""
        ) {
          delete payload[key];
        }
      });

      const existing = await Student.findById(id);
      if (!existing) throw new ApiError(404, "Student not found");

      if (payload.batchId && payload.batchId !== existing.batchId) {
        // Check if new batch is full
        const newBatchResp = await academicServiceClient.getBatchById(
          payload.batchId,
          token
        );
        const newBatch = newBatchResp.data || newBatchResp;

        if (newBatch.currentStudents >= newBatch.maxStudents) {
          throw new ApiError(400, "Target batch is full. Cannot transfer student.");
        }

        await academicServiceClient.updateBatchCurrentStudents(
          existing.batchId,
          -1,
          token
        );
        await academicServiceClient.updateBatchCurrentStudents(
          payload.batchId,
          +1,
          token
        );
      }

      if (payload.profile && typeof payload.profile === "object") {
        let profileUpdated = false;
        if (existing.profile) {
          const updatedProfile = await StudentProfile.findByIdAndUpdate(
            existing.profile,
            { $set: payload.profile },
            { new: true, runValidators: true }
          );
          if (updatedProfile) {
            profileUpdated = true;
            delete payload.profile;
          }
        }

        if (!profileUpdated) {
          let pf = await StudentProfile.findOne({ studentId: id });

          if (pf) {
            pf = await StudentProfile.findByIdAndUpdate(
              pf._id,
              { $set: payload.profile },
              { new: true, runValidators: true }
            );
          } else {
            pf = await StudentProfile.create({
              ...payload.profile,
              studentId: id,
            });
          }
          payload.profile = pf._id;
        }
      }

      const updated = await Student.findByIdAndUpdate(
        id,
        { $set: payload },
        { new: true, runValidators: true }
      )
        .select("-password")
        .populate("profile");
      if (!updated) throw new ApiError(404, "Student not found");
      return updated;
    } catch (error) {
      throw error instanceof ApiError
        ? error
        : new ApiError(500, "Error updating student: " + error.message);
    }
  }

  async delete(id, token) {
    try {
      const st = await Student.findById(id);
      if (!st) throw new ApiError(404, "Student not found");
      await st.softDelete();
      await academicServiceClient.updateBatchCurrentStudents(
        st.batchId,
        -1,
        token
      );
      return { message: "Student deleted successfully" };
    } catch (error) {
      throw error instanceof ApiError
        ? error
        : new ApiError(500, "Error deleting student: " + error.message);
    }
  }

  async restore(id, token) {
    try {
      const st = await Student.findOne({ _id: id, deletedAt: { $ne: null } });
      if (!st) throw new ApiError(404, "Deleted student not found");
      await st.restore();
      await academicServiceClient.updateBatchCurrentStudents(
        st.batchId,
        +1,
        token
      );
      const restored = await Student.findById(id)
        .select("-password")
        .populate("profile")
        .lean();
      return restored;
    } catch (error) {
      throw error instanceof ApiError
        ? error
        : new ApiError(500, "Error restoring student: " + error.message);
    }
  }

  async getDeletedStudents() {
    try {
      const deletedStudents = await Student.find({ deletedAt: { $ne: null } })
        .select("-password")
        .populate("profile")
        .lean();
      return deletedStudents;
    } catch (error) {
      throw error instanceof ApiError
        ? error
        : new ApiError(
          500,
          "Error fetching deleted students: " + error.message
        );
    }
  }

  async deletePermanently(id, token) {
    try {
      const st = await Student.findOne({ _id: id, deletedAt: { $ne: null } });
      if (!st) throw new ApiError(404, "Deleted student not found");
      await st.deletePermanently();
      await academicServiceClient.updateBatchCurrentStudents(
        st.batchId,
        -1,
        token
      );
      return { message: "Student deleted permanently successfully" };
    } catch (error) {
      throw error instanceof ApiError
        ? error
        : new ApiError(
          500,
          "Error deleting student permanently: " + error.message
        );
    }
  }
}

export default new StudentService();

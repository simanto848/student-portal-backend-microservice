import AssessmentSubmission from "../../models/AssessmentSubmission.js";
import Assessment from "../../models/Assessment.js";
import { ApiError } from "shared";
import { v4 as uuidv4 } from "uuid";

import {
  deleteStoredFileIfExists,
  resolveStoredPath,
  toStoredRelativePath,
} from "../../utils/fileStorage.js";

import userServiceClient from "../../client/userServiceClient.js";

class AssessmentSubmissionService {
  async createSubmission(data) {
    try {
      const assessment = await Assessment.findById(data.assessmentId);
      if (!assessment) {
        throw new ApiError(404, "Assessment not found");
      }

      await userServiceClient.verifyStudent(data.studentId);

      const existingSubmission = await AssessmentSubmission.findOne({
        assessmentId: data.assessmentId,
        studentId: data.studentId,
      });

      if (existingSubmission) {
        throw new ApiError(409, "Submission already exists");
      }

      const submission = await AssessmentSubmission.create(data);
      return submission;
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new ApiError(500, error.message || "Failed to create submission");
    }
  }

  async createSubmissionWithFiles(
    { assessmentId, enrollmentId, content },
    files = [],
    studentId
  ) {
    const assessment = await Assessment.findById(assessmentId);
    if (!assessment) {
      throw new ApiError(404, "Assessment not found");
    }

    await userServiceClient.verifyStudent(studentId);

    const existingSubmission = await AssessmentSubmission.findOne({
      assessmentId,
      studentId,
    });
    if (existingSubmission) {
      // Avoid leaving uploaded files on disk
      for (const file of files) {
        deleteStoredFileIfExists(
          toStoredRelativePath("assessment-submissions", file.filename)
        );
      }
      throw new ApiError(409, "Submission already exists");
    }

    const now = new Date();
    const dueDate = assessment?.dueDate ? new Date(assessment.dueDate) : null;

    const attachments = (files || []).map((file) => {
      const attachmentId = uuidv4();
      const storedPath = toStoredRelativePath(
        "assessment-submissions",
        file.filename
      );
      const url = `/enrollment/assessments/submissions/item/PLACEHOLDER/attachments/${attachmentId}/download`;

      return {
        id: attachmentId,
        filename: file.originalname,
        url,
        fileName: file.originalname,
        fileUrl: url,
        storedPath,
        fileSize: file.size,
        mimeType: file.mimetype,
        uploadedAt: new Date(),
      };
    });

    const submission = await AssessmentSubmission.create({
      assessmentId,
      enrollmentId,
      studentId,
      content,
      isLate: !!(dueDate && now > dueDate),
      attachments,
    });

    // Patch placeholder URLs with real submission id
    submission.attachments = (submission.attachments || []).map((a) => {
      const fixedUrl = `/enrollment/assessments/submissions/item/${submission.id}/attachments/${a.id}/download`;
      return {
        ...a,
        url: fixedUrl,
        fileUrl: fixedUrl,
      };
    });
    await submission.save();

    return submission;
  }

  async getSubmissionById(id) {
    const submission = await AssessmentSubmission.findById(id);
    if (!submission) {
      throw new ApiError(404, "Submission not found");
    }
    return submission;
  }

  async listSubmissions(filters = {}) {
    const query = {};
    if (filters.assessmentId) query.assessmentId = filters.assessmentId;
    if (filters.studentId) query.studentId = filters.studentId;
    if (filters.status) query.status = filters.status;

    const submissions = await AssessmentSubmission.find(query).sort({
      createdAt: -1,
    });
    return submissions;
  }

  async updateSubmission(id, data) {
    const submission = await this.getSubmissionById(id);
    Object.assign(submission, data);
    await submission.save();
    return submission;
  }

  async updateSubmissionWithFiles(id, { content }, files = [], studentId) {
    const submission = await this.getSubmissionById(id);
    if (String(submission.studentId) !== String(studentId)) {
      // Avoid leaving uploaded files on disk
      for (const file of files) {
        deleteStoredFileIfExists(
          toStoredRelativePath("assessment-submissions", file.filename)
        );
      }
      throw new ApiError(
        403,
        "You do not have permission to update this submission"
      );
    }

    // Remove existing stored files
    for (const attachment of submission.attachments || []) {
      if (attachment?.storedPath) {
        deleteStoredFileIfExists(attachment.storedPath);
      }
    }

    const newAttachments = (files || []).map((file) => {
      const attachmentId = uuidv4();
      const storedPath = toStoredRelativePath(
        "assessment-submissions",
        file.filename
      );
      const url = `/enrollment/assessments/submissions/item/${submission.id}/attachments/${attachmentId}/download`;

      return {
        id: attachmentId,
        filename: file.originalname,
        url,
        fileName: file.originalname,
        fileUrl: url,
        storedPath,
        fileSize: file.size,
        mimeType: file.mimetype,
        uploadedAt: new Date(),
      };
    });

    submission.content = content;
    submission.attachments = newAttachments;
    submission.submittedAt = new Date();
    submission.status =
      submission.status === "graded" ? "graded" : "resubmitted";
    submission.attemptNumber = Number(submission.attemptNumber || 1) + 1;

    await submission.save();
    return submission;
  }

  async gradeSubmission(id, gradeData) {
    const submission = await this.getSubmissionById(id);
    submission.marksObtained = gradeData.marksObtained;
    submission.feedback = gradeData.feedback;
    submission.status = "graded";
    submission.gradedAt = new Date();
    await submission.save();
    return submission;
  }

  async getSubmissionAttachmentForDownload(
    submissionId,
    attachmentId,
    requester
  ) {
    const submission = await this.getSubmissionById(submissionId);

    if (requester?.role === "student") {
      if (String(submission.studentId) !== String(requester.sub)) {
        throw new ApiError(
          403,
          "You do not have permission to access this file"
        );
      }
    }

    const attachment = (submission.attachments || []).find(
      (a) => String(a.id) === String(attachmentId)
    );
    if (!attachment) {
      throw new ApiError(404, "Attachment not found");
    }

    if (!attachment.storedPath) {
      throw new ApiError(404, "Attachment file is unavailable");
    }

    const absPath = resolveStoredPath(attachment.storedPath);

    return {
      absPath,
      fileName: attachment.filename || attachment.fileName || "attachment",
    };
  }

  async deleteSubmission(id) {
    const submission = await this.getSubmissionById(id);
    for (const attachment of submission.attachments || []) {
      if (attachment?.storedPath) {
        deleteStoredFileIfExists(attachment.storedPath);
      }
    }
    await submission.softDelete();
    return submission;
  }

  async getStudentSubmission(studentId, assessmentId) {
    const submission = await AssessmentSubmission.findOne({
      studentId,
      assessmentId,
    });
    if (!submission) {
      throw new ApiError(404, "Submission not found");
    }
    return submission;
  }

  async getAssessmentSubmissionStats(assessmentId) {
    const submissions = await AssessmentSubmission.find({ assessmentId });
    const total = submissions.length;
    const graded = submissions.filter((s) => s.status === "graded").length;
    const pending = total - graded;

    return {
      total,
      graded,
      pending,
    };
  }
}

export default new AssessmentSubmissionService();

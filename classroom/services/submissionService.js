import axios from "axios";
import Submission from "../models/Submission.js";
import Assignment from "../models/Assignment.js";
import Feedback from "../models/Feedback.js";
import StreamItem from "../models/StreamItem.js";

import WorkspaceService from "./workspaceService.js";
import Workspace from "../models/Workspace.js";
import { emitWorkspace, emitUser } from "../utils/events.js";
import { v4 as uuidv4 } from "uuid";
import {
  toStoredPath,
  resolveStoredPath,
  deleteStoredFileIfExists,
} from "../utils/fileStorage.js";

const submitAssignment = async (assignmentId, data, userId, token) => {
  const assignment = await Assignment.findById(assignmentId);
  if (!assignment) throw new Error("Assignment not found");

  if (assignment.status !== "published") {
    throw new Error("Assignment is not accepting submissions");
  }

  await WorkspaceService.getWorkspaceById(
    assignment.workspaceId,
    userId,
    "student",
    token
  );

  let submission = await Submission.findOne({
    assignmentId,
    studentId: userId,
  });
  const now = new Date();
  const late =
    assignment.dueAt && now > assignment.dueAt && !assignment.allowLate;

  if (late && !assignment.allowLate) {
    throw new Error("Late submissions are not allowed");
  }

  if (!submission) {
    submission = await Submission.create({
      assignmentId,
      workspaceId: assignment.workspaceId,
      studentId: userId,
      files: data.files,
      textAnswer: data.textAnswer,
      status: "submitted",
      submittedAt: now,
      late: assignment.dueAt && now > assignment.dueAt,
    });

    await StreamItem.create({
      workspaceId: assignment.workspaceId,
      type: "grade_event",
      refId: submission.id,
      actorId: userId,
    });
  } else {
    if (submission.status === "graded") {
      throw new Error("Cannot modify graded submission");
    }
    submission.files = data.files;
    submission.textAnswer = data.textAnswer;
    submission.status =
      submission.status === "submitted" ? "resubmitted" : "submitted";
    submission.submittedAt = now;
    submission.late = assignment.dueAt && now > assignment.dueAt;
    await submission.save();
  }

  emitWorkspace(assignment.workspaceId, "submission.updated", submission);
  return submission;
};

const submitAssignmentWithFiles = async (assignmentId, data, userId, token) => {
  const assignment = await Assignment.findById(assignmentId);
  if (!assignment) throw new Error("Assignment not found");

  if (assignment.status !== "published") {
    throw new Error("Assignment is not accepting submissions");
  }

  await WorkspaceService.getWorkspaceById(
    assignment.workspaceId,
    userId,
    "student",
    token
  );

  const fileList = Array.isArray(data?.files) ? data.files : [];
  const mappedFiles = fileList.map((f) => {
    const storedPath = toStoredPath({
      subdir: "submissions",
      filename: f.filename,
    });
    return {
      id: uuidv4(),
      name: f.originalname,
      type: f.mimetype,
      size: f.size,
      path: storedPath,
      uploadedAt: new Date().toISOString(),
    };
  });

  let submission = await Submission.findOne({
    assignmentId,
    studentId: userId,
  });

  const now = new Date();
  const late =
    assignment.dueAt && now > assignment.dueAt && !assignment.allowLate;
  if (late && !assignment.allowLate) {
    throw new Error("Late submissions are not allowed");
  }

  if (!submission) {
    submission = await Submission.create({
      assignmentId,
      workspaceId: assignment.workspaceId,
      studentId: userId,
      files: mappedFiles,
      textAnswer: data.textAnswer,
      status: "submitted",
      submittedAt: now,
      late: assignment.dueAt && now > assignment.dueAt,
    });

    await StreamItem.create({
      workspaceId: assignment.workspaceId,
      type: "grade_event",
      refId: submission.id,
      actorId: userId,
    });
  } else {
    if (submission.status === "graded") {
      throw new Error("Cannot modify graded submission");
    }

    const existingFiles = Array.isArray(submission.files)
      ? submission.files
      : [];
    await Promise.all(
      existingFiles
        .map((f) => f?.path)
        .filter(Boolean)
        .map((p) => deleteStoredFileIfExists(p))
    );

    submission.files = mappedFiles;
    submission.textAnswer = data.textAnswer;
    submission.status =
      submission.status === "submitted" ? "resubmitted" : "submitted";
    submission.submittedAt = now;
    submission.late = assignment.dueAt && now > assignment.dueAt;
    await submission.save();
  }

  submission.files = (submission.files || []).map((f) => ({
    ...f,
    url: `/submissions/item/${submission.id}/files/${f.id}/download`,
  }));
  await submission.save();

  emitWorkspace(assignment.workspaceId, "submission.updated", submission);
  return submission;
};

const listSubmissions = async (assignmentId, userId, role, token) => {
  const assignment = await Assignment.findById(assignmentId);
  if (!assignment) throw new Error("Assignment not found");

  await WorkspaceService.getWorkspaceById(
    assignment.workspaceId,
    userId,
    "teacher",
    token
  );

  /* 
     Enhanced Logic: Fetch all students in the workspace to identify who hasn't submitted yet.
     Return both existing submissions and placeholder "missing" submissions.
  */
  const workspace = await Workspace.findById(assignment.workspaceId);
  const submissions = await Submission.find({ assignmentId }).lean();
  const submissionMap = new Map(submissions.map((s) => [s.studentId, s]));

  let allStudentIds = [...(workspace?.studentIds || [])];
  const studentDetailsMap = new Map();

  // Fallback: If workspace list is empty, fetch by Batch ID
  if (
    allStudentIds.length === 0 &&
    workspace.batchId &&
    process.env.USER_SERVICE_URL
  ) {
    try {
      const batchResponse = await axios.get(
        `${process.env.USER_SERVICE_URL}/students`,
        {
          params: { batchId: workspace.batchId, limit: 1000 },
          headers: { Authorization: token },
        }
      );

      if (batchResponse.data && batchResponse.data.success) {
        const students =
          batchResponse.data.data.students || batchResponse.data.data;
        if (Array.isArray(students)) {
          students.forEach((s) => {
            const sId = s.id || s._id;
            allStudentIds.push(sId);
            studentDetailsMap.set(sId, s);
          });
        }
      }
    } catch (e) {
      console.error("Failed to fetch batch students", e.message);
    }
  }

  // Combine current workspace students and any prior submitters
  allStudentIds = [...new Set([...allStudentIds, ...submissionMap.keys()])];

  const populatedSubmissions = await Promise.all(
    allStudentIds.map(async (studentId) => {
      let submission = submissionMap.get(studentId);

      if (!submission) {
        submission = {
          _id: `missing-${studentId}`,
          assignmentId: assignmentId,
          studentId: studentId,
          status: "missing",
          files: [],
          submittedAt: null,
          grade: null,
          late: false,
        };
      }

      // Optimization: Use pre-fetched details
      if (studentDetailsMap.has(studentId)) {
        submission.studentId = studentDetailsMap.get(studentId);
        return submission;
      }

      try {
        if (!process.env.USER_SERVICE_URL) {
          return submission;
        }
        const response = await axios.get(
          `${process.env.USER_SERVICE_URL}/students/${submission.studentId}`,
          {
            headers: {
              Authorization: token,
            },
          }
        );

        if (response.data && response.data.success) {
          submission.studentId = response.data.data;
        }
        return submission;
      } catch (error) {
        console.error(
          `Failed to fetch student details for ${submission.studentId}`,
          error.message
        );
        return submission;
      }
    })
  );

  return populatedSubmissions.sort((a, b) => {
    // Show Missing items at the bottom
    if (a.status === "missing" && b.status !== "missing") return 1;
    if (a.status !== "missing" && b.status === "missing") return -1;
    // Sort submitted by date desc
    if (a.submittedAt && b.submittedAt) {
      return new Date(b.submittedAt) - new Date(a.submittedAt);
    }
    return 0;
  });
};

const getSubmission = async (submissionId, userId, role, token) => {
  const submission = await Submission.findById(submissionId);
  if (!submission) throw new Error("Submission not found");

  const assignment = await Assignment.findById(submission.assignmentId);
  if (role === "student" && submission.studentId !== userId) {
    throw new Error("Not your submission");
  }

  await WorkspaceService.getWorkspaceById(
    assignment.workspaceId,
    userId,
    role,
    token
  );
  return submission;
};

const getMySubmission = async (assignmentId, userId, token) => {
  const assignment = await Assignment.findById(assignmentId);
  if (!assignment) throw new Error("Assignment not found");

  await WorkspaceService.getWorkspaceById(
    assignment.workspaceId,
    userId,
    "student",
    token
  );

  const submission = await Submission.findOne({
    assignmentId,
    studentId: userId,
  });
  if (!submission) return null;

  submission.files = (submission.files || []).map((f) => ({
    ...f,
    url: `/submissions/item/${submission.id}/files/${f.id}/download`,
  }));
  return submission;
};

const getSubmissionFileForDownload = async (
  submissionId,
  fileId,
  userId,
  role,
  token
) => {
  const submission = await Submission.findById(submissionId);
  if (!submission) throw new Error("Submission not found");

  const assignment = await Assignment.findById(submission.assignmentId);
  if (!assignment) throw new Error("Assignment not found");

  if (role === "student" && submission.studentId !== userId) {
    throw new Error("Not your submission");
  }

  await WorkspaceService.getWorkspaceById(
    assignment.workspaceId,
    userId,
    role,
    token
  );

  const files = Array.isArray(submission.files) ? submission.files : [];
  const file = files.find((f) => f && f.id === fileId);
  if (!file) throw new Error("File not found");
  if (!file.path) throw new Error("File has no path");

  return {
    absolutePath: resolveStoredPath(file.path),
    downloadName: file.name || "download",
  };
};

const gradeSubmission = async (submissionId, data, userId, token) => {
  const submission = await Submission.findById(submissionId);
  if (!submission) throw new Error("Submission not found");

  const assignment = await Assignment.findById(submission.assignmentId);
  await WorkspaceService.getWorkspaceById(
    assignment.workspaceId,
    userId,
    "teacher",
    token
  );

  if (data.grade > assignment.maxScore) {
    throw new Error("Grade exceeds maxScore");
  }

  submission.grade = data.grade;
  submission.rubricScores = data.rubricScores || [];
  submission.status = "graded";
  submission.gradedAt = new Date();
  submission.gradedById = userId;
  await submission.save();

  await StreamItem.create({
    workspaceId: assignment.workspaceId,
    type: "grade_event",
    refId: submission.id,
    actorId: userId,
  });

  emitWorkspace(assignment.workspaceId, "submission.graded", submission);
  emitUser(submission.studentId, "submission.graded", submission);

  return submission;
};

const addFeedback = async (submissionId, data, userId, role, token) => {
  const submission = await Submission.findById(submissionId);
  if (!submission) throw new Error("Submission not found");

  const assignment = await Assignment.findById(submission.assignmentId);
  if (role === "student" && submission.studentId !== userId) {
    throw new Error("Not your submission");
  }
  await WorkspaceService.getWorkspaceById(
    assignment.workspaceId,
    userId,
    role,
    token
  );

  const feedback = await Feedback.create({
    submissionId,
    authorId: userId,
    message: data.message,
    type: data.type || "comment",
  });

  submission.feedbackCount += 1;
  await submission.save();

  await StreamItem.create({
    workspaceId: assignment.workspaceId,
    type: "feedback",
    refId: feedback.id,
    actorId: userId,
  });

  emitWorkspace(assignment.workspaceId, "submission.feedback", feedback);
  emitUser(submission.studentId, "submission.feedback", feedback);

  return feedback;
};

const removeFileFromSubmission = async (
  submissionId,
  fileId,
  userId,
  role,
  token
) => {
  const submission = await Submission.findById(submissionId);
  if (!submission) throw new Error("Submission not found");

  const assignment = await Assignment.findById(submission.assignmentId);
  if (!assignment) throw new Error("Assignment not found");

  if (role === "student" && submission.studentId !== userId) {
    throw new Error("Not your submission");
  }

  // Double check workspace access
  await WorkspaceService.getWorkspaceById(
    assignment.workspaceId,
    userId,
    role,
    token
  );

  if (submission.status === "graded") {
    throw new Error("Cannot modify graded submission");
  }

  const fileIndex = submission.files.findIndex((f) => f.id === fileId);
  if (fileIndex === -1) {
    throw new Error("File not found in submission");
  }

  const file = submission.files[fileIndex];

  // Physically delete the file if possible
  if (file.path) {
    await deleteStoredFileIfExists(file.path);
  }

  // Remove from array
  submission.files.splice(fileIndex, 1);

  // Update metadata
  submission.updatedAt = new Date();

  await submission.save();

  // Return updated submission with download URLs
  submission.files = (submission.files || []).map((f) => ({
    ...f,
    url: `/submissions/item/${submission.id}/files/${f.id}/download`,
  }));

  return submission;
};

export default {
  submitAssignment,
  submitAssignmentWithFiles,
  listSubmissions,
  getSubmission,
  getMySubmission,
  getSubmissionFileForDownload,
  gradeSubmission,
  addFeedback,
  removeFileFromSubmission,
};

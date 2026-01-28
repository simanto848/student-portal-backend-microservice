import Assignment from "../models/Assignment.js";
import StreamItem from "../models/StreamItem.js";
import WorkspaceService from "./workspaceService.js";
import { emitWorkspace } from "../utils/events.js";
import { v4 as uuidv4 } from "uuid";
import {
  toStoredPath,
  resolveStoredPath,
  deleteStoredFileIfExists,
} from "../utils/fileStorage.js";

const createAssignment = async (workspaceId, data, userId, token) => {
  await WorkspaceService.getWorkspaceById(
    workspaceId,
    userId,
    "teacher",
    token
  );

  const assignment = await Assignment.create({
    workspaceId,
    ...data,
    createdById: userId,
    publishedAt: data.status === "published" ? new Date() : null,
  });

  if (assignment.status === "published") {
    await StreamItem.create({
      workspaceId,
      type: "assignment",
      refId: assignment.id,
      actorId: userId,
    });
    emitWorkspace(workspaceId, "assignment.created", assignment);
  }

  return assignment;
};

const listAssignments = async (workspaceId, userId, role, token) => {
  await WorkspaceService.getWorkspaceById(workspaceId, userId, role, token);

  const filter = { workspaceId, deletedAt: null };
  if (role === "student") {
    filter.status = { $ne: "draft" };
  }

  return Assignment.find(filter).sort({ dueAt: 1 });
};

const getAssignment = async (assignmentId, userId, role, token) => {
  const assignment = await Assignment.findById(assignmentId);
  if (!assignment) throw new Error("Assignment not found");

  await WorkspaceService.getWorkspaceById(
    assignment.workspaceId,
    userId,
    role,
    token
  );

  if (role === "student" && assignment.status === "draft") {
    throw new Error("Assignment is not published");
  }

  return assignment;
};

const updateAssignment = async (assignmentId, updates, userId, token) => {
  const assignment = await Assignment.findById(assignmentId);
  if (!assignment) throw new Error("Assignment not found");

  await WorkspaceService.getWorkspaceById(
    assignment.workspaceId,
    userId,
    "teacher",
    token
  );

  const wasDraft = assignment.status === "draft";
  Object.assign(assignment, updates);

  if (
    wasDraft &&
    assignment.status === "published" &&
    !assignment.publishedAt
  ) {
    assignment.publishedAt = new Date();
    await StreamItem.create({
      workspaceId: assignment.workspaceId,
      type: "assignment",
      refId: assignment.id,
      actorId: userId,
    });
    emitWorkspace(assignment.workspaceId, "assignment.published", assignment);
  }

  await assignment.save();
  return assignment;
};

const deleteAssignment = async (assignmentId, userId, token) => {
  const assignment = await Assignment.findById(assignmentId);
  if (!assignment) throw new Error("Assignment not found");

  await WorkspaceService.getWorkspaceById(
    assignment.workspaceId,
    userId,
    "teacher",
    token
  );

  assignment.deletedAt = new Date();
  await assignment.save();
  return true;
};

const uploadAssignmentFiles = async (workspaceId, files, userId, token) => {
  if (!workspaceId) throw new Error("workspaceId is required");
  const fileList = Array.isArray(files) ? files : [];
  if (fileList.length === 0) throw new Error("At least one file is required");

  await WorkspaceService.getWorkspaceById(
    workspaceId,
    userId,
    "teacher",
    token
  );

  const attachments = fileList.map((f) => {
    const storedPath = toStoredPath({
      subdir: "assignments",
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

  return attachments.map((a) => ({
    ...a,
    url: `/assignments/item/temp/attachments/${a.id}/download`,
  }));
};

const getAssignmentAttachmentForDownload = async (
  assignmentId,
  attachmentId,
  userId,
  role,
  token
) => {
  const assignment = await Assignment.findById(assignmentId);
  if (!assignment) throw new Error("Assignment not found");

  await WorkspaceService.getWorkspaceById(
    assignment.workspaceId,
    userId,
    role,
    token
  );

  const attachments = Array.isArray(assignment.attachments)
    ? assignment.attachments
    : [];
  const attachment = attachments.find((a) => a && a.id === attachmentId);
  if (!attachment) throw new Error("Attachment not found");
  if (!attachment.path) throw new Error("Attachment has no file path");

  return {
    absolutePath: resolveStoredPath(attachment.path),
    downloadName: attachment.name || "download",
  };
};

export default {
  createAssignment,
  listAssignments,
  getAssignment,
  updateAssignment,
  deleteAssignment,
  uploadAssignmentFiles,
  getAssignmentAttachmentForDownload,
};

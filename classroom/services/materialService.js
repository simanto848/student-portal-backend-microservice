import Material from "../models/Material.js";
import StreamItem from "../models/StreamItem.js";
import WorkspaceService from "./workspaceService.js";
import { emitWorkspace } from "../utils/events.js";
import { v4 as uuidv4 } from "uuid";
import {
  toStoredPath,
  resolveStoredPath,
  deleteStoredFileIfExists,
} from "../utils/fileStorage.js";

const createMaterial = async (workspaceId, data, userId, token) => {
  await WorkspaceService.getWorkspaceById(
    workspaceId,
    userId,
    "teacher",
    token
  );

  const material = await Material.create({
    workspaceId,
    ...data,
    createdById: userId,
    publishedAt: new Date(),
  });

  await StreamItem.create({
    workspaceId,
    type: "material",
    refId: material.id,
    actorId: userId,
  });

  emitWorkspace(workspaceId, "material.created", material);
  return material;
};

const createFileMaterial = async (workspaceId, data, files, userId, token) => {
  if (!workspaceId) throw new Error("workspaceId is required");
  if (!data?.title) throw new Error("title is required");
  const fileList = Array.isArray(files) ? files : [];
  if (fileList.length === 0) throw new Error("At least one file is required");

  await WorkspaceService.getWorkspaceById(
    workspaceId,
    userId,
    "teacher",
    token
  );

  const baseAttachments = fileList.map((f) => {
    const storedPath = toStoredPath({
      subdir: "materials",
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

  const material = await Material.create({
    workspaceId,
    topicId: data.topicId,
    title: data.title,
    type: "file",
    content: "",
    attachments: baseAttachments,
    createdById: userId,
    publishedAt: new Date(),
  });

  material.attachments = (material.attachments || []).map((a) => ({
    ...a,
    url: `/materials/item/${material.id}/attachments/${a.id}/download`,
  }));
  await material.save();

  await StreamItem.create({
    workspaceId,
    type: "material",
    refId: material.id,
    actorId: userId,
  });

  emitWorkspace(workspaceId, "material.created", material);
  return material;
};

const listMaterials = async (workspaceId, userId, role, token) => {
  await WorkspaceService.getWorkspaceById(workspaceId, userId, role, token);

  return Material.find({ workspaceId, deletedAt: null }).sort({
    publishedAt: -1,
  });
};

const getMaterial = async (materialId, userId, role, token) => {
  const material = await Material.findById(materialId);
  if (!material) throw new Error("Material not found");

  await WorkspaceService.getWorkspaceById(
    material.workspaceId,
    userId,
    role,
    token
  );
  return material;
};

const updateMaterial = async (materialId, updates, userId, token) => {
  const material = await Material.findById(materialId);
  if (!material) throw new Error("Material not found");

  await WorkspaceService.getWorkspaceById(
    material.workspaceId,
    userId,
    "teacher",
    token
  );

  Object.assign(material, updates);
  await material.save();
  return material;
};

const deleteMaterial = async (materialId, userId, token) => {
  const material = await Material.findById(materialId);
  if (!material) throw new Error("Material not found");

  await WorkspaceService.getWorkspaceById(
    material.workspaceId,
    userId,
    "teacher",
    token
  );

  const attachments = Array.isArray(material.attachments)
    ? material.attachments
    : [];

  await Promise.all(
    attachments
      .map((a) => a?.path)
      .filter(Boolean)
      .map((p) => deleteStoredFileIfExists(p))
  );

  material.deletedAt = new Date();
  await material.save();
  return true;
};

const getMaterialAttachmentForDownload = async (
  materialId,
  attachmentId,
  userId,
  role,
  token
) => {
  const material = await Material.findById(materialId);
  if (!material) throw new Error("Material not found");

  await WorkspaceService.getWorkspaceById(
    material.workspaceId,
    userId,
    role,
    token
  );

  const attachments = Array.isArray(material.attachments)
    ? material.attachments
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
  createMaterial,
  createFileMaterial,
  listMaterials,
  getMaterial,
  updateMaterial,
  deleteMaterial,
  getMaterialAttachmentForDownload,
};

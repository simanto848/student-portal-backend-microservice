import fs from "fs";
import path from "path";
import { v4 as uuidv4 } from "uuid";

const ensureDirSync = (dirPath) => {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
};

const getUploadsRoot = () => {
  return path.join(process.cwd(), "public", "uploads");
};

export const ensureUploadsSubdir = (subdir) => {
  const root = getUploadsRoot();
  const full = path.join(root, subdir);
  ensureDirSync(full);
  return full;
};

export const buildStoredFileName = (originalName) => {
  const safeOriginal = String(originalName || "file").replace(
    /[^a-zA-Z0-9._-]+/g,
    "_"
  );
  return `${uuidv4()}_${safeOriginal}`;
};

export const toStoredPath = ({ subdir, filename }) => {
  return path.join("public", "uploads", subdir, filename).replace(/\\/g, "/");
};

export const resolveStoredPath = (storedPath) => {
  const root = process.cwd();
  const resolved = path.resolve(root, storedPath);
  const expectedPrefix = path.resolve(root, "public", "uploads") + path.sep;

  if (!resolved.startsWith(expectedPrefix)) {
    throw new Error("Invalid file path");
  }

  return resolved;
};

export const deleteStoredFileIfExists = async (storedPath) => {
  if (!storedPath) return;
  const absolute = resolveStoredPath(storedPath);
  try {
    await fs.promises.unlink(absolute);
  } catch (e) {
    if (e && e.code === "ENOENT") return;
    throw e;
  }
};

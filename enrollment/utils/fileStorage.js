import fs from "fs";
import path from "path";
import { v4 as uuidv4 } from "uuid";

const PUBLIC_DIR = path.join(process.cwd(), "public");
const UPLOADS_DIR = path.join(PUBLIC_DIR, "uploads");

export const ensureUploadsSubdir = (subdir) => {
  const safeSubdir = String(subdir || "")
    .replace(/\\/g, "/")
    .replace(/\.+/g, "")
    .trim();
  const dirPath = path.join(UPLOADS_DIR, safeSubdir);
  fs.mkdirSync(dirPath, { recursive: true });
  return dirPath;
};

export const buildStoredFileName = (originalName) => {
  const ext = path.extname(String(originalName || "")).slice(0, 12);
  return `${uuidv4()}${ext}`;
};

export const toStoredRelativePath = (subdir, storedFileName) => {
  const safeSubdir = String(subdir || "")
    .replace(/\\/g, "/")
    .replace(/\.+/g, "")
    .trim();
  return path.posix.join("uploads", safeSubdir, storedFileName);
};

export const resolveStoredPath = (storedRelativePath) => {
  const rel = String(storedRelativePath || "").replace(/\\/g, "/");
  const resolved = path.resolve(PUBLIC_DIR, rel);
  if (!resolved.startsWith(PUBLIC_DIR)) {
    throw new Error("Invalid stored file path");
  }
  return resolved;
};

export const deleteStoredFileIfExists = (storedRelativePath) => {
  if (!storedRelativePath) return;
  try {
    const abs = resolveStoredPath(storedRelativePath);
    if (fs.existsSync(abs)) {
      fs.unlinkSync(abs);
    }
  } catch {
    // ignore
  }
};

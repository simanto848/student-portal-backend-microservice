import multer from "multer";
import {
  ensureUploadsSubdir,
  buildStoredFileName,
} from "../utils/fileStorage.js";
import { config } from "shared";

const maxUploadMb = Number(config.app.maxUploadMb);

const normalizeAllowedMimeTypes = (allowedMimeTypes) => {
  if (!allowedMimeTypes) return null;
  if (!Array.isArray(allowedMimeTypes)) return null;
  const normalized = allowedMimeTypes
    .map((t) => String(t || "").trim())
    .filter(Boolean);
  return normalized.length ? normalized : null;
};

const storage = (subdir) => {
  const uploadDir = ensureUploadsSubdir(subdir);

  return multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
      cb(null, buildStoredFileName(file.originalname));
    },
  });
};

export const createUpload = (subdir, options = {}) => {
  const allowedMimeTypes = normalizeAllowedMimeTypes(options.allowedMimeTypes);
  const maxFiles = Number(options.maxFiles || 0);

  return multer({
    storage: storage(subdir),
    limits: {
      fileSize: maxUploadMb * 1024 * 1024,
      ...(Number.isFinite(maxFiles) && maxFiles > 0 ? { files: maxFiles } : {}),
    },
    fileFilter: (req, file, cb) => {
      if (!allowedMimeTypes) return cb(null, true);
      if (allowedMimeTypes.includes(file.mimetype)) return cb(null, true);
      const err = new Error("Unsupported file type");
      err.name = "MulterError";
      err.code = "UNSUPPORTED_FILE_TYPE";
      return cb(err);
    },
  });
};

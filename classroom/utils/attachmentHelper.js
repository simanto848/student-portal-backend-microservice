import { v4 as uuidv4 } from 'uuid';
import { toStoredPath, resolveStoredPath, deleteStoredFileIfExists } from './fileStorage.js';

export const mapFilesToAttachments = (files, subdir) => {
    const fileList = Array.isArray(files) ? files : [];
    return fileList.map((f) => ({
        id: uuidv4(),
        name: f.originalname,
        type: f.mimetype,
        size: f.size,
        path: toStoredPath({ subdir, filename: f.filename }),
        uploadedAt: new Date().toISOString(),
    }));
};

export const addDownloadUrls = (files, urlPrefix) => {
    return (files || []).map((f) => ({
        ...f,
        url: `${urlPrefix}/${f.id}/download`,
    }));
};

export const deleteAttachmentFiles = async (attachments) => {
    const items = Array.isArray(attachments) ? attachments : [];
    await Promise.all(
        items
            .map((a) => a?.path)
            .filter(Boolean)
            .map((p) => deleteStoredFileIfExists(p))
    );
};

export { resolveStoredPath };

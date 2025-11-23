import Material from '../models/Material.js';
import StreamItem from '../models/StreamItem.js';
import WorkspaceService from './workspaceService.js';
import { emitWorkspace } from '../utils/events.js';

const createMaterial = async (workspaceId, data, userId) => {
    await WorkspaceService.getWorkspaceById(workspaceId, userId, 'teacher');

    const material = await Material.create({
        workspaceId,
        ...data,
        createdById: userId,
        publishedAt: new Date()
    });

    await StreamItem.create({
        workspaceId,
        type: 'material',
        refId: material.id,
        actorId: userId
    });

    emitWorkspace(workspaceId, 'material.created', material);
    return material;
};

const listMaterials = async (workspaceId, userId, role) => {
    await WorkspaceService.getWorkspaceById(workspaceId, userId, role);

    return Material.find({ workspaceId, deletedAt: null }).sort({ publishedAt: -1 });
};

const getMaterial = async (materialId, userId, role) => {
    const material = await Material.findById(materialId);
    if (!material) throw new Error('Material not found');

    await WorkspaceService.getWorkspaceById(material.workspaceId, userId, role);
    return material;
};

const updateMaterial = async (materialId, updates, userId) => {
    const material = await Material.findById(materialId);
    if (!material) throw new Error('Material not found');

    await WorkspaceService.getWorkspaceById(material.workspaceId, userId, 'teacher');

    Object.assign(material, updates);
    await material.save();
    return material;
};

const deleteMaterial = async (materialId, userId) => {
    const material = await Material.findById(materialId);
    if (!material) throw new Error('Material not found');

    await WorkspaceService.getWorkspaceById(material.workspaceId, userId, 'teacher');

    material.deletedAt = new Date();
    await material.save();
    return true;
};

export default {
    createMaterial,
    listMaterials,
    getMaterial,
    updateMaterial,
    deleteMaterial
};

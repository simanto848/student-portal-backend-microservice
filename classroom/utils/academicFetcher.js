import { Course, Batch } from '../models/external/Academic.js';
import { config } from 'shared';
import { fetchWithFallback } from './httpClient.js';

export const fetchCourse = async (courseId, token) => {
    const local = await Course.findById(courseId);
    if (local) return local;

    try {
        const base = config.services.academic.replace(/\/$/, '');
        const res = await fetchWithFallback(
            `${base}/courses/${courseId}`,
            { headers: { Authorization: token } },
            'academic'
        );
        const data = await res.json();
        if (data.success && data.data) return data.data;
    } catch (e) {
        // silent
    }
    return null;
};

export const fetchBatch = async (batchId, token) => {
    const local = await Batch.findById(batchId);
    if (local) return local;

    try {
        const base = config.services.academic.replace(/\/$/, '');
        const res = await fetchWithFallback(
            `${base}/batches/${batchId}`,
            { headers: { Authorization: token } },
            'academic'
        );
        const data = await res.json();
        if (data.success && data.data) return data.data;
    } catch (e) {
        // silent
    }
    return null;
};

export const fetchCoursesMap = async (courseIds, token) => {
    const uniqueIds = [...new Set(courseIds.filter(Boolean).map(String))];
    if (uniqueIds.length === 0) return new Map();

    // Try local DB first
    const localCourses = await Course.find({ _id: { $in: uniqueIds } }).lean();
    const map = new Map(localCourses.map(c => [c._id.toString(), c]));

    // Fetch any missing from the API
    const missing = uniqueIds.filter(id => !map.has(id));
    if (missing.length > 0) {
        const base = config.services.academic.replace(/\/$/, '');
        await Promise.all(missing.map(async (id) => {
            try {
                const res = await fetchWithFallback(
                    `${base}/courses/${id}`,
                    { headers: { Authorization: token } },
                    'academic'
                );
                const data = await res.json();
                if (data.success && data.data) map.set(id, data.data);
            } catch (e) { /* skip */ }
        }));
    }
    return map;
};

export const fetchBatchesMap = async (batchIds, token) => {
    const uniqueIds = [...new Set(batchIds.filter(Boolean).map(String))];
    if (uniqueIds.length === 0) return new Map();

    const localBatches = await Batch.find({ _id: { $in: uniqueIds } }).lean();
    const map = new Map(localBatches.map(b => [b._id.toString(), b]));

    const missing = uniqueIds.filter(id => !map.has(id));
    if (missing.length > 0) {
        const base = config.services.academic.replace(/\/$/, '');
        await Promise.all(missing.map(async (id) => {
            try {
                const res = await fetchWithFallback(
                    `${base}/batches/${id}`,
                    { headers: { Authorization: token } },
                    'academic'
                );
                const data = await res.json();
                if (data.success && data.data) map.set(id, data.data);
            } catch (e) { /* skip */ }
        }));
    }
    return map;
};

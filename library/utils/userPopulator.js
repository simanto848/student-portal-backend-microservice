import userServiceClient from '../clients/userServiceClient.js';
import academicServiceClient from '../clients/academicServiceClient.js';

export async function populateUsers(records, userIdField, token) {
    if (!records.length) return [];

    // 1. Group unique user IDs by type
    const byType = {};
    for (const r of records) {
        const type = r.userType || 'student';
        if (!byType[type]) byType[type] = new Set();
        byType[type].add(String(r[userIdField]));
    }

    // 2. Batch-fetch each type in parallel
    const userMap = new Map();
    const fetchPromises = Object.entries(byType).map(async ([type, idSet]) => {
        for (const id of idSet) {
            try {
                const user = await userServiceClient.validateUser(type, id, token);
                userMap.set(id, { ...user, _resolvedType: type });
            } catch {
                // leave missing — will get fallback below
            }
        }
    });
    await Promise.all(fetchPromises);

    // 3. Batch-fetch missing department names
    const deptIds = new Set();
    for (const user of userMap.values()) {
        if (!user.department?.name && !user.departmentName && user.departmentId) {
            deptIds.add(String(user.departmentId));
        }
    }

    const deptMap = new Map();
    if (deptIds.size > 0) {
        const deptPromises = [...deptIds].map(async (deptId) => {
            try {
                const dept = await academicServiceClient.getDepartmentById(deptId);
                deptMap.set(deptId, dept.data?.name || dept.name);
            } catch {
                // ignore
            }
        });
        await Promise.all(deptPromises);
    }

    // 4. Attach user details to each record
    return records.map((record) => {
        const userId = String(record[userIdField]);
        const user = userMap.get(userId);

        if (!user) {
            return {
                ...record,
                user: {
                    id: userId,
                    fullName: 'Unknown User',
                    error: 'Failed to fetch user details',
                },
            };
        }

        const departmentName =
            user.department?.name ||
            user.departmentName ||
            deptMap.get(String(user.departmentId)) ||
            null;

        return {
            ...record,
            user: {
                id: user.id || user._id,
                fullName: user.fullName,
                email: user.email,
                departmentId: user.departmentId,
                departmentName,
                registrationNumber: user.registrationNumber,
            },
        };
    });
}

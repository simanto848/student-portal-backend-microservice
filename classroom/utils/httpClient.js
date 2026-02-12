export const fetchWithFallback = async (url, options, fallbackHost) => {
    try {
        return await fetch(url, options);
    } catch (e) {
        if (url.includes('localhost') && fallbackHost) {
            const newUrl = url.replace('localhost', fallbackHost);
            try {
                return await fetch(newUrl, options);
            } catch (e2) {
                throw e;
            }
        }
        throw e;
    }
};

export const extractApiArray = (payload) => {
    if (!payload) return [];
    if (Array.isArray(payload)) return payload;

    if (payload.success && Array.isArray(payload.data)) return payload.data;

    if (payload.success && payload.data && typeof payload.data === 'object') {
        if (Array.isArray(payload.data.data)) return payload.data.data;
        if (Array.isArray(payload.data.enrollments)) return payload.data.enrollments;
    }

    if (Array.isArray(payload.data)) return payload.data;
    if (payload.data && typeof payload.data === 'object' && Array.isArray(payload.data.data)) {
        return payload.data.data;
    }

    return [];
};

export function parsePagination(pagination) {
    const page = parseInt(pagination?.page) || 1;
    const limit = parseInt(pagination?.limit) || 10;
    const skip = (page - 1) * limit;
    return { page, limit, skip };
}

export function buildPaginationMeta(total, page, limit) {
    return {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
    };
}

export async function paginatedQuery(Model, query, opts = {}) {
    const { page = 1, limit = 10, sort = { createdAt: -1 }, populate, lean = true } = opts;
    const skip = (page - 1) * limit;

    let q = Model.find(query).sort(sort).skip(skip).limit(limit);
    if (populate) {
        const pops = Array.isArray(populate) ? populate : [populate];
        for (const p of pops) q = q.populate(p);
    }
    if (lean) q = q.lean();

    const [items, total] = await Promise.all([q, Model.countDocuments(query)]);
    return { items, pagination: buildPaginationMeta(total, page, limit) };
}

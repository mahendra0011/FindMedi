export const paginatedResults = async (Model, filter, { page = 1, limit = 20, sort = { createdAt: -1 }, populate } = {}) => {
  const p = Math.max(1, parseInt(page) || 1);
  const l = Math.min(100, Math.max(1, parseInt(limit) || 20));
  const skip = (p - 1) * l;

  let query = Model.find(filter).sort(sort).skip(skip).limit(l);
  if (populate) {
    if (Array.isArray(populate)) {
      populate.forEach(f => { query = query.populate(f); });
    } else {
      query = query.populate(populate);
    }
  }

  const [data, total] = await Promise.all([query, Model.countDocuments(filter)]);
  return { data, total, page: p, limit: l, totalPages: Math.ceil(total / l) };
};

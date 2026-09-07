async function paginate(model, filter, query, populate) {
  const { page = 1, limit = 10 } = query;
  let find = model.find(filter).sort({ createdAt: -1, _id: -1 }).skip((page - 1) * limit).limit(limit);
  if (populate) find = find.populate(populate);
  const [data, total] = await Promise.all([find, model.countDocuments(filter)]);
  return { data, pagination: { page, limit, total, pages: Math.ceil(total / limit) } };
}

module.exports = paginate;

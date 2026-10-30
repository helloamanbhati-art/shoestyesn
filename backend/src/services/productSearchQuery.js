const MAX_SEARCH_LENGTH = 100;
const MAX_RESULT_LIMIT = 50;

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function normalizeProductSearchRequest(query = {}) {
  const term = String(query.q ?? '').trim();
  if (!term) throw new RangeError('Search query required');
  if (term.length > MAX_SEARCH_LENGTH) {
    throw new RangeError(`Search query must be ${MAX_SEARCH_LENGTH} characters or fewer`);
  }

  return {
    term,
    limit: Math.min(Math.max(Number(query.limit) || 10, 1), MAX_RESULT_LIMIT),
  };
}

function caseInsensitiveMatch(term) {
  return { $regex: escapeRegex(term), $options: 'i' };
}

function buildCategorySearchFilter(term) {
  return { isActive: true, name: caseInsensitiveMatch(term) };
}

function buildProductSearchFilter(term, categoryIds = []) {
  const match = caseInsensitiveMatch(term);
  const fields = [
    { name: match },
    { colors: match },
    { clothingType: match },
    { description: match },
    { shortDescription: match },
  ];

  if (categoryIds.length > 0) fields.push({ category: { $in: categoryIds } });

  return {
    $and: [
      { isActive: true },
      { $or: fields },
    ],
  };
}

module.exports = {
  buildCategorySearchFilter,
  buildProductSearchFilter,
  normalizeProductSearchRequest,
};

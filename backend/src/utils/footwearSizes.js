const FOOTWEAR_SIZES = Object.freeze(['36', '37', '38', '39', '40', '41']);
const FOOTWEAR_SIZE_SET = new Set(FOOTWEAR_SIZES);

function filterSupportedFootwearSizes(sizes) {
  if (!Array.isArray(sizes)) return [];
  return [...new Set(sizes.map((size) => String(size).trim()).filter((size) => FOOTWEAR_SIZE_SET.has(size)))];
}

module.exports = { FOOTWEAR_SIZES, filterSupportedFootwearSizes };

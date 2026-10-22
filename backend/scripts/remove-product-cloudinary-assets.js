const path = require('node:path');
const { v2: cloudinary } = require('cloudinary');

require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const applyChanges = process.argv.includes('--apply');
const productPrefix = 'gujjus-style-hub/products';
const createdOnArg = process.argv.find((argument) => argument.startsWith('--created-on='));
const createdOn = createdOnArg?.slice('--created-on='.length);

if (applyChanges && !createdOn) {
  throw new Error('--apply requires --created-on=YYYY-MM-DD to prevent deleting unrelated product assets');
}

async function listResources(resourceType) {
  const resources = [];
  let nextCursor;
  do {
    const page = await cloudinary.api.resources({
      type: 'upload',
      resource_type: resourceType,
      prefix: productPrefix,
      max_results: 500,
      ...(nextCursor ? { next_cursor: nextCursor } : {}),
    });
    resources.push(...(page.resources || []));
    nextCursor = page.next_cursor;
  } while (nextCursor);
  return resources;
}

async function run() {
  if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
    throw new Error('Cloudinary credentials are required');
  }
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });

  const resourcesByType = {};
  for (const resourceType of ['image', 'video', 'raw']) {
    resourcesByType[resourceType] = await listResources(resourceType);
  }
  const inventory = Object.entries(resourcesByType).flatMap(([resourceType, resources]) =>
    resources.map(({ public_id: publicId, created_at: createdAt, bytes }) => ({
      resourceType,
      publicId,
      createdAt,
      bytes,
    })),
  );
  const selected = createdOn
    ? inventory.filter(({ createdAt }) => createdAt?.slice(0, 10) === createdOn)
    : inventory;

  if (!applyChanges) {
    const dateCounts = inventory.reduce((counts, { createdAt }) => {
      const date = createdAt?.slice(0, 10) || 'unknown';
      counts[date] = (counts[date] || 0) + 1;
      return counts;
    }, {});
    console.log(JSON.stringify({
      mode: 'dry-run',
      prefix: productPrefix,
      createdOn: createdOn || null,
      assetsInFolder: inventory.length,
      selectedAssets: selected.length,
      dateCounts,
      inventory: createdOn
        ? selected
        : [...selected].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 50),
    }, null, 2));
    return;
  }

  const deleted = [];
  for (const resourceType of ['image', 'video', 'raw']) {
    const ids = selected
      .filter((asset) => asset.resourceType === resourceType)
      .map(({ publicId }) => publicId);
    for (let index = 0; index < ids.length; index += 100) {
      const batch = ids.slice(index, index + 100);
      const result = await cloudinary.api.delete_resources(batch, { resource_type: resourceType, type: 'upload' });
      deleted.push(...Object.entries(result.deleted || {}).map(([publicId, status]) => ({ resourceType, publicId, status })));
    }
  }

  console.log(JSON.stringify({
    mode: 'apply',
    prefix: productPrefix,
    found: selected.length,
    deleted: deleted.filter(({ status }) => status === 'deleted').length,
    results: deleted,
  }, null, 2));
}

run().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});

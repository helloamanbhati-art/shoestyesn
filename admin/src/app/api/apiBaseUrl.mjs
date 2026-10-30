export function resolveAdminApiBaseUrl({ dev, configuredUrl } = {}) {
  if (!dev) return '';
  return String(configuredUrl || 'http://localhost:3000').replace(/\/+$/, '');
}

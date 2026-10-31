const crypto = require('crypto');

function getConfiguredAdminEmail(env = process.env) {
  const email = String(env.ADMIN_EMAIL || '').trim().toLowerCase();
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error('ADMIN_EMAIL must be a valid email address');
  }
  return email;
}

function getConfiguredAdminCredentials(env = process.env) {
  const email = getConfiguredAdminEmail(env);
  const password = String(env.ADMIN_PASSWORD || '');
  const minLength = env.NODE_ENV === 'production' ? 12 : 1;
  if (password.length < minLength) {
    throw new Error(
      env.NODE_ENV === 'production'
        ? 'ADMIN_PASSWORD must be at least 12 characters'
        : 'ADMIN_PASSWORD is required',
    );
  }
  if (password.length > 256) throw new Error('ADMIN_PASSWORD must be no more than 256 characters');
  return { email, password };
}

const digestEmail = (value) => crypto.createHash('sha256')
  .update(String(value || '').trim().toLowerCase()).digest();

function isConfiguredAdminEmail(candidate, env = process.env) {
  const email = getConfiguredAdminEmail(env);
  return crypto.timingSafeEqual(digestEmail(candidate), digestEmail(email));
}

async function synchronizeConfiguredAdmin({ AdminUser, AdminSession, env = process.env }) {
  const email = getConfiguredAdminEmail(env);
  await AdminUser.updateMany(
    { email: { $ne: email }, isActive: true },
    { $set: { isActive: false } },
  );

  let admin = await AdminUser.findOne({ email }).select('+password');
  if (!admin) {
    const { password } = getConfiguredAdminCredentials(env);
    return AdminUser.create({ firstName: 'Admin', email, password, role: 'super_admin', isActive: true });
  }

  const accessChanged = !admin.isActive || admin.role !== 'super_admin';
  if (accessChanged) {
    admin.isActive = true;
    admin.role = 'super_admin';
    await admin.save();
    if (AdminSession) {
      await AdminSession.updateMany(
        { adminId: admin._id, revokedAt: null },
        { $set: { revokedAt: new Date(), revocationReason: 'admin_access_changed' } },
      );
    }
  }
  return admin;
}

module.exports = {
  getConfiguredAdminEmail,
  getConfiguredAdminCredentials,
  isConfiguredAdminEmail,
  synchronizeConfiguredAdmin,
};

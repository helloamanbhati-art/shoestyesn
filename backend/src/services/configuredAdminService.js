const crypto = require('crypto');

function getConfiguredAdminCredentials(env = process.env) {
  const email = String(env.ADMIN_EMAIL || '').trim().toLowerCase();
  const password = String(env.ADMIN_PASSWORD || '');
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error('ADMIN_EMAIL must be a valid email address');
  }
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
  const { email } = getConfiguredAdminCredentials(env);
  return crypto.timingSafeEqual(digestEmail(candidate), digestEmail(email));
}

async function synchronizeConfiguredAdmin({ AdminUser, AdminSession, env = process.env }) {
  const { email, password } = getConfiguredAdminCredentials(env);
  await AdminUser.updateMany(
    { email: { $ne: email }, isActive: true },
    { $set: { isActive: false } },
  );

  let admin = await AdminUser.findOne({ email }).select('+password');
  if (!admin) {
    return AdminUser.create({ firstName: 'Admin', email, password, role: 'super_admin', isActive: true });
  }

  const passwordMatches = await admin.matchPassword(password);
  const credentialsChanged = !passwordMatches || !admin.isActive || admin.role !== 'super_admin';
  if (credentialsChanged) {
    admin.password = password;
    admin.isActive = true;
    admin.role = 'super_admin';
    await admin.save();
    if (AdminSession) {
      await AdminSession.updateMany(
        { adminId: admin._id, revokedAt: null },
        { $set: { revokedAt: new Date(), revocationReason: 'admin_credentials_changed' } },
      );
    }
  }
  return admin;
}

module.exports = { getConfiguredAdminCredentials, isConfiguredAdminEmail, synchronizeConfiguredAdmin };

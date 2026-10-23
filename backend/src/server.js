const { app, ensureDefaultAdmin } = require("./app");
const { validateProductionAdminOrigin } = require('./middleware/csrf');
const { getCookieSettings } = require('./services/sessionService');
const { connectDatabase, disconnectDatabase } = require('./config/database');

const PORT = process.env.PORT || 3000;
const MONGODB_URI = process.env.MONGODB_URI;

async function bootstrap() {
  if (!MONGODB_URI) {
    throw new Error("MONGODB_URI is missing in environment.");
  }

  validateProductionAdminOrigin();
  getCookieSettings();

  await connectDatabase(MONGODB_URI);
  await ensureDefaultAdmin();

  const server = app.listen(PORT, () => {
    console.log(`Backend running on port ${PORT}`);
  });

  let isShuttingDown = false;
  const shutdown = async (signal) => {
    if (isShuttingDown) return;
    isShuttingDown = true;
    console.log(`${signal} received; draining HTTP and database connections`);
    server.close(async () => {
      await disconnectDatabase().catch((error) => {
        console.error('Database shutdown failed:', error.message);
      });
      process.exit(0);
    });
    server.closeIdleConnections?.();
    setTimeout(() => process.exit(1), 10_000).unref();
  };

  process.once('SIGTERM', () => shutdown('SIGTERM'));
  process.once('SIGINT', () => shutdown('SIGINT'));
}

bootstrap().catch((error) => {
  console.error("Failed to start backend:", error.message);
  process.exit(1);
});

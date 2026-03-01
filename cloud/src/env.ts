export const env = {
  port: parseInt(process.env.CLOUD_PORT ?? '3000', 10),
  databaseUrl: process.env.DATABASE_URL ?? 'postgres://printing:printing@localhost:5432/printing_cloud',
  jwtSecret: process.env.JWT_SECRET ?? 'dev-secret-change-in-production',
  bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS ?? '12', 10),
};

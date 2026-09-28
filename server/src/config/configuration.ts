export default () => ({
  port: parseInt(process.env.PORT || '3200', 10),
  cors: {
    origin: (process.env.CORS_ORIGIN || 'http://localhost:5173').split(','),
    credentials: true,
  },
  database: {
    type: 'mysql' as const,
    host: process.env.DB_HOST || '127.0.0.1',
    port: parseInt(process.env.DB_PORT || '3306', 10),
    username: process.env.DB_USER || 'root',
    password: process.env.DB_PASS || 'root',
    database: process.env.DB_NAME || 'nova_admin',
    synchronize: process.env.DB_SYNC === 'true',
    logging: process.env.DB_LOG === 'true',
  },
  jwt: {
    secret: process.env.JWT_SECRET || 'nova-admin-dev-secret',
    expires: process.env.JWT_EXPIRES || '2h',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'nova-admin-dev-refresh',
    refreshExpires: process.env.JWT_REFRESH_EXPIRES || '7d',
  },
  swaggerEnabled: process.env.SWAGGER_ENABLED !== 'false',
});

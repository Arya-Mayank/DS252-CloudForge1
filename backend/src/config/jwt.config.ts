export const jwtConfig = {
  secret: process.env.JWT_SECRET || 'default-secret-change-in-production',
  expiry: (process.env.JWT_EXPIRY || '7d') as string,
};

if (process.env.NODE_ENV === 'production' && jwtConfig.secret === 'default-secret-change-in-production') {
  console.error('⚠️  WARNING: Using default JWT secret in production! Please set JWT_SECRET in .env');
}


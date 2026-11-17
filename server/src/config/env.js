import 'dotenv/config';

const required = ['DATABASE_URL', 'JWT_SECRET', 'POS_API_KEY'];
for (const key of required) {
  if (!process.env[key]) throw new Error(`Missing required environment variable: ${key}`);
}
if (process.env.JWT_SECRET.length < 32) {
  throw new Error('JWT_SECRET must be at least 32 characters long');
}
if (process.env.POS_API_KEY.length < 32) {
  throw new Error('POS_API_KEY must be at least 32 characters long');
}

export const config = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT || 4000),
  databaseUrl: process.env.DATABASE_URL,
  jwtSecret: process.env.JWT_SECRET,
  posApiKey: process.env.POS_API_KEY,
  resendApiKey: process.env.RESEND_API_KEY || '',
  resendFromEmail: process.env.RESEND_FROM_EMAIL || '',
  clientOrigin: process.env.CLIENT_ORIGIN || 'http://localhost:3000'
};

import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

const environment = {
  // Server
  PORT: process.env.PORT || 5000,
  NODE_ENV: process.env.NODE_ENV || 'development',

  // Database
  MONGODB_URI: process.env.DATABASE_URL,

  // JWT
  JWT_SECRET: process.env.SECRET,
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',

  // SMTP
  SMTP_HOST: process.env.EMAIL_SMTP_HOST,
  SMTP_PORT: Number(process.env.EMAIL_SMTP_PORT),
  SMTP_USER: process.env.EMAIL_SMTP_USER,
  SMTP_PASS: process.env.EMAIL_SMTP_PASS,
  SMTP_SECURE: process.env.EMAIL_SMTP_SECURE === 'true',
  SMTP_SERVICE: process.env.EMAIL_SMTP_SERVICE_NAME,

  // Frontend URL
  FRONTEND_URL: process.env.CLIENT_HOST,

  // Cloudinary
  CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME,
  CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY,
  CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET,
};

// Validate required environment variables
const requiredEnvVars = [
  'DATABASE_URL',
  'SECRET',
  'EMAIL_SMTP_HOST',
  'EMAIL_SMTP_PORT',
  'EMAIL_SMTP_USER',
  'EMAIL_SMTP_PASS',
  'CLIENT_HOST',
  'CLOUDINARY_CLOUD_NAME',
  'CLOUDINARY_API_KEY',
  'CLOUDINARY_API_SECRET'
];

requiredEnvVars.forEach((envVar) => {
  if (!process.env[envVar]) {
    console.warn(`Warning: ${envVar} environment variable is not set.`);
  }
});

export default environment;

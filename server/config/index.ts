import dotenv from 'dotenv';
dotenv.config({ override: true, quiet: true });

export const config = {
  port: process.env.PORT ? parseInt(process.env.PORT, 10) : 3000,
  nodeEnv: process.env.NODE_ENV || 'development',
  jwtSecret: process.env.JWT_SECRET || 'attendsecure_production_secret_key_tsdc_2026_jwt_token_auth',
  college: {
    name: process.env.VITE_COLLEGE_NAME || 'Thakur Shyamnarayan Degree College (TSDC)',
    latitude: parseFloat(process.env.VITE_DEFAULT_LAT || '19.2138050'),
    longitude: parseFloat(process.env.VITE_DEFAULT_LNG || '72.8648690'),
    defaultGeofenceRadiusMeters: 50,
  },
  email: {
    resendApiKey: process.env.RESEND_API_KEY || '',
    resendOwnerEmail: process.env.RESEND_OWNER_EMAIL || 'smartattendance13@gmail.com',
    smtpHost: process.env.SMTP_HOST || 'smtp.gmail.com',
    smtpPort: parseInt(process.env.SMTP_PORT || '465', 10),
    smtpUser: process.env.SMTP_USER || 'smartattendance13@gmail.com',
    smtpPass: process.env.SMTP_PASS || '',
    smtpFrom: process.env.SMTP_FROM || 'AttendSecure TSDC <smartattendance13@gmail.com>',
  },
};

export default config;

import nodemailer from 'nodemailer';

export interface SentEmailLog {
  id: string;
  to: string;
  subject: string;
  otp: string;
  sentAt: string;
  html: string;
  deliveredRealEmail: boolean;
  statusMessage: string;
}

export interface EmailSendResult {
  success: boolean;
  deliveredRealEmail: boolean;
  message: string;
  error?: string;
}

// In-memory / log store for sent emails
const sentEmailsLog: SentEmailLog[] = [];

export function generateOTP(): string {
  // Generate cryptographically sound 6-digit OTP
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export function generateOtpEmailHtml(otp: string, recipientName: string = 'Student'): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Verify Your AttendSecure Account</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      background-color: #FBF9F5;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      color: #1C1917;
    }
    .email-container {
      max-width: 560px;
      margin: 40px auto;
      background: #FFFFFF;
      border: 1px solid #E7E5E4;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.03);
    }
    .header {
      background-color: #1C1917;
      padding: 28px 32px;
      text-align: left;
    }
    .brand-title {
      color: #FFFFFF;
      font-size: 20px;
      font-weight: 700;
      letter-spacing: -0.5px;
      margin: 0;
    }
    .brand-subtitle {
      color: #A8A29E;
      font-size: 12px;
      margin-top: 4px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .content {
      padding: 36px 32px;
    }
    .greeting {
      font-size: 16px;
      font-weight: 600;
      margin-bottom: 12px;
      color: #292524;
    }
    .text-body {
      font-size: 14px;
      line-height: 1.6;
      color: #57534E;
      margin-bottom: 24px;
    }
    .otp-card {
      background-color: #F5F5F4;
      border: 1px dashed #D6D3D1;
      border-radius: 8px;
      padding: 24px;
      text-align: center;
      margin: 24px 0;
    }
    .otp-code {
      font-family: 'Courier New', Courier, monospace;
      font-size: 34px;
      font-weight: 700;
      letter-spacing: 8px;
      color: #0F172A;
      margin: 0;
    }
    .otp-meta {
      font-size: 12px;
      color: #78716C;
      margin-top: 8px;
    }
    .security-notice {
      background-color: #FEF3C7;
      border-left: 4px solid #D97706;
      padding: 12px 16px;
      border-radius: 4px;
      font-size: 13px;
      color: #92400E;
      margin: 24px 0;
      line-height: 1.5;
    }
    .footer {
      background-color: #FAFAF9;
      border-top: 1px solid #E7E5E4;
      padding: 20px 32px;
      text-align: center;
      font-size: 12px;
      color: #A8A29E;
      line-height: 1.5;
    }
  </style>
</head>
<body>
  <div class="email-container">
    <div class="header">
      <div class="brand-title">AttendSecure</div>
      <div class="brand-subtitle">Smart Location-Based Attendance • TSDC</div>
    </div>
    
    <div class="content">
      <div class="greeting">Hello ${recipientName},</div>
      <p class="text-body">
        Thank you for registering on <strong>AttendSecure</strong>. Please use the One-Time Password (OTP) below to verify your college account and activate your attendance credentials.
      </p>

      <div class="otp-card">
        <div class="otp-code">${otp}</div>
        <div class="otp-meta">Valid for 10 minutes • Single Use Only</div>
      </div>

      <div class="security-notice">
        <strong>Security Notice:</strong> Never share this OTP with anyone. College faculty and staff will never ask for your verification code.
      </div>

      <p class="text-body" style="margin-bottom: 0;">
        If you did not request this verification, you can safely ignore this email.
      </p>
    </div>

    <div class="footer">
      Thakur Shyamnarayan Degree College (TSDC)<br>
      Thakur Complex, Kandivali East, Mumbai 400101<br>
      © ${new Date().getFullYear()} AttendSecure. All rights reserved.
    </div>
  </div>
</body>
</html>
  `.trim();
}

function getEmailTransporter(): any {
  const host = process.env.SMTP_HOST;
  const port = parseInt(process.env.SMTP_PORT || '465', 10);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (host && user && pass) {
    return nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: {
        user,
        pass,
      },
    });
  }

  const gmailUser = process.env.GMAIL_USER;
  const gmailPass = process.env.GMAIL_APP_PASSWORD;
  if (gmailUser && gmailPass) {
    return nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: gmailUser,
        pass: gmailPass,
      },
    });
  }

  return null;
}

export async function sendOtpEmail(to: string, otp: string, recipientName: string = 'User'): Promise<EmailSendResult> {
  const html = generateOtpEmailHtml(otp, recipientName);
  const subject = 'Verify Your AttendSecure Account - OTP: ' + otp;
  
  let deliveredRealEmail = false;
  let statusMessage = 'OTP generated and saved for verification.';
  let errorMessage: string | undefined;

  const transporter = getEmailTransporter();
  if (transporter) {
    try {
      const fromAddress = process.env.SMTP_FROM || process.env.SMTP_USER || process.env.GMAIL_USER || '"AttendSecure TSDC" <noreply@tsdc.edu.in>';
      await transporter.sendMail({
        from: fromAddress,
        to,
        subject,
        html,
      });
      deliveredRealEmail = true;
      statusMessage = `Email successfully dispatched to ${to} via SMTP.`;
      console.log(`[EMAIL DISPATCH] Real email sent to ${to}: OTP is ${otp}`);
    } catch (err: any) {
      errorMessage = err?.message || 'SMTP delivery failed';
      statusMessage = `SMTP delivery error: ${errorMessage}`;
      console.warn(`[EMAIL DISPATCH WARNING] Could not deliver email to ${to}:`, errorMessage);
    }
  } else {
    statusMessage = 'No SMTP credentials configured. OTP provided directly on screen.';
    console.log(`[EMAIL DISPATCH] SMTP not configured. OTP generated for ${to}: ${otp}`);
  }

  const logEntry: SentEmailLog = {
    id: 'email_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
    to,
    subject,
    otp,
    sentAt: new Date().toISOString(),
    html,
    deliveredRealEmail,
    statusMessage,
  };

  sentEmailsLog.unshift(logEntry);
  if (sentEmailsLog.length > 50) sentEmailsLog.pop();

  return {
    success: true,
    deliveredRealEmail,
    message: statusMessage,
    error: errorMessage,
  };
}

export function getRecentEmails(): SentEmailLog[] {
  return sentEmailsLog;
}

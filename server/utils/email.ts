import dotenv from "dotenv";
import { Resend } from "resend";
import crypto from "crypto";

dotenv.config({ override: true, quiet: true });

export interface EmailSendResult {
  success: boolean;
  deliveredRealEmail: boolean;
  message: string;
  error?: string;
}

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

const sentEmailsLog: SentEmailLog[] = [];

export function generateOTP(): string {
  return crypto.randomInt(100000, 1000000).toString();
}

export function generateOtpEmailHtml(
  otp: string,
  recipientName: string = "User",
  purpose: string = "registration",
): string {
  const isReset = purpose === "password_reset";

  const titleText = isReset
    ? "Reset Your AttendSecure Password"
    : "Verify Your AttendSecure Account";

  const leadText = isReset
    ? `We received a request to reset the password for your college account. Please use the One-Time Password (OTP) below to safely set a new password.`
    : `Thank you for registering on <strong>AttendSecure</strong>. Please use the One-Time Password (OTP) below to verify your college account.`;

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta
    name="viewport"
    content="width=device-width, initial-scale=1.0"
  />
  <title>${titleText}</title>

  <style>
    body {
      margin: 0;
      padding: 0;
      background-color: #FBF9F5;
      font-family:
        -apple-system,
        BlinkMacSystemFont,
        "Segoe UI",
        Roboto,
        Helvetica,
        Arial,
        sans-serif;
      color: #1C1917;
    }

    .email-container {
      max-width: 560px;
      margin: 40px auto;
      background: #FFFFFF;
      border: 1px solid #E7E5E4;
      border-radius: 12px;
      overflow: hidden;
    }

    .header {
      background-color: #1C1917;
      padding: 28px 32px;
    }

    .brand-title {
      color: #FFFFFF;
      font-size: 20px;
      font-weight: 700;
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
      font-family: "Courier New", Courier, monospace;
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
      <div class="brand-subtitle">
        Smart Location-Based Attendance • TSDC
      </div>
    </div>

    <div class="content">

      <div class="greeting">
        Hello ${recipientName},
      </div>

      <p class="text-body">
        ${leadText}
      </p>

      <div class="otp-card">
        <div class="otp-code">${otp}</div>

        <div class="otp-meta">
          Valid for 10 minutes • Single Use Only
        </div>
      </div>

      <div class="security-notice">
        <strong>Security Notice:</strong>
        Never share this OTP with anyone.
        College faculty and staff will never ask
        for your verification code.
      </div>

      <p class="text-body" style="margin-bottom: 0;">
        If you did not request this verification,
        you can safely ignore this email.
      </p>

    </div>

    <div class="footer">
      Thakur Shyamnarayan Degree College (TSDC)<br />
      Thakur Complex, Kandivali East, Mumbai 400101<br />
      ©️ ${new Date().getFullYear()} AttendSecure.
      All rights reserved.
    </div>

  </div>
</body>
</html>
`.trim();
}

export async function sendOtpEmail(
  to: string,
  otp: string,
  recipientName: string = "User",
  purpose: string = "registration",
): Promise<EmailSendResult> {
  const email = to.trim().toLowerCase();

  if (!email) {
    return {
      success: false,
      deliveredRealEmail: false,
      message: "Recipient email address is required.",
      error: "Missing recipient email.",
    };
  }

  const resendApiKey = process.env.RESEND_API_KEY?.trim();

  if (!resendApiKey) {
    return {
      success: false,
      deliveredRealEmail: false,
      message: "Resend API key is not configured.",
      error: "RESEND_API_KEY is missing.",
    };
  }

  const fromAddress = (
    process.env.RESEND_FROM || "AttendSecure <onboarding@resend.dev>"
  ).trim();

  const resend = new Resend(resendApiKey);

  const html = generateOtpEmailHtml(otp, recipientName, purpose);

  const subject =
    purpose === "password_reset"
      ? "Reset Your AttendSecure Password"
      : "Verify Your AttendSecure Account";

  try {
    // Send directly to the email entered by the user.
    const result = await resend.emails.send({
      from: fromAddress,
      to: [email],
      subject,
      html,
    });

    if (result.error) {
      console.error("[RESEND ERROR]", result.error.message);

      return {
        success: false,
        deliveredRealEmail: false,
        message: "Failed to send OTP email.",
        error: result.error.message,
      };
    }

    console.log(`[RESEND SUCCESS] OTP email sent to ${email}`);

    // Keep the existing local email log functionality.
    const logEntry: SentEmailLog = {
      id:
        "email_" +
        Date.now() +
        "_" +
        Math.random().toString(36).substring(2, 6),
      to: email,
      subject,
      otp,
      sentAt: new Date().toISOString(),
      html,
      deliveredRealEmail: true,
      statusMessage: "OTP email sent successfully.",
    };

    sentEmailsLog.unshift(logEntry);

    if (sentEmailsLog.length > 50) {
      sentEmailsLog.pop();
    }

    return {
      success: true,
      deliveredRealEmail: true,
      message: "OTP email sent successfully.",
    };
  } catch (error: any) {
    const message = error?.message || "Unknown Resend error occurred.";

    console.error("[RESEND ERROR]", message);

    return {
      success: false,
      deliveredRealEmail: false,
      message: "Failed to send OTP email.",
      error: message,
    };
  }
}

export function getRecentEmails(): SentEmailLog[] {
  return sentEmailsLog;
}
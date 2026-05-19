import nodemailer from "nodemailer";

// Validate and log SMTP configuration (for debugging)
const smtpPort = process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : 2525;
const smtpHost = process.env.SMTP_HOST || "smtp.mailtrap.io";

// Debug logging (only in development)
if (process.env.NODE_ENV === "development") {
  console.log("📧 SMTP Configuration:", {
    host: smtpHost,
    port: smtpPort,
    user: process.env.SMTP_USER ? `${process.env.SMTP_USER.substring(0, 4)}...` : "NOT SET",
    pass: process.env.SMTP_PASS ? "***" : "NOT SET",
    from: process.env.SMTP_FROM || "NOT SET",
  });
}

if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
  console.warn("⚠️  SMTP credentials not configured. Email sending will fail.");
}

const transporter = nodemailer.createTransport({
  host: smtpHost,
  port: smtpPort,
  secure: false, // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
  // Add connection timeout settings
  connectionTimeout: 10000, // 10 seconds
  greetingTimeout: 10000,
  socketTimeout: 10000,
});

export async function sendVerificationEmail({
  email,
  token,
}: {
  email: string;
  token: string;
}) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || "http://localhost:3000";
  const verifyUrl = `${baseUrl}/api/auth/verify-email?token=${token}`;

  await transporter.sendMail({
    from: `"Vie" <${process.env.SMTP_FROM || "noreply@vie.com"}>`,
    to: email,
    subject: "Verify your email",
    html: `
      <p>Welcome!</p>
      <p>Please verify your email by clicking the link below:</p>
      <a href="${verifyUrl}">Verify Email</a>
      <p>This link expires in 24 hours.</p>
    `,
  });
}

export async function sendEmailChangeVerification({
  newEmail,
  token,
}: {
  newEmail: string;
  token: string;
}) {
  const verifyUrl = `${process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || "http://localhost:3000"}/api/auth/verify-email-change?token=${token}`;
  const fromEmail = process.env.SMTP_FROM || "noreply@vie.com";

  await transporter.sendMail({
    from: `"Vie" <${fromEmail}>`,
    to: newEmail,
    subject: "Confirm your new email address",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #0A0A0A;">Confirm your new email</h2>
        <p>You requested to change your account email to <strong>${newEmail}</strong>.</p>
        <p>Click the button below to confirm and update your email address:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${verifyUrl}" style="background-color: #0A0A0A; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">
            Confirm new email
          </a>
        </div>
        <p style="color: #666; font-size: 14px;">Or copy and paste this link into your browser:</p>
        <p style="color: #666; font-size: 12px; word-break: break-all;">${verifyUrl}</p>
        <p style="color: #999; font-size: 12px; margin-top: 30px;">This link expires in 24 hours. If you didn't request this change, you can safely ignore this email.</p>
      </div>
    `,
  });
}

const PASSWORD_RESET_IDENTIFIER_PREFIX = "password-reset:";

/** Used when storing tokens; keep in sync with forgot-password / reset-password routes. */
export function passwordResetIdentifier(email: string) {
  return `${PASSWORD_RESET_IDENTIFIER_PREFIX}${email.toLowerCase().trim()}`;
}

export function parseEmailFromPasswordResetIdentifier(identifier: string): string | null {
  if (!identifier.startsWith(PASSWORD_RESET_IDENTIFIER_PREFIX)) return null;
  return identifier.slice(PASSWORD_RESET_IDENTIFIER_PREFIX.length) || null;
}

export async function sendPasswordResetEmail({
  email,
  token,
}: {
  email: string;
  token: string;
}) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || "http://localhost:3000";
  const resetUrl = `${baseUrl}/auth/reset-password?token=${encodeURIComponent(token)}`;
  const fromEmail = process.env.SMTP_FROM || "noreply@vie.com";

  await transporter.sendMail({
    from: `"Vie" <${fromEmail}>`,
    to: email,
    subject: "Reset your password",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #0A0A0A;">Reset your password</h2>
        <p>We received a request to reset the password for your account.</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetUrl}" style="background-color: #0A0A0A; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">
            Choose a new password
          </a>
        </div>
        <p style="color: #666; font-size: 14px;">Or copy and paste this link into your browser:</p>
        <p style="color: #666; font-size: 12px; word-break: break-all;">${resetUrl}</p>
        <p style="color: #999; font-size: 12px; margin-top: 30px;">This link expires in 1 hour. If you did not request a reset, you can ignore this email.</p>
      </div>
    `,
  });
}

export async function sendTwoFactorEnabledEmail({
  email,
  name,
  recoveryCodesPdf,
}: {
  email: string;
  name?: string | null;
  recoveryCodesPdf: Buffer;
}) {
  const fromEmail = process.env.SMTP_FROM || "noreply@vie.com";
  const displayName = name?.trim() || "there";

  await transporter.sendMail({
    from: `"Vie" <${fromEmail}>`,
    to: email,
    subject: "Two-step verification enabled on your account",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #0A0A0A;">Two-step verification is now enabled</h2>
        <p>Hi ${displayName},</p>
        <p>Authenticator-based two-step verification was successfully enabled on your Vie account.</p>
        <p><strong>Your recovery codes are attached as a PDF.</strong> Store them in a safe place. Each code works only once if you lose access to your authenticator app.</p>
        <p style="color: #999; font-size: 12px; margin-top: 30px;">If you did not enable this, contact your administrator immediately and reset your password.</p>
      </div>
    `,
    attachments: [
      {
        filename: "vie-recovery-codes.pdf",
        content: recoveryCodesPdf,
        contentType: "application/pdf",
      },
    ],
  });
}

export async function sendInvitationEmail({
  email,
  token,
  organizationName,
  inviterName,
  role,
}: {
  email: string;
  token: string;
  organizationName: string;
  inviterName?: string;
  role?: string;
}) {
  // Validate required environment variables
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
    throw new Error("SMTP configuration is missing. Please check your environment variables.");
  }

  const inviteUrl = `${process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || "http://localhost:3000"}/auth/invite?token=${token}`;
  // Format role for display in email
  const roleText = 
    role?.toLowerCase() === "admin" || role?.toLowerCase() === "administrator" ? "Administrator" :
    role?.toLowerCase() === "owner" ? "Owner" :
    role?.toLowerCase() === "manager" ? "Manager" :
    role?.toLowerCase() === "user" || role?.toLowerCase() === "member" ? "User" :
    "Member";
  const fromEmail = process.env.SMTP_FROM || "noreply@vie.com";

  await transporter.sendMail({
    from: `"Vie" <${fromEmail}>`,
    to: email,
    subject: `You've been invited to join ${organizationName}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2B7FFF;">You've been invited!</h2>
        <p>${inviterName ? `${inviterName} has` : "You have been"} invited to join <strong>${organizationName}</strong> as a <strong>${roleText}</strong>.</p>
        <p>Click the button below to accept the invitation:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${inviteUrl}" style="background-color: #2B7FFF; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">
            Accept Invitation
          </a>
        </div>
        <p style="color: #666; font-size: 14px;">Or copy and paste this link into your browser:</p>
        <p style="color: #666; font-size: 12px; word-break: break-all;">${inviteUrl}</p>
        <p style="color: #999; font-size: 12px; margin-top: 30px;">This invitation expires in 7 days.</p>
        <p style="color: #999; font-size: 12px;">If you didn't expect this invitation, you can safely ignore this email.</p>
      </div>
    `,
  });
}

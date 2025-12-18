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
  const verifyUrl = `${process.env.NEXTAUTH_URL}/api/auth/verify-email?token=${token}`;

  await transporter.sendMail({
    from: `"VApps" <${process.env.SMTP_FROM || "noreply@vapps.com"}>`,
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
  const fromEmail = process.env.SMTP_FROM || "noreply@vapps.com";

  await transporter.sendMail({
    from: `"VApps" <${fromEmail}>`,
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

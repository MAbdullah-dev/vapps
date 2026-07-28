import { z } from "zod";
import { normalizeEmail } from "@/lib/email-normalize";

const emailField = z
  .string()
  .email("Invalid email")
  .transform((value) => normalizeEmail(value));

export const registerSchema = z
  .object({
    email: emailField,
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string().min(8),
    inviteToken: z.string().optional(),
    /** Cloudflare Turnstile token (required when `CLOUDFLARE_TURNSTILE_SECRET_KEY` is set). */
    turnstileToken: z.string().min(1).optional(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export const loginSchema = z.object({
  email: emailField,
  password: z.string().min(1, "Password is required"),
});

export const forgotPasswordSchema = z.object({
  email: emailField,
});

export const resendVerificationSchema = z.object({
  email: emailField,
  turnstileToken: z.string().min(1).optional(),
});

export const resetPasswordSchema = z
  .object({
    token: z.string().min(1, "Reset link is invalid or expired"),
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string().min(8),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResendVerificationInput = z.infer<typeof resendVerificationSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;

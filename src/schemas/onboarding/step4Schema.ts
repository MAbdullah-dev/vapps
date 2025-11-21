import * as z from "zod";

export const teamMemberSchema = z.object({
  fullName: z.string().min(1, "Full Name is required"),
  email: z.string().email("Invalid email").min(1, "Email is required"),
  role: z.string().min(1, "Role is required"),
  ssoMethod: z.string(),
});

export const step4Schema = z.object({
  teamMembers: z.array(teamMemberSchema).min(1, "Add at least one team member"),
});

export type TeamMember = z.infer<typeof teamMemberSchema>;
export type Step4Values = z.infer<typeof step4Schema>;

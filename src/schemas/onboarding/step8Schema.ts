import * as z from "zod";

export const step8Schema = z.object({
  multiLevelApprovals: z.boolean().default(false),
  automaticTaskAssignment: z.boolean().default(false),

  criticalSLA: z.string().min(1, "Required"),
  highPrioritySLA: z.string().min(1, "Required"),
  mediumPrioritySLA: z.string().min(1, "Required"),
  lowPrioritySLA: z.string().min(1, "Required"),

  emailNotifications: z.boolean().default(true),
  inAppNotifications: z.boolean().default(true),
  smsNotifications: z.boolean().default(false),
  

  escalationRules: z.string().optional(),
});

export type Step8Values = z.infer<typeof step8Schema>;

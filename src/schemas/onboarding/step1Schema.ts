import * as z from "zod";

export const step1Schema = z.object({
  orgName: z.string().min(2, "Organization name is required"),
});

export type Step1Values = z.infer<typeof step1Schema>;

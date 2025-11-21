import { z } from "zod";

export const step9Schema = z.object({
  widgets: z.object({
    tasksCompleted: z.boolean(),
    complianceScore: z.boolean(),
    workloadByUser: z.boolean(),
    overdueTasks: z.boolean(),

    issueDistribution: z.boolean(),
    auditTrend: z.boolean(),
    projectProgress: z.boolean(),
    documentVersion: z.boolean(),
  }),

  reportFrequency: z.string().min(1, "Please select a frequency"),
});

export type Step9Values = z.infer<typeof step9Schema>;

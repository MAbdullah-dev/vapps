import { z } from "zod";

export const customerSchema = z.object({
  name: z.string().optional(),
  email: z.string().optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
});

export const vendorSchema = z.object({
  name: z.string().optional(),
  email: z.string().optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
});

// Base schema - arrays are optional, validation happens conditionally
export const step7Schema = z.object({
  activeTab: z.enum(["customers", "vendors"]).optional().default("customers"),
  customers: z.array(customerSchema).optional().default([]),
  vendors: z.array(vendorSchema).optional().default([]),
});

export type Step7Values = z.infer<typeof step7Schema>;

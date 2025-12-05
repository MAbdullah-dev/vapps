import { z } from "zod";

export const customerSchema = z.object({
  name: z.string().min(1, "Customer Name is required"),
  email: z.string().optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
});

export const vendorSchema = z.object({
  name: z.string().min(1, "Vendor Name is required"),
  email: z.string().optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
});

export const step7Schema = z.object({
  activeTab: z.enum(["customers", "vendors"]).optional(),
  customers: z.array(customerSchema).optional().default([]),
  vendors: z.array(vendorSchema).optional().default([]),
});

export type Step7Values = z.infer<typeof step7Schema>;

import { z } from "zod";

export const productSchema = z.object({
  sku: z.string().optional(),
  name: z.string().min(1, "Product Name is required"),
  category: z.string().optional(),
  unit: z.string().optional(),
  cost: z.string().optional(),
  reorder: z.string().optional(),
});

export const step6Schema = z.object({
  products: z.array(productSchema).min(1, "At least one product is required"),
});

export type Step6Values = z.infer<typeof step6Schema>;

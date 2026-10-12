import { z } from "zod";
import { poishaSchema } from "./common.js";

export const productImageSchema = z.object({
  id: z.string().uuid().optional(),
  url: z.string().url(),
  altText: z.string().max(200).optional(),
  sortOrder: z.number().int().min(0).default(0),
  isPrimary: z.boolean().default(false),
});

export const productVariantSchema = z.object({
  id: z.string().uuid().optional(),
  title: z.string().min(1).max(100), // e.g. "Red / XL" or "1 KG"
  sku: z.string().max(50).optional(),
  price: poishaSchema, // in poisha
  compareAtPrice: poishaSchema.optional(), // original/strikethrough price
  stockQuantity: z.number().int().min(0).default(0),
  option1: z.string().max(50).optional(), // Size
  option2: z.string().max(50).optional(), // Color
  option3: z.string().max(50).optional(), // Material / Weight
  imageUrl: z.string().url().optional(),
});

export const createProductSchema = z.object({
  title: z.string().min(2).max(255),
  slug: z.string().min(2).max(100).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug must be URL-safe"),
  description: z.string().optional(),
  banglaTitle: z.string().max(255).optional(),
  banglaDescription: z.string().optional(),
  categoryId: z.string().uuid().optional(),
  isFeatured: z.boolean().default(false),
  isActive: z.boolean().default(true),
  
  // Single-product campaign funnel fields
  videoUrl: z.string().url().optional(), // YouTube / Facebook video
  features: z.array(z.string()).default([]), // Bullet points of benefits
  guaranteeText: z.string().max(200).optional(), // "৭ দিনের ক্যাশব্যাক গ্যারান্টি"

  images: z.array(productImageSchema).min(1, "At least one product image is required"),
  variants: z.array(productVariantSchema).min(1, "At least one variant/price is required"),
});

export const updateProductSchema = createProductSchema.partial();

export type ProductImage = z.infer<typeof productImageSchema>;
export type ProductVariant = z.infer<typeof productVariantSchema>;
export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;

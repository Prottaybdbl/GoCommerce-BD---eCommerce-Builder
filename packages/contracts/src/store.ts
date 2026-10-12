import { z } from "zod";
import { bdPhoneSchema } from "./common.js";

export const subdomainSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(3, "Subdomain must be at least 3 characters")
  .max(40, "Subdomain cannot exceed 40 characters")
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Subdomain can only contain lowercase letters, numbers, and hyphens");

export const customDomainSchema = z
  .string()
  .trim()
  .toLowerCase()
  .regex(
    /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/,
    "Invalid domain format (e.g. www.mystore.com)"
  );

export const storeSettingsSchema = z.object({
  storeName: z.string().min(2).max(100),
  tagline: z.string().max(200).optional(),
  logoUrl: z.string().url().optional(),
  supportPhone: bdPhoneSchema.optional(),
  supportWhatsapp: bdPhoneSchema.optional(),
  deliveryChargeInsideDhaka: z.number().int().min(0).default(6000), // ৳60
  deliveryChargeSubDhaka: z.number().int().min(0).default(10000), // ৳100
  deliveryChargeOutsideDhaka: z.number().int().min(0).default(12000), // ৳120
  freeDeliveryThreshold: z.number().int().min(0).optional(), // e.g. ৳2000+ free delivery

  // Anti-fraud / Advance bKash settings
  advanceDeliveryRequiredOutsideDhaka: z.boolean().default(false),
  advanceDeliveryAmount: z.number().int().min(0).default(12000), // ৳120
  bkashPersonalNumber: bdPhoneSchema.optional(),
  nagadPersonalNumber: bdPhoneSchema.optional(),

  // Facebook & Marketing
  facebookPixelId: z.string().max(50).optional(),
  facebookCapiToken: z.string().max(500).optional(),
  tiktokPixelId: z.string().max(50).optional(),

  // Active theme
  themeArchetype: z.enum([
    "viral-funnel",
    "multi-campaign",
    "fashion-store",
    "tech-gadget",
    "organic-food",
  ]).default("viral-funnel"),
  themeConfig: z.record(z.unknown()).default({}),
});

export const createStoreSchema = z.object({
  name: z.string().min(2).max(100),
  subdomain: subdomainSchema,
  phone: bdPhoneSchema,
  themeArchetype: z.enum([
    "viral-funnel",
    "multi-campaign",
    "fashion-store",
    "tech-gadget",
    "organic-food",
  ]).default("viral-funnel"),
});

export const registerStoreSchema = z.object({
  name: z.string().trim().min(2, "পূর্ণ নাম অন্তত ২ অক্ষরের হতে হবে").max(100),
  email: z.string().trim().toLowerCase().email("সঠিক ইমেইল এড্রেস প্রদান করুন"),
  password: z.string().min(8, "পাসওয়ার্ড অন্তত ৮ অক্ষরের হতে হবে").max(128),
  storeName: z.string().trim().min(2, "দোকানের নাম অন্তত ২ অক্ষরের হতে হবে").max(100),
  subdomain: subdomainSchema,
  phone: bdPhoneSchema,
});

export const completeOnboardingSchema = z.object({
  storeName: z.string().trim().min(2, "দোকানের নাম অন্তত ২ অক্ষরের হতে হবে").max(100),
  subdomain: subdomainSchema,
  niche: z.string().trim().min(2, "দোকানের ক্যাটাগরি বা নিশ নির্বাচন করুন").max(50),
  phone: bdPhoneSchema,
  password: z.string().min(8, "পাসওয়ার্ড অন্তত ৮ অক্ষরের হতে হবে").max(128),
});

export const loginSchema = z
  .object({
    email: z.string().trim().min(1, "সঠিক ইমেইল বা ইউজারনেম প্রদান করুন").optional(),
    username: z.string().trim().min(1).optional(),
    identifier: z.string().trim().min(1).optional(),
    password: z.string().min(1, "পাসওয়ার্ড প্রদান করুন"),
  })
  .transform((data) => ({
    email: (data.email || data.username || data.identifier || "").trim().toLowerCase(),
    password: data.password,
  }))
  .refine((data) => data.email.length >= 2, {
    message: "সঠিক ইমেইল বা ইউজারনেম প্রদান করুন",
    path: ["email"],
  });

export type StoreSettings = z.infer<typeof storeSettingsSchema>;
export type CreateStoreInput = z.infer<typeof createStoreSchema>;
export type RegisterStoreInput = z.infer<typeof registerStoreSchema>;
export type CompleteOnboardingInput = z.infer<typeof completeOnboardingSchema>;
export type LoginInput = z.infer<typeof loginSchema>;



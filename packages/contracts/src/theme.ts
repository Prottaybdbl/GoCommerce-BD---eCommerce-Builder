import { z } from "zod";

export const themeArchetypeSchema = z.enum([
  "viral-funnel",
  "multi-campaign",
  "fashion-store",
  "tech-gadget",
  "organic-food",
]);

export const themeTokensSchema = z.object({
  primaryColor: z.string().default("#E11D48"), // Rose / Vibrant Red-Pink
  accentColor: z.string().default("#10B981"), // Emerald Green
  backgroundColor: z.string().default("#FFFFFF"),
  textColor: z.string().default("#0F172A"),
  borderRadius: z.string().default("0.5rem"),
});

export const viralFunnelConfigSchema = z.object({
  announcementBarText: z.string().default("সারা দেশে ফ্রি হোম ডেলিভারি এবং ক্যাশ অন ডেলিভারি সুবিধা!"),
  announcementTimerEndsAt: z.string().optional(),
  heroVideoUrl: z.string().optional(),
  bulletPoints: z.array(z.string()).default([
    "১০০% অরিজিনাল ও প্রিমিয়াম কোয়ালিটি",
    "প্রোডাক্ট হাতে পেয়ে চেক করে পেমেন্ট করার সুবিধা",
    "৭ দিনের মধ্যে সহজ রিটার্ন ও রিপ্লেসমেন্ট পলিসি"
  ]),
  stickyOrderButtonText: z.string().default("অর্ডার করতে এখানে ক্লিক করুন"),
  guaranteeBadgeText: z.string().default("পণ্য হাতে পেয়ে টাকা পরিশোধ করুন"),
  quantityDiscountOffers: z.array(z.object({
    quantity: z.number().int().min(1),
    discountPoisha: z.number().int().min(0),
    badgeText: z.string(),
  })).default([]),
});

export const fashionStoreConfigSchema = z.object({
  heroBannerUrl: z.string().optional(),
  heroHeadline: z.string().default("নতুন কালেকশন ২০২৬"),
  showSizeGuideModal: z.boolean().default(true),
  showStockBadges: z.boolean().default(true),
});

export const techGadgetConfigSchema = z.object({
  warrantyPeriod: z.string().default("১ বছরের অফিসিয়াল ওয়ারেন্টি"),
  replacementPeriod: z.string().default("৭ দিনের রিপ্লেসমেন্ট গ্যারান্টি"),
  specsTableEnabled: z.boolean().default(true),
});

export const organicFoodConfigSchema = z.object({
  originLocation: z.string().default("সুন্দরবন ও খাঁটি লোকাল খামার"),
  freshnessGuarantee: z.string().default("শতভাগ খাঁটি ও ভেজালমুক্ত"),
  minimumOrderWeight: z.string().default("৫০০ গ্রাম"),
});

export type ThemeArchetype = z.infer<typeof themeArchetypeSchema>;
export type ThemeTokens = z.infer<typeof themeTokensSchema>;
export type ViralFunnelConfig = z.infer<typeof viralFunnelConfigSchema>;
export type FashionStoreConfig = z.infer<typeof fashionStoreConfigSchema>;
export type TechGadgetConfig = z.infer<typeof techGadgetConfigSchema>;
export type OrganicFoodConfig = z.infer<typeof organicFoodConfigSchema>;

import { z } from "zod";
import { bdPhoneSchema, poishaSchema } from "./common.js";

export const deliveryZoneSchema = z.enum(["inside_dhaka", "sub_dhaka", "outside_dhaka"]);

export const orderItemInputSchema = z.object({
  productId: z.string().uuid(),
  variantId: z.string().uuid(),
  quantity: z.number().int().min(1).max(50),
});

export const checkoutOrderSchema = z.object({
  customerName: z.string().trim().min(2, "নাম কমপক্ষে ২ অক্ষরের হতে হবে").max(120),
  phone: bdPhoneSchema,
  deliveryZone: deliveryZoneSchema,
  deliveryDistrict: z.string().trim().min(2, "জেলা নির্বাচন করুন").max(60),
  deliveryThana: z.string().trim().max(60).optional(),
  deliveryAddress: z.string().trim().min(5, "সম্পূর্ণ ঠিকানা লিখুন (রোড, বাড়ি নম্বর, এলাকা)").max(500),
  customerNote: z.string().trim().max(300).optional(),
  
  items: z.array(orderItemInputSchema).min(1, "অন্তত একটি পণ্য নির্বাচন করুন"),

  // Advance delivery charge if paid upfront
  advancePaymentMethod: z.enum(["bkash_personal", "nagad_personal", "bkash_merchant"]).optional(),
  advanceSenderPhone: bdPhoneSchema.optional(),
  advanceTrxId: z.string().trim().min(4).max(60).optional(),

  // Tracking context for Meta Conversions API (CAPI) deduplication
  fbc: z.string().optional(),
  fbp: z.string().optional(),
  eventId: z.string().optional(),
});

export const callStatusSchema = z.enum([
  "pending",
  "confirmed",
  "no_answer_1",
  "no_answer_2",
  "no_answer_3",
  "wrong_number",
  "cancelled_by_customer",
  "advance_required",
]);

export const updateCallStatusSchema = z.object({
  callStatus: callStatusSchema,
  callNotes: z.string().max(500).optional(),
});

export const verifyAdvancePaymentSchema = z.object({
  advanceMethod: z.enum(["bkash_personal", "nagad_personal", "bkash_merchant"]),
  advanceSenderPhone: bdPhoneSchema,
  advanceTrxId: z.string().trim().min(4).max(60),
  advanceAmount: poishaSchema,
  isVerified: z.boolean().default(true),
});

export const orderStatusSchema = z.enum([
  "pending",
  "confirmed",
  "processing",
  "shipped",
  "delivered",
  "returned",
  "cancelled",
]);

export const updateOrderStatusSchema = z.object({
  status: orderStatusSchema,
  note: z.string().max(300).optional(),
});

export type DeliveryZone = z.infer<typeof deliveryZoneSchema>;
export type CheckoutOrderInput = z.infer<typeof checkoutOrderSchema>;
export type CallStatus = z.infer<typeof callStatusSchema>;
export type UpdateCallStatusInput = z.infer<typeof updateCallStatusSchema>;
export type VerifyAdvancePaymentInput = z.infer<typeof verifyAdvancePaymentSchema>;
export type OrderStatus = z.infer<typeof orderStatusSchema>;

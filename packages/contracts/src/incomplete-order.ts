import { z } from "zod";
import { bdPhoneSchema } from "./common.js";

export const captureIncompleteOrderSchema = z.object({
  phone: bdPhoneSchema,
  customerName: z.string().trim().max(120).optional(),
  deliveryDistrict: z.string().trim().max(60).optional(),
  deliveryAddress: z.string().trim().max(500).optional(),
  items: z.array(z.object({
    productId: z.string().uuid(),
    variantId: z.string().uuid(),
    title: z.string(),
    price: z.number().int(),
    quantity: z.number().int().default(1),
  })).default([]),
  estimatedAmount: z.number().int().min(0).default(0),
  lastStep: z.enum(["phone_entered", "address_entered", "submit_failed"]).default("phone_entered"),
});

export const updateIncompleteOrderSchema = z.object({
  status: z.enum(["abandoned", "called", "recovered", "dropped"]),
  notes: z.string().max(500).optional(),
});

/**
 * Generate 1-click WhatsApp message link to recover abandoned shopper
 */
export function generateWhatsappRecoveryUrl(params: {
  phone: string;
  customerName?: string;
  productTitles: string[];
  storeName: string;
}): string {
  // Strip +88 for WhatsApp international link format
  const cleanPhone = params.phone.replace(/^\+/, "");
  const nameGreeting = params.customerName ? ` ${params.customerName}` : "";
  const products = params.productTitles.join(", ");

  const text = encodeURIComponent(
    `আসসালামু আলাইকুম${nameGreeting}। আপনি ${params.storeName} থেকে "${products}" অর্ডার করতে চেয়েছিলেন কিন্তু সম্পন্ন হয়নি। অর্ডারটি কনফার্ম করতে অথবা কোনো সাহায্য লাগলে আমাদের জানান। ধন্যবাদ!`
  );

  return `https://wa.me/${cleanPhone}?text=${text}`;
}

export type CaptureIncompleteOrderInput = z.infer<typeof captureIncompleteOrderSchema>;
export type UpdateIncompleteOrderInput = z.infer<typeof updateIncompleteOrderSchema>;

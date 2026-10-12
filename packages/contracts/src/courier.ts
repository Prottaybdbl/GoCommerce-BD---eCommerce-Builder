import { z } from "zod";
import { poishaToBdt } from "./common.js";

export const courierProviderSchema = z.enum(["steadfast", "pathao", "redx"]);

export const bookCourierParcelSchema = z.object({
  orderId: z.string().uuid(),
  courierProvider: courierProviderSchema,
  pickupAddress: z.string().optional(),
  note: z.string().max(200).optional(),
});

/**
 * Standard Steadfast Bulk Upload CSV Row format:
 * Invoice, Name, Phone, Address, Cod Amount, Note
 */
export interface SteadfastCsvRow {
  Invoice: string;
  Name: string;
  Address: string;
  Phone: string;
  Amount: number; // COD amount in BDT
  Note?: string;
}

/**
 * Standard Pathao Bulk Upload CSV Row format
 */
export interface PathaoCsvRow {
  MerchantOrderId: string;
  RecipientName: string;
  RecipientPhone: string;
  RecipientAddress: string;
  RecipientCity: string;
  RecipientZone: string;
  AmountToCollect: number; // COD in BDT
  ItemQuantity: number;
  ItemDescription?: string;
}

export function formatOrderToSteadfastCsvRow(order: {
  orderNumber: number;
  customerName: string;
  phone: string;
  deliveryAddress: string;
  deliveryDistrict: string;
  totalAmount: number; // in poisha
  advanceVerified: boolean;
  advanceAmount: number;
  customerNote?: string | null;
}): SteadfastCsvRow {
  const codAmountPoisha = order.advanceVerified
    ? Math.max(0, order.totalAmount - order.advanceAmount)
    : order.totalAmount;

  return {
    Invoice: `#${order.orderNumber}`,
    Name: order.customerName,
    Phone: order.phone.replace(/^\+88/, ""), // Steadfast expects 01XXXXXXXXX
    Address: `${order.deliveryAddress}, ${order.deliveryDistrict}`,
    Amount: poishaToBdt(codAmountPoisha),
    Note: order.customerNote || "Please handle with care",
  };
}

export const courierRemittanceStatusSchema = z.enum(["pending", "received", "disputed"]);

export type CourierProvider = z.infer<typeof courierProviderSchema>;
export type BookCourierParcelInput = z.infer<typeof bookCourierParcelSchema>;
export type CourierRemittanceStatus = z.infer<typeof courierRemittanceStatusSchema>;

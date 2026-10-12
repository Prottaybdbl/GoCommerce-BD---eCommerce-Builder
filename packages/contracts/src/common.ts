import { z } from "zod";
import {
  convertBanglaToAsciiDigits,
  bdPhoneRegex,
  poishaToBdt,
  bdtToPoisha,
  formatBdt,
} from "./utils.js";

export * from "./utils.js";

export const bdPhoneSchema = z
  .string()
  .trim()
  .transform((val) => convertBanglaToAsciiDigits(val).replace(/[\s\-()]/g, ""))
  .refine((val) => bdPhoneRegex.test(val), {
    message: "সঠিক ১১ ডিজিটের বাংলাদেশি মোবাইল নম্বর প্রদান করুন (যেমন: 017XXXXXXXX বা ০১৭XXXXXXXX)",
  })
  .transform((val) => {
    const match = val.match(bdPhoneRegex);
    return match ? `+88${match[1]}` : val;
  });

export const poishaSchema = z
  .number()
  .int()
  .min(0, "Amount cannot be negative");

export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const apiResponseSchema = <T extends z.ZodTypeAny>(dataSchema: T) =>
  z.object({
    success: z.boolean(),
    data: dataSchema.optional(),
    message: z.string().optional(),
    error: z.string().optional(),
  });

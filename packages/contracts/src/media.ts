import { z } from "zod";

export const mediaContentTypeSchema = z.enum(["image/webp", "image/jpeg", "image/png"]);
export type MediaContentType = z.infer<typeof mediaContentTypeSchema>;

export const mediaFolderSchema = z.enum(["products", "logos", "themes"]);
export type MediaFolder = z.infer<typeof mediaFolderSchema>;

export const presignMediaRequestSchema = z.object({
  filename: z.string().min(1).max(255),
  contentType: mediaContentTypeSchema.default("image/webp"),
  folder: mediaFolderSchema.default("products"),
});
export type PresignMediaRequest = z.infer<typeof presignMediaRequestSchema>;

export const presignedTargetSchema = z.object({
  width: z.number().int().positive(),
  key: z.string().min(1),
  uploadUrl: z.string().url(),
  publicUrl: z.string().url(),
});
export type PresignedTarget = z.infer<typeof presignedTargetSchema>;

export const presignMediaResponseSchema = z.object({
  uploadId: z.string().uuid(),
  urls: z.object({
    small: presignedTargetSchema,   // 360px width
    medium: presignedTargetSchema,  // 720px width
    large: presignedTargetSchema,   // 1080px width
  }),
});
export type PresignMediaResponse = z.infer<typeof presignMediaResponseSchema>;

export const verifyMediaRequestSchema = z.object({
  keys: z.array(z.string().min(1)).min(1).max(10),
});
export type VerifyMediaRequest = z.infer<typeof verifyMediaRequestSchema>;

export const verifiedMediaObjectSchema = z.object({
  key: z.string(),
  size: z.number().int().nonnegative(),
  contentType: z.string(),
  publicUrl: z.string().url(),
});
export type VerifiedMediaObject = z.infer<typeof verifiedMediaObjectSchema>;

export const verifyMediaResponseSchema = z.object({
  verified: z.boolean(),
  objects: z.array(verifiedMediaObjectSchema),
});
export type VerifyMediaResponse = z.infer<typeof verifyMediaResponseSchema>;

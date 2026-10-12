import * as announcement_bar from "./sections/announcement_bar/index.js";
import * as header from "./sections/header/index.js";
import * as banner_carousel from "./sections/banner_carousel/index.js";
import * as hero_product from "./sections/hero_product/index.js";
import * as features_list from "./sections/features_list/index.js";
import * as video_showcase from "./sections/video_showcase/index.js";
import * as specs_table from "./sections/specs_table/index.js";
import * as origin_badge from "./sections/origin_badge/index.js";
import * as trust_badges from "./sections/trust_badges/index.js";
import * as inline_checkout from "./sections/inline_checkout/index.js";
import * as sticky_bottom_bar from "./sections/sticky_bottom_bar/index.js";
import * as faq_accordion from "./sections/faq_accordion/index.js";

export const SECTION_REGISTRY = {
  announcement_bar,
  header,
  banner_carousel,
  hero_product,
  features_list,
  video_showcase,
  specs_table,
  origin_badge,
  trust_badges,
  inline_checkout,
  sticky_bottom_bar,
  faq_accordion,
} as const;

export type SectionType = keyof typeof SECTION_REGISTRY;

export function getSectionMeta(type: string) {
  const entry = (SECTION_REGISTRY as Record<string, any>)[type];
  return entry?.meta;
}

export function getSectionSchema(type: string) {
  const entry = (SECTION_REGISTRY as Record<string, any>)[type];
  return entry?.schema;
}

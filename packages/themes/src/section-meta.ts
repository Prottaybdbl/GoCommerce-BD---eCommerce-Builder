/**
 * Section metadata — the non-schema half of a section definition (report §3.6).
 *
 * `schema.ts` says what a section's settings ARE. `meta.ts` says how the
 * section behaves on a page: whether it breaks out of the shell container,
 * which visual variants it ships, how many may appear, and which entitlement
 * gates it.
 */
export type SectionCategory =
  | "promo"
  | "header"
  | "hero"
  | "content"
  | "social_proof"
  | "commerce"
  | "footer";

export interface SectionMeta {
  type: string;
  name: string;
  banglaName: string;
  description: string;
  category: SectionCategory;
  /**
   * Renders edge-to-edge. The page shell lifts these OUT of the max-width
   * container instead of hard-coding a list of section types (report §4.4).
   */
  fullWidth: boolean;
  /**
   * Visual variants. All variants of a section share identical DOM and are
   * switched purely by the `data-variant` attribute in CSS (report §3.4), so
   * adding a variant costs bytes of CSS, not a new component.
   */
  variants: string[];
  defaultVariant: string;
  /** How many instances of this section one page may hold. */
  maxPerPage: number;
  /** Entitlement required to use the section at all, e.g. "shop". */
  requiredFeature?: string;
  /** Pinned position: these never move in the page order. */
  pinned?: "top" | "bottom";
}

/**
 * Page Shells — defining the layout container proportions (Report §4.4)
 *
 * Emits CSS custom properties (--gc-max, --gc-gutter, --gc-rhythm) so that
 * page shells cost zero excess layout components and avoid the single-column
 * hard ceiling on visual variety.
 */

export interface ShellDefinition {
  id: string;
  maxWidth: string;
  gutter: string;
  rhythm: string;
  sidebar?: string;
}

export const SHELLS = {
  "single-column": {
    id: "single-column",
    maxWidth: "48rem",
    gutter: "1rem",
    rhythm: "1.5rem",
  },
  "narrow-funnel": {
    id: "narrow-funnel",
    maxWidth: "34rem",
    gutter: "1rem",
    rhythm: "1rem",
  },
  "wide-editorial": {
    id: "wide-editorial",
    maxWidth: "72rem",
    gutter: "1.5rem",
    rhythm: "2.5rem",
  },
  "full-bleed": {
    id: "full-bleed",
    maxWidth: "100%",
    gutter: "0",
    rhythm: "0",
  },
  "shop-grid": {
    id: "shop-grid",
    maxWidth: "80rem",
    gutter: "1.5rem",
    rhythm: "2rem",
  },
  "shop-sidebar": {
    id: "shop-sidebar",
    maxWidth: "80rem",
    gutter: "1.5rem",
    rhythm: "2rem",
    sidebar: "16rem",
  },
} as const;

export type ShellType = keyof typeof SHELLS;
export type PageShell = ShellDefinition;

export function getShell(id?: string): ShellDefinition {
  if (id && id in SHELLS) {
    return SHELLS[id as ShellType];
  }
  return SHELLS["single-column"];
}

import type { ThemeArchetype } from "@gocom/contracts";
export type { SectionType } from "./registry.js";
import type { SectionType } from "./registry.js";

export interface DesignPreset {
  id: string;
  name: string;
  banglaName: string;
  primaryColor: string; // Brand accent e.g. #E11D48
  secondaryColor: string; // Supporting color e.g. #0F172A
  accentColor: string; // Highlights/Badges e.g. #10B981
  backgroundColor: string; // Background e.g. #F8FAFC
  surfaceColor: string; // Cards e.g. #FFFFFF
  textColor: string; // Text e.g. #0F172A
  mutedTextColor: string; // Secondary text e.g. #64748B
  borderColor: string; // Borders e.g. #E2E8F0
  borderRadius: string; // e.g. 1rem
  fontFamily: string; // e.g. 'Hind Siliguri', sans-serif
}

export interface SectionLocks {
  removable?: boolean;
  movable?: boolean;
  duplicable?: boolean;
  variantLocked?: boolean;
}

export interface FieldConstraint {
  min?: number;
  max?: number;
  hidden?: boolean;
  readOnly?: boolean;
}

export interface SectionInstance {
  id: string;
  type: SectionType;
  variant?: string;
  enabled: boolean;
  settings: Record<string, any>;
  locks?: SectionLocks;
  constraints?: Record<string, FieldConstraint>;
  requiresFeature?: string[];
  whenMissing?: "hide" | "downgrade" | "upsell";
  downgradeTo?: string;
}

export interface PageDefinition {
  kind: "landing" | "home" | "product" | "collection" | "cart" | "custom";
  title: string;
  shell?: string;
  variants?: Record<string, { label: string; sectionIds: string[] }>;
  sections: SectionInstance[];
}

export interface ThemeTemplate {
  id: string;
  version?: number;
  tier?: "landing" | "shop";
  archetype: ThemeArchetype | string;
  name: string;
  banglaName: string;
  description: string;
  banglaDescription?: string;
  defaultPreset: string; // preset ID
  allowedPresets?: string[];
  shell?: string;
  tags?: string[];
  bestFor?: string[];
  requiresFeature?: string[];
  sections: SectionInstance[];
  pages?: Record<string, PageDefinition>;
}

export interface ResolvedTheme {
  templateId?: string;
  templateVersion?: number;
  archetype: ThemeArchetype | string;
  tier?: "landing" | "shop";
  manifest?: any;
  template: ThemeTemplate;
  preset: DesignPreset;
  shell: any;
  sections: SectionInstance[];
  page?: string;
}


import type { UiField } from "@gocom/themes";

export interface FieldControlProps {
  field: UiField;
  value: any;
  onChange: (value: any) => void;
  language?: "bn" | "en";
  allValues?: Record<string, any>;
}

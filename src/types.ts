export type Row = Record<string, unknown>;

export type ColType = "integer" | "number" | "boolean" | "date" | "datetime" | "string";

export interface ColumnStats {
  name: string;
  type: ColType;
  count: number; // non-null values
  nulls: number;
  unique: number; // exact if <= sample limit, else approximate flag
  uniqueApprox: boolean;
  // numeric
  min?: number;
  max?: number;
  mean?: number;
  median?: number;
  std?: number;
  histogram?: { bins: number[]; counts: number[] }; // bins length = counts length + 1
  // categorical / string
  top?: { value: string; count: number }[];
  // dates stored as epoch ms in min/max when type is date/datetime
  minLabel?: string;
  maxLabel?: string;
}

export interface Dataset {
  columns: string[];
  types: Record<string, ColType>;
  rows: Row[];
  stats: ColumnStats[];
  rowCount: number; // rows actually loaded
  totalRowCount?: number; // total in source if known and larger (truncated)
  truncated: boolean;
  source: string;
  format: string;
}

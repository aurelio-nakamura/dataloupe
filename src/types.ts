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

/**
 * Reproducibility metadata embedded in a generated report so a recipient can
 * verify exactly what produced it: the content hash of the source data, its
 * size, the tool that generated the report, and the ordered operations applied.
 * Everything here travels inside the self-contained HTML file.
 */
export interface Provenance {
  /** Lowercase hex SHA-256 of the raw source bytes (data integrity / dedup). */
  sha256?: string;
  /** Size of the source in bytes. */
  sourceBytes?: number;
  /** Human-readable name of the tool that produced the report. */
  tool?: string;
  /** Ordered, human-readable operations applied to produce this report. */
  steps?: string[];
}

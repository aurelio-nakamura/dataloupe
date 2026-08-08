import { datasetFromRows } from "./dataset-core.js";
import type { Dataset } from "./types.js";
import { parseFile, type ParseOptions } from "./parse.js";

// Re-export the browser-safe core (datasetFromRows, buildDatasetFromText, DatasetMeta).
export { datasetFromRows, buildDatasetFromText } from "./dataset-core.js";
export type { DatasetMeta } from "./dataset-core.js";

/**
 * Build a fully-analyzed {@link Dataset} from a data file
 * (CSV, TSV, JSON, NDJSON/JSONL, Parquet, or Excel `.xlsx`).
 */
export async function buildDataset(path: string, opts: ParseOptions = {}): Promise<Dataset> {
  const { rows, format, totalRowCount, truncated } = await parseFile(path, opts);
  return datasetFromRows(rows, { format, source: path, totalRowCount, truncated });
}

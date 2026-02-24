/**
 * @certifieddata/schema-gen
 *
 * Generate CertifiedData.io dataset manifest scaffolding from a field map.
 *
 * This does NOT issue or sign certificates. It produces the schema portion
 * of a manifest that you upload to CertifiedData.io for certification.
 *
 * Quick start:
 *
 *   import { generateManifestScaffold } from "@certifieddata/schema-gen";
 *
 *   const scaffold = generateManifestScaffold({
 *     datasetName: "transactions",
 *     rowCount: 100_000,
 *     fields: [
 *       { name: "id",         type: "uuid",    unique: true },
 *       { name: "amount",     type: "float",   nullable: false },
 *       { name: "currency",   type: "enum",    values: ["USD","EUR","GBP"] },
 *       { name: "created_at", type: "datetime" },
 *     ],
 *   });
 *
 *   console.log(JSON.stringify(scaffold, null, 2));
 */

export type { FieldSpec, FieldType, SchemaGenInput, ManifestScaffold } from "./types.js";
import type { SchemaGenInput, ManifestScaffold } from "./types.js";

export function generateManifestScaffold(input: SchemaGenInput): ManifestScaffold {
  return {
    dataset_name: input.datasetName,
    description: input.description,
    row_count: input.rowCount,
    columns: input.fields.map((f) => ({
      name: f.name,
      type: f.type,
      nullable: f.nullable ?? false,
      unique: f.unique ?? false,
      description: f.description,
      values: f.values,
      cardinality: f.cardinality,
    })),
    generated_at: new Date().toISOString(),
  };
}

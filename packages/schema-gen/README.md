# @certifieddata/schema-gen

Generate CertifiedData.io dataset manifest scaffolding from field maps.

Use this to produce the schema portion of a manifest before uploading to CertifiedData.io
for certification. Does NOT issue or sign certificates.

## Install

```bash
npm install @certifieddata/schema-gen
# or globally for CLI use:
npm install -g @certifieddata/schema-gen
```

## Library usage

```ts
import { generateManifestScaffold } from "@certifieddata/schema-gen";

const scaffold = generateManifestScaffold({
  datasetName: "transactions",
  rowCount: 100_000,
  fields: [
    { name: "id",         type: "uuid",    unique: true },
    { name: "amount",     type: "float",   nullable: false },
    { name: "currency",   type: "enum",    values: ["USD", "EUR", "GBP"] },
    { name: "status",     type: "enum",    values: ["pending", "settled", "failed"] },
    { name: "created_at", type: "datetime" },
  ],
});

console.log(JSON.stringify(scaffold, null, 2));
```

Output:
```json
{
  "dataset_name": "transactions",
  "row_count": 100000,
  "columns": [
    { "name": "id",         "type": "uuid",    "nullable": false, "unique": true },
    { "name": "amount",     "type": "float",   "nullable": false, "unique": false },
    { "name": "currency",   "type": "enum",    "nullable": false, "unique": false, "values": ["USD", "EUR", "GBP"] },
    { "name": "status",     "type": "enum",    "nullable": false, "unique": false, "values": ["pending", "settled", "failed"] },
    { "name": "created_at", "type": "datetime","nullable": false, "unique": false }
  ],
  "generated_at": "2026-02-22T00:00:00.000Z"
}
```

## CLI usage

```bash
sdaas-schema-gen \
  --name transactions \
  --rows 100000 \
  --fields "id:uuid,amount:float,currency:enum:USD|EUR|GBP,created_at:datetime"
```

Flags:
- `--name` — Dataset name (required)
- `--fields` — Comma-separated `name:type` or `name:enum:val1|val2|val3`
- `--rows` — Approximate row count
- `--out` — Write to file instead of stdout

## Supported field types

`string`, `integer`, `float`, `boolean`, `date`, `datetime`, `uuid`, `email`, `phone`, `enum`, `text`

## License

MIT

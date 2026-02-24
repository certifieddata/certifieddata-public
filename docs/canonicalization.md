# Payload Canonicalization

Before signing or verifying a certificate, the payload must be serialized to a canonical byte sequence. This ensures that two implementations independently produce the same bytes from the same JSON object.

---

## Algorithm

```
canonical_bytes = UTF8_encode(json_stable_stringify(strip_undefined(payload)))
```

### Step 1: Strip undefined / null values

Remove all keys whose value is `undefined` (or `null` if you want maximum compatibility). This prevents signed payloads from varying based on whether optional fields are omitted vs. explicitly set to `null`.

### Step 2: Stable JSON serialization

Serialize the object using **deterministic key ordering** (alphabetical, recursive). Do NOT use `JSON.stringify()` directly — its key order is insertion-order-dependent.

Use the [`json-stable-stringify`](https://www.npmjs.com/package/json-stable-stringify) package:

```bash
npm install json-stable-stringify
```

```typescript
import stableStringify from "json-stable-stringify";

function stripUndefined(obj: unknown): unknown {
  if (obj === null || obj === undefined) return undefined;
  if (Array.isArray(obj)) return obj.map(stripUndefined).filter((v) => v !== undefined);
  if (typeof obj === "object") {
    return Object.fromEntries(
      Object.entries(obj as Record<string, unknown>)
        .filter(([, v]) => v !== undefined)
        .map(([k, v]) => [k, stripUndefined(v)])
    );
  }
  return obj;
}

function canonicalPayloadBytes(payload: unknown): Uint8Array {
  const stripped = stripUndefined(payload);
  const json = stableStringify(stripped) ?? "{}";
  return new TextEncoder().encode(json);
}
```

### Step 3: UTF-8 encode

The resulting JSON string is encoded to `Uint8Array` using UTF-8. This byte sequence is what is passed to the Ed25519 signing or verification function.

---

## Why not RFC 8785 (JCS)?

RFC 8785 (JSON Canonicalization Scheme) is more rigorous but requires a dedicated library. The CertifiedData.io format uses `json-stable-stringify` because:

- It is simpler to implement independently in any language
- It is already the de facto standard for deterministic JSON in the JS/TS ecosystem
- The public verification packages (`@certifieddata/verify`, Python verifier) implement this same algorithm

If RFC 8785 compatibility is needed in a future schema version, it will be introduced with a new `schema_version` field value.

---

## Reference Implementations

**TypeScript** (`packages/verify/src/canon.ts`):
```typescript
import stableStringify from "json-stable-stringify";

export function canonicalPayloadBytes(payload: unknown): Uint8Array {
  const stripped = stripUndefined(payload);
  const json = stableStringify(stripped) ?? "{}";
  return new TextEncoder().encode(json);
}
```

**Python** (`examples/python-verify/verify.py`):
```python
import json

def canonical_bytes(payload: dict) -> bytes:
    def strip(v):
        if isinstance(v, dict):
            return {k: strip(val) for k, val in v.items() if val is not None}
        if isinstance(v, list):
            return [strip(i) for i in v]
        return v
    return json.dumps(strip(payload), sort_keys=True, separators=(',', ':')).encode('utf-8')
```

---

## Verification Checklist

When implementing your own verifier, confirm:

- [ ] Keys are sorted alphabetically (not insertion order)
- [ ] No `undefined` or `null` values remain in the payload
- [ ] Output is a UTF-8 byte sequence (not a UTF-16 or base64 string)
- [ ] The exact same bytes are produced server-side and client-side
- [ ] You verify against the `payload` field of the manifest envelope, not the full envelope

---

## See Also

- [Manifest Format](./manifest-format.md)
- [Key Rotation](./key-rotation.md)
- [`@certifieddata/verify` package](../packages/verify/)

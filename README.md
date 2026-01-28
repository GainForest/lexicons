# ATProto Lexicons

This repository contains ATProto lexicon schemas for the **Hypersphere ecosystem** - GainForest's AT Protocol infrastructure for environmental impact tracking and decentralized data.

## Hypersphere Ecosystem

| Component | Description | URL |
|-----------|-------------|-----|
| **Hypergoat** | AT Protocol AppView - indexes lexicons and exposes them via GraphQL | [hypergoat.vercel.app](https://hypergoat.vercel.app) |
| **Impact Indexer** | Hypersphere Explorer - real-time visualization and data explorer | [impactindexer.org](https://impactindexer.org) |
| **Governance** | Feature requests and Lexicon Indexing Requests (LIRs) | [hypersphere-issues](https://github.com/GainForest/hypersphere-issues) |

## Structure

```
lexicons/
  app/
    bsky/
      richtext/         # Bluesky richtext facet (for compatibility)
    gainforest/
      common/           # Shared definitions (blobs, images, URIs)
      dwc/              # Darwin Core biodiversity records
      evaluator/        # Decentralized evaluator services
      organization/     # Organization-related schemas
        observations/   # Observation records (dendogram, fauna, flora, trees)
        predictions/    # Prediction records (fauna, flora)
  com/
    atproto/
      repo/             # Standard ATProto references
  org/
    impactindexer/
      review/           # Review system (comments, likes) for AT-Proto entities
  pub/
    leaflet/            # Leaflet document schemas
      blocks/           # Content block types (text, image, code, etc.)
      pages/            # Page/document compositions
      richtext/         # Rich text annotations (facets)
```

## Namespaces

### `app.gainforest.common`

Shared type definitions used across other lexicons:

- `uri` - Object containing a URI reference
- `smallBlob` / `largeBlob` - Generic blob references (10MB / 100MB)
- `smallImage` / `largeImage` - Image blobs (5MB / 10MB, JPEG/PNG/WebP)
- `indexedOrganization` - Organization identity object

### `app.gainforest.dwc`

Darwin Core (DwC) aligned biodiversity records following the [TDWG Simple Darwin Core standard](https://dwc.tdwg.org/simple/). Uses a star-schema pattern where occurrences reference shared events.

| Lexicon | Type | Description |
|---------|------|-------------|
| `dwc.defs` | defs | Shared types: geolocation, taxonIdentification, enums (basisOfRecord, sex, taxonRank, etc.) |
| `dwc.event` | record | Sampling/collecting event with location, protocol, and effort metadata |
| `dwc.occurrence` | record | Single organism observation at a place and time |
| `dwc.measurement` | record | MeasurementOrFact extension linked to an occurrence (DBH, height, etc.) |

**Relationships:**
- Multiple `occurrence` records can reference one `event` via `eventRef` (AT-URI)
- Multiple `measurement` records can reference one `occurrence` via `occurrenceRef` (AT-URI)

### `app.gainforest.evaluator`

Decentralized evaluator services for attaching structured, typed evaluation data to records. A more sophisticated evolution of the [Bluesky labeler pattern](https://docs.bsky.app/docs/advanced-guides/moderation) -- instead of string labels, evaluators produce typed results with confidence scores and method provenance.

| Lexicon | Type | Description |
|---------|------|-------------|
| `evaluator.defs` | defs | Shared types: subjectRef, methodInfo, candidateTaxon, qualityFlag, derivedMeasurement, and result types (speciesId, dataQuality, verification, classification, measurement) |
| `evaluator.service` | record | Declaration record (rkey `self`) registering an account as an evaluator with policies, supported types, and subject collections |
| `evaluator.evaluation` | record | Evaluation result published by an evaluator — typed result union, confidence, method provenance, negation/supersedes versioning |
| `evaluator.subscription` | record | User subscribes to an evaluator — published in user's own repo, with optional collection/type filters |

**Discovery:** Uses ATProto-native HTTP header injection (like labelers):
- Client sends `atproto-accept-evaluators: did:plc:eval1,did:plc:eval2`
- AppView attaches matching evaluations inline in responses under an `evaluations` key
- AppView responds with `atproto-content-evaluators` header confirming resolved evaluators

**Processing:** Evaluators watch the Jetstream firehose for subscriber records and matching subject collections, then publish evaluation records to their own repo.

**Result types:** `speciesIdResult` (ranked candidate taxa), `dataQualityResult` (per-field quality flags), `verificationResult` (expert confirm/reject), `classificationResult` (generic categories), `measurementResult` (derived measurements).

**Extending with new result types:**

1. **Experimental** — Use the `dynamicProperties` field (JSON string) on the evaluation record to prototype new result structures without any schema change. Omit `result` and put your data in `dynamicProperties`:
   ```json
   {
     "evaluationType": "my-new-type",
     "dynamicProperties": "{\"myField\": \"value\", \"score\": 42}",
     "confidence": 850,
     "createdAt": "2025-01-25T00:00:00.000Z"
   }
   ```

2. **Formal** — Once the type stabilizes, define it in `evaluator/defs.json` and add its ref to the `result` union in `evaluator/evaluation.json`, then re-publish with `goat lex publish --update`. ATProto unions are open by default, so existing clients that don't recognize the new `$type` will skip it gracefully.

### `app.gainforest.organization`

Organization profiles, site configurations, and biodiversity data:

- `info` - Organization profile information
- `defaultSite` - Default site configuration
- `layer` - Map layer definitions
- `getIndexedOrganizations` - Query for indexed organizations
- `observations/` - Observation records (dendogram, fauna, flora, measuredTreesCluster)
- `predictions/` - Prediction records (fauna, flora)

### `pub.leaflet`

Leaflet document schemas for structured content authoring:

- **blocks/** - Content block types: text, header, image, code, math, blockquote, iframe, button, poll, page, bskyPost, horizontalRule, unorderedList, website
- **pages/** - Document compositions (`linearDocument` - ordered sequence of blocks with alignment)
- **richtext/** - Text annotation via facets (bold, italic, underline, strikethrough, code, highlight, links, mentions)

### `com.atproto.repo`

Standard ATProto strong reference type (`strongRef`).

### `org.impactindexer.review`

Review system for AT-Proto entities, enabling comments and likes on records, users, PDSes, and lexicons. Used by [Impact Indexer](https://impactindexer.org) to provide community feedback and engagement.

| Lexicon | Type | Description |
|---------|------|-------------|
| `review.defs` | defs | Shared types: `subjectRef` (URI + type + optional CID), `subjectType` enum (record, user, pds, lexicon) |
| `review.comment` | record | Text comment on a subject with optional threaded replies |
| `review.like` | record | Like on a subject (one per user per subject) |

**Subject Types:**
- `record` - AT-URI of a specific record (`at://did/collection/rkey`)
- `user` - DID of a user (`did:plc:xxx`)
- `pds` - Hostname of a PDS (`example.com`)
- `lexicon` - NSID of a lexicon (`app.bsky.feed.post`)

## Publishing Lexicons

### Prerequisites

1. **Install goat** - The AT Protocol CLI tool:
   ```bash
   # macOS
   brew install goat
   
   # Or build from source
   go install github.com/bluesky-social/goat@latest
   ```

2. **Login to your ATProto account**:
   ```bash
   goat account login -u your-handle.bsky.social -p your-app-password
   ```
   > Use an [app password](https://bsky.app/settings/app-passwords), not your main password.

### Step 1: Configure DNS

Each lexicon namespace requires a DNS TXT record to prove ownership. The record maps the namespace to your account's DID.

**Find your DID:**
```bash
goat resolve your-handle.bsky.social
```

**Add DNS TXT records** for each NSID group (first 3 segments of the NSID):

| NSID Pattern | DNS Record | Value |
|--------------|------------|-------|
| `app.gainforest.common.*` | `_lexicon.common.gainforest.app` | `did=did:plc:xxxxx` |
| `app.gainforest.dwc.*` | `_lexicon.dwc.gainforest.app` | `did=did:plc:xxxxx` |
| `app.gainforest.evaluator.*` | `_lexicon.evaluator.gainforest.app` | `did=did:plc:xxxxx` |
| `app.gainforest.organization.*` | `_lexicon.organization.gainforest.app` | `did=did:plc:xxxxx` |
| `app.gainforest.organization.observations.*` | `_lexicon.observations.organization.gainforest.app` | `did=did:plc:xxxxx` |
| `app.gainforest.organization.predictions.*` | `_lexicon.predictions.organization.gainforest.app` | `did=did:plc:xxxxx` |
| `org.impactindexer.review.*` | `_lexicon.review.impactindexer.org` | `did=did:plc:xxxxx` |
| `pub.leaflet.blocks.*` | `_lexicon.blocks.leaflet.pub` | `did=did:plc:xxxxx` |
| `pub.leaflet.pages.*` | `_lexicon.pages.leaflet.pub` | `did=did:plc:xxxxx` |
| `pub.leaflet.richtext.*` | `_lexicon.richtext.leaflet.pub` | `did=did:plc:xxxxx` |

**DNS Provider Notes:**
- In most DNS providers, enter only the subdomain part (e.g., `_lexicon.common` for Namecheap)
- The domain is reversed from the NSID (e.g., `app.gainforest.common` → `common.gainforest.app`)
- DNS propagation can take 5-30 minutes

### Step 2: Verify DNS Configuration

```bash
# Check if DNS records are configured correctly
goat lex check-dns

# Or check specific lexicons
goat lex check-dns lexicons/app/gainforest/
```

You can also verify manually:
```bash
dig TXT _lexicon.organization.gainforest.app +short
# Should return: "did=did:plc:xxxxx"
```

### Step 3: Lint Lexicons

Before publishing, validate your lexicon schemas:

```bash
goat lex lint

# Or lint specific files
goat lex lint lexicons/app/gainforest/
```

### Step 4: Check Status

See which lexicons are new, modified, or already published:

```bash
goat lex status
```

**Status indicators:**
- `🟢` - New (not yet published)
- `🟠` - Already published (no changes)
- `🟣` - Updated (will be modified)

### Step 5: Publish

```bash
# Publish all lexicons
goat lex publish

# Publish specific namespace
goat lex publish lexicons/app/gainforest/

# Skip DNS check (if DNS is configured but not yet propagated)
goat lex publish --skip-dns-check

# Update existing lexicons
goat lex publish --update
```

**Publish indicators:**
- `🟢` - Successfully published (new)
- `🟣` - Successfully updated
- `🟠` - Skipped (already exists, use `--update` to modify)
- `⭕` - Skipped (DNS not configured for this namespace)

## Verifying Published Lexicons

After publishing, verify your lexicons are accessible:

```bash
# List all lexicon schemas in your account
goat ls -c your-handle.bsky.social | grep lexicon

# Fetch a specific lexicon
goat get at://your-handle.bsky.social/com.atproto.lexicon.schema/app.gainforest.organization.info
```

## Creating New Lexicons

1. **Create from template:**
   ```bash
   goat lex new record app.gainforest.myfeature.myrecord
   ```

2. **Edit the generated file** at `lexicons/app/gainforest/myfeature/myrecord.json`

3. **Lint, check DNS, and publish** as described above.

## Lexicon Types

- **record** - Data stored in user repositories (most common)
- **query** - Read-only API endpoint
- **procedure** - Write API endpoint
- **subscription** - Real-time event stream

## Resources

- [ATProto Lexicon Specification](https://atproto.com/specs/lexicon)
- [goat CLI Documentation](https://github.com/bluesky-social/goat)
- [Lexicon Examples](https://github.com/bluesky-social/atproto/tree/main/lexicons)
- [Darwin Core Standard](https://dwc.tdwg.org/)
- [Simple Darwin Core](https://dwc.tdwg.org/simple/)
- [GBIF Backbone Taxonomy](https://www.gbif.org/dataset/d7dddbf4-2cf0-4f39-9b2a-bb099caae36c)

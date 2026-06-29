# GainForest Hypersphere — Architecture & Lexicons

**A technical briefing for decentralized biodiversity data infrastructure**

This document is written for people who care about open, interoperable biodiversity data — specifically, what it would look like for species observations to be self-sovereign, portable, and not locked inside any single platform.

---

## What We Are Building

GainForest is an environmental tech nonprofit building infrastructure for conservation organizations, forest monitors, and field scientists to publish biodiversity data they own and control. We call this infrastructure the **Hypersphere**. It runs on the [AT Protocol](https://atproto.com) — the same decentralized protocol that powers Bluesky — with Darwin Core-aligned lexicons as the schema layer.

The core principle: a species observation is a record in a user's own repository, signed by their own DID, portable, and inspectable by anyone. When that observation is verified, it can back a **Bumicert** — a verifiable impact certificate — making the full chain from field sensor to financial instrument publicly auditable on open infrastructure.

---

## Infrastructure

### ePDS — Extended Personal Data Server

We run a fork of the official AT Protocol PDS called [ePDS](https://github.com/GainForest/ePDS). It wraps the standard PDS with a friendlier sign-up experience (email OTP, Google, GitHub). Field monitors in Brazil, Indonesia, and the Philippines get an AT Protocol identity and data repository without needing to understand the underlying protocol.

Observations, recordings, and tree measurements live in their own repository. The data is theirs.

### Tainá — Field Data Collection

[Tainá](https://github.com/GainForest/taina-app) is the field data collection tool — a Telegram bot and a React Native scaffold for offline-first recording. Field monitors use it to submit species observations with photos (vision AI assisted), schedule AudioMoth recorder deployments, and queue records for sync to their PDS.

### audiogoat — Bioacoustic CLI

[audiogoat](https://github.com/GainForest/audiogoat) is a Go CLI for batch AudioMoth processing: converts `.WAV` to FLAC, extracts timestamps from filenames, and uploads records as `app.gainforest.ac.audio` + `app.gainforest.ac.deployment` to the PDS.

### AT Protocol Indexer

The [gainforest-atproto-indexer](https://github.com/GainForest/gainforest-atproto-indexer) connects to a [Tap](https://github.com/bluesky-social/indigo/tree/main/cmd/tap) relay, filters events by lexicon NSID, validates records against schema, and stores them in PostgreSQL with a GraphQL API. It indexes across **all PDSes on the network**, not just our own — any DID publishing our lexicons is auto-discovered.

Indexed namespaces:

| Namespace | Collections |
|---|---|
| `app.gainforest.dwc.*` | `event`, `occurrence`, `measurement` |
| `app.gainforest.evaluator.*` | `evaluation`, `service`, `subscription` |
| `app.gainforest.organization.*` | `defaultSite`, `info`, `layer`, `observations.*`, `predictions.*` |
| `org.hypercerts.claim.*` | `activity`, `collection`, `contribution`, `evaluation`, `evidence`, `measurement`, `project`, `rights` |
| `org.impactindexer.review.*` | `comment`, `like` |

### Record Scorer

[gainforest-scorer](https://github.com/GainForest/gainforest-scorer) is a Go service that ingests ATProto records and blobs via Tap, evaluates them with AI, and stores scoring metadata in Postgres with a GraphQL API. Referenced blobs (images, audio) are fetched and scored independently. This is the layer where automated species identification happens before results are written back as `evaluator.evaluation` records.

### Bumiscan — Data Explorer

[Bumiscan](https://github.com/GainForest/gainforest-explorer) is a block explorer for the data commons: Darwin Core occurrences, conservation project sites, and Bumicerts. It surfaces records from the indexer GraphQL API.

### Bumicerts (GainForest App)

Bumicerts are verifiable impact certificates on ATProto. When a field monitor submits a verified observation, that observation can back a [Hypercert](https://hypercerts.org) — an on-chain impact claim. The connection matters: the underlying ATProto records (DID-signed, structured as `dwc.occurrence` + `ac.audio` + `evaluator.evaluation`) are the evidence layer. The full provenance chain is publicly inspectable by anyone, not just the issuer.

This is what "AI-evaluation ready" means in practice: because the schemas are open and published on ATProto, any evaluator — a research institution, an AI service, a community expert network — can attach typed assessments to the same records. The Bumicert's credibility is a function of its evaluator graph, not a single platform's trust model.

The [GainForest app](https://gainforest.app) unifies the Bumicerts marketplace, the live observation globe, and the ATProto data explorer. The donation pipeline flows from funder → `org.hypercerts.funding.receipt` (on ATProto) → project site → field monitor, with every step linked by AT-URIs.

### Lexplorer

[GainForest Lexplorer](https://github.com/GainForest/gainforest-lexplorer) is a browsable schema reference, modeled on [lexicons.bio](https://lexicons.bio). It renders DwC, Audiovisual Core, Hypercerts, and Certified schemas with field tables and relationship diagrams.

---

## Lexicons

All schemas are in [github.com/GainForest/lexicons](https://github.com/GainForest/lexicons), published to the ATProto network via DNS ownership verification.

### Darwin Core — `app.gainforest.dwc`

A star-schema implementation of [Simple Darwin Core](https://dwc.tdwg.org/simple/) on ATProto:

| Lexicon | Type | Description |
|---|---|---|
| `dwc.defs` | defs | Shared types: geolocation, taxonIdentification, enums (basisOfRecord, sex, taxonRank, occurrenceStatus, establishmentMeans, etc.) |
| `dwc.event` | record | Sampling event — location, date range, protocol, weather, team |
| `dwc.occurrence` | record | Single organism observation |
| `dwc.measurement` | record | MeasurementOrFact extension (DBH, height, weight, etc.) |
| `dwc.dataset` | record | Dataset-level metadata for publication and exchange |

Relationships: many `occurrence` → one `event` (via AT-URI `eventRef`); many `measurement` → one `occurrence` (via `occurrenceRef`).

`dwc.occurrence` carries the standard DwC fields: `scientificName`, `vernacularName`, `basisOfRecord` (`HumanObservation` | `MachineObservation` | …), `occurrenceStatus`, `individualCount`, `sex`, `lifeStage`, `establishmentMeans`, `identifiedBy`, `dateIdentified`, `identificationRemarks`, and `dynamicProperties` for unstandardized extensions.

### Audiovisual Core — `app.gainforest.ac`

Aligned with the [TDWG Audiovisual Core standard](https://ac.tdwg.org/):

| Lexicon | Type | Description |
|---|---|---|
| `ac.multimedia` | record | Generic media (image, audio, video) linked as evidence to a `dwc.occurrence` |
| `ac.audio` | record | Audio recording with full technical metadata: codec, sample rate, frequency bounds (`ac:freqLow`/`freqHigh`), high/low-pass filters, SNR |
| `ac.deployment` | record | PAM device deployment (AudioMoth, Song Meter, Swift, etc.) — device config, gain, duty cycle, mounting, location |

Relationships: one `deployment` → many `audio` → one `occurrence` (optionally) → one `event`.

See [`docs/audiomoth.md`](../docs/audiomoth.md) for field mappings and a complete workflow example.

### Evaluator — `app.gainforest.evaluator`

The evaluator pattern extends Bluesky's [labeler system](https://docs.bsky.app/docs/advanced-guides/moderation). Instead of string labels, evaluators produce **typed results with confidence scores and method provenance**. The schema is designed for typed, versioned, decentralized identification.

| Lexicon | Type | Description |
|---|---|---|
| `evaluator.defs` | defs | Result types: `speciesIdResult`, `dataQualityResult`, `verificationResult`, `classificationResult`, `measurementResult` |
| `evaluator.service` | record | Registration record declaring an account as an evaluator with policies and supported result types |
| `evaluator.evaluation` | record | A typed result attached to any ATProto record — includes confidence (0–1000), method provenance, optional `negation` flag and `supersedes` ref for versioning |
| `evaluator.subscription` | record | A user's subscription to a specific evaluator, published in their own repo |

**Discovery:** Clients send `atproto-accept-evaluators: did:plc:eval1,did:plc:eval2`. AppViews attach matching evaluations inline under an `evaluations` key. The AppView responds with `atproto-content-evaluators` confirming resolved evaluators.

**Mapping to iNaturalist's identification workflow:**
The initial observation is the `dwc.occurrence`. Each identification suggested by a community member — species name, confidence, method — is an `evaluator.evaluation` with a `speciesIdResult`. The `speciesIdResult` carries a ranked list of candidate taxa with per-taxon scores. Withdrawn identifications use `negation: true`. Revised identifications use `supersedes` to link to the prior evaluation. "Research Grade" becomes a policy computed by an evaluator service (or an AppView rule) rather than a hard-coded threshold in a single platform.

### Organization & Layers — `app.gainforest.organization`

Site-scoped records for conservation project sites:

- `info` — organization profile
- `defaultSite` — primary site configuration  
- `layer` / `layerGroup` — atomic map layers and layer stacks (drone imagery, satellite, canopy height, species occurrence point clouds) with time-series support for change detection
- `observations/` — structured observations: `dendogram`, `fauna`, `flora`, `measuredTreesCluster`
- `predictions/` — AI-generated species predictions: `fauna`, `flora`

See [`docs/layers.md`](../docs/layers.md) for the layer/layerGroup data model.

### Supporting Namespaces

| Namespace | What it covers |
|---|---|
| `app.gainforest.common` | Shared types: blobs, images, URIs, rich text |
| `app.gainforest.gbif` | GBIF-aligned dataset metadata |
| `app.gainforest.link` | EVM wallet ↔ ATProto DID identity links |
| `app.gainforest.funding` | Donation configuration records |
| `app.gainforest.asset` | Generic blob anchor records |
| `org.impactindexer.review` | Community comments and likes on any ATProto entity |
| `pub.leaflet` | Structured document authoring — content blocks, page layouts, rich text |

---

## The iNaturalist Bridge

We have been publishing iNaturalist observations to ATProto via an automated bridge for several months. The bridge handle is `inaturalist.climateai.org` (DID: `did:plc:upasua6f5yqalwvyyhjbztyl`) — it pulls from the iNaturalist public API and posts records as `app.gainforest.dwc.occurrence` to a single ATProto account.

This is a proof of concept, not a real federation. The structural problem is obvious: **observations from millions of individual iNaturalist users appear under one DID**. The provenance, reputation, and identity of individual observers is lost. The identification community — the entire social graph of expert reviews, agreements, and disagreements that makes iNaturalist valuable — is not represented at all.

What real federation would look like:

1. Each iNaturalist observer owns a PDS and an AT Protocol DID
2. Observations post to their own repository as `dwc.occurrence` + `ac.multimedia`
3. Community identifications flow through the evaluator system — each suggestion is an `evaluator.evaluation` with `speciesIdResult`, published by the identifier's DID, with confidence and method
4. An AppView aggregates identifications across PDSes — Research Grade is a configurable policy on the evaluation aggregate, not a platform-specific algorithm
5. Third-party identifiers (BirdNET, iNaturalist CV, expert networks) register as `evaluator.service` accounts with declared methodologies

---

## Open Questions

The data model is solid enough to build on. What we are still working through — and would genuinely benefit from thinking through with people who know this domain deeply:

**Taxon concept references.** `dwc.occurrence` stores `scientificName` as a free string. Linking to a stable, versioned taxon concept (GBIF Backbone taxon key, iNaturalist taxon ID, Catalogue of Life ID) needs either a ref lexicon or a convention for taxon concept URIs in `dynamicProperties`. The right answer probably depends on which authoritative sources the community wants to treat as canonical.

**Identification history as a structured chain.** In iNaturalist, the identification history is a first-class feature. The evaluator `supersedes` + `negation` fields support this technically. What would help is an agreed convention for how AppViews reconstruct the full identification thread from a set of evaluation records — so this works the same across implementations.

**Quality grade semantics.** "Research Grade" in iNaturalist is a specific algorithm. In a decentralized world, quality thresholds become policies that different AppViews might implement differently. An agreed evaluator policy lexicon, or a shared convention, would let quality claims mean the same thing across platforms.

**Cross-platform observation linking.** An observation in iNaturalist and the same observation in a GainForest project site should be linkable. An external-ID convention across ATProto lexicons — "this record is also known as iNat observation #12345678" — doesn't exist yet.

**Namespace governance.** The `app.gainforest.dwc.*` and `app.gainforest.ac.*` namespaces are currently owned by GainForest's DNS. For these to function as a neutral shared standard, they need multi-stakeholder governance — similar to how TDWG governs Darwin Core — or a neutral namespace with a governance model the broader community can ratify. We are actively thinking about this. Lexicon Indexing Requests (LIRs) are our current lightweight governance process, but it is clearly not sufficient for a standard that should outlast any single organization.

---

## The Invitation

We are not building a replacement for iNaturalist. We are trying to build the layer underneath — a protocol infrastructure that lets biodiversity data, wherever collected, be self-sovereign, portable, and aggregatable by anyone.

The lexicons are open. The indexer is open. The code is on GitHub. We are actively working on these problems and would like to work on them with people who know this domain better than we do.

If you care about the technical architecture of a decentralized, post-platform biodiversity commons — come tinker with us.

**Links**

| | |
|---|---|
| Lexicon schemas | [github.com/GainForest/lexicons](https://github.com/GainForest/lexicons) |
| Schema browser | [gainforest-lexplorer](https://github.com/GainForest/gainforest-lexplorer) |
| Lexicon governance (LIRs) | [hypercollective on Tangled](https://tangled.org/gainforest.earth/hypercollective) |
| AT Protocol indexer | [github.com/GainForest/gainforest-atproto-indexer](https://github.com/GainForest/gainforest-atproto-indexer) |
| iNaturalist ATProto bridge | `inaturalist.climateai.org` — `did:plc:upasua6f5yqalwvyyhjbztyl` |
| lexicons.bio | [lexicons.bio](https://lexicons.bio) — community lexicon browser |

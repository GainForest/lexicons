# Layers & Layer Groups

This document explains how to model map layers with the GainForest organization
layer lexicons, and how repeat captures of the same area become
change-over-time series.

The schemas are deliberately minimal: every field is either written by a real
publisher or read by a real client today. Fields are added when a consumer
needs them, not ahead of time.

## What is a Layer?

A map layer is one visual or analytical dataset that can be placed on a map.
Examples include:

- drone orthomosaics (COG GeoTIFFs)
- GeoJSON points for trees, sensors, or observations
- GeoJSON lines for trails, rivers, or tree-crown delineations
- polygons for land-cover classes or conservation zones
- tiled map overlays

A layer is an **atomic renderable source**. If a client can turn it on/off as
one map item, it is one layer.

## Lexicons

| Lexicon | Meaning |
|---------|---------|
| `app.gainforest.organization.layer` | One renderable map product. |
| `app.gainforest.organization.layerGroup` | A named area monitored over time. Layers join it via `groupRef`. |

## Core Model

### `layer`

A `layer` stores the data source and rendering metadata:

- `name` — display name
- `type` — rendering type (`raster_tif`, `tms_tile`, `geojson_points`,
  `geojson_points_trees`, `geojson_line`, `choropleth`, `choropleth_shannon`).
  An open set (`knownValues`): clients ignore layers whose type they cannot
  render.
- `uri` — where the layer data lives: a GeoJSON file, a COG GeoTIFF, or a
  `{z}/{x}/{y}` tile template
- `bounds` — geographic footprint as `'west,south,east,north'` in WGS84
  decimal degrees (a string, because lexicons have no float type)
- `capturedAt` — when the underlying data was captured in the field (e.g. the
  drone flight date). The one canonical temporal field.
- `groupRef` — AT-URI of the `layerGroup` (monitored area) this layer belongs to
- `siteRef` — AT-URI of the project site this layer belongs to
- `category`, `isDefault`, `displayOrder`, `legend` — display metadata

### `layerGroup`

A `layerGroup` is a small named anchor for a **monitored area** — a place an
organization surveys repeatedly, like a mangrove restoration plot that is
re-flown by drone:

- `name` — e.g. `"Tumanan"`
- `description` — what the area is and why it is monitored
- `siteRef` — optional link to the project site
- `bounds` — optional footprint; clients fall back to the union of member
  layer bounds

The group holds **no member list**. Layers join a group by setting their
`groupRef` to the group record's AT-URI.

## Membership Is Child → Parent, Append-Only

The relationship is single-sourced and one-directional:

- `layer.groupRef` → `layerGroup` record.

Publishing a new capture of a monitored area is **one appended layer record**
with `groupRef` set. The group record is never edited, so there is no member
array to keep in sync, no write contention on a central record, and no cap on
how many captures an area can accumulate.

## Time-Series Semantics Emerge from the Members

Clients derive behaviour from the member layers — there is no `groupType`
field to declare it:

- Members spanning **two or more distinct `capturedAt` days** make the group a
  **time series**: clients offer a time slider whose stops are the distinct
  capture days, ordered ascending.
- Members sharing **one capture day** are **products of the same survey** —
  e.g. an orthomosaic plus the tree-crown delineations derived from it — and
  render together at that slider stop.
- A group whose members span a single day is just a bundle of related
  products; clients render the members normally.

## Worked Example (real data)

Oceanus Conservation re-flies the Tumanan mangrove area. The monitored area is
one `layerGroup`:

```json
{
  "$type": "app.gainforest.organization.layerGroup",
  "name": "Tumanan",
  "description": "Drone monitoring area — repeat captures of Tumanan grouped into a change-over-time series.",
  "bounds": "126.34303096,8.25471625,126.35772009,8.26481389",
  "createdAt": "2026-07-07T00:00:00.000Z"
}
```

Each flight is a normal `layer` pointing back at it:

```json
{
  "$type": "app.gainforest.organization.layer",
  "name": "Tumanan (2025-04-09)",
  "type": "raster_tif",
  "uri": "https://gainforest-transparency-dashboard.s3.amazonaws.com/layers/oceanus-conservation/tumanan-2025-04-09.tif",
  "bounds": "126.34303096,8.25476583,126.35745156,8.26481389",
  "capturedAt": "2025-04-09T00:00:00.000Z",
  "groupRef": "at://did:plc:6oxtzu7gxz7xcldvtwfh3bpt/app.gainforest.organization.layerGroup/3xyz…",
  "createdAt": "2026-07-07T00:00:00.000Z"
}
```

With three flights on 2025-04-09, 2025-08-16, and 2025-10-14, clients see three
distinct capture days and render a time slider. If tree delineations for the
2025-04-09 flight are published later, they are one more appended layer with
the same `groupRef` and `capturedAt` — they fade in and out with that flight's
orthomosaic.

## Fetching

- **Raw PDS clients**: `com.atproto.repo.listRecords` on both collections,
  then join members to groups by `groupRef` client-side. Both lists are small.
- **Indexer/AppView clients**: filter layers by `groupRef` (or `siteRef`) and
  order by `capturedAt`.

## Recommended Conventions

- Set `capturedAt` on every capture-derived layer (drone imagery and its
  derived products). Without it, a layer cannot ride a timeline.
- Set `groupRef` on every repeat capture of a monitored area, and give
  same-survey products the same `capturedAt`.
- Set `bounds` on every layer so clients can fly to it and reason about
  overlap.
- Keep each layer atomic: independent on/off toggles are separate layers
  sharing a `groupRef`.

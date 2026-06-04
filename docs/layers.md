# Layers & Layer Groups

This document explains how to think about map layers in general, and how to model them with the GainForest organization layer lexicons.

## What is a Layer?

A map layer is one visual or analytical dataset that can be placed on a map. Examples include:

- drone imagery
- satellite imagery
- elevation or canopy-height rasters
- GeoJSON points for trees, sensors, or observations
- GeoJSON lines for trails, rivers, or transects
- polygons for project boundaries, land-cover classes, or conservation zones
- heatmaps, contours, and tiled map overlays

A layer should be treated as an **atomic renderable source**. If a client can turn it on/off as one map item, it is probably one layer.

## Lexicons

| Lexicon | Meaning |
|---------|---------|
| `app.gainforest.organization.layer` | One renderable map source. |
| `app.gainforest.organization.layerGroup` | A related set of layers for one site. Used for stacks, timelines, and catalogs. |

## Core Model

### `layer`

A `layer` stores the data source and rendering metadata:

- `name` — display name
- `type` — source/rendering type, such as `raster_tif`, `tms_tile`, `geojson_points`, `satellite_overlay`
- `uri` / `tilePattern` — where the layer data lives
- `siteRef` — the site this layer belongs to
- `layerGroupRef` — optional reference to its primary group
- `capturedAt`, `validFrom`, `validTo`, `sequence`, `timeLabel` — optional temporal metadata
- visual metadata such as `legend`, `colorScale`, `opacity`, `bounds`, `unit`, `propertyKey`

### `layerGroup`

A `layerGroup` describes how multiple layers relate to each other.

Supported group styles:

- `stack` — multiple layers shown together
- `time_series` — layers represent time slices for a scrubber/timeline
- `catalog` — related layers grouped for browsing
- `single` — a wrapper around one main layer, useful for consistent UI handling

A group belongs to a site through `siteRef` and references child layers through `layers[].layerRef`.

## Site-Scoped Fetching

For new records, always set `siteRef` on both layer groups and layers.

This lets an indexer/AppView answer questions like:

- “Give me all layer groups for Site A.”
- “Give me all layers for Site A.”
- “Which site does this layer belong to?”

For raw PDS clients that cannot filter records by fields, `layerGroup.layers[]` can also act as a manifest of exact layer records to fetch.

## Relationship Pattern

Use AT-URI references as the durable relationship:

- `layer.layerGroupRef` points from a layer to its group.
- `layerGroup.layers[].layerRef` points from a group to its layers.
- `layer.layerGroupName` is only denormalized display/search text.

This gives a practical two-way relationship without making names into identifiers.

## Stacked Layers

Use `groupType: "stack"` when a site view is made from multiple layers at once.

Short example: Site 1 has drone imagery, a valley height model, and tree points.

```json
{
  "$type": "app.gainforest.organization.layerGroup",
  "name": "Site 1 map overview",
  "siteRef": "at://did:plc:org/app.gainforest.organization.site/site1",
  "groupType": "stack",
  "layers": [
    {
      "layerRef": "at://did:plc:org/app.gainforest.organization.layer/site1-drone",
      "label": "Drone imagery",
      "role": "base",
      "displayOrder": 0
    },
    {
      "layerRef": "at://did:plc:org/app.gainforest.organization.layer/site1-height",
      "label": "Valley height",
      "role": "overlay",
      "displayOrder": 1,
      "opacity": "0.65"
    },
    {
      "layerRef": "at://did:plc:org/app.gainforest.organization.layer/site1-trees",
      "label": "Tree points",
      "role": "annotation",
      "displayOrder": 2
    }
  ],
  "createdAt": "2026-06-04T00:00:00.000Z"
}
```

Each referenced child is a normal `layer` record. For example, the tree layer might be:

```json
{
  "$type": "app.gainforest.organization.layer",
  "name": "Site 1 tree points",
  "type": "geojson_points_trees",
  "uri": "https://example.org/site1/trees.geojson",
  "siteRef": "at://did:plc:org/app.gainforest.organization.site/site1",
  "layerGroupRef": "at://did:plc:org/app.gainforest.organization.layerGroup/site1-overview",
  "layerGroupName": "Site 1 map overview",
  "createdAt": "2026-06-04T00:00:00.000Z"
}
```

Clients should render stack items by `displayOrder`; lower values render first.

## Time-Series Layers

Use `groupType: "time_series"` when the same kind of layer is measured repeatedly over time.

Short example: Site 2 has quarterly drone imagery for three years. That is 12 layer records, grouped into one timeline.

```json
{
  "$type": "app.gainforest.organization.layerGroup",
  "name": "Site 2 drone imagery timeline",
  "siteRef": "at://did:plc:org/app.gainforest.organization.site/site2",
  "groupType": "time_series",
  "temporalResolution": "quarterly",
  "layers": [
    {
      "layerRef": "at://did:plc:org/app.gainforest.organization.layer/site2-drone-2023-q1",
      "label": "2023 Q1",
      "capturedAt": "2023-01-15T00:00:00.000Z",
      "sequence": 0
    },
    {
      "layerRef": "at://did:plc:org/app.gainforest.organization.layer/site2-drone-2023-q2",
      "label": "2023 Q2",
      "capturedAt": "2023-04-15T00:00:00.000Z",
      "sequence": 1
    },
    {
      "layerRef": "at://did:plc:org/app.gainforest.organization.layer/site2-drone-2025-q4",
      "label": "2025 Q4",
      "capturedAt": "2025-10-15T00:00:00.000Z",
      "sequence": 11
    }
  ],
  "createdAt": "2026-06-04T00:00:00.000Z"
}
```

A child layer for one quarter might look like:

```json
{
  "$type": "app.gainforest.organization.layer",
  "name": "Site 2 drone imagery 2023 Q1",
  "type": "satellite_overlay",
  "uri": "https://example.org/site2/drone/2023-q1/{z}/{x}/{y}.png",
  "tilePattern": "https://example.org/site2/drone/2023-q1/{z}/{x}/{y}.png",
  "siteRef": "at://did:plc:org/app.gainforest.organization.site/site2",
  "layerGroupRef": "at://did:plc:org/app.gainforest.organization.layerGroup/site2-drone-timeline",
  "layerGroupName": "Site 2 drone imagery timeline",
  "capturedAt": "2023-01-15T00:00:00.000Z",
  "validFrom": "2023-01-01T00:00:00.000Z",
  "validTo": "2023-03-31T23:59:59.000Z",
  "sequence": 0,
  "timeLabel": "2023 Q1",
  "createdAt": "2026-06-04T00:00:00.000Z"
}
```

Clients should order timeline items by `capturedAt`, then `validFrom`, then `sequence`.

## Recommended Conventions

- Set `siteRef` on every new `layer` and `layerGroup`.
- Use `layerGroupRef` for durable identity; keep `layerGroupName` as display text only.
- Use `displayOrder` for stacks and `sequence` for timelines.
- Put temporal metadata on both the group item and the child layer when possible.
- Keep each layer atomic. If multiple sources must be turned on/off independently, model them as separate layers and group them.

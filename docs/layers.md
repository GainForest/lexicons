# Layer & Layer Group Lexicon Guide

This guide explains how to model organization map layers with site-scoped fetching, stacked layer views, and time scrubbing.

## Lexicons

| Lexicon | Purpose |
|---------|---------|
| `app.gainforest.organization.layer` | One atomic map-renderable source: GeoJSON, raster, tiles, heatmap, etc. |
| `app.gainforest.organization.layerGroup` | A related collection of layers for one site: stacks, time series, or catalogs. |

## Key Principles

1. **A layer is atomic.** It represents one renderable data source.
2. **A layer group is compositional.** It tells clients how related layers should be shown together.
3. **`siteRef` is the site relationship.** New layer and layer group records should set it so indexers can query only the records for a specific site.
4. **AT-URI refs are durable identity.** Use `layerGroupRef`/`layers[].layerRef` as the canonical relationship. `layerGroupName` is denormalized display text only.

## Fetching Layers for a Site

For indexed/AppView clients, query records by exact `siteRef`:

- `app.gainforest.organization.layerGroup` where `siteRef = <site AT-URI>`
- `app.gainforest.organization.layer` where `siteRef = <site AT-URI>`

This supports fetching all layers for a site without returning unrelated layers, and every layer still declares which site it belongs to.

For raw PDS clients that cannot field-filter records, use `layerGroup.layers[]` as a manifest of exact layer AT-URIs to fetch.

## Stacked Layers

Use `groupType: "stack"` when multiple layers should be rendered together.

```json
{
  "name": "Forest health overview",
  "siteRef": "at://did:plc:example/app.gainforest.organization.site/abc123",
  "groupType": "stack",
  "layers": [
    {
      "layerRef": "at://did:plc:example/app.gainforest.organization.layer/canopy",
      "role": "base",
      "displayOrder": 0,
      "opacity": "1"
    },
    {
      "layerRef": "at://did:plc:example/app.gainforest.organization.layer/species",
      "role": "overlay",
      "displayOrder": 1,
      "opacity": "0.8"
    }
  ],
  "createdAt": "2026-06-04T00:00:00.000Z"
}
```

Clients should sort by `displayOrder`; lower values render first.

## Time Scrubbing

Use `groupType: "time_series"` when layers represent time slices of the same phenomenon.

```json
{
  "name": "Drone canopy cover over time",
  "siteRef": "at://did:plc:example/app.gainforest.organization.site/abc123",
  "groupType": "time_series",
  "temporalResolution": "monthly",
  "layers": [
    {
      "layerRef": "at://did:plc:example/app.gainforest.organization.layer/jan2025",
      "label": "January 2025",
      "capturedAt": "2025-01-01T00:00:00.000Z",
      "sequence": 0
    },
    {
      "layerRef": "at://did:plc:example/app.gainforest.organization.layer/feb2025",
      "label": "February 2025",
      "capturedAt": "2025-02-01T00:00:00.000Z",
      "sequence": 1
    }
  ],
  "createdAt": "2026-06-04T00:00:00.000Z"
}
```

Clients should prefer `capturedAt`, then `validFrom`, then `sequence` for scrubber order.

Each child `layer` can also carry `capturedAt`, `validFrom`, `validTo`, `sequence`, and `timeLabel` so it remains meaningful outside the group.

## Catalogs

Use `groupType: "catalog"` for a loose set of related layers that share a category, source, or display context but are not necessarily rendered together.

## Relationship Pattern

A recommended new layer record includes both site and group metadata:

```json
{
  "name": "Canopy cover January 2025",
  "type": "raster_tif",
  "uri": "https://example.com/canopy-2025-01.tif",
  "siteRef": "at://did:plc:example/app.gainforest.organization.site/abc123",
  "layerGroupRef": "at://did:plc:example/app.gainforest.organization.layerGroup/group123",
  "layerGroupName": "Drone canopy cover over time",
  "capturedAt": "2025-01-01T00:00:00.000Z",
  "sequence": 0,
  "createdAt": "2026-06-04T00:00:00.000Z"
}
```

`layerGroupRef` points from layer to group. `layerGroup.layers[].layerRef` points from group to layers. This creates a practical two-way relationship while preserving compatibility with existing layer records.

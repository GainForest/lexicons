# HOWTO: Recording Biodiversity Observations

This guide walks through creating Darwin Core occurrence records on ATProto when you observe wildlife in the field.

## Prerequisites

```bash
# Install goat CLI
brew install goat

# Login
goat account login -u your-handle.bsky.social -p your-app-password
```

## Example 1: Photo of an Animal

You're in a Costa Rican cloud forest and photograph a resplendent quetzal perched in a tree.

### Step 1: Upload the image blob

```bash
goat blob upload photo-quetzal.jpg
```

This returns a blob reference like:

```json
{
  "$type": "blob",
  "ref": { "$link": "bafkrei..." },
  "mimeType": "image/jpeg",
  "size": 2845632
}
```

### Step 2: Create the occurrence record

```bash
goat create app.gainforest.dwc.occurrence - <<'EOF'
{
  "basisOfRecord": "HumanObservation",
  "dcType": "StillImage",
  "scientificName": "Pharomachrus mocinno de la Llave, 1832",
  "kingdom": "Animalia",
  "phylum": "Chordata",
  "class": "Aves",
  "order": "Trogoniformes",
  "family": "Trogonidae",
  "genus": "Pharomachrus",
  "specificEpithet": "mocinno",
  "taxonRank": "species",
  "vernacularName": "Resplendent Quetzal",
  "gbifTaxonKey": "2475218",
  "eventDate": "2025-03-15T07:45:00-06:00",
  "eventTime": "07:45:00",
  "habitat": "montane cloud forest",
  "decimalLatitude": "10.4523",
  "decimalLongitude": "-84.1167",
  "coordinateUncertaintyInMeters": 10,
  "geodeticDatum": "EPSG:4326",
  "country": "Costa Rica",
  "countryCode": "CR",
  "stateProvince": "Alajuela",
  "locality": "Monteverde Cloud Forest Reserve, Sendero Bosque Nuboso",
  "minimumElevationInMeters": 1520,
  "maximumElevationInMeters": 1520,
  "individualCount": 1,
  "sex": "male",
  "lifeStage": "adult",
  "behavior": "perching",
  "occurrenceStatus": "present",
  "recordedBy": "Jane Smith",
  "recordedByID": "https://orcid.org/0000-0002-1234-5678",
  "samplingProtocol": "opportunistic observation, DSLR camera 300mm lens",
  "identifiedBy": "Jane Smith",
  "dateIdentified": "2025-03-15",
  "license": "http://creativecommons.org/licenses/by/4.0/",
  "mediaEvidence": {
    "image": {
      "$type": "blob",
      "ref": { "$link": "bafkrei..." },
      "mimeType": "image/jpeg",
      "size": 2845632
    }
  },
  "occurrenceRemarks": "Male perched at ~8m height in Ocotea tree, tail streamers clearly visible. Observed for 3 minutes before flying northeast.",
  "createdAt": "2025-03-15T13:45:00.000Z"
}
EOF
```

### What you get back

```
at://did:plc:qoti4acfmc5wg6zzmtix6hse/app.gainforest.dwc.occurrence/3lbq...
```

This AT-URI is the permanent identifier for this observation.

---

## Example 2: Sound Recording of a Bird

You record 30 seconds of a bird song in the Brazilian Atlantic Forest using your phone.

### Step 1: Upload the audio blob

Audio files are stored using the `common.defs#smallBlob` type (up to 10MB, any MIME type):

```bash
goat blob upload bird-call.mp3
```

Returns:

```json
{
  "$type": "blob",
  "ref": { "$link": "bafkrei..." },
  "mimeType": "audio/mpeg",
  "size": 485120
}
```

### Step 2: Create the occurrence record

Note: since `mediaEvidence` only accepts images, we reference audio via `associatedMedia` with the blob CID URI, and store the audio blob as a `dynamicProperties` reference.

```bash
goat create app.gainforest.dwc.occurrence - <<'EOF'
{
  "basisOfRecord": "MachineObservation",
  "dcType": "Sound",
  "scientificName": "Lipaugus vociferans (Wied-Neuwied, 1820)",
  "kingdom": "Animalia",
  "phylum": "Chordata",
  "class": "Aves",
  "order": "Passeriformes",
  "family": "Cotingidae",
  "genus": "Lipaugus",
  "specificEpithet": "vociferans",
  "taxonRank": "species",
  "vernacularName": "Screaming Piha",
  "gbifTaxonKey": "2482572",
  "eventDate": "2025-06-22T14:20:00-03:00",
  "eventTime": "14:20:00",
  "habitat": "lowland tropical rainforest",
  "decimalLatitude": "-23.4356",
  "decimalLongitude": "-45.0712",
  "coordinateUncertaintyInMeters": 25,
  "geodeticDatum": "EPSG:4326",
  "country": "Brazil",
  "countryCode": "BR",
  "stateProvince": "Sao Paulo",
  "locality": "Parque Estadual da Serra do Mar, Nucleo Santa Virginia",
  "minimumElevationInMeters": 850,
  "maximumElevationInMeters": 850,
  "occurrenceStatus": "present",
  "recordedBy": "Carlos Oliveira",
  "recordedByID": "https://orcid.org/0000-0003-9876-5432",
  "samplingProtocol": "audio point count 10-min, smartphone recorder 48kHz",
  "samplingEffort": "30 seconds recording",
  "identifiedBy": "Carlos Oliveira",
  "identificationRemarks": "Identified by distinctive three-note descending whistle, compared against Xeno-canto XC456789",
  "dateIdentified": "2025-06-22",
  "license": "http://creativecommons.org/licenses/by-nc/4.0/",
  "associatedMedia": "https://xeno-canto.org/456789",
  "dynamicProperties": "{\"audioBlob\":{\"ref\":\"bafkrei...\",\"mimeType\":\"audio/mpeg\",\"size\":485120,\"durationSeconds\":30,\"sampleRate\":48000}}",
  "occurrenceRemarks": "Loud three-note whistle heard from canopy ~15m up. Bird not visually confirmed. Recording captured at 48kHz.",
  "createdAt": "2025-06-22T17:20:00.000Z"
}
EOF
```

---

## Adding Measurements

If you measured something about the organism (e.g., estimated wingspan, distance), create a linked `dwc.measurement` record:

```bash
goat create app.gainforest.dwc.measurement - <<'EOF'
{
  "occurrenceRef": "at://did:plc:qoti4acfmc5wg6zzmtix6hse/app.gainforest.dwc.occurrence/3lbq...",
  "measurementType": "estimated distance to observer",
  "measurementValue": "12",
  "measurementUnit": "m",
  "measurementMethod": "visual estimate",
  "measurementDeterminedBy": "Jane Smith",
  "measurementDeterminedDate": "2025-03-15",
  "createdAt": "2025-03-15T13:46:00.000Z"
}
EOF
```

---

## Grouping Observations with Events

If you make multiple observations during one survey session, create an event first, then link occurrences to it:

### Create the event

```bash
goat create app.gainforest.dwc.event - <<'EOF'
{
  "eventID": "survey-monteverde-2025-03-15-am",
  "eventDate": "2025-03-15T06:00:00/2025-03-15T10:00:00",
  "habitat": "montane cloud forest",
  "samplingProtocol": "point count, 10 stations, 10 min each",
  "samplingEffort": "4 hours, 10 points",
  "decimalLatitude": "10.4520",
  "decimalLongitude": "-84.1170",
  "coordinateUncertaintyInMeters": 500,
  "geodeticDatum": "EPSG:4326",
  "country": "Costa Rica",
  "countryCode": "CR",
  "locality": "Monteverde Cloud Forest Reserve",
  "minimumElevationInMeters": 1450,
  "maximumElevationInMeters": 1600,
  "createdAt": "2025-03-15T16:00:00.000Z"
}
EOF
```

### Link occurrences to the event

Include `eventRef` in each occurrence record:

```json
{
  "eventRef": "at://did:plc:.../app.gainforest.dwc.event/3lbr...",
  "eventID": "survey-monteverde-2025-03-15-am",
  ...
}
```

---

## Field Reference

| Field | Photo | Audio | Notes |
|-------|-------|-------|-------|
| `basisOfRecord` | `HumanObservation` | `MachineObservation` | Human = direct visual; Machine = device-captured |
| `dcType` | `StillImage` | `Sound` | What kind of evidence |
| `mediaEvidence` | image blob | - | Only accepts image/* MIME types |
| `associatedMedia` | - | URI or CID | For non-image media references |
| `dynamicProperties` | - | JSON with audio metadata | Duration, sample rate, etc. |
| `samplingProtocol` | Camera details | Recorder details | How you captured it |

## Tips

- **Coordinates**: Use as many decimal places as your GPS provides (e.g., `"10.452312"`)
- **Uncertainty**: Phone GPS is typically 5-15m; handheld GPS 3-5m; no GPS use 1000+
- **Scientific names**: Include authorship if known; use `identificationQualifier: "cf."` if uncertain
- **GBIF keys**: Look up at https://www.gbif.org/species/search
- **Timestamps**: `eventDate`/`eventTime` = when you observed; `createdAt` = when you wrote the record (ISO 8601 UTC)
- **Pipe-delimit** multiple values: `"recordedBy": "Jane Smith | John Doe"`

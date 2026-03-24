# AudioMoth & Passive Acoustic Monitoring — Lexicon Guide

This document explains how to model AudioMoth (and other passive acoustic monitoring) data using the GainForest lexicons. It covers which lexicon handles which concern, the relationships between records, and a complete field-by-field mapping.

---

## What is AudioMoth?

[AudioMoth](https://www.openacousticdevices.info/audiomoth) is a low-cost, open-source passive acoustic monitoring (PAM) device used to record soundscapes and wildlife calls. It is placed in the field for days or weeks and records audio continuously or on a duty cycle. The resulting recordings are then processed by tools like [Kaleidoscope](https://www.wildlifeacoustics.com/products/kaleidoscope-pro) or BirdNET to identify species by their calls.

Other common PAM devices: Wildlife Acoustics Song Meter SM4, Cornell Lab Swift, Bioacoustic Unit (BAR-LT).

---

## Lexicon Architecture

Audiomoth data spans **four lexicons**, each handling a distinct concern:

```
ac.deployment          ←── Where was the device? What was it configured as?
    │
    │ (deploymentRef)
    ▼
ac.audio               ←── The actual audio file + technical metadata
    │
    │ (occurrenceRef)
    ▼
dwc.occurrence         ←── Species detection / biodiversity observation
    │
    │ (eventRef)
    ▼
dwc.event              ←── Sampling event (location, weather, team)
```

**Key principle:** Each lexicon owns its concern. Audio technical properties live on `ac.audio`. Device configuration lives on `ac.deployment`. Species identification lives on `dwc.occurrence`. Sampling context (location, weather, habitat, team) lives on `dwc.event`.

---

## The Four Lexicons

### 1. `app.gainforest.ac.deployment` — Recorder Deployment

A deployment is a device placed at a fixed location for a period of time. **One deployment → many audio recordings.**

Use this record to capture everything that is constant across all recordings from a single placement of the device.

| Field | Description |
|---|---|
| `name` | Human-readable label (e.g., "Site A North — AudioMoth March 2024") |
| `deviceModel` | Device name (e.g., "AudioMoth 1.2.0", "Song Meter SM4") |
| `deviceSerialNumber` | Serial number for inventory tracking |
| `firmwareVersion` | Firmware version at time of deployment |
| `gain` | Gain setting (e.g., "medium", "high", "36dB") |
| `sampleRateHz` | Configured sample rate in Hz |
| `recordingSchedule` | Duty cycle description (e.g., "5 min on / 10 min off, 18:00–06:00") |
| `microphoneType` | Microphone used (e.g., "built-in MEMS", "ultrasonic MEMS") |
| `mountingHeight` | Height above ground in meters |
| `mountingOrientation` | Microphone orientation (e.g., "horizontal", "vertical-facing-down") |
| `batteryType` | Battery type (e.g., "AA lithium x3", "solar panel") |
| `storageMedia` | Storage card (e.g., "microSD 128GB SanDisk Endurance") |
| `deployedAt` | When the device was placed and activated |
| `retrievedAt` | When the device was collected |
| `decimalLatitude` | WGS84 latitude of the deployment point |
| `decimalLongitude` | WGS84 longitude of the deployment point |
| `altitude` | Altitude in meters above sea level |
| `habitat` | Brief habitat description at the device location |
| `siteRef` | AT-URI to the organization site record |
| `eventRef` | AT-URI to the `dwc.event` sampling event |
| `remarks` | Free-text notes about the deployment |

### 2. `app.gainforest.ac.audio` — Audio Recording

A single audio file and its technical metadata. **One audio record per file.** References its deployment via `deploymentRef`.

| Field | Description |
|---|---|
| `name` | Short label for the recording |
| `description` | Longer description (richtext) |
| `blob` | The audio file stored on the PDS (WAV, FLAC, MP3, etc.) |
| `metadata.channels` | Number of channels (1 = mono, 2 = stereo) |
| `metadata.duration` | Duration in seconds |
| `metadata.sampleRate` | Sample rate in Hz |
| `metadata.recordedAt` | Exact datetime the audio was captured |
| `metadata.bitDepth` | Bits per sample (16, 24, 32) |
| `metadata.fileFormat` | Format string (e.g., "WAV", "FLAC") |
| `metadata.fileSizeBytes` | File size in bytes |
| `metadata.codec` | Codec (e.g., "PCM", "FLAC") |
| `metadata.minFrequencyHz` | Lowest frequency present (aligns with AC `ac:freqLow`) |
| `metadata.maxFrequencyHz` | Highest frequency present (aligns with AC `ac:freqHigh`) |
| `metadata.filterHighPassHz` | High-pass filter cutoff applied (aligns with AC `ac:filterHighPass`) |
| `metadata.filterLowPassHz` | Low-pass filter cutoff applied (aligns with AC `ac:filterLowPass`) |
| `metadata.signalToNoiseRatio` | SNR in dB |
| `spectrogram` | Spectrogram image blob |
| `thumbnail` | Thumbnail image for list views |
| `license` | License string (e.g., "CC-BY-4.0") |
| `recordedBy` | Name of person/agent who made the recording (aligns with AC `dc:creator`) |
| `tags` | Freeform tags (e.g., "dawn-chorus", "rain", "chainsaw") |
| `occurrenceRef` | AT-URI to `dwc.occurrence` (links audio as species detection evidence) |
| `deploymentRef` | AT-URI to `ac.deployment` (links to the device deployment) |
| `siteRef` | AT-URI to the organization site |

### 3. `app.gainforest.dwc.occurrence` — Species Detection

When a species is identified in a recording (by a human expert or a tool like Kaleidoscope/BirdNET), create a `dwc.occurrence` record. The audio record is the *evidence*; the occurrence is the *observation*.

| Audiomoth / identification field | `dwc.occurrence` field |
|---|---|
| Scientific name | `scientificName` |
| Common name | `vernacularName` |
| Local name | `vernacularName` (use the most locally relevant name; add others to `dynamicProperties`) |
| Notes / remarks | `occurrenceRemarks` |
| Country | `country` / `countryCode` |
| Elevation | `minimumElevationInMeters` / `maximumElevationInMeters` |
| Picture (optional) | Create a separate `ac.multimedia` record with `occurrenceRef` pointing to the same occurrence |
| Identification tool used | `identificationRemarks` (e.g., "BirdNET v2.4 confidence 0.92") |
| Identified by | `identifiedBy` |
| Date identified | `dateIdentified` |

Set `basisOfRecord` to `MachineObservation` for automated identifications, `HumanObservation` for expert review.

### 4. `app.gainforest.dwc.event` — Sampling Event

The sampling event captures the broader survey context: who conducted it, the weather, full location details, and the sampling protocol. The deployment references the event via `eventRef`. Multiple deployments and occurrences can belong to the same event.

| Audiomoth context field | `dwc.event` field |
|---|---|
| Survey date range | `eventDate` |
| Location (full) | `decimalLatitude`, `decimalLongitude`, `country`, `stateProvince`, `locality` |
| Weather conditions | `temperature`, `humidity`, `windSpeed`, `cloudCover`, `weatherRemarks` |
| Habitat | `habitat` |
| Team / recordist | `recordedBy` |
| Equipment used | `equipmentUsed` |
| Sampling protocol | `samplingProtocol` (e.g., "Passive acoustic monitoring, 7-day deployment") |

---

## Relationships Diagram

```
dwc.event (survey context: location, weather, team, protocol)
    ▲
    │ eventRef
    │
ac.deployment (device config: model, gain, schedule, mount)
    ▲
    │ deploymentRef
    │
ac.audio ──────────────────────────────► dwc.occurrence (species ID: name, remarks)
    │                occurrenceRef              ▲
    │                                           │ occurrenceRef
    └──► ac.multimedia (photos of the          ─┘
         deployment site, device, habitat)
```

---

## Complete Workflow Example

### Scenario: AudioMoth deployed for one week, Kaleidoscope identifies a bat species

**Step 1: Create the sampling event**

```json
// dwc.event
{
  "eventID": "survey-2024-03-amazon-site-a",
  "eventDate": "2024-03-01/2024-03-08",
  "samplingProtocol": "Passive acoustic monitoring, 7-day deployment, AudioMoth",
  "habitat": "Primary Amazonian rainforest, 300m from river edge",
  "decimalLatitude": "-3.7452",
  "decimalLongitude": "-62.2159",
  "country": "Brazil",
  "recordedBy": "Maria Silva",
  "temperature": "26",
  "humidity": "89",
  "createdAt": "2024-03-01T08:00:00Z"
}
```

**Step 2: Create the deployment record**

```json
// ac.deployment
{
  "name": "Site A North — AudioMoth March 2024",
  "deviceModel": "AudioMoth 1.2.0",
  "deviceSerialNumber": "2B4E8A1C",
  "firmwareVersion": "1.8.1",
  "gain": "medium",
  "sampleRateHz": 48000,
  "recordingSchedule": "5 min on / 10 min off, 18:00–06:00 UTC-4",
  "batteryType": "AA lithium x3",
  "storageMedia": "microSD 128GB SanDisk Endurance",
  "mountingHeight": "1.5",
  "mountingOrientation": "horizontal",
  "deployedAt": "2024-03-01T09:00:00Z",
  "retrievedAt": "2024-03-08T09:00:00Z",
  "decimalLatitude": "-3.7452",
  "decimalLongitude": "-62.2159",
  "altitude": "312",
  "habitat": "Primary rainforest, closed canopy ~30m, 5m from large cecropia",
  "eventRef": "at://did:plc:xxx/app.gainforest.dwc.event/tid123",
  "createdAt": "2024-03-01T09:00:00Z"
}
```

**Step 3: Create the audio record (one per file)**

```json
// ac.audio
{
  "name": "2024-03-04T02:15:00 Site A North",
  "blob": { ... },
  "metadata": {
    "channels": 1,
    "duration": "300.0",
    "sampleRate": 48000,
    "recordedAt": "2024-03-04T02:15:00Z",
    "bitDepth": 16,
    "fileFormat": "WAV",
    "fileSizeBytes": 28800000,
    "codec": "PCM",
    "minFrequencyHz": 20,
    "maxFrequencyHz": 24000
  },
  "license": "CC-BY-4.0",
  "recordedBy": "Maria Silva",
  "tags": ["night-recording", "tropical-forest"],
  "deploymentRef": "at://did:plc:xxx/app.gainforest.ac.deployment/tid456",
  "createdAt": "2024-03-08T12:00:00Z"
}
```

**Step 4: Create the occurrence record (after Kaleidoscope identification)**

```json
// dwc.occurrence
{
  "basisOfRecord": "MachineObservation",
  "scientificName": "Pteronotus parnellii",
  "vernacularName": "Mustached bat",
  "eventDate": "2024-03-04T02:15:00Z",
  "decimalLatitude": "-3.7452",
  "decimalLongitude": "-62.2159",
  "country": "Brazil",
  "identifiedBy": "Kaleidoscope Pro v5.6.0",
  "dateIdentified": "2024-03-10",
  "identificationRemarks": "Auto-ID confidence 0.87; reviewed and confirmed by J. Santos",
  "occurrenceRemarks": "Foraging calls, 3 passes detected in 5-minute window",
  "associatedMedia": "at://did:plc:xxx/app.gainforest.ac.audio/tid789",
  "createdAt": "2024-03-10T15:00:00Z"
}
```

Then update the `ac.audio` record's `occurrenceRef` to point to this occurrence.

---

## Field Mapping Quick Reference

From the team's notes, here is where each field lives:

| Field | Lexicon | Field name |
|---|---|---|
| recordist | `ac.audio` | `recordedBy` |
| length / duration | `ac.audio` | `metadata.duration` |
| country | `dwc.occurrence` or `dwc.event` | `country` |
| elevation | `dwc.occurrence` or `dwc.event` | `minimumElevationInMeters` |
| picture (optional) | `ac.multimedia` | `file` (separate record linked via `occurrenceRef`) |
| common name | `dwc.occurrence` | `vernacularName` |
| scientific name | `dwc.occurrence` | `scientificName` |
| local name | `dwc.occurrence` | `vernacularName` (or `dynamicProperties` for multiple) |
| notes / remarks | `dwc.occurrence` | `occurrenceRemarks` |
| device model | `ac.deployment` | `deviceModel` |
| gain | `ac.deployment` | `gain` |
| sample rate | `ac.deployment` (configured) + `ac.audio` (actual) | `sampleRateHz` / `metadata.sampleRate` |
| deployment location | `ac.deployment` | `decimalLatitude`, `decimalLongitude`, `altitude` |
| weather | `dwc.event` | `temperature`, `humidity`, `windSpeed`, `weatherRemarks` |
| habitat | `ac.deployment` (micro-habitat at device) + `dwc.event` (broader habitat) | `habitat` |

---

## AC Standard Alignment

The `ac.audio` and `ac.deployment` lexicons align with the [TDWG Audiovisual Core standard](https://ac.tdwg.org/termlist/) as follows:

| AC Term | Our lexicon + field |
|---|---|
| `dc:creator` | `ac.audio` → `recordedBy` |
| `mo:sample_rate` | `ac.audio` → `metadata.sampleRate` |
| `ac:freqLow` | `ac.audio` → `metadata.minFrequencyHz` |
| `ac:freqHigh` | `ac.audio` → `metadata.maxFrequencyHz` |
| `ac:filterHighPass` | `ac.audio` → `metadata.filterHighPassHz` |
| `ac:filterLowPass` | `ac.audio` → `metadata.filterLowPassHz` |
| `xmp:CreateDate` | `ac.audio` → `metadata.recordedAt` |
| `dc:format` | `ac.audio` → `metadata.fileFormat` |
| `ac:tag` | `ac.audio` → `tags` |
| `dcterms:rights` | `ac.audio` → `license` |
| `ac:captureDevice` | `ac.deployment` → `deviceModel` |
| `dwc:decimalLatitude` | `ac.deployment` → `decimalLatitude` |
| `dwc:habitat` | `ac.deployment` → `habitat` |

The `app.gainforest.ac` namespace is aligned with TDWG Audiovisual Core (formerly Audubon Core — same standard, same `ac:` abbreviation). The `ac.multimedia` lexicon covers general media (images, video, audio as evidence for occurrences); `ac.audio` covers the richer technical metadata specific to audio recordings.

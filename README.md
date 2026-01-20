# ATProto Lexicons

This repository contains ATProto lexicon schemas for the Gainforest ecosystem.

## Structure

```
lexicons/
  app/
    gainforest/
      common/           # Shared definitions
      organization/     # Organization-related schemas
        observations/   # Observation records (fauna, flora, etc.)
        predictions/    # Prediction records
  com/
    atproto/
      repo/             # Standard ATProto references
  pub/
    leaflet/            # Leaflet document schemas
```

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
| `app.gainforest.organization.*` | `_lexicon.organization.gainforest.app` | `did=did:plc:xxxxx` |
| `app.gainforest.organization.observations.*` | `_lexicon.observations.organization.gainforest.app` | `did=did:plc:xxxxx` |
| `app.gainforest.organization.predictions.*` | `_lexicon.predictions.organization.gainforest.app` | `did=did:plc:xxxxx` |

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

# Cloudflare KV Setup Guide

## Overview

This project uses **Cloudflare KV** (Key-Value storage) to store scraped car data. The KV namespace needs to be properly configured for the Pages Functions to work.

## Current Configuration

The project is configured to use KV namespace with binding name `CAR_LISTINGS`.

### Existing Namespace ID
- **Production ID**: `677b8c8790fc44a58eaad0a3f2f89c3f`
- **Binding Name**: `CAR_LISTINGS`

## Setup Options

### Option 1: Use Existing Namespace (Recommended)

If you have access to the existing KV namespace, the configuration is already set up in `wrangler.toml`.

### Option 2: Create New KV Namespace

If you need to create a new KV namespace:

#### Automated Setup
```bash
npm run setup-kv
```

#### Manual Setup
```bash
# 1. Login to Cloudflare
wrangler login

# 2. Create production namespace
wrangler kv:namespace create "CAR_LISTINGS"

# 3. Create preview namespace (for development)
wrangler kv:namespace create "CAR_LISTINGS" --preview

# 4. List existing namespaces
npm run kv:list
```

#### Update Configuration

After creating new namespaces, update `wrangler.toml` with the new IDs:

```toml
# Replace with your new namespace IDs
[[kv_namespaces]]
binding = "CAR_LISTINGS"
id = "your-production-namespace-id"

[env.development]
[[env.development.kv_namespaces]]
binding = "CAR_LISTINGS"
id = "your-preview-namespace-id"
```

## Verification

### Check KV Access in Functions

The KV namespace is available in your Pages Functions as `env.CAR_LISTINGS`:

```typescript
export async function onRequest(context: any) {
  const { env } = context;
  
  // Check if KV is available
  if (!env.CAR_LISTINGS) {
    return new Response('KV namespace not configured', { status: 500 });
  }
  
  // Use KV
  await env.CAR_LISTINGS.put('test-key', 'test-value');
  const value = await env.CAR_LISTINGS.get('test-key');
}
```

### Test KV Operations

```bash
# Test storing data
wrangler kv:key put --binding CAR_LISTINGS "test-key" "test-value"

# Test retrieving data
wrangler kv:key get --binding CAR_LISTINGS "test-key"

# List all keys
wrangler kv:key list --binding CAR_LISTINGS
```

## Environment-Specific Configuration

### Production
- Uses the main KV namespace
- Configured in `[[kv_namespaces]]` section

### Development/Preview
- Uses preview KV namespace
- Configured in `[env.development]` and `[env.preview]` sections

### Local Development
```bash
# Run with KV binding
npm run pages:dev
```

## Data Structure

The KV store contains car collections with keys like:
- `toyota-yaris` → Car collection data
- `honda-civic` → Car collection data

Each value is a JSON object:
```json
{
  "brand": "toyota",
  "model": "yaris",
  "cars": [...],
  "count": 150,
  "lastUpdated": "2024-01-15T10:30:00Z"
}
```

## Troubleshooting

### KV Namespace Not Found
- Verify the namespace ID in `wrangler.toml`
- Check if you have access to the namespace
- Create a new namespace if needed

### Permission Errors
- Ensure you're logged in: `wrangler login`
- Check your Cloudflare account permissions
- Verify you're in the correct Cloudflare account

### Local Development Issues
```bash
# Clear local cache
rm -rf .wrangler

# Restart development server
npm run pages:dev
```

## Migration from Worker to Pages

If migrating from the standalone Worker:

1. **Export existing data**:
   ```bash
   # From the worker directory
   wrangler kv:key list --binding CAR_LISTINGS
   ```

2. **Import to Pages KV**:
   ```bash
   # Copy data to new namespace if needed
   wrangler kv:bulk put --binding CAR_LISTINGS data.json
   ```

## Security Notes

- KV namespace IDs are not sensitive (they're in the config)
- Actual data access requires proper authentication
- Use environment-specific namespaces for isolation 
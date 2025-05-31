# Cloudflare Pages Deployment Guide

## Prerequisites

1. **Cloudflare Account**: Make sure you have a Cloudflare account
2. **Wrangler CLI**: Install the Wrangler CLI globally
   ```bash
   npm install -g wrangler
   ```
3. **Authentication**: Login to Cloudflare
   ```bash
   wrangler login
   ```

## Deployment Options

### Option 1: Deploy via Wrangler CLI (Recommended)

1. **Build and Deploy**:
   ```bash
   cd frontend
   npm install
   npm run deploy
   ```

2. **For development environment**:
   ```bash
   npm run deploy:dev
   ```

### Option 2: Deploy via Cloudflare Dashboard

1. **Connect GitHub Repository**:
   - Go to Cloudflare Dashboard → Pages
   - Click "Create a project"
   - Connect your GitHub repository
   - Select this repository

2. **Configure Build Settings**:
   - **Framework preset**: Vite
   - **Build command**: `cd frontend && npm install && npm run build`
   - **Build output directory**: `frontend/dist`
   - **Root directory**: `/` (or leave empty)

3. **Environment Variables**:
   - Add any required environment variables in the Pages dashboard

4. **KV Namespace Binding**:
   - In Pages dashboard → Settings → Functions
   - Add KV namespace binding:
     - Variable name: `CAR_LISTINGS`
     - KV namespace: Select your existing KV namespace or create new one

## API Endpoints

Once deployed, your API will be available at:

- `https://your-domain.pages.dev/api/search-autos?brand=toyota&model=yaris`
- `https://your-domain.pages.dev/api/get-cars?brand=toyota&model=yaris`
- `https://your-domain.pages.dev/api/get-all-cars`

## Local Development with Functions

To test Pages Functions locally:

```bash
cd frontend
npm run build
npm run pages:dev
```

This will start a local server with Functions support.

## KV Namespace Setup

If you need to create a new KV namespace:

```bash
wrangler kv:namespace create "CAR_LISTINGS"
wrangler kv:namespace create "CAR_LISTINGS" --preview
```

Update the `wrangler.toml` file with the new namespace IDs.

## Custom Domain

To use a custom domain:

1. Go to Pages dashboard → Custom domains
2. Add your domain
3. Update DNS records as instructed

## Environment Variables

Set these in the Cloudflare Pages dashboard:

- `NODE_ENV`: `production`
- Any other environment variables your app needs

## Troubleshooting

1. **Build Errors**: Check the build logs in the Pages dashboard
2. **Function Errors**: Check the Functions logs in the dashboard
3. **KV Access Issues**: Verify KV namespace binding is correct
4. **CORS Issues**: Functions include CORS headers, but verify in browser dev tools

## Monitoring

- **Analytics**: Available in Cloudflare Pages dashboard
- **Logs**: Real-time logs available in dashboard
- **Performance**: Web Vitals and performance metrics available 
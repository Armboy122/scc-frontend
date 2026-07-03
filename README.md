# SCC Frontend

Smart Cover Connect frontend built with Next.js.

## Target runtime

Production frontend runs on Vercel. It calls the VPS-hosted backend API.

```text
Vercel frontend -> NEXT_PUBLIC_API_BASE_URL -> VPS backend
```

Docker is intentionally not part of the current frontend flow. Vercel builds directly from this repository.

## Local development

1. Copy env template:

```bash
cp .env.example .env.local
```

2. Set API endpoint:

```env
NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:8080/api/v1
```

3. Install and run:

```bash
npm ci --include=dev
npm run dev
```

4. Open:

```bash
open http://127.0.0.1:3000
```

## Test

```bash
npm test
```

## Vercel env

For production, set this in Vercel Project Environment Variables:

```env
NEXT_PUBLIC_API_BASE_URL=https://api.103.117.151.158.sslip.io/api/v1
```

When the permanent API domain is ready, replace the temporary `sslip.io` host with:

```env
NEXT_PUBLIC_API_BASE_URL=https://api.<domain>/api/v1
```

## Vercel deploy checklist

Use these settings when importing `Armboy122/scc-frontend` into Vercel:

| Setting | Value |
|---|---|
| Framework Preset | Next.js |
| Root Directory | `.` |
| Install Command | `npm ci` |
| Build Command | `npm run build` |
| Output Directory | `.next` |
| Node.js | Vercel default / latest LTS |

Before deploying, verify locally:

```bash
npm run lint
npm test
NEXT_PUBLIC_API_BASE_URL=https://api.103.117.151.158.sslip.io/api/v1 npm run build
```

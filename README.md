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
NEXT_PUBLIC_API_BASE_URL=https://api.<domain>/api/v1
```

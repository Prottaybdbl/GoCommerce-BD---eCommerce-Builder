# ADR 0002: Zero-Server-Compute Media Pipeline & Cloudflare Edge Caching

## Status
Accepted

## Date
2026-10-01

## Context
In a multi-tenant SaaS environment hosted on cost-effective infrastructure (such as a 4 GB RAM VPS on Hetzner with Coolify), server-side image processing pipelines (e.g. `sharp`, `jimp`, `imagemagick`) present severe CPU spikes and Out-Of-Memory (OOM) fatal crashing risks. A single merchant uploading 10 uncompressed 15 MB smartphone photos could easily exhaust available memory and crash all tenant API containers.

Furthermore, storefront pages in Bangladesh serve users over high-latency 2G/3G/4G networks. To achieve sub-2-second Largest Contentful Paint (LCP), storefront HTML and images must be served from Cloudflare's edge cache (s-maxage=86400) close to Bangladeshi ISPs (Dhaka/Chittagong edge points), while ensuring that merchant product edits, price modifications, and theme adjustments are immediately reflected via sub-second edge cache purging.

## Decision
1. **Zero Server Image Processing (Invariant #3)**:
   - Never import `sharp` or decode images in `apps/api` or BullMQ worker containers.
   - All image resizing is executed client-side inside the merchant's browser (HTML5 Canvas / Web Worker) before transmission.
   - The client produces exactly three responsive widths: `360px` (small), `720px` (medium), and `1080px` (large).
   - The client prefers WebP encoding and automatically falls back to progressive JPEG if Safari or legacy WebKit fails to encode WebP.
2. **Direct-to-R2 Uploads via AWS SigV4 Presigned URLs**:
   - The merchant API (`POST /v1/media/presign`) generates three presigned PUT URLs using native Node.js `node:crypto` (HMAC-SHA256 SigV4), eliminating heavy external AWS SDK bundle dependencies.
   - The browser uploads the 3 resized image blobs directly to Cloudflare R2 object storage.
3. **Server-Side Metadata Verification (`POST /v1/media/verify`)**:
   - The API verifies uploaded objects solely using HTTP `HEAD` requests to Cloudflare R2.
   - The server validates object presence, content type (`image/webp`, `image/jpeg`, `image/png`), and enforces the ≤ 2 MB file budget.
   - Cross-tenant access is strictly blocked by validating that object keys match `stores/${storeId}/...`.
4. **Cloudflare Edge Caching & Tag-Based Cache Purge (Invariant #8)**:
   - Public storefront responses set `Cache-Control: public, max-age=60, s-maxage=86400, stale-while-revalidate=600` and `Cache-Tag: s:${storeId}, s:${storeId}:products`.
   - In accordance with Invariant #8, cacheable storefront responses strictly forbid the `Set-Cookie` header.
   - Merchant mutations (`POST /v1/products`, `PUT /v1/theme`) trigger `purgeStoreCache(storeId)` via Cloudflare API tag invalidation.

## Technical Consequences & Verification
- **VPS Stability**: Zero CPU or RAM overhead from image processing on the API server.
- **Speed**: Browser-to-R2 direct upload bypasses API proxy bottlenecks.
- **Verified by Automated Tests**:
  - `apps/api/test/media-and-cache.test.ts` (14/14 automated tests passing) verifying SigV4 generation, tenant isolation, 2 MB size limits, MIME checks, edge cache tags, and cookie hygiene.

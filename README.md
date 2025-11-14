## GoModel Trainer – Architecture Notes

This workspace hosts the customer-facing **trainer** app (Next.js 16 + Convex) that
coordinates dataset uploads into Cloudflare R2 and triggers training jobs on the
stand-alone **ai-toolkit** service.

```
Browser ── upload ──► R2 bucket
   │                     │
   │         Convex      │
   └─► trainer actions ──┼────► R2 sync worker (Python) ──► /app/ai-toolkit/datasets/r2
                         │
                         └────► ai-toolkit REST API (/api/jobs, /api/files, …)
```

### Environment variables

`env.example.txt` enumerates everything required by both the Next.js runtime and
Convex actions. The most important values for the ai-toolkit integration are:

| Variable | Description |
| --- | --- |
| `AI_TOOLKIT_URL` | Base URL of the ai-toolkit UI/worker (e.g. `http://ai-toolkit:8675`). |
| `AI_TOOLKIT_AUTH_TOKEN` | Bearer token required by ai-toolkit middleware (`AI_TOOLKIT_AUTH`). |
| `R2_SYNC_WORKER_URL` | HTTP endpoint of the Python worker that mirrors R2 objects to disk. |
| `AITK_R2_DATASETS_ROOT` | Absolute path (inside the ai-toolkit host/container) where synced datasets live. |
| `AITK_DATASETS_FOLDER` / `AITK_TRAINING_FOLDER` | Canonical paths that should be configured inside ai-toolkit `/settings` so the synced datasets and resulting checkpoints are visible to the UI. |

### Contracts

Shared TypeScript definitions live in `convex/integration.ts`. They describe:

* Dataset identity (`datasetId`, `r2Bucket`, `r2Prefix`).
* `SyncDatasetRequest`/`SyncDatasetResponse` payloads that the Convex action sends to the R2 worker (`POST /sync-dataset`).
* ai-toolkit job payloads (`AiToolkitCreateJobRequest`) mirroring `ui/src/app/api/jobs/route.ts`.
* A helper `buildQwenImageEdit2509JobConfig(datasetPath)` that produces the JSON config for the only supported workflow (Qwen Image Edit 2509 on 32 GB GPUs).

These contracts ensure every component—trainer, sync worker, and ai-toolkit—agrees on
paths and JSON structures without duplicating constant strings all over the codebase.

### Running locally

```bash
pnpm install
pnpm dev             # Next.js
npx convex dev       # Convex backend
```

You will also need the ai-toolkit stack running somewhere that is reachable from the
Convex environment. The minimum configuration for ai-toolkit is:

```env
AI_TOOLKIT_AUTH=super-secret-token
AI_TOOLKIT_DATASETS=/app/ai-toolkit/datasets
AI_TOOLKIT_OUTPUT=/app/ai-toolkit/output
```

…and the R2 sync worker should be able to read/write to
`/app/ai-toolkit/datasets/r2`.

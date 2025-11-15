## GoModel Trainer – Architecture Notes

This workspace hosts the customer-facing **trainer** app (Next.js 16 + Convex) that coordinates dataset uploads into Cloudflare R2 and triggers training jobs on RunPod Serverless.

```
Browser ── upload ──► R2 bucket
   │                     │
   │         Convex      │
   └─► trainer actions ──┼────► RunPod Serverless (/run)
                         │            │
                         │            └──► Sync from R2 → Train → Return results
```

### Simplified Architecture (No Middleware)

The trainer now calls RunPod Serverless directly:

1. User uploads images → R2
2. User clicks "Train" → Convex action calls `POST /v2/{endpoint}/run` with:
   - `job_config`: Qwen-Image-Edit-2509 training config
   - `r2_dataset`: {datasetId, bucket, prefix}
3. RunPod worker:
   - Downloads dataset from R2 to local storage
   - Runs ai-toolkit training
   - Returns status/results
4. Trainer polls `/v2/{endpoint}/status/{id}` for progress

**No separate sync worker or ai-toolkit UI needed for training** - just the RunPod Serverless endpoint with GPU workers.

### Environment Variables (Convex Dashboard)

Set these in https://dashboard.convex.dev under your deployment's Environment Variables:

| Variable | Description |
| --- | --- |
| `RUNPOD_ENDPOINT_ID` | Your RunPod Serverless endpoint ID (e.g. `re2sx58p1s4eex`) |
| `RUNPOD_API_KEY` | RunPod API key for calling `/run` and `/status` |
| `R2_BUCKET` | Cloudflare R2 bucket name where datasets are uploaded |

### Environment Variables (RunPod Serverless)

Set these in RunPod console for your serverless endpoint:

| Variable | Description |
| --- | --- |
| `R2_ENDPOINT` | `https://<account-id>.r2.cloudflarestorage.com` |
| `R2_ACCESS_KEY_ID` | R2 access key (must be exactly 32 characters) |
| `R2_SECRET_ACCESS_KEY` | R2 secret key |
| `R2_REGION` | `auto` |
| `HF_TOKEN` | HuggingFace token for downloading Qwen model |

### Contracts

Shared definitions in `convex/integration.ts`:

* Dataset identity (`datasetId`, `r2Bucket`, `r2Prefix`)
* `buildQwenImageEdit2509JobConfig(datasetPath)` - Generates training config
* RunPod API constants

The serverless handler (`ai-toolkit/rp_handler.py`) accepts:

```json
{
  "input": {
    "job_config": { ... },
    "r2_dataset": {
      "datasetId": "...",
      "bucket": "...",
      "prefix": "datasets/..."
    }
  }
}
```

### Running Locally

```bash
pnpm install
pnpm dev             # Next.js
npx convex dev       # Convex backend
```

The Convex backend will call your RunPod Serverless endpoint when training is triggered.

### Testing

1. Upload images via the trainer UI
2. Click "Train Qwen Image Edit 2509"
3. Check Convex logs for RunPod job ID
4. Monitor job status in RunPod dashboard or via "Refresh" button in trainer UI

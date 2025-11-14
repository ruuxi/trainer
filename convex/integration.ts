/**
 * Shared integration contracts between the trainer (Convex backend),
 * the R2 sync worker that lives next to ai-toolkit, and the ai-toolkit
 * job orchestration APIs.
 */

export const AI_TOOLKIT_URL =
  process.env.AI_TOOLKIT_URL ?? 'http://ai-toolkit:8675';

export const AI_TOOLKIT_AUTH_TOKEN = process.env.AI_TOOLKIT_AUTH_TOKEN ?? '';

export const R2_SYNC_WORKER_URL =
  process.env.R2_SYNC_WORKER_URL ?? 'http://ai-toolkit-sync:8080';

/**
 * Absolute path on the ai-toolkit host/container where R2 datasets
 * are synced before a job is submitted.
 */
export const AITK_R2_DATASETS_ROOT =
  process.env.AITK_R2_DATASETS_ROOT ?? '/app/ai-toolkit/datasets/r2';

/**
 * Canonical dataset + training folder roots that should be configured
 * inside ai-toolkit (/settings API or environment variables). These are
 * not strictly required by Convex, but exposing them here makes it easy
 * to keep trainer + worker + ai-toolkit aligned.
 */
export const AITK_DATASETS_FOLDER =
  process.env.AITK_DATASETS_FOLDER ?? '/app/ai-toolkit/datasets';
export const AITK_TRAINING_FOLDER =
  process.env.AITK_TRAINING_FOLDER ?? '/app/ai-toolkit/output';

export const DEFAULT_GPU_IDS = [0];

export const QWEN_IMAGE_EDIT_MODEL = 'Qwen/Qwen-Image-Edit-2509';
export const QWEN_IMAGE_EDIT_ACCURACY_ADAPTER =
  'uint3|ostris/accuracy_recovery_adapters/qwen_image_edit_2509_torchao_uint3.safetensors';

/**
 * Information we store per dataset so we can sync it from R2 before
 * running a training job.
 */
export type DatasetIdentity = {
  datasetId: string;
  r2Bucket: string;
  r2Prefix: string;
};

/**
 * Request/response payloads for the sync worker HTTP API.
 */
export type SyncDatasetRequest = DatasetIdentity & {
  overwrite?: boolean;
};

export type SyncDatasetResponse =
  | {
      ok: true;
      datasetId: string;
      localPath: string;
      alreadySynced: boolean;
      bytesWritten: number;
      objectCount: number;
    }
  | {
      ok: false;
      datasetId: string;
      error: string;
      status?: number;
    };

/**
 * ai-toolkit job creation payload. Mirrors the Next.js API route in
 * ai-toolkit/ui/src/app/api/jobs/route.ts
 */
export type AiToolkitCreateJobRequest = {
  name: string;
  gpu_ids: number[];
  job_config: Record<string, unknown>;
};

export type AiToolkitCreateJobResponse =
  | {
      id: string;
      name: string;
      queue_position: number;
      created_at: string;
    }
  | {
      error: string;
    };

/**
 * Helper to build the minimal job config we need for Qwen Image Edit 2509.
 * Mirrors the defaults defined in ai-toolkit/ui/src/app/jobs/new/options.ts
 */
export const buildQwenImageEdit2509JobConfig = (datasetPath: string) => ({
  process: [
    {
      name: 'qwen_image_edit_plus',
      model: {
        name_or_path: QWEN_IMAGE_EDIT_MODEL,
        quantize: true,
        quantize_te: true,
        low_vram: true,
        qtype: 'qfloat8',
        model_kwargs: {
          match_target_res: false,
        },
        accuracy_recovery_adapter: QWEN_IMAGE_EDIT_ACCURACY_ADAPTER,
      },
      train: {
        noise_scheduler: 'flowmatch',
        timestep_type: 'weighted',
        unload_text_encoder: false,
      },
      sample: {
        sampler: 'flowmatch',
        guidance_scale: 3.5,
      },
      datasets: [
        {
          name: 'primary',
          dataset_path: datasetPath,
          cache_latents: true,
          resolution: 1024,
        },
      ],
    },
  ],
});


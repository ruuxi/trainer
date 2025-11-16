/**
 * Shared integration contracts between the trainer (Convex backend),
 * the R2 sync worker that lives next to ai-toolkit, and the ai-toolkit
 * job orchestration APIs.
 */

// RunPod Serverless endpoint for training jobs
export const RUNPOD_ENDPOINT_ID = process.env.RUNPOD_ENDPOINT_ID;
export const RUNPOD_API_KEY = process.env.RUNPOD_API_KEY ?? '';
export const RUNPOD_API_BASE = 'https://api.runpod.ai/v2';

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

export const QWEN_IMAGE_MODEL = 'Qwen/Qwen-Image';
export const QWEN_IMAGE_ACCURACY_ADAPTER =
  'uint3|ostris/accuracy_recovery_adapters/qwen_image_torchao_uint3.safetensors';

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
 * Note: gpu_ids must be a comma-separated string like "0" or "0,1"
 */
export type AiToolkitCreateJobRequest = {
  name: string;
  gpu_ids: string;
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
 * Helper to build the minimal job config we need for Qwen Image.
 * Based on train_lora_qwen_image_24gb.yaml
 */
export const buildQwenImageJobConfig = (datasetPath: string, jobName: string) => ({
  job: 'extension',
  config: {
    name: jobName,
    process: [
      {
        type: 'diffusion_trainer',
        training_folder: 'output',
        device: 'cuda:0',
        network: {
          type: 'lora',
          linear: 16,
          linear_alpha: 16,
        },
        save: {
          dtype: 'float16',
          save_every: 250,
          max_step_saves_to_keep: 4,
        },
        datasets: [
          {
            folder_path: datasetPath,
            caption_ext: 'txt',
            caption_dropout_rate: 0.05,
            shuffle_tokens: false,
            cache_latents_to_disk: true,
            resolution: [512, 768, 1024],
          },
        ],
        train: {
          batch_size: 1,
          cache_text_embeddings: true,
          steps: 2000,
          gradient_accumulation: 1,
          train_unet: true,
          train_text_encoder: false,
          gradient_checkpointing: true,
          noise_scheduler: 'flowmatch',
          optimizer: 'adamw8bit',
          lr: 0.0001,
          dtype: 'bf16',
        },
        model: {
          name_or_path: QWEN_IMAGE_MODEL,
          arch: 'qwen_image',
          quantize: true,
          qtype: QWEN_IMAGE_ACCURACY_ADAPTER,
          quantize_te: true,
          qtype_te: 'qfloat8',
          low_vram: true,
        },
        sample: {
          sampler: 'flowmatch',
          sample_every: 250,
          width: 1024,
          height: 1024,
          prompts: [
            'woman with red hair, playing chess at the park, bomb going off in the background',
            'a woman holding a coffee cup, in a beanie, sitting at a cafe',
            'a horse is a DJ at a night club, fish eye lens, smoke machine, lazer lights, holding a martini',
            'a man showing off his cool new t shirt at the beach, a shark is jumping out of the water in the background',
            'a bear building a log cabin in the snow covered mountains',
            'woman playing the guitar, on stage, singing a song, laser lights, punk rocker',
            'hipster man with a beard, building a chair, in a wood shop',
            'photo of a man, white background, medium shot, modeling clothing, studio lighting, white backdrop',
            'a man holding a sign that says, \'this is a sign\'',
            'a bulldog, in a post apocalyptic world, with a shotgun, in a leather jacket, in a desert, with a motorcycle',
          ],
          neg: '',
          seed: 42,
          walk_seed: true,
          guidance_scale: 3,
          sample_steps: 25,
        },
      },
    ],
  },
});


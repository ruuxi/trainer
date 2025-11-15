'use node';

import { action } from "./_generated/server";
import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { internal } from "./_generated/api";
import {
  RUNPOD_API_BASE,
  RUNPOD_API_KEY,
  RUNPOD_ENDPOINT_ID,
  buildQwenImageEdit2509JobConfig,
} from "./integration";

type AuthCtx = {
  auth: {
    getUserIdentity: () => Promise<{ subject: string } | null>;
  };
};

const ensureAuth = async (ctx: AuthCtx) => {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throw new Error("Not authenticated");
  }
  return identity;
};

type DatasetRecord = {
  _id: Id<"datasets">;
  userId: string;
  name: string;
  r2Bucket: string;
  r2Prefix: string;
  lastSyncedAt?: number;
};

const runpodHeaders = () => {
  if (!RUNPOD_API_KEY) {
    throw new Error("RUNPOD_API_KEY is not configured");
  }
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${RUNPOD_API_KEY}`,
  };
};

const startRunPodJob = async (payload: {
  job_config: Record<string, unknown>;
  r2_dataset: {
    datasetId: string;
    bucket: string;
    prefix: string;
  };
}) => {
  const url = `${RUNPOD_API_BASE}/${RUNPOD_ENDPOINT_ID}/run`;
  const res = await fetch(url, {
    method: "POST",
    headers: runpodHeaders(),
    body: JSON.stringify({ input: payload }),
  });
  
  if (!res.ok) {
    const errorPayload = await res.text();
    throw new Error(
      `RunPod rejected job (${res.status}): ${errorPayload}`,
    );
  }
  
  return res.json();
};

const fetchRunPodJobStatus = async (jobId: string) => {
  const url = `${RUNPOD_API_BASE}/${RUNPOD_ENDPOINT_ID}/status/${jobId}`;
  const res = await fetch(url, {
    headers: runpodHeaders(),
  });
  
  if (!res.ok) {
    throw new Error(
      `Failed to fetch RunPod job ${jobId} status (${res.status})`,
    );
  }
  
  return res.json();
};

export const startQwenImageEditJob = action({
  args: {
    datasetId: v.id("datasets"),
  },
  returns: v.object({
    jobId: v.id("jobs"),
    runpodJobId: v.string(),
  }),
  handler: async (ctx, args): Promise<{
    jobId: Id<"jobs">;
    runpodJobId: string;
  }> => {
    const identity = await ensureAuth(ctx);

    const dataset: DatasetRecord | null = await ctx.runQuery(
      internal.jobs_helpers.getDatasetInternal,
      {
        datasetId: args.datasetId,
        userId: identity.subject,
      },
    );

    if (!dataset) {
      throw new Error("Dataset not found");
    }

    // Build job config (placeholder path will be replaced by serverless worker)
    const jobName = `qwen-2509-${dataset.name}-${Date.now()}`;
    const jobConfig = buildQwenImageEdit2509JobConfig("/workspace/datasets/placeholder", jobName);

    // Call RunPod serverless endpoint
    const runpodJob = await startRunPodJob({
      job_config: jobConfig,
      r2_dataset: {
        datasetId: dataset._id,
        bucket: dataset.r2Bucket,
        prefix: dataset.r2Prefix,
      },
    });

    const now = Date.now();
    const jobId: Id<"jobs"> = await ctx.runMutation(
      internal.jobs_helpers.createJobRecord,
      {
        datasetId: args.datasetId,
        userId: identity.subject,
        runpodJobId: runpodJob.id,
        status: runpodJob.status ?? "IN_QUEUE",
        gpuIds: [0],
        createdAt: now,
        updatedAt: now,
      },
    );

    await ctx.runMutation(internal.jobs_helpers.updateDatasetSync, {
      datasetId: args.datasetId,
      lastSyncedAt: now,
      updatedAt: now,
    });

    return {
      jobId,
      runpodJobId: runpodJob.id,
    };
  },
});

export const syncJobsForDataset = action({
  args: {
    datasetId: v.id("datasets"),
  },
  returns: v.object({
    synced: v.number(),
  }),
  handler: async (ctx, args) => {
    const identity = await ensureAuth(ctx);
    
    const dataset: DatasetRecord | null = await ctx.runQuery(
      internal.jobs_helpers.getDatasetInternal,
      {
        datasetId: args.datasetId,
        userId: identity.subject,
      },
    );

    if (!dataset) {
      throw new Error("Dataset not found");
    }

    const jobs = await ctx.runQuery(internal.jobs_helpers.listJobsInternal, {
      datasetId: args.datasetId,
    });

    const now = Date.now();
    let synced = 0;

    for (const job of jobs) {
      if (!job.aiToolkitJobId) {
        continue;
      }
      try {
        // Fetch status from RunPod
        const runpodStatus = await fetchRunPodJobStatus(job.aiToolkitJobId);
        
        const newStatus = runpodStatus.status ?? job.status;
        
        // Extract R2 output paths if present
        const output = runpodStatus.output || {};
        const r2Outputs = output.r2_outputs || {};
        const checkpointPaths = r2Outputs.checkpoints || [];
        const samplePaths = r2Outputs.samples || [];
        
        await ctx.runMutation(internal.jobs_helpers.updateJobStatus, {
          jobId: job._id,
          status: newStatus,
          updatedAt: now,
          lastStatusSync: now,
          runpodOutput: runpodStatus.output,
          checkpointPaths: checkpointPaths.length > 0 ? checkpointPaths : undefined,
          samplePaths: samplePaths.length > 0 ? samplePaths : undefined,
        });
        synced += 1;
      } catch (error) {
        console.error("Failed to sync job", job.aiToolkitJobId, error);
      }
    }

    return { synced };
  },
});

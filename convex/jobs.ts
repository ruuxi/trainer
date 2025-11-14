'use node';

import { action, query, internalMutation, internalQuery } from "./_generated/server";
import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { internal } from "./_generated/api";
import {
  AI_TOOLKIT_AUTH_TOKEN,
  AI_TOOLKIT_URL,
  DEFAULT_GPU_IDS,
  R2_SYNC_WORKER_URL,
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

const syncDataset = async (
  dataset: DatasetRecord,
  overwrite: boolean,
) => {
  const res = await fetch(`${R2_SYNC_WORKER_URL}/sync-dataset`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      datasetId: dataset._id,
      bucket: dataset.r2Bucket,
      prefix: dataset.r2Prefix,
      overwrite,
    }),
  });
  if (!res.ok) {
    const payload = await res.text();
    throw new Error(
      `Sync worker failed (${res.status}): ${payload}`,
    );
  }
  const json = await res.json();
  if (!json.ok) {
    throw new Error(
      `Sync worker error for dataset ${dataset._id}: ${json.error}`,
    );
  }
  return json.localPath as string;
};

const authHeaders = () => {
  if (!AI_TOOLKIT_AUTH_TOKEN) {
    throw new Error("AI_TOOLKIT_AUTH_TOKEN is not configured");
  }
  return {
    Authorization: `Bearer ${AI_TOOLKIT_AUTH_TOKEN}`,
  };
};

const createAiToolkitJob = async (payload: {
  name: string;
  gpu_ids: number[];
  job_config: Record<string, unknown>;
}) => {
  const res = await fetch(`${AI_TOOLKIT_URL}/api/jobs`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(),
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const errorPayload = await res.text();
    throw new Error(
      `ai-toolkit rejected job (${res.status}): ${errorPayload}`,
    );
  }
  return res.json();
};

const fetchAiToolkitJob = async (jobId: string) => {
  const res = await fetch(
    `${AI_TOOLKIT_URL}/api/jobs?id=${encodeURIComponent(jobId)}`,
    {
      headers: authHeaders(),
    },
  );
  if (!res.ok) {
    throw new Error(
      `Failed to fetch job ${jobId} from ai-toolkit (${res.status})`,
    );
  }
  return res.json();
};

const fetchSamples = async (jobId: string) => {
  const res = await fetch(
    `${AI_TOOLKIT_URL}/api/jobs/${jobId}/samples`,
    { headers: authHeaders() },
  );
  if (!res.ok) {
    return [];
  }
  const json = await res.json();
  return (json.samples ?? []) as string[];
};

const fetchFiles = async (jobId: string) => {
  const res = await fetch(
    `${AI_TOOLKIT_URL}/api/jobs/${jobId}/files`,
    { headers: authHeaders() },
  );
  if (!res.ok) {
    return [];
  }
  const json = await res.json();
  const files = (json.files ?? []) as { path: string }[];
  return files.map((file) => file.path);
};

// Internal query to get dataset with ownership check
export const getDatasetInternal = internalQuery({
  args: {
    datasetId: v.id("datasets"),
    userId: v.string(),
  },
  returns: v.union(
    v.object({
      _id: v.id("datasets"),
      _creationTime: v.number(),
      userId: v.string(),
      name: v.string(),
      r2Bucket: v.string(),
      r2Prefix: v.string(),
      r2ObjectCount: v.optional(v.number()),
      r2Bytes: v.optional(v.number()),
      lastSyncedAt: v.optional(v.number()),
      lastSyncedPath: v.optional(v.string()),
      createdAt: v.number(),
      updatedAt: v.number(),
      description: v.optional(v.string()),
    }),
    v.null(),
  ),
  handler: async (ctx, args) => {
    const dataset = await ctx.db.get(args.datasetId);
    if (!dataset || dataset.userId !== args.userId) {
      return null;
    }
    return dataset;
  },
});

// Internal mutation to create job record
export const createJobRecord = internalMutation({
  args: {
    datasetId: v.id("datasets"),
    userId: v.string(),
    aiToolkitJobId: v.optional(v.string()),
    aiToolkitJobName: v.optional(v.string()),
    status: v.string(),
    gpuIds: v.array(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
    lastStatusSync: v.number(),
  },
  returns: v.id("jobs"),
  handler: async (ctx, args) => {
    return await ctx.db.insert("jobs", {
      datasetId: args.datasetId,
      userId: args.userId,
      createdAt: args.createdAt,
      updatedAt: args.updatedAt,
      aiToolkitJobId: args.aiToolkitJobId,
      aiToolkitJobName: args.aiToolkitJobName,
      status: args.status,
      gpuIds: args.gpuIds,
      lastStatusSync: args.lastStatusSync,
    });
  },
});

// Internal mutation to update dataset sync metadata
export const updateDatasetSync = internalMutation({
  args: {
    datasetId: v.id("datasets"),
    lastSyncedAt: v.number(),
    lastSyncedPath: v.string(),
    updatedAt: v.number(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.datasetId, {
      lastSyncedAt: args.lastSyncedAt,
      lastSyncedPath: args.lastSyncedPath,
      updatedAt: args.updatedAt,
    });
    return null;
  },
});

// Internal query to list jobs for a dataset
export const listJobsInternal = internalQuery({
  args: {
    datasetId: v.id("datasets"),
  },
  returns: v.array(
    v.object({
      _id: v.id("jobs"),
      _creationTime: v.number(),
      datasetId: v.id("datasets"),
      userId: v.string(),
      createdAt: v.number(),
      updatedAt: v.number(),
      aiToolkitJobId: v.optional(v.string()),
      aiToolkitJobName: v.optional(v.string()),
      status: v.string(),
      gpuIds: v.array(v.number()),
      lastStatusSync: v.optional(v.number()),
      samplePaths: v.optional(v.array(v.string())),
      checkpointPaths: v.optional(v.array(v.string())),
    }),
  ),
  handler: async (ctx, args) => {
    return await ctx.db
      .query("jobs")
      .withIndex("datasetId", (q) => q.eq("datasetId", args.datasetId))
      .take(25);
  },
});

// Internal mutation to update job status
export const updateJobStatus = internalMutation({
  args: {
    jobId: v.id("jobs"),
    status: v.string(),
    updatedAt: v.number(),
    lastStatusSync: v.number(),
    samplePaths: v.array(v.string()),
    checkpointPaths: v.array(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.jobId, {
      status: args.status,
      updatedAt: args.updatedAt,
      lastStatusSync: args.lastStatusSync,
      samplePaths: args.samplePaths,
      checkpointPaths: args.checkpointPaths,
    });
    return null;
  },
});

export const startQwenImageEditJob = action({
  args: {
    datasetId: v.id("datasets"),
    overwriteSync: v.optional(v.boolean()),
  },
  returns: v.object({
    jobId: v.id("jobs"),
    aiToolkitJobId: v.optional(v.string()),
    jobName: v.string(),
    datasetPath: v.string(),
  }),
  handler: async (ctx, args): Promise<{
    jobId: Id<"jobs">;
    aiToolkitJobId: string | undefined;
    jobName: string;
    datasetPath: string;
  }> => {
    const identity = await ensureAuth(ctx);

    const dataset: DatasetRecord | null = await ctx.runQuery(
      internal.jobs.getDatasetInternal,
      {
        datasetId: args.datasetId,
        userId: identity.subject,
      },
    );

    if (!dataset) {
      throw new Error("Dataset not found");
    }

    const localPath: string = await syncDataset(
      dataset,
      args.overwriteSync ?? false,
    );

    const jobName: string = `qwen-2509-${dataset.name}-${Date.now()}`;
    const jobConfig = buildQwenImageEdit2509JobConfig(localPath);
    const gpuIds = DEFAULT_GPU_IDS;

    const aiToolkitJob = await createAiToolkitJob({
      name: jobName,
      gpu_ids: gpuIds,
      job_config: jobConfig,
    });

    const now = Date.now();
    const jobId: Id<"jobs"> = await ctx.runMutation(
      internal.jobs.createJobRecord,
      {
        datasetId: args.datasetId,
        userId: identity.subject,
        aiToolkitJobId: aiToolkitJob.id,
        aiToolkitJobName: aiToolkitJob.name ?? jobName,
        status: "queued",
        gpuIds,
        createdAt: now,
        updatedAt: now,
        lastStatusSync: now,
      },
    );

    await ctx.runMutation(internal.jobs.updateDatasetSync, {
      datasetId: args.datasetId,
      lastSyncedAt: now,
      lastSyncedPath: localPath,
      updatedAt: now,
    });

    return {
      jobId,
      aiToolkitJobId: aiToolkitJob.id,
      jobName,
      datasetPath: localPath,
    };
  },
});

export const listJobsForDataset = query({
  args: {
    datasetId: v.id("datasets"),
  },
  returns: v.array(
    v.object({
      _id: v.id("jobs"),
      _creationTime: v.number(),
      datasetId: v.id("datasets"),
      userId: v.string(),
      createdAt: v.number(),
      updatedAt: v.number(),
      aiToolkitJobId: v.optional(v.string()),
      aiToolkitJobName: v.optional(v.string()),
      status: v.string(),
      gpuIds: v.array(v.number()),
      lastStatusSync: v.optional(v.number()),
      samplePaths: v.optional(v.array(v.string())),
      checkpointPaths: v.optional(v.array(v.string())),
    }),
  ),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const dataset = await ctx.db.get(args.datasetId);
    if (!dataset || dataset.userId !== identity.subject) {
      throw new Error("Dataset not found");
    }

    return ctx.db
      .query("jobs")
      .withIndex("datasetId", (q) => q.eq("datasetId", args.datasetId))
      .order("desc")
      .take(25);
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
      internal.jobs.getDatasetInternal,
      {
        datasetId: args.datasetId,
        userId: identity.subject,
      },
    );

    if (!dataset) {
      throw new Error("Dataset not found");
    }

    const jobs = await ctx.runQuery(internal.jobs.listJobsInternal, {
      datasetId: args.datasetId,
    });

    const now = Date.now();
    let synced = 0;

    for (const job of jobs) {
      if (!job.aiToolkitJobId) {
        continue;
      }
      try {
        const remoteJob = await fetchAiToolkitJob(job.aiToolkitJobId);
        const samples = await fetchSamples(job.aiToolkitJobId);
        const files = await fetchFiles(job.aiToolkitJobId);
        
        await ctx.runMutation(internal.jobs.updateJobStatus, {
          jobId: job._id,
          status: remoteJob.status ?? job.status,
          updatedAt: now,
          lastStatusSync: now,
          samplePaths: samples,
          checkpointPaths: files,
        });
        synced += 1;
      } catch (error) {
        console.error("Failed to sync job", job.aiToolkitJobId, error);
      }
    }

    return { synced };
  },
});

import { internalMutation, internalQuery, query } from "./_generated/server";
import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";

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
    runpodJobId: v.string(),
    status: v.string(),
    gpuIds: v.array(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  },
  returns: v.id("jobs"),
  handler: async (ctx, args) => {
    return await ctx.db.insert("jobs", {
      datasetId: args.datasetId,
      userId: args.userId,
      createdAt: args.createdAt,
      updatedAt: args.updatedAt,
      aiToolkitJobId: args.runpodJobId,
      aiToolkitJobName: `qwen-job-${args.runpodJobId}`,
      status: args.status,
      gpuIds: args.gpuIds,
      lastStatusSync: args.createdAt,
    });
  },
});

// Internal mutation to update dataset sync metadata
export const updateDatasetSync = internalMutation({
  args: {
    datasetId: v.id("datasets"),
    lastSyncedAt: v.number(),
    updatedAt: v.number(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.datasetId, {
      lastSyncedAt: args.lastSyncedAt,
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
    runpodOutput: v.optional(v.any()),
    checkpointPaths: v.optional(v.array(v.string())),
    samplePaths: v.optional(v.array(v.string())),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const update: {
      status: string;
      updatedAt: number;
      lastStatusSync: number;
      checkpointPaths?: string[];
      samplePaths?: string[];
    } = {
      status: args.status,
      updatedAt: args.updatedAt,
      lastStatusSync: args.lastStatusSync,
    };

    if (args.checkpointPaths) {
      update.checkpointPaths = args.checkpointPaths;
    }
    if (args.samplePaths) {
      update.samplePaths = args.samplePaths;
    }

    await ctx.db.patch(args.jobId, update);
    return null;
  },
});

// Public query to list jobs for a dataset
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

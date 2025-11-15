import { query } from "./_generated/server";
import { v } from "convex/values";

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


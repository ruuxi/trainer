import { mutation } from "./_generated/server";
import { v } from "convex/values";

const R2_BUCKET = process.env.R2_BUCKET;

if (!R2_BUCKET) {
  throw new Error("R2_BUCKET must be configured to create datasets");
}

export const create = mutation({
  args: {
    name: v.string(),
    description: v.optional(v.string()),
  },
  returns: v.object({
    datasetId: v.id("datasets"),
  }),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const now = Date.now();
    const datasetId = await ctx.db.insert("datasets", {
      userId: identity.subject,
      name: args.name,
      description: args.description,
      createdAt: now,
      updatedAt: now,
      r2Bucket: R2_BUCKET,
      r2Prefix: "",
      r2ObjectCount: 0,
      r2Bytes: 0,
    });

    await ctx.db.patch(datasetId, {
      r2Prefix: `datasets/${datasetId}/data`,
      updatedAt: Date.now(),
    });

    return { datasetId };
  },
});



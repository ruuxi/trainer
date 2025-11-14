import { mutation } from "./_generated/server";
import { v } from "convex/values";

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

    const datasetId = await ctx.db.insert("datasets", {
      userId: identity.subject,
      name: args.name,
      description: args.description,
      createdAt: Date.now(),
    });

    return { datasetId };
  },
});



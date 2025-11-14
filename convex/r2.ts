import { R2 } from "@convex-dev/r2";
import { components } from "./_generated/api";
import { mutation } from "./_generated/server";
import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import type { MutationCtx, QueryCtx } from "./_generated/server";

const r2 = new R2(components.r2);

type Identity = {
  subject: string;
};

type ConvexCtx = QueryCtx | MutationCtx;
type AuthCtx = Pick<ConvexCtx, "auth">;
type DbCtx = Pick<ConvexCtx, "db">;

const getIdentity = async (ctx: AuthCtx) => {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throw new Error("Not authenticated");
  }
  return identity;
};

const assertDatasetOwner = async (
  ctx: DbCtx,
  datasetId: Id<"datasets">,
  userId: string,
) => {
  const dataset = await ctx.db.get(datasetId);
  if (!dataset || dataset.userId !== userId) {
    throw new Error("Dataset not found");
  }
  return dataset;
};

const buildDatasetKey = (datasetId: Id<"datasets">) =>
  `datasets/${datasetId}/images/${crypto.randomUUID()}`;

const extractDatasetIdFromKey = (key: string): Id<"datasets"> | null => {
  const parts = key.split("/");
  if (parts.length < 3) {
    return null;
  }
  if (parts[0] !== "datasets") {
    return null;
  }
  return parts[1] as Id<"datasets">;
};

export const generateUploadUrl = mutation({
  args: {
    datasetId: v.id("datasets"),
  },
  returns: v.object({
    key: v.string(),
    url: v.string(),
  }),
  handler: async (ctx, args) => {
    const identity = await getIdentity(ctx);
    await assertDatasetOwner(ctx, args.datasetId, identity.subject);
    const key = buildDatasetKey(args.datasetId);
    const { url } = await r2.generateUploadUrl(key);
    return { key, url };
  },
});

export const { syncMetadata } = r2.clientApi({
  checkUpload: async (ctx) => {
    await getIdentity(ctx);
  },
  onUpload: async (ctx, bucket, key) => {
    const identity = await getIdentity(ctx);
    const datasetId = extractDatasetIdFromKey(key);
    if (!datasetId) {
      throw new Error("Invalid dataset key");
    }
    await assertDatasetOwner(ctx, datasetId, identity.subject);
    await ctx.db.insert("datasetImages", {
      datasetId,
      userId: identity.subject,
      key,
      bucket,
      createdAt: Date.now(),
    });
  },
});


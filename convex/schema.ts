import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

/**
 * Convex data model.
 *
 * Add new tables and indexes here to keep generated types in sync with the
 * actual data we store.
 */
export default defineSchema({
  todos: defineTable({
    text: v.string(),
    completed: v.boolean(),
    userId: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("userId", ["userId"]),
  datasets: defineTable({
    userId: v.string(),
    name: v.string(),
    description: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
    r2Bucket: v.string(),
    r2Prefix: v.string(),
    r2ObjectCount: v.optional(v.number()),
    r2Bytes: v.optional(v.number()),
    lastSyncedAt: v.optional(v.number()),
    lastSyncedPath: v.optional(v.string()),
  }).index("userId", ["userId"]),
  datasetImages: defineTable({
    datasetId: v.id("datasets"),
    userId: v.string(),
    key: v.string(),
    bucket: v.string(),
    createdAt: v.number(),
  })
    .index("datasetId", ["datasetId"])
    .index("userId", ["userId"]),
  jobs: defineTable({
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
  })
    .index("datasetId", ["datasetId"])
    .index("userId", ["userId"]),
});


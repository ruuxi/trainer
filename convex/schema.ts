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
});


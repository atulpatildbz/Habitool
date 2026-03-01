import { defineSchema, defineTable } from "convex/server";
import { authTables } from "@convex-dev/auth/server";
import { v } from "convex/values";

export default defineSchema({
  ...authTables,
  habits: defineTable({
    userId: v.id("users"),
    name: v.string(),
    color: v.string(),
    icon: v.optional(v.string()),
    target: v.number(),
    streakGoal: v.optional(v.number()),
  }).index("by_user", ["userId"]),
  logs: defineTable({
    userId: v.id("users"),
    habitId: v.id("habits"),
    date: v.string(),
    value: v.number(),
  }).index("by_user", ["userId"]).index("by_habit_date", ["habitId", "date"]),
});

import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

export const get = query({
  args: {},
  handler: async (ctx: any) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    return await ctx.db.query("habits")
      .withIndex("by_user", (q: any) => q.eq("userId", userId))
      .collect();
  },
});

export const create = mutation({
  args: {
    name: v.string(),
    color: v.string(),
    icon: v.optional(v.string()),
    target: v.number(),
    streakGoal: v.optional(v.number()),
  },
  handler: async (ctx: any, args: any) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    return await ctx.db.insert("habits", { ...args, userId });
  },
});

export const update = mutation({
  args: {
    id: v.id("habits"),
    name: v.optional(v.string()),
    color: v.optional(v.string()),
    icon: v.optional(v.string()),
    target: v.optional(v.number()),
    streakGoal: v.optional(v.number()),
  },
  handler: async (ctx: any, args: any) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const { id, ...updates } = args;
    const existing = await ctx.db.get(id);
    if (existing?.userId !== userId) throw new Error("Unauthorized");
    await ctx.db.patch(id, updates);
  },
});

export const remove = mutation({
  args: { id: v.id("habits") },
  handler: async (ctx: any, args: any) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const existing = await ctx.db.get(args.id);
    if (existing?.userId !== userId) throw new Error("Unauthorized");
    await ctx.db.delete(args.id);

    const logs = await ctx.db.query("logs")
      .withIndex("by_habit_date", (q: any) => q.eq("habitId", args.id))
      .collect();
    for (const log of logs) {
      await ctx.db.delete(log._id);
    }
  },
});

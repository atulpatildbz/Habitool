import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

export const get = query({
  args: {},
  handler: async (ctx: any) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    return await ctx.db.query("logs")
      .withIndex("by_user", (q: any) => q.eq("userId", userId))
      .collect();
  },
});

export const toggle = mutation({
  args: { habitId: v.id("habits"), date: v.string(), target: v.number() },
  handler: async (ctx: any, args: any) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const existing = await ctx.db.query("logs")
      .withIndex("by_habit_date", (q: any) => q.eq("habitId", args.habitId).eq("date", args.date))
      .first();

    if (existing) {
      const newValue = existing.value >= args.target ? 0 : args.target;
      if (newValue === 0) {
        await ctx.db.delete(existing._id);
      } else {
        await ctx.db.patch(existing._id, { value: newValue });
      }
    } else {
      await ctx.db.insert("logs", {
        userId,
        habitId: args.habitId,
        date: args.date,
        value: args.target,
      });
    }
  },
});

export const update = mutation({
  args: { habitId: v.id("habits"), date: v.string(), value: v.number() },
  handler: async (ctx: any, args: any) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const existing = await ctx.db.query("logs")
      .withIndex("by_habit_date", (q: any) => q.eq("habitId", args.habitId).eq("date", args.date))
      .first();

    if (existing) {
      if (args.value <= 0) {
        await ctx.db.delete(existing._id);
      } else {
        await ctx.db.patch(existing._id, { value: args.value });
      }
    } else if (args.value > 0) {
      await ctx.db.insert("logs", {
        userId,
        habitId: args.habitId,
        date: args.date,
        value: args.value,
      });
    }
  },
});

import { internalMutation, internalQuery } from "./_generated/server";
import { v } from "convex/values";

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function assertReasonableEmail(email: string) {
  if (!email.includes("@")) {
    throw new Error("Expected a valid email address.");
  }
}

export const list = internalQuery({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("allowedEmails").collect();
  },
});

export const grant = internalMutation({
  args: {
    email: v.string(),
    role: v.optional(v.union(v.literal("admin"), v.literal("user"))),
  },
  handler: async (ctx, args) => {
    const email = normalizeEmail(args.email);
    assertReasonableEmail(email);
    const now = Date.now();
    const role = args.role ?? "user";

    const existing = await ctx.db
      .query("allowedEmails")
      .withIndex("by_email", (q) => q.eq("email", email))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, { role, updatedAt: now });
      return existing._id;
    }

    return await ctx.db.insert("allowedEmails", {
      email,
      role,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const revoke = internalMutation({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    const email = normalizeEmail(args.email);
    const existing = await ctx.db
      .query("allowedEmails")
      .withIndex("by_email", (q) => q.eq("email", email))
      .first();

    if (!existing) return false;
    await ctx.db.delete(existing._id);
    return true;
  },
});

export const setRole = internalMutation({
  args: {
    email: v.string(),
    role: v.union(v.literal("admin"), v.literal("user")),
  },
  handler: async (ctx, args) => {
    const email = normalizeEmail(args.email);
    const existing = await ctx.db
      .query("allowedEmails")
      .withIndex("by_email", (q) => q.eq("email", email))
      .first();

    if (!existing) {
      throw new Error(`No allowlist entry exists for ${email}`);
    }

    await ctx.db.patch(existing._id, { role: args.role, updatedAt: Date.now() });
    return existing._id;
  },
});

import { getAuthUserId } from "@convex-dev/auth/server";
import { query } from "./_generated/server";

export const getCurrent = query({
  args: {},
  handler: async (ctx: any) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    const user = await ctx.db.get(userId);
    if (!user) return null;

    return {
      name: user.name ?? null,
      email: user.email ?? null,
      image: user.image ?? null,
    };
  },
});

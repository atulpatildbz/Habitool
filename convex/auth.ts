import { convexAuth } from "@convex-dev/auth/server";
import Google from "@auth/core/providers/google";
import { Anonymous } from "@convex-dev/auth/providers/Anonymous";

const MOBILE_REDIRECT_URI = "habitool://auth";

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [Google, Anonymous],
  callbacks: {
    async redirect({ redirectTo }) {
      const siteUrl = process.env.SITE_URL?.replace(/\/$/, "");

      if (!siteUrl) {
        throw new Error("Missing environment variable `SITE_URL`");
      }

      if (redirectTo.startsWith("?") || redirectTo.startsWith("/")) {
        return `${siteUrl}${redirectTo}`;
      }

      if (redirectTo.startsWith(siteUrl)) {
        const after = redirectTo[siteUrl.length];
        if (after === undefined || after === "?" || after === "/") {
          return redirectTo;
        }
      }

      if (
        redirectTo === MOBILE_REDIRECT_URI ||
        redirectTo.startsWith(`${MOBILE_REDIRECT_URI}?`) ||
        redirectTo.startsWith(`${MOBILE_REDIRECT_URI}#`)
      ) {
        return redirectTo;
      }

      throw new Error(
        `Invalid \`redirectTo\` ${redirectTo} for configured SITE_URL: ${siteUrl}`,
      );
    },
    async beforeSessionCreation(ctx, { userId }) {
      const user = await ctx.db.get(userId);
      const email = typeof user?.email === "string" ? user.email.toLowerCase() : "";
      const db = (ctx as any).db;
      const allowed = email
        ? await db
            .query("allowedEmails")
            .withIndex("by_email", (q) => q.eq("email", email))
            .first()
        : null;

      if (!allowed) {
        throw new Error("This email is not allowed to access this app.");
      }
    },
  },
});

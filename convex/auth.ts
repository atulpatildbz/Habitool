import { convexAuth } from "@convex-dev/auth/server";
import Google from "@auth/core/providers/google";
import { Anonymous } from "@convex-dev/auth/providers/Anonymous";

const MOBILE_REDIRECT_URI = "habitool://auth";

function normalizeUrl(value?: string): string | null {
  if (!value) return null;
  return value.replace(/\/$/, "");
}

function isLoopbackUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.hostname === "localhost" || url.hostname === "127.0.0.1";
  } catch {
    return false;
  }
}

function resolveSiteUrl(): string {
  const candidates = [normalizeUrl(process.env.SITE_URL), normalizeUrl(process.env.APP_URL)].filter(
    (value): value is string => Boolean(value),
  );

  const nonLoopback = candidates.find((value) => !isLoopbackUrl(value));
  const resolved = nonLoopback ?? candidates[0];

  if (!resolved) {
    throw new Error("Missing environment variable `SITE_URL` (or `APP_URL` as fallback)");
  }

  return resolved;
}

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [Google, Anonymous],
  callbacks: {
    async redirect({ redirectTo }) {
      const siteUrl = resolveSiteUrl();

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

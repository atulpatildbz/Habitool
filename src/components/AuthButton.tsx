import { useAuthActions } from "@convex-dev/auth/react";
import { App as CapacitorApp } from "@capacitor/app";
import { Browser } from "@capacitor/browser";
import { ConvexHttpClient } from "convex/browser";
import { useConvexAuth } from "convex/react";
import { Cloud, LogIn, LogOut } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { isNativeApp } from "../lib/platform";

const NATIVE_REDIRECT_URI = "habitool://auth";
const OAUTH_VERIFIER_STORAGE_KEY_PREFIX = "__convexAuthOAuthVerifier_";

export function AuthButton() {
  const convexUrl = import.meta.env.VITE_CONVEX_URL;

  if (!convexUrl) {
    return (
      <button
        disabled
        className="inline-flex items-center gap-2 px-3 py-2 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-400 cursor-not-allowed text-xs sm:text-sm font-medium"
        title="Set VITE_CONVEX_URL in .env.local to enable sign-in"
        aria-label="Auth setup required"
      >
        <LogIn size={16} />
        <span className="hidden sm:inline">Auth Disabled</span>
      </button>
    );
  }

  if (isNativeApp()) {
    return <NativeSyncButton />;
  }

  return <AuthButtonInner />;
}

function NativeSyncButton() {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const { signIn, signOut } = useAuthActions();
  const [isNativeGoogleSigningIn, setIsNativeGoogleSigningIn] = useState(false);
  const convexUrl = import.meta.env.VITE_CONVEX_URL as string | undefined;

  const verifierStorageKey = useMemo(() => {
    if (!convexUrl) return null;
    return `${OAUTH_VERIFIER_STORAGE_KEY_PREFIX}${convexUrl.replace(/[^a-zA-Z0-9]/g, "")}`;
  }, [convexUrl]);

  useEffect(() => {
    if (!isNativeApp()) return;

    let listener: { remove: () => Promise<void> } | undefined;

    void CapacitorApp.addListener("appUrlOpen", async ({ url }) => {
      try {
        const parsed = new URL(url);
        if (parsed.protocol !== "habitool:" || parsed.hostname !== "auth") return;

        const code = parsed.searchParams.get("code");
        if (!code) return;

        await Browser.close().catch(() => undefined);
        await (signIn as any)(undefined, { code });
      } catch (error) {
        console.error("Failed to complete native Google sign-in", error);
      } finally {
        setIsNativeGoogleSigningIn(false);
      }
    }).then((handle) => {
      listener = handle;
    });

    return () => {
      if (listener) {
        void listener.remove();
      }
    };
  }, [signIn]);

  const startNativeGoogleSignIn = async () => {
    if (!convexUrl || !verifierStorageKey) return;

    setIsNativeGoogleSigningIn(true);

    try {
      const client = new ConvexHttpClient(convexUrl);
      const result = await client.action("auth:signIn" as any, {
        provider: "google",
        params: { redirectTo: NATIVE_REDIRECT_URI },
        calledBy: "capacitor-native-google",
      });

      if (!result?.redirect || !result?.verifier) {
        throw new Error("Unexpected auth response from backend");
      }

      localStorage.setItem(verifierStorageKey, result.verifier);
      await Browser.open({ url: result.redirect });
    } catch (error) {
      console.error("Failed to start native Google sign-in", error);
      setIsNativeGoogleSigningIn(false);
    }
  };

  if (isLoading || isNativeGoogleSigningIn) {
    return (
      <div
        className="h-10 w-24 animate-pulse rounded-full bg-zinc-200 dark:bg-zinc-800"
        aria-label="Loading auth state"
      />
    );
  }

  if (isAuthenticated) {
    return (
      <div className="flex items-center gap-2">
        <div className="inline-flex items-center gap-1.5 px-2.5 py-2 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300 text-xs sm:text-sm font-medium">
          <Cloud size={14} />
          <span className="hidden sm:inline">Sync On</span>
        </div>
        <button
          onClick={() => signOut()}
          className="inline-flex items-center gap-1.5 px-2.5 py-2 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200 text-xs sm:text-sm font-medium hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
          title="Disable sync"
          aria-label="Disable sync"
        >
          <LogOut size={14} />
          <span className="hidden sm:inline">Disable</span>
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={startNativeGoogleSignIn}
      className="inline-flex items-center gap-1.5 px-2.5 py-2 rounded-full bg-emerald-600 text-white text-xs sm:text-sm font-medium hover:bg-emerald-700 transition-colors"
      title="Sign in with Google to enable cloud sync"
      aria-label="Sign in with Google to enable cloud sync"
    >
      <LogIn size={14} />
      <span className="hidden sm:inline">Google Sync</span>
    </button>
  );
}

function AuthButtonInner() {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const { signIn, signOut } = useAuthActions();

  if (isLoading) {
    return (
      <div
        className="h-10 w-24 sm:w-36 animate-pulse rounded-full bg-zinc-200 dark:bg-zinc-800"
        aria-label="Loading auth state"
      />
    );
  }

  if (isAuthenticated) {
    return (
      <div className="flex items-center gap-2">
        <div className="inline-flex items-center gap-2 px-2.5 sm:px-3 py-2 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300 text-xs sm:text-sm font-medium">
          <span className="w-2 h-2 rounded-full bg-emerald-500" />
          <span className="hidden sm:inline">Signed In</span>
        </div>
        <button
          onClick={() => signOut()}
          className="inline-flex items-center gap-2 px-2.5 sm:px-3 py-2 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200 text-xs sm:text-sm font-medium hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
          title="Log out"
          aria-label="Log out"
        >
          <LogOut size={16} />
          <span className="hidden sm:inline">Log Out</span>
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => signIn("google")}
      className="inline-flex items-center gap-2 px-2.5 sm:px-3 py-2 rounded-full bg-blue-600 text-white text-xs sm:text-sm font-medium hover:bg-blue-700 transition-colors"
      title="Sign in with Google"
      aria-label="Sign in with Google"
    >
      <LogIn size={16} />
      <span className="hidden sm:inline">Sign In with Google</span>
    </button>
  );
}

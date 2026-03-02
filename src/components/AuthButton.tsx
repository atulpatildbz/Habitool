import { useAuthActions } from "@convex-dev/auth/react";
import { App as CapacitorApp } from "@capacitor/app";
import { Browser } from "@capacitor/browser";
import { ConvexHttpClient } from "convex/browser";
import { useConvexAuth, useQuery } from "convex/react";
import { LogIn, LogOut, Settings, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { isNativeApp } from "../lib/platform";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
// @ts-ignore
import { api } from "../../convex/_generated/api";

const NATIVE_REDIRECT_URI = "habitool://auth";
const OAUTH_VERIFIER_STORAGE_KEY_PREFIX = "__convexAuthOAuthVerifier_";
const NOT_ALLOWED_TOAST_MESSAGE =
  "This email is currently not allowed to use this app. Reach out to the developer to allow access.";
type AuthUser = {
  name?: string | null;
  email?: string | null;
  image?: string | null;
} | null;

function extractErrorText(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  try {
    return JSON.stringify(error);
  } catch {
    return "";
  }
}

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

function AccountMenu({ user, onSignOut }: { user: AuthUser | undefined; onSignOut: () => void }) {
  const [open, setOpen] = useState(false);
  const displayName = user?.name?.trim() || user?.email?.trim() || "Account";
  const initial = displayName.charAt(0).toUpperCase();

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="h-10 w-10 rounded-full border border-zinc-200 dark:border-zinc-700 overflow-hidden bg-zinc-200 dark:bg-zinc-800 flex items-center justify-center hover:border-zinc-300 dark:hover:border-zinc-500 transition-colors"
          title={displayName}
          aria-label="Account menu"
        >
          {user?.image ? (
            <img src={user.image} alt="Google account avatar" className="h-full w-full object-cover" />
          ) : (
            <span className="text-sm font-semibold text-zinc-700 dark:text-zinc-200">{initial || "A"}</span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        sideOffset={8}
        className="w-44 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-1"
      >
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          aria-label="Settings"
        >
          <Settings size={14} />
          <span>Settings</span>
        </button>
        <button
          type="button"
          onClick={() => {
            setOpen(false);
            onSignOut();
          }}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          aria-label="Log out"
        >
          <LogOut size={14} />
          <span>Log out</span>
        </button>
      </PopoverContent>
    </Popover>
  );
}

function NativeSyncButton() {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const { signIn, signOut } = useAuthActions();
  const currentUser = useQuery(api.users.getCurrent) as AuthUser | undefined;
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
        className="h-10 w-10 animate-pulse rounded-full bg-zinc-200 dark:bg-zinc-800"
        aria-label="Loading auth state"
      />
    );
  }

  if (isAuthenticated) {
    return <AccountMenu user={currentUser} onSignOut={() => signOut()} />;
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
  const currentUser = useQuery(api.users.getCurrent) as AuthUser | undefined;
  const [isHandlingOAuthCode, setIsHandlingOAuthCode] = useState(false);
  const [isWebGoogleSigningIn, setIsWebGoogleSigningIn] = useState(false);
  const [showNotAllowedToast, setShowNotAllowedToast] = useState(false);
  const hasHandledCodeRef = useRef(false);

  useEffect(() => {
    if (isNativeApp() || hasHandledCodeRef.current) return;

    const url = new URL(window.location.href);
    const code = url.searchParams.get("code");
    if (!code) return;

    hasHandledCodeRef.current = true;
    setIsHandlingOAuthCode(true);
    url.searchParams.delete("code");
    window.history.replaceState({}, "", `${url.pathname}${url.search}${url.hash}`);

    void (async () => {
      try {
        await (signIn as any)(undefined, { code });
      } catch (error) {
        const errorText = extractErrorText(error).toLowerCase();
        if (errorText.includes("not allowed")) {
          setShowNotAllowedToast(true);
        }
      } finally {
        setIsHandlingOAuthCode(false);
      }
    })();
  }, [signIn]);

  useEffect(() => {
    if (!showNotAllowedToast) return;
    const timer = window.setTimeout(() => setShowNotAllowedToast(false), 10000);
    return () => window.clearTimeout(timer);
  }, [showNotAllowedToast]);

  const startWebGoogleSignIn = async () => {
    if (isWebGoogleSigningIn) return;
    setIsWebGoogleSigningIn(true);
    try {
      await signIn("google");
    } catch (error) {
      console.error("Failed to start web Google sign-in", error);
    } finally {
      setIsWebGoogleSigningIn(false);
    }
  };

  if (isLoading || isHandlingOAuthCode) {
    return (
      <div
        className="h-10 w-10 animate-pulse rounded-full bg-zinc-200 dark:bg-zinc-800"
        aria-label="Loading auth state"
      />
    );
  }

  if (isAuthenticated) {
    return <AccountMenu user={currentUser} onSignOut={() => signOut()} />;
  }

  return (
    <>
      {showNotAllowedToast && (
        <div
          className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-[min(92vw,520px)] rounded-xl border border-red-300 bg-red-50 text-red-900 px-4 py-3 shadow-lg"
          role="alert"
          aria-live="assertive"
        >
          <div className="flex items-start gap-3">
            <p className="text-sm leading-5">{NOT_ALLOWED_TOAST_MESSAGE}</p>
            <button
              type="button"
              onClick={() => setShowNotAllowedToast(false)}
              className="ml-auto inline-flex h-6 w-6 items-center justify-center rounded-md hover:bg-red-100 transition-colors"
              aria-label="Dismiss access denied message"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      )}
      <button
        onClick={startWebGoogleSignIn}
        disabled={isWebGoogleSigningIn}
        className="inline-flex items-center gap-2 px-2.5 sm:px-3 py-2 rounded-full bg-blue-600 text-white text-xs sm:text-sm font-medium hover:bg-blue-700 disabled:opacity-70 disabled:cursor-not-allowed transition-colors"
        title="Sign in with Google"
        aria-label="Sign in with Google"
        aria-busy={isWebGoogleSigningIn}
      >
        {isWebGoogleSigningIn ? (
          <>
            <span className="h-4 w-4 rounded-full border-2 border-white/80 border-t-transparent animate-spin" />
            <span className="hidden sm:inline">Redirecting...</span>
          </>
        ) : (
          <>
            <LogIn size={16} />
            <span className="hidden sm:inline">Sign In with Google</span>
          </>
        )}
      </button>
    </>
  );
}

import { useAuthActions } from "@convex-dev/auth/react";
import { useConvexAuth } from "convex/react";
import { LogIn, LogOut } from "lucide-react";

export function AuthButton() {
  const convexUrl = import.meta.env.VITE_CONVEX_URL;

  if (!convexUrl) {
    return (
      <button
        disabled
        className="inline-flex items-center gap-2 px-3 py-2 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-400 cursor-not-allowed text-sm font-medium"
        title="Set VITE_CONVEX_URL in .env.local to enable sign-in"
        aria-label="Auth setup required"
      >
        <LogIn size={16} />
        <span>Auth Disabled</span>
      </button>
    );
  }

  return <AuthButtonInner />;
}

function AuthButtonInner() {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const { signIn, signOut } = useAuthActions();

  if (isLoading) {
    return (
      <div
        className="h-10 w-36 animate-pulse rounded-full bg-zinc-200 dark:bg-zinc-800"
        aria-label="Loading auth state"
      />
    );
  }

  if (isAuthenticated) {
    return (
      <div className="flex items-center gap-2">
        <div className="inline-flex items-center gap-2 px-3 py-2 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300 text-sm font-medium">
          <span className="w-2 h-2 rounded-full bg-emerald-500" />
          <span>Signed In</span>
        </div>
        <button
          onClick={() => signOut()}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200 text-sm font-medium hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
          title="Log out"
        >
          <LogOut size={16} />
          <span>Log Out</span>
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => signIn("google")}
      className="inline-flex items-center gap-2 px-3 py-2 rounded-full bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors"
      title="Sign in with Google"
    >
      <LogIn size={16} />
      <span>Sign In with Google</span>
    </button>
  );
}

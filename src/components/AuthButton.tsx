import { useAuthActions } from "@convex-dev/auth/react";
import { useConvexAuth } from "convex/react";
import { LogIn, LogOut } from "lucide-react";

export function AuthButton() {
  const convexUrl = import.meta.env.VITE_CONVEX_URL;
  
  if (!convexUrl) return null;

  return <AuthButtonInner />;
}

function AuthButtonInner() {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const { signIn, signOut } = useAuthActions();

  if (isLoading) {
    return <div className="w-9 h-9 animate-pulse bg-zinc-200 dark:bg-zinc-800 rounded-full" />;
  }

  if (isAuthenticated) {
    return (
      <button 
        onClick={() => signOut()} 
        className="p-2 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-transform hover:scale-105 active:scale-95"
        title="Sign Out"
      >
        <LogOut size={20} />
      </button>
    );
  }

  return (
    <button 
      onClick={() => signIn("google")} 
      className="p-2 rounded-full bg-blue-600 text-white hover:bg-blue-700 transition-transform hover:scale-105 active:scale-95"
      title="Sign in with Google"
    >
      <LogIn size={20} />
    </button>
  );
}

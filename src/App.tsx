/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { HabitList } from './components/HabitList';
import { ConvexAuthProvider } from "@convex-dev/auth/react";
import { ConvexReactClient } from "convex/react";
import { HybridHabitProvider, LocalOnlyProvider } from "./hooks/HabitContext";

const convexUrl = import.meta.env.VITE_CONVEX_URL;
const convex = convexUrl ? new ConvexReactClient(convexUrl) : null;

export default function App() {
  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 font-sans">
      {convex ? (
        <ConvexAuthProvider client={convex}>
          <HybridHabitProvider>
            <HabitList />
          </HybridHabitProvider>
        </ConvexAuthProvider>
      ) : (
        <LocalOnlyProvider>
          <HabitList />
        </LocalOnlyProvider>
      )}
    </div>
  );
}

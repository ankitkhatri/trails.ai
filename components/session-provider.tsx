"use client";

import type { Session } from "next-auth";
import { SessionProvider } from "next-auth/react";
import type { ReactNode } from "react";

type AppSessionProviderProps = {
  children: ReactNode;
  session: Session | null;
};

export function AppSessionProvider({
  children,
  session,
}: AppSessionProviderProps) {
  return <SessionProvider session={session}>{children}</SessionProvider>;
}

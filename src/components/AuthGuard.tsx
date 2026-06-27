"use client";

import { useRouter } from "next/navigation";
import { ReactNode, useEffect, useMemo, useSyncExternalStore } from "react";
import { type LoggedInGuest } from "@/lib/guest-auth";

type AuthGuardProps = {
  children: (guest: LoggedInGuest) => ReactNode;
};

const guestStorageKey = "wedding-app:guest";
const checkingSnapshot = "__checking__";

function subscribeToGuestStorage(onStoreChange: () => void) {
  window.addEventListener("storage", onStoreChange);

  return () => {
    window.removeEventListener("storage", onStoreChange);
  };
}

function getGuestSnapshot() {
  return localStorage.getItem(guestStorageKey) ?? "";
}

function getServerGuestSnapshot() {
  return checkingSnapshot;
}

function parseGuestSnapshot(snapshot: string): LoggedInGuest | null {
  if (!snapshot || snapshot === checkingSnapshot) {
    return null;
  }

  try {
    const parsedGuest = JSON.parse(snapshot) as Partial<LoggedInGuest>;

    if (
      typeof parsedGuest.id === "string" &&
      typeof parsedGuest.name === "string"
    ) {
      return {
        id: parsedGuest.id,
        name: parsedGuest.name,
      };
    }
  } catch {
    localStorage.removeItem(guestStorageKey);
  }

  return null;
}

export function AuthGuard({ children }: AuthGuardProps) {
  const router = useRouter();
  const guestSnapshot = useSyncExternalStore(
    subscribeToGuestStorage,
    getGuestSnapshot,
    getServerGuestSnapshot,
  );
  const guest = useMemo(
    () => parseGuestSnapshot(guestSnapshot),
    [guestSnapshot],
  );
  const isChecking = guestSnapshot === checkingSnapshot;

  useEffect(() => {
    if (!isChecking && !guest) {
      router.replace("/login");
    }
  }, [guest, isChecking, router]);

  if (isChecking || !guest) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-rose-50 px-6 text-stone-700">
        <p>確認中です...</p>
      </main>
    );
  }

  return children(guest);
}

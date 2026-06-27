"use client";

import Link from "next/link";
import { AuthGuard } from "@/components/AuthGuard";

type PlaceholderPageProps = {
  title: string;
};

export function PlaceholderPage({ title }: PlaceholderPageProps) {
  return (
    <AuthGuard>
      {(guest) => (
        <main className="flex min-h-screen items-center justify-center bg-rose-50 px-6 py-10 text-stone-900">
          <section className="w-full max-w-xl rounded-lg border border-rose-100 bg-white p-6 shadow-sm">
            <p className="text-sm font-semibold text-rose-500">
              {guest.name} 様
            </p>
            <h1 className="mt-2 text-2xl font-bold">{title}</h1>
            <Link
              className="mt-6 inline-flex rounded-md bg-rose-500 px-4 py-2 font-semibold text-white transition hover:bg-rose-600"
              href="/home"
            >
              HOMEへ戻る
            </Link>
          </section>
        </main>
      )}
    </AuthGuard>
  );
}

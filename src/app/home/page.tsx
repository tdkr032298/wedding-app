"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { AuthGuard } from "@/components/AuthGuard";
import { clearLoggedInGuest } from "@/lib/guest-auth";

const homeLinks = [
  { href: "/profile", label: "プロフィール閲覧画面" },
  { href: "/seating", label: "席次確認画面" },
  { href: "/schedule", label: "タイムスケジュール確認画面" },
  { href: "/upload", label: "画像添付画面" },
  { href: "/gallery", label: "画像閲覧画面" },
  { href: "/missions", label: "Mission表示画面" },
];

export default function HomePage() {
  const router = useRouter();

  function handleLogout() {
    clearLoggedInGuest();
    router.replace("/login");
  }

  return (
    <AuthGuard>
      {(guest) => (
        <main className="min-h-screen bg-rose-50 px-6 py-8 text-stone-900">
          <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
            <header className="rounded-lg border border-rose-100 bg-white p-6 shadow-sm">
              <p className="text-sm font-semibold text-rose-500">HOME</p>
              <div className="mt-2 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <h1 className="text-2xl font-bold">
                    ようこそ、{guest.name} 様
                  </h1>
                  <p className="mt-2 text-sm text-stone-600">
                    ご覧になりたい項目を選択してください。
                  </p>
                </div>
                <button
                  className="rounded-md border border-stone-300 px-4 py-2 text-sm font-semibold text-stone-700 transition hover:bg-stone-50"
                  onClick={handleLogout}
                  type="button"
                >
                  ログアウト
                </button>
              </div>
            </header>

            <section className="grid gap-3 sm:grid-cols-2">
              {homeLinks.map((link) => (
                <Link
                  className="rounded-lg border border-rose-100 bg-white p-5 font-semibold shadow-sm transition hover:border-rose-300 hover:bg-rose-50"
                  href={link.href}
                  key={link.href}
                >
                  {link.label}
                </Link>
              ))}
            </section>
          </div>
        </main>
      )}
    </AuthGuard>
  );
}

"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  getLoggedInGuest,
  normalizeGuestName,
  saveLoggedInGuest,
} from "@/lib/guest-auth";
import { supabase } from "@/lib/supabase";

type GuestRow = {
  id: string | number;
  name: string | null;
  first_login_at: string | null;
  login_count: number | null;
};

export default function LoginPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (getLoggedInGuest()) {
      router.replace("/home");
    }
  }, [router]);

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    const normalizedInputName = normalizeGuestName(name);

    if (!normalizedInputName) {
      setError("お名前を入力してください");
      return;
    }

    setIsLoading(true);

    const { data, error: fetchError } = await supabase
      .from("guests")
      .select("id,name,first_login_at,login_count")
      .returns<GuestRow[]>();

    setIsLoading(false);

    if (fetchError) {
      setError(`ゲスト情報の取得に失敗しました: ${fetchError.message}`);
      return;
    }

    const matchedGuest = (data ?? []).find((guest) => {
      return normalizeGuestName(guest.name ?? "") === normalizedInputName;
    });

    if (!matchedGuest || !matchedGuest.name) {
      setError("お名前が見つかりませんでした");
      return;
    }

    const now = new Date().toISOString();
    const { error: updateError } = await supabase
      .from("guests")
      .update({
        first_login_at: matchedGuest.first_login_at ?? now,
        login_count: (matchedGuest.login_count ?? 0) + 1,
      })
      .eq("id", matchedGuest.id);

    if (updateError) {
      setError(`ログイン情報の更新に失敗しました: ${updateError.message}`);
      return;
    }

    saveLoggedInGuest({
      id: String(matchedGuest.id),
      name: matchedGuest.name,
    });
    router.push("/home");
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-rose-50 px-6 py-10 text-stone-900">
      <section className="w-full max-w-md rounded-lg border border-rose-100 bg-white p-6 shadow-sm">
        <p className="text-sm font-semibold text-rose-500">
          Wedding Guest Login
        </p>
        <h1 className="mt-2 text-2xl font-bold">お名前を入力してください</h1>
        <p className="mt-2 text-sm leading-6 text-stone-600">
          ご登録いただいたお名前でログインできます。
        </p>

        <form className="mt-6 flex flex-col gap-4" onSubmit={handleLogin}>
          <label className="flex flex-col gap-2 text-sm font-medium">
            お名前
            <input
              className="rounded-md border border-stone-300 px-3 py-3 text-base outline-none transition focus:border-rose-400 focus:ring-2 focus:ring-rose-100"
              placeholder="例: 山田 太郎"
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
          </label>

          {error ? (
            <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          ) : null}

          <button
            className="rounded-md bg-rose-500 px-4 py-3 font-semibold text-white transition hover:bg-rose-600 disabled:cursor-not-allowed disabled:bg-rose-300"
            disabled={isLoading}
            type="submit"
          >
            {isLoading ? "照合中..." : "ログイン"}
          </button>
        </form>
      </section>
    </main>
  );
}

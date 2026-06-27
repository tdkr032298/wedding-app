"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AuthGuard } from "@/components/AuthGuard";
import { supabase } from "@/lib/supabase";

type CoupleProfile = {
  id: string | number;
  created_at: string;
  role: string | null;
  name: string;
  name_kana: string | null;
  nickname: string | null;
  birthday: string | null;
  hometown: string | null;
  hobby: string | null;
  favorite_food: string | null;
  personality: string | null;
  message: string | null;
  display_order: number | null;
  is_active: boolean | null;
};

type ProfileState = "loading" | "done" | "error";

function displayValue(value: string | null | undefined) {
  return value && value.trim().length > 0 ? value : "未設定";
}

function formatBirthday(value: string | null) {
  if (!value) {
    return "未設定";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString("ja-JP", {
    month: "long",
    day: "numeric",
  });
}

function ProfileCard({ profile }: { profile: CoupleProfile }) {
  const details = [
    { label: "ニックネーム", value: profile.nickname },
    { label: "誕生日", value: formatBirthday(profile.birthday) },
    { label: "出身地", value: profile.hometown },
    { label: "趣味", value: profile.hobby },
    { label: "好きな食べ物", value: profile.favorite_food },
    { label: "性格", value: profile.personality },
  ];

  return (
    <article className="overflow-hidden rounded-lg border border-rose-100 bg-white shadow-sm">
      <div className="bg-rose-50 p-5">
        <p className="text-sm font-semibold text-rose-500">
          {displayValue(profile.role)}
        </p>
        <h2 className="mt-2 text-3xl font-bold text-stone-900">
          {profile.name}
        </h2>
        <p className="mt-1 text-sm text-stone-600">
          {displayValue(profile.name_kana)}
        </p>
      </div>

      <div className="flex flex-col gap-4 p-5">
        <dl className="grid gap-3">
          {details.map((detail) => (
            <div
              className="rounded-md border border-stone-100 bg-stone-50 px-4 py-3"
              key={detail.label}
            >
              <dt className="text-xs font-semibold text-stone-500">
                {detail.label}
              </dt>
              <dd className="mt-1 text-sm font-semibold text-stone-800">
                {displayValue(detail.value)}
              </dd>
            </div>
          ))}
        </dl>

        {profile.message ? (
          <div className="rounded-md bg-rose-50 px-4 py-3">
            <p className="text-xs font-semibold text-rose-500">メッセージ</p>
            <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-stone-700">
              {profile.message}
            </p>
          </div>
        ) : null}
      </div>
    </article>
  );
}

function ProfileContent() {
  const [profiles, setProfiles] = useState<CoupleProfile[]>([]);
  const [state, setState] = useState<ProfileState>("loading");
  const [error, setError] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function fetchProfiles() {
      const { data, error: fetchError } = await supabase
        .from("profiles")
        .select("*")
        .eq("is_active", true)
        .order("display_order", { ascending: true })
        .returns<CoupleProfile[]>();

      if (!isMounted) {
        return;
      }

      if (fetchError) {
        setError(`プロフィール情報の取得に失敗しました: ${fetchError.message}`);
        setState("error");
        return;
      }

      setProfiles(data ?? []);
      setState("done");
    }

    void fetchProfiles();

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <main className="min-h-screen bg-rose-50 px-6 py-8 text-stone-900">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-5">
        <header className="rounded-lg border border-rose-100 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-rose-500">Profile</p>
              <h1 className="mt-2 text-2xl font-bold">プロフィール閲覧画面</h1>
              <p className="mt-2 text-sm leading-6 text-stone-600">
                新郎新婦のプロフィールをご覧いただけます。
              </p>
            </div>
            <Link
              className="rounded-md border border-stone-300 bg-white px-4 py-3 text-center font-semibold text-stone-700 shadow-sm transition hover:bg-stone-50"
              href="/home"
            >
              HOMEに戻る
            </Link>
          </div>
        </header>

        {state === "loading" ? (
          <section className="rounded-lg border border-rose-100 bg-white p-5 text-stone-600 shadow-sm">
            読み込み中...
          </section>
        ) : null}

        {state === "error" ? (
          <section className="rounded-lg border border-red-100 bg-red-50 p-5 text-red-700 shadow-sm">
            {error}
          </section>
        ) : null}

        {state === "done" && profiles.length === 0 ? (
          <section className="rounded-lg border border-rose-100 bg-white p-5 text-stone-600 shadow-sm">
            プロフィール情報がまだ登録されていません
          </section>
        ) : null}

        {profiles.length > 0 ? (
          <section className="grid gap-5 md:grid-cols-2">
            {profiles.map((profile) => (
              <ProfileCard key={profile.id} profile={profile} />
            ))}
          </section>
        ) : null}
      </div>
    </main>
  );
}

export default function ProfilePage() {
  return <AuthGuard>{() => <ProfileContent />}</AuthGuard>;
}

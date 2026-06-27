"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AuthGuard } from "@/components/AuthGuard";
import { supabase } from "@/lib/supabase";

type Mission = {
  id: string | number;
  created_at: string;
  title: string;
  description: string | null;
  mission_type: string | null;
  points: number | null;
  is_active: boolean | null;
  display_order: number | null;
};

type MissionState = "loading" | "done" | "error";

function MissionsContent() {
  const [missions, setMissions] = useState<Mission[]>([]);
  const [state, setState] = useState<MissionState>("loading");
  const [error, setError] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function fetchMissions() {
      const { data, error: fetchError } = await supabase
        .from("missions")
        .select("*")
        .eq("is_active", true)
        .order("display_order", { ascending: true })
        .order("created_at", { ascending: true })
        .returns<Mission[]>();

      if (!isMounted) {
        return;
      }

      if (fetchError) {
        setError(`Mission一覧の取得に失敗しました: ${fetchError.message}`);
        setState("error");
        return;
      }

      setMissions(data ?? []);
      setState("done");
    }

    void fetchMissions();

    return () => {
      isMounted = false;
    };
  }, []);

  function handleChallenge() {
    alert("このMissionは後で実装します");
  }

  return (
    <main className="min-h-screen bg-rose-50 px-6 py-8 text-stone-900">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-5">
        <header className="rounded-lg border border-rose-100 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-rose-500">Mission</p>
              <h1 className="mt-2 text-2xl font-bold">Mission表示画面</h1>
              <p className="mt-2 text-sm leading-6 text-stone-600">
                挑戦できるMissionを一覧で表示します。
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

        {state === "done" && missions.length === 0 ? (
          <section className="rounded-lg border border-rose-100 bg-white p-5 text-stone-600 shadow-sm">
            現在表示できるMissionはありません
          </section>
        ) : null}

        {missions.length > 0 ? (
          <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {missions.map((mission) => (
              <article
                className="flex min-h-64 flex-col rounded-lg border border-rose-100 bg-white p-5 shadow-sm"
                key={mission.id}
              >
                <div className="flex flex-1 flex-col gap-3">
                  <div className="flex items-start justify-between gap-3">
                    <h2 className="text-lg font-bold leading-7">
                      {mission.title}
                    </h2>
                    <span className="shrink-0 rounded-full bg-rose-100 px-3 py-1 text-sm font-semibold text-rose-700">
                      {mission.points ?? 0} pt
                    </span>
                  </div>

                  <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">
                    {mission.mission_type ?? "type未設定"}
                  </p>

                  {mission.description ? (
                    <p className="text-sm leading-6 text-stone-700">
                      {mission.description}
                    </p>
                  ) : (
                    <p className="text-sm text-stone-400">説明は未設定です</p>
                  )}
                </div>

                <button
                  className="mt-5 rounded-md bg-rose-500 px-4 py-3 font-semibold text-white transition hover:bg-rose-600"
                  onClick={handleChallenge}
                  type="button"
                >
                  Missionに挑戦する
                </button>
              </article>
            ))}
          </section>
        ) : null}
      </div>
    </main>
  );
}

export default function MissionsPage() {
  return <AuthGuard>{() => <MissionsContent />}</AuthGuard>;
}

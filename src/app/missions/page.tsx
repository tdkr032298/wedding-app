"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AuthGuard } from "@/components/AuthGuard";
import { type LoggedInGuest } from "@/lib/guest-auth";
import { supabase } from "@/lib/supabase";

type Mission = {
  id: string | number;
  created_at: string;
  title: string;
  description: string | null;
  category: string | null;
  mission_type: string | null;
  points: number | null;
  is_active: boolean | null;
  display_order: number | null;
};

type MissionState = "loading" | "done" | "error";

type MissionLog = {
  mission_id: string | number | null;
  status: string | null;
};

const categoryOrder = ["Photo Mission", "Story Mission", "Challenge Mission"];

function getCategoryLabel(category: string | null) {
  return category || "その他";
}

function MissionsContent({ guest }: { guest: LoggedInGuest }) {
  const [missions, setMissions] = useState<Mission[]>([]);
  const [completedMissionIds, setCompletedMissionIds] = useState<Set<string>>(
    () => new Set(),
  );
  const [state, setState] = useState<MissionState>("loading");
  const [error, setError] = useState("");

  const groupedMissions = useMemo(() => {
    const groups = new Map<string, Mission[]>();

    for (const mission of missions) {
      const category = getCategoryLabel(mission.category);
      groups.set(category, [...(groups.get(category) ?? []), mission]);
    }

    return Array.from(groups.entries()).sort(([categoryA], [categoryB]) => {
      const indexA = categoryOrder.indexOf(categoryA);
      const indexB = categoryOrder.indexOf(categoryB);

      if (indexA === -1 && indexB === -1) {
        return categoryA.localeCompare(categoryB);
      }

      if (indexA === -1) {
        return 1;
      }

      if (indexB === -1) {
        return -1;
      }

      return indexA - indexB;
    });
  }, [missions]);

  useEffect(() => {
    let isMounted = true;

    async function fetchMissions() {
      const [missionsResponse, logsResponse] = await Promise.all([
        supabase
          .from("missions")
          .select("*")
          .eq("is_active", true)
          .order("category", { ascending: true })
          .order("display_order", { ascending: true })
          .order("created_at", { ascending: true })
          .returns<Mission[]>(),
        supabase
          .from("mission_logs")
          .select("mission_id,status")
          .eq("guest_name", guest.name)
          .eq("status", "completed")
          .returns<MissionLog[]>(),
      ]);

      if (!isMounted) {
        return;
      }

      if (missionsResponse.error) {
        setError(
          `Mission一覧の取得に失敗しました: ${missionsResponse.error.message}`,
        );
        setState("error");
        return;
      }

      if (logsResponse.error) {
        setError(
          `Missionクリア状況の取得に失敗しました: ${logsResponse.error.message}`,
        );
        setState("error");
        return;
      }

      setMissions(missionsResponse.data ?? []);
      setCompletedMissionIds(
        new Set(
          (logsResponse.data ?? [])
            .map((log) => log.mission_id)
            .filter(
              (missionId): missionId is string | number => missionId !== null,
            )
            .map(String),
        ),
      );
      setState("done");
    }

    void fetchMissions();

    return () => {
      isMounted = false;
    };
  }, [guest.name]);

  return (
    <main className="min-h-screen bg-rose-50 px-6 py-8 text-stone-900">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-5">
        <header className="rounded-lg border border-rose-100 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-rose-500">Mission</p>
              <h1 className="mt-2 text-2xl font-bold">Mission一覧</h1>
              <p className="mt-2 text-sm leading-6 text-stone-600">
                挑戦できるMissionをカテゴリごとに表示します。
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

        {groupedMissions.map(([category, categoryMissions]) => (
          <section className="flex flex-col gap-3" key={category}>
            <h2 className="text-xl font-bold">{category}</h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {categoryMissions.map((mission) => {
                const isCompleted = completedMissionIds.has(
                  String(mission.id),
                );

                return (
                  <Link
                    className={`flex min-h-56 flex-col rounded-lg border bg-white p-5 shadow-sm transition ${
                      isCompleted
                        ? "border-green-200 bg-green-50 hover:border-green-300"
                        : "border-rose-100 hover:border-rose-300 hover:bg-rose-50"
                    }`}
                    href={`/missions/${mission.id}`}
                    key={mission.id}
                  >
                    <div className="flex flex-1 flex-col gap-3">
                      <div className="flex items-start justify-between gap-3">
                        <h3 className="text-lg font-bold leading-7">
                          {mission.title}
                        </h3>
                        <span
                          className={`shrink-0 rounded-full px-3 py-1 text-sm font-semibold ${
                            isCompleted
                              ? "bg-green-100 text-green-700"
                              : "bg-rose-100 text-rose-700"
                          }`}
                        >
                          {isCompleted
                            ? "クリア済み"
                            : `${mission.points ?? 0} pt`}
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
                    <span
                      className={`mt-5 rounded-md px-4 py-3 text-center font-semibold text-white ${
                        isCompleted ? "bg-green-600" : "bg-rose-500"
                      }`}
                    >
                      {isCompleted ? "Missionクリア済み" : "Missionに挑戦する"}
                    </span>
                  </Link>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </main>
  );
}

export default function MissionsPage() {
  return <AuthGuard>{(guest) => <MissionsContent guest={guest} />}</AuthGuard>;
}

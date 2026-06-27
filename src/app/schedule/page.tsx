"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AuthGuard } from "@/components/AuthGuard";
import { supabase } from "@/lib/supabase";

type TimelineEvent = {
  id: string | number;
  created_at: string;
  event_time: string | null;
  title: string;
  description: string | null;
  location: string | null;
  icon: string | null;
  display_order: number | null;
  is_active: boolean | null;
};

type ScheduleState = "loading" | "done" | "error";

function displayValue(value: string | null | undefined) {
  return value && value.trim().length > 0 ? value : "";
}

function ScheduleContent() {
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [state, setState] = useState<ScheduleState>("loading");
  const [error, setError] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function fetchTimeline() {
      const { data, error: fetchError } = await supabase
        .from("timeline")
        .select("*")
        .eq("is_active", true)
        .order("display_order", { ascending: true })
        .order("event_time", { ascending: true })
        .returns<TimelineEvent[]>();

      if (!isMounted) {
        return;
      }

      if (fetchError) {
        setError(`タイムスケジュールの取得に失敗しました: ${fetchError.message}`);
        setState("error");
        return;
      }

      setEvents(data ?? []);
      setState("done");
    }

    void fetchTimeline();

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <main className="min-h-screen bg-rose-50 px-6 py-8 text-stone-900">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-5">
        <header className="rounded-lg border border-rose-100 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-rose-500">Schedule</p>
              <h1 className="mt-2 text-2xl font-bold">
                タイムスケジュール確認画面
              </h1>
              <p className="mt-2 text-sm leading-6 text-stone-600">
                当日の流れを時系列で確認できます。
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

        {state === "done" && events.length === 0 ? (
          <section className="rounded-lg border border-rose-100 bg-white p-5 text-stone-600 shadow-sm">
            タイムスケジュールはまだ登録されていません
          </section>
        ) : null}

        {events.length > 0 ? (
          <section className="rounded-lg border border-rose-100 bg-white p-5 shadow-sm">
            <ol className="relative flex flex-col gap-5 border-l-2 border-rose-100 pl-5">
              {events.map((event) => (
                <li className="relative" key={event.id}>
                  <span className="absolute -left-[30px] top-5 flex h-4 w-4 rounded-full border-2 border-white bg-rose-400 shadow-sm" />
                  <article className="rounded-lg border border-stone-100 bg-rose-50/60 p-4 shadow-sm">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="flex items-start gap-3">
                        {event.icon ? (
                          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white text-2xl shadow-sm">
                            {event.icon}
                          </span>
                        ) : null}
                        <div>
                          <p className="text-sm font-semibold text-rose-600">
                            {displayValue(event.event_time) || "時刻未設定"}
                          </p>
                          <h2 className="mt-1 text-lg font-bold leading-7">
                            {event.title}
                          </h2>
                        </div>
                      </div>

                      {event.location ? (
                        <span className="rounded-full bg-white px-3 py-1 text-sm font-semibold text-stone-600 shadow-sm">
                          {event.location}
                        </span>
                      ) : null}
                    </div>

                    {event.description ? (
                      <p className="mt-3 text-sm leading-6 text-stone-700">
                        {event.description}
                      </p>
                    ) : null}
                  </article>
                </li>
              ))}
            </ol>
          </section>
        ) : null}
      </div>
    </main>
  );
}

export default function SchedulePage() {
  return <AuthGuard>{() => <ScheduleContent />}</AuthGuard>;
}

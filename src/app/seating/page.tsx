"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AuthGuard } from "@/components/AuthGuard";
import { type LoggedInGuest, normalizeGuestName } from "@/lib/guest-auth";
import { supabase } from "@/lib/supabase";

type GuestSeat = {
  id: string | number;
  name: string | null;
  table_name: string | null;
  seat_label: string | null;
  group_name: string | null;
  side: string | null;
  is_active: boolean | null;
};

type VenueTable = {
  id: string | number;
  table_name: string;
  display_name: string | null;
  table_number: number | null;
  x_position: number | null;
  y_position: number | null;
  shape: string | null;
  seat_count: number | null;
  note: string | null;
  map_label: string | null;
  area_name: string | null;
  color_theme: string | null;
  is_active: boolean | null;
  display_order: number | null;
};

type SeatingState = "loading" | "done" | "error";

function displayValue(value: string | null | undefined) {
  return value && value.trim().length > 0 ? value : "未設定";
}

function isSameGuest(memberName: string | null, guestName: string) {
  if (!memberName) {
    return false;
  }

  return normalizeGuestName(memberName) === normalizeGuestName(guestName);
}

function clampPercent(value: number | null) {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return 0;
  }

  return Math.min(100, Math.max(0, value));
}

function getTableLabel(table: VenueTable) {
  return table.map_label || table.display_name || table.table_name;
}

function SeatingContent({ guest }: { guest: LoggedInGuest }) {
  const [currentGuest, setCurrentGuest] = useState<GuestSeat | null>(null);
  const [guests, setGuests] = useState<GuestSeat[]>([]);
  const [tables, setTables] = useState<VenueTable[]>([]);
  const [selectedTableName, setSelectedTableName] = useState<string | null>(
    null,
  );
  const [state, setState] = useState<SeatingState>("loading");
  const [error, setError] = useState("");

  const selectedTable = useMemo(() => {
    if (!selectedTableName) {
      return null;
    }

    return tables.find((table) => table.table_name === selectedTableName) ?? null;
  }, [selectedTableName, tables]);

  const selectedTableGuests = useMemo(() => {
    if (!selectedTableName) {
      return [];
    }

    return guests
      .filter((member) => member.table_name === selectedTableName)
      .sort((memberA, memberB) => {
        const seatA = memberA.seat_label ?? "";
        const seatB = memberB.seat_label ?? "";

        if (seatA !== seatB) {
          return seatA.localeCompare(seatB, "ja");
        }

        return (memberA.name ?? "").localeCompare(memberB.name ?? "", "ja");
      });
  }, [guests, selectedTableName]);

  useEffect(() => {
    let isMounted = true;

    async function fetchSeatingData() {
      const [guestResponse, tableResponse] = await Promise.all([
        supabase
          .from("guests")
          .select("id,name,table_name,seat_label,group_name,side,is_active")
          .eq("is_active", true)
          .returns<GuestSeat[]>(),
        supabase
          .from("tables")
          .select("*")
          .eq("is_active", true)
          .order("display_order", { ascending: true })
          .order("table_number", { ascending: true })
          .returns<VenueTable[]>(),
      ]);

      if (!isMounted) {
        return;
      }

      if (guestResponse.error) {
        setError(`ゲスト情報の取得に失敗しました: ${guestResponse.error.message}`);
        setState("error");
        return;
      }

      if (tableResponse.error) {
        setError(`テーブル情報の取得に失敗しました: ${tableResponse.error.message}`);
        setState("error");
        return;
      }

      const guestRows = guestResponse.data ?? [];
      const tableRows = tableResponse.data ?? [];
      const matchedGuest =
        guestRows.find((row) => isSameGuest(row.name, guest.name)) ?? null;

      setGuests(guestRows);
      setTables(tableRows);
      setCurrentGuest(matchedGuest);
      setSelectedTableName(
        matchedGuest?.table_name || tableRows[0]?.table_name || null,
      );
      setState("done");
    }

    void fetchSeatingData();

    return () => {
      isMounted = false;
    };
  }, [guest.name]);

  const tableName = displayValue(currentGuest?.table_name);
  const seatLabel = displayValue(currentGuest?.seat_label);

  return (
    <main className="min-h-screen bg-rose-50 px-6 py-8 text-stone-900">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-5">
        <header className="rounded-lg border border-rose-100 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-rose-500">Seating</p>
              <h1 className="mt-2 text-2xl font-bold">席次確認</h1>
              <p className="mt-2 text-sm leading-6 text-stone-600">
                あなたのお席と会場内のテーブル位置を確認できます。
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

        {state === "done" ? (
          <>
            <section className="rounded-lg border border-rose-100 bg-white p-5 shadow-sm">
              <p className="text-sm font-semibold text-rose-500">あなたの席</p>
              <p className="mt-2 text-xl font-bold">
                {displayValue(currentGuest?.name ?? guest.name)}
              </p>
              <p className="mt-2 text-sm leading-6 text-stone-600">
                あなたのお席はこちらです。
              </p>

              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <div className="rounded-lg bg-rose-50 p-5">
                  <p className="text-sm font-semibold text-rose-600">
                    テーブル名
                  </p>
                  <p className="mt-2 text-4xl font-bold tracking-wide text-rose-700">
                    {tableName}
                  </p>
                </div>
                <div className="rounded-lg border border-stone-200 p-5">
                  <p className="text-sm font-semibold text-stone-500">席番号</p>
                  <p className="mt-2 text-3xl font-bold">{seatLabel}</p>
                </div>
              </div>
            </section>

            <section className="rounded-lg border border-rose-100 bg-white p-5 shadow-sm">
              <div className="flex flex-col gap-1">
                <h2 className="text-lg font-bold">会場マップ</h2>
                <p className="text-sm text-stone-600">
                  テーブルをタップすると詳細を確認できます。
                </p>
              </div>

              {tables.length === 0 ? (
                <p className="mt-5 rounded-md bg-stone-50 px-4 py-3 text-sm text-stone-600">
                  テーブル情報がありません
                </p>
              ) : (
                <div className="mt-5 overflow-x-auto pb-2">
                  <div className="relative h-[420px] min-w-[680px] rounded-lg border border-stone-200 bg-gradient-to-br from-white to-rose-50">
                    <div className="absolute left-1/2 top-4 -translate-x-1/2 rounded-full border border-stone-200 bg-white px-4 py-2 text-xs font-semibold text-stone-500">
                      MAIN STAGE
                    </div>

                    {tables.map((table) => {
                      const isOwnTable =
                        Boolean(currentGuest?.table_name) &&
                        table.table_name === currentGuest?.table_name;
                      const isSelected =
                        table.table_name === selectedTableName;
                      const left = `${clampPercent(table.x_position)}%`;
                      const top = `${clampPercent(table.y_position)}%`;
                      const isRect = table.shape === "rect";

                      return (
                        <button
                          className={`absolute flex min-h-16 min-w-20 -translate-x-1/2 -translate-y-1/2 items-center justify-center border px-3 py-2 text-center text-sm font-bold shadow-sm transition ${
                            isRect ? "rounded-lg" : "rounded-full"
                          } ${
                            isOwnTable
                              ? "border-rose-500 bg-rose-500 text-white ring-4 ring-rose-100"
                              : isSelected
                                ? "border-stone-700 bg-stone-900 text-white"
                                : "border-stone-200 bg-white text-stone-800 hover:border-rose-300 hover:bg-rose-50"
                          }`}
                          key={table.id}
                          onClick={() => setSelectedTableName(table.table_name)}
                          style={{ left, top }}
                          type="button"
                        >
                          {getTableLabel(table)}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </section>

            <section className="rounded-lg border border-rose-100 bg-white p-5 shadow-sm">
              <h2 className="text-lg font-bold">テーブル詳細</h2>

              {!selectedTable ? (
                <p className="mt-4 rounded-md bg-stone-50 px-4 py-3 text-sm text-stone-600">
                  テーブルを選択してください
                </p>
              ) : (
                <div className="mt-4 flex flex-col gap-5">
                  <div className="rounded-lg bg-rose-50 p-5">
                    <p className="text-sm font-semibold text-rose-600">
                      {selectedTable.area_name || "エリア未設定"}
                    </p>
                    <p className="mt-1 text-3xl font-bold text-rose-700">
                      {selectedTable.display_name || selectedTable.table_name}
                    </p>
                    {selectedTable.note ? (
                      <p className="mt-3 text-sm leading-6 text-stone-700">
                        {selectedTable.note}
                      </p>
                    ) : null}
                  </div>

                  <div>
                    <h3 className="font-bold">このテーブルのゲスト</h3>
                    {selectedTableGuests.length === 0 ? (
                      <p className="mt-3 rounded-md bg-stone-50 px-4 py-3 text-sm text-stone-600">
                        このテーブルのゲスト情報はまだありません
                      </p>
                    ) : (
                      <ul className="mt-3 flex flex-col gap-3">
                        {selectedTableGuests.map((member) => {
                          const isCurrentGuest = isSameGuest(
                            member.name,
                            guest.name,
                          );

                          return (
                            <li
                              className={`rounded-md border px-4 py-3 ${
                                isCurrentGuest
                                  ? "border-rose-300 bg-rose-50"
                                  : "border-stone-200 bg-white"
                              }`}
                              key={member.id}
                            >
                              <div className="flex items-center justify-between gap-3">
                                <div>
                                  <p className="font-semibold">
                                    {displayValue(member.name)}
                                  </p>
                                  <p className="mt-1 text-sm text-stone-500">
                                    席番号: {displayValue(member.seat_label)}
                                  </p>
                                </div>
                                {isCurrentGuest ? (
                                  <span className="shrink-0 rounded-full bg-rose-500 px-3 py-1 text-xs font-semibold text-white">
                                    あなた
                                  </span>
                                ) : null}
                              </div>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </div>
                </div>
              )}
            </section>
          </>
        ) : null}
      </div>
    </main>
  );
}

export default function SeatingPage() {
  return <AuthGuard>{(guest) => <SeatingContent guest={guest} />}</AuthGuard>;
}

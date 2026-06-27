import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Guest, GuestSearchResponse } from "@/types/guest";

type GuestRow = {
  id: string | number;
  name: string | null;
  table_name: string | null;
  seat_number: string | number | null;
  timeline_url: string | null;
  quiz_url: string | null;
  mission_url: string | null;
};

type SearchRequest = {
  name?: unknown;
};

const guestColumns =
  "id,name,table_name,seat_number,timeline_url,quiz_url,mission_url";

function normalizeText(value: string) {
  return value.normalize("NFKC").trim().replace(/\s+/g, " ");
}

function removeSpaces(value: string) {
  return normalizeText(value).replace(/\s/g, "");
}

function toGuest(row: GuestRow): Guest {
  return {
    id: String(row.id),
    name: row.name ?? "",
    table_name: row.table_name,
    seat_number: row.seat_number === null ? null : String(row.seat_number),
    timeline_url: row.timeline_url,
    quiz_url: row.quiz_url,
    mission_url: row.mission_url,
  };
}

export async function POST(request: Request) {
  let body: SearchRequest;

  try {
    body = (await request.json()) as SearchRequest;
  } catch {
    return NextResponse.json(
      { error: "Invalid request body." },
      { status: 400 },
    );
  }

  if (typeof body.name !== "string" || normalizeText(body.name).length === 0) {
    return NextResponse.json(
      { error: "名前を入力してください。" },
      { status: 400 },
    );
  }

  const searchName = normalizeText(body.name);
  const searchNameWithoutSpaces = removeSpaces(searchName);
  const supabase = createSupabaseServerClient();

  const { data, error } = await supabase
    .from("guests")
    .select(guestColumns)
    .order("name", { ascending: true })
    .limit(1000)
    .returns<GuestRow[]>();

  if (error) {
    return NextResponse.json(
      { error: `ゲスト情報の取得に失敗しました: ${error.message}` },
      { status: 500 },
    );
  }

  if (!data || data.length === 0) {
    return NextResponse.json(
      {
        error:
          "guests テーブルからゲスト情報を取得できませんでした。テーブル名、登録先の Supabase プロジェクト、RLS の SELECT policy を確認してください。",
      },
      { status: 500 },
    );
  }

  const guests = (data ?? [])
    .map(toGuest)
    .filter((guest) => {
      return removeSpaces(guest.name) === searchNameWithoutSpaces;
    })
    .slice(0, 20);
  const tableNames = Array.from(
    new Set(
      guests
        .map((guest) => guest.table_name)
        .filter((tableName): tableName is string => Boolean(tableName)),
    ),
  );

  const tableMembersByTable: GuestSearchResponse["tableMembersByTable"] = {};

  if (tableNames.length > 0) {
    const { data: memberRows, error: memberError } = await supabase
      .from("guests")
      .select(guestColumns)
      .in("table_name", tableNames)
      .order("name", { ascending: true })
      .returns<GuestRow[]>();

    if (memberError) {
      return NextResponse.json(
        {
          error: `同じテーブルのメンバー取得に失敗しました: ${memberError.message}`,
        },
        { status: 500 },
      );
    }

    for (const member of (memberRows ?? []).map(toGuest)) {
      if (!member.table_name) {
        continue;
      }
      tableMembersByTable[member.table_name] ??= [];
      tableMembersByTable[member.table_name].push(member);
    }
  }

  return NextResponse.json({
    guests,
    tableMembersByTable,
  } satisfies GuestSearchResponse);
}

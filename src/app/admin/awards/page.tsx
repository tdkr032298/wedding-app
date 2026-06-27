"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type PhotoAwardRow = {
  id: string | number;
  created_at: string;
  guest_name: string | null;
  image_url: string | null;
  file_path: string | null;
  caption: string | null;
  is_best_photo: boolean | null;
  is_heartwarming_award: boolean | null;
  award_title: string | null;
};

type MissionLogAwardRow = {
  id: string | number;
  created_at: string;
  guest_name: string | null;
  mission_id: string | number | null;
  status: string | null;
  submitted_text: string | null;
  submitted_image_url: string | null;
  is_heartwarming_award: boolean | null;
  award_title: string | null;
};

type MissionRow = {
  id: string | number;
  mission_type: string | null;
  title: string | null;
};

type AdminState = "loading" | "done" | "error";

const awardSelectLimit = 3;

function formatDate(value: string) {
  return new Intl.DateTimeFormat("ja-JP", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

function createTitleMap(missions: MissionRow[]) {
  return new Map(
    missions.map((mission) => [String(mission.id), mission.title || "Mission"]),
  );
}

function createStoryMissionIdSet(missions: MissionRow[]) {
  return new Set(
    missions
      .filter((mission) => mission.mission_type === "text")
      .map((mission) => String(mission.id)),
  );
}

export default function AdminAwardsPage() {
  const [photos, setPhotos] = useState<PhotoAwardRow[]>([]);
  const [missionLogs, setMissionLogs] = useState<MissionLogAwardRow[]>([]);
  const [missionTitleMap, setMissionTitleMap] = useState<Map<string, string>>(
    new Map(),
  );
  const [photoTitles, setPhotoTitles] = useState<Record<string, string>>({});
  const [missionLogTitles, setMissionLogTitles] = useState<Record<string, string>>({});
  const [state, setState] = useState<AdminState>("loading");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [savingKey, setSavingKey] = useState("");

  async function loadAwards() {
    setState("loading");
    setError("");

    const [photosResponse, logsResponse, missionsResponse] = await Promise.all([
      supabase
        .from("photos")
        .select(
          "id,created_at,guest_name,image_url,file_path,caption,is_best_photo,is_heartwarming_award,award_title",
        )
        .order("created_at", { ascending: false })
        .returns<PhotoAwardRow[]>(),
      supabase
        .from("mission_logs")
        .select(
          "id,created_at,guest_name,mission_id,status,submitted_text,submitted_image_url,is_heartwarming_award,award_title",
        )
        .not("submitted_text", "is", null)
        .order("created_at", { ascending: false })
        .returns<MissionLogAwardRow[]>(),
      supabase
        .from("missions")
        .select("id,title,mission_type")
        .returns<MissionRow[]>(),
    ]);

    if (photosResponse.error) {
      throw new Error(`写真一覧の取得に失敗しました: ${photosResponse.error.message}`);
    }

    if (logsResponse.error) {
      throw new Error(
        `Story Mission回答の取得に失敗しました: ${logsResponse.error.message}`,
      );
    }

    if (missionsResponse.error) {
      throw new Error(
        `Missionタイトルの取得に失敗しました: ${missionsResponse.error.message}`,
      );
    }

    const nextPhotos = photosResponse.data ?? [];
    const missions = missionsResponse.data ?? [];
    const storyMissionIds = createStoryMissionIdSet(missions);
    const nextLogs = (logsResponse.data ?? []).filter(
      (log) => log.mission_id && storyMissionIds.has(String(log.mission_id)),
    );

    setPhotos(nextPhotos);
    setMissionLogs(nextLogs);
    setMissionTitleMap(createTitleMap(missions));
    setPhotoTitles(
      Object.fromEntries(
        nextPhotos.map((photo) => [String(photo.id), photo.award_title ?? ""]),
      ),
    );
    setMissionLogTitles(
      Object.fromEntries(
        nextLogs.map((log) => [String(log.id), log.award_title ?? ""]),
      ),
    );
    setState("done");
  }

  useEffect(() => {
    async function initialLoad() {
      try {
        await loadAwards();
      } catch (loadError) {
        setError(
          loadError instanceof Error
            ? loadError.message
            : "表彰データの取得に失敗しました",
        );
        setState("error");
      }
    }

    void initialLoad();
  }, []);

  async function runUpdate({
    key,
    table,
    id,
    values,
  }: {
    key: string;
    table: "photos" | "mission_logs";
    id: string | number;
    values: Record<string, string | boolean | null>;
  }) {
    setSavingKey(key);
    setMessage("");
    setError("");

    const { error: updateError } = await supabase
      .from(table)
      .update(values)
      .eq("id", id);

    if (updateError) {
      setError(`保存に失敗しました: ${updateError.message}`);
      setSavingKey("");
      return;
    }

    try {
      await loadAwards();
      setMessage("保存しました");
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "保存後の再取得に失敗しました",
      );
    } finally {
      setSavingKey("");
    }
  }

  const bestPhotoCount = photos.filter((photo) => photo.is_best_photo).length;
  const heartwarmingAwardCount =
    photos.filter((photo) => photo.is_heartwarming_award && photo.caption?.trim())
      .length +
    missionLogs.filter((log) => log.is_heartwarming_award).length;
  const isBestPhotoLimitReached = bestPhotoCount >= awardSelectLimit;
  const isHeartwarmingLimitReached =
    heartwarmingAwardCount >= awardSelectLimit;

  return (
    <main className="min-h-screen bg-stone-100 px-4 py-6 text-stone-900 sm:px-8">
      <div className="mx-auto max-w-7xl">
        <header className="flex flex-col gap-4 rounded-2xl bg-white p-5 shadow sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-rose-600">管理者用</p>
            <h1 className="text-2xl font-bold sm:text-3xl">
              管理者用：表彰選択画面
            </h1>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              className="rounded-full bg-stone-900 px-4 py-2 text-sm font-semibold text-white"
              href="/screen/awards"
            >
              表彰画面を見る
            </Link>
            <Link
              className="rounded-full border border-stone-300 bg-white px-4 py-2 text-sm font-semibold"
              href="/home"
            >
              HOMEへ戻る
            </Link>
          </div>
        </header>

        {message ? (
          <p className="mt-4 rounded-xl bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
            {message}
          </p>
        ) : null}

        {error ? (
          <p className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
            {error}
          </p>
        ) : null}

        {state === "loading" ? (
          <div className="mt-6 rounded-2xl bg-white p-10 text-center text-lg font-semibold shadow">
            読み込み中...
          </div>
        ) : null}

        {state === "done" ? (
          <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(420px,0.8fr)]">
            <section className="rounded-2xl bg-white p-5 shadow">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-bold">写真一覧</h2>
                  <p className="mt-1 text-sm text-stone-500">
                    ベスト写真賞と写真コメントの表彰を選択します。
                  </p>
                </div>
                <span className="rounded-full bg-stone-100 px-3 py-1 text-sm font-semibold">
                  {photos.length}件
                </span>
              </div>
              <div className="mt-4 flex flex-wrap gap-2 text-sm font-semibold">
                <span className="rounded-full bg-amber-100 px-3 py-1 text-amber-800">
                  ベスト写真 {bestPhotoCount} / {awardSelectLimit}
                </span>
                <span className="rounded-full bg-rose-100 px-3 py-1 text-rose-800">
                  ベストコメント {heartwarmingAwardCount} / {awardSelectLimit}
                </span>
              </div>

              {photos.length === 0 ? (
                <p className="mt-6 rounded-xl bg-stone-50 p-5 text-stone-500">
                  写真はまだ投稿されていません
                </p>
              ) : (
                <div className="mt-5 grid gap-4 md:grid-cols-2">
                  {photos.map((photo) => {
                    const id = String(photo.id);
                    const selected =
                      Boolean(photo.is_best_photo) ||
                      Boolean(photo.is_heartwarming_award);
                    const hasCaption = Boolean(photo.caption?.trim());
                    const disableBestPhotoSelect =
                      !photo.is_best_photo && isBestPhotoLimitReached;
                    const disableHeartwarmingSelect =
                      !photo.is_heartwarming_award &&
                      (!hasCaption || isHeartwarmingLimitReached);

                    return (
                      <article
                        className={`overflow-hidden rounded-2xl border p-3 shadow-sm ${
                          selected
                            ? "border-rose-300 bg-rose-50"
                            : "border-stone-200 bg-white"
                        }`}
                        key={id}
                      >
                        {photo.image_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            alt={photo.caption || "投稿写真"}
                            className="h-48 w-full rounded-xl object-cover"
                            src={photo.image_url}
                          />
                        ) : (
                          <div className="flex h-48 items-center justify-center rounded-xl bg-stone-100 text-stone-400">
                            画像なし
                          </div>
                        )}

                        <div className="mt-3 space-y-3">
                          <div className="text-sm">
                            <p className="font-bold">
                              投稿者: {photo.guest_name || "未設定"}
                            </p>
                            <p className="text-stone-500">
                              {formatDate(photo.created_at)}
                            </p>
                            {photo.caption ? (
                              <p className="mt-2 rounded-lg bg-white/80 p-3 leading-6">
                                {photo.caption}
                              </p>
                            ) : (
                              <p className="mt-2 text-stone-400">コメントなし</p>
                            )}
                          </div>

                          <div className="flex flex-wrap gap-2 text-xs font-semibold">
                            <span
                              className={`rounded-full px-3 py-1 ${
                                photo.is_best_photo
                                  ? "bg-amber-200 text-amber-900"
                                  : "bg-stone-100 text-stone-500"
                              }`}
                            >
                              ベスト写真: {photo.is_best_photo ? "選択中" : "未選択"}
                            </span>
                            <span
                              className={`rounded-full px-3 py-1 ${
                                photo.is_heartwarming_award
                                  ? "bg-rose-200 text-rose-900"
                                  : "bg-stone-100 text-stone-500"
                              }`}
                            >
                              コメント賞:{" "}
                              {photo.is_heartwarming_award ? "選択中" : "未選択"}
                            </span>
                          </div>

                          <label className="block text-sm font-semibold">
                            award_title
                            <input
                              className="mt-1 w-full rounded-xl border border-stone-300 px-3 py-2 text-sm outline-none focus:border-rose-400"
                              onChange={(event) =>
                                setPhotoTitles((current) => ({
                                  ...current,
                                  [id]: event.target.value,
                                }))
                              }
                              placeholder="例：最高の笑顔賞"
                              value={photoTitles[id] ?? ""}
                            />
                          </label>

                          <div className="grid gap-2 sm:grid-cols-3">
                            <button
                              className="rounded-xl bg-amber-500 px-3 py-2 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-50"
                              disabled={
                                savingKey === `photo-best-${id}` ||
                                disableBestPhotoSelect
                              }
                              onClick={() =>
                                void runUpdate({
                                  id: photo.id,
                                  key: `photo-best-${id}`,
                                  table: "photos",
                                  values: {
                                    is_best_photo: !photo.is_best_photo,
                                    award_title: photo.is_best_photo
                                      ? null
                                      : photoTitles[id]?.trim() || null,
                                  },
                                })
                              }
                              type="button"
                            >
                              {photo.is_best_photo
                                ? "ベスト解除"
                                : disableBestPhotoSelect
                                  ? "上限3つです"
                                  : "ベスト写真賞に選ぶ"}
                            </button>
                            <button
                              className="rounded-xl bg-rose-500 px-3 py-2 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-50"
                              disabled={
                                savingKey === `photo-heart-${id}` ||
                                disableHeartwarmingSelect
                              }
                              onClick={() =>
                                void runUpdate({
                                  id: photo.id,
                                  key: `photo-heart-${id}`,
                                  table: "photos",
                                  values: {
                                    is_heartwarming_award:
                                      !photo.is_heartwarming_award,
                                    award_title: photo.is_heartwarming_award
                                      ? null
                                      : photoTitles[id]?.trim() || null,
                                  },
                                })
                              }
                              type="button"
                            >
                              {photo.is_heartwarming_award
                                ? "コメント賞解除"
                                : !hasCaption
                                  ? "コメントなし"
                                : disableHeartwarmingSelect
                                  ? "上限3つです"
                                  : "コメント賞に選ぶ"}
                            </button>
                            <button
                              className="rounded-xl bg-stone-900 px-3 py-2 text-sm font-bold text-white disabled:opacity-50"
                              disabled={savingKey === `photo-title-${id}`}
                              onClick={() =>
                                void runUpdate({
                                  id: photo.id,
                                  key: `photo-title-${id}`,
                                  table: "photos",
                                  values: {
                                    award_title: photoTitles[id]?.trim() || null,
                                  },
                                })
                              }
                              type="button"
                            >
                              タイトル保存
                            </button>
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </section>

            <section className="rounded-2xl bg-white p-5 shadow">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-bold">Story Mission回答</h2>
                  <p className="mt-1 text-sm text-stone-500">
                    テキスト回答から心温まるコメント賞を選択します。
                  </p>
                </div>
                <span className="rounded-full bg-stone-100 px-3 py-1 text-sm font-semibold">
                  {missionLogs.length}件
                </span>
              </div>
              <div className="mt-4 flex flex-wrap gap-2 text-sm font-semibold">
                <span className="rounded-full bg-rose-100 px-3 py-1 text-rose-800">
                  ベストコメント {heartwarmingAwardCount} / {awardSelectLimit}
                </span>
              </div>

              {missionLogs.length === 0 ? (
                <p className="mt-6 rounded-xl bg-stone-50 p-5 text-stone-500">
                  Story Mission回答はまだありません
                </p>
              ) : (
                <div className="mt-5 flex flex-col gap-4">
                  {missionLogs.map((log) => {
                    const id = String(log.id);
                    const missionTitle = log.mission_id
                      ? missionTitleMap.get(String(log.mission_id)) ?? "Mission"
                      : "Mission";
                    const disableHeartwarmingSelect =
                      !log.is_heartwarming_award && isHeartwarmingLimitReached;

                    return (
                      <article
                        className={`rounded-2xl border p-4 shadow-sm ${
                          log.is_heartwarming_award
                            ? "border-rose-300 bg-rose-50"
                            : "border-stone-200 bg-white"
                        }`}
                        key={id}
                      >
                        <div className="space-y-2 text-sm">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <p className="font-bold">
                              投稿者: {log.guest_name || "未設定"}
                            </p>
                            <span
                              className={`rounded-full px-3 py-1 text-xs font-semibold ${
                                log.is_heartwarming_award
                                  ? "bg-rose-200 text-rose-900"
                                  : "bg-stone-100 text-stone-500"
                              }`}
                            >
                              コメント賞:{" "}
                              {log.is_heartwarming_award ? "選択中" : "未選択"}
                            </span>
                          </div>
                          <p className="text-stone-500">{formatDate(log.created_at)}</p>
                          <p className="font-semibold text-rose-700">
                            {missionTitle}
                          </p>
                          <p className="rounded-xl bg-white/80 p-3 leading-6">
                            {log.submitted_text}
                          </p>
                        </div>

                        <label className="mt-4 block text-sm font-semibold">
                          award_title
                          <input
                            className="mt-1 w-full rounded-xl border border-stone-300 px-3 py-2 text-sm outline-none focus:border-rose-400"
                            onChange={(event) =>
                              setMissionLogTitles((current) => ({
                                ...current,
                                [id]: event.target.value,
                              }))
                            }
                            placeholder="例：心に残るメッセージ賞"
                            value={missionLogTitles[id] ?? ""}
                          />
                        </label>

                        <div className="mt-3 grid gap-2 sm:grid-cols-2">
                          <button
                            className="rounded-xl bg-rose-500 px-3 py-2 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-50"
                            disabled={
                              savingKey === `log-heart-${id}` ||
                              disableHeartwarmingSelect
                            }
                            onClick={() =>
                              void runUpdate({
                                id: log.id,
                                key: `log-heart-${id}`,
                                table: "mission_logs",
                                values: {
                                  is_heartwarming_award:
                                    !log.is_heartwarming_award,
                                  award_title: log.is_heartwarming_award
                                    ? null
                                    : missionLogTitles[id]?.trim() || null,
                                },
                              })
                            }
                            type="button"
                          >
                            {log.is_heartwarming_award
                              ? "コメント賞解除"
                              : disableHeartwarmingSelect
                                ? "上限3つです"
                                : "コメント賞に選ぶ"}
                          </button>
                          <button
                            className="rounded-xl bg-stone-900 px-3 py-2 text-sm font-bold text-white disabled:opacity-50"
                            disabled={savingKey === `log-title-${id}`}
                            onClick={() =>
                              void runUpdate({
                                id: log.id,
                                key: `log-title-${id}`,
                                table: "mission_logs",
                                values: {
                                  award_title: missionLogTitles[id]?.trim() || null,
                                },
                              })
                            }
                            type="button"
                          >
                            タイトル保存
                          </button>
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </section>
          </div>
        ) : null}
      </div>
    </main>
  );
}

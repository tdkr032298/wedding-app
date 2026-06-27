"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type Guest = {
  id: string | number;
  name: string | null;
  table_name: string | null;
  first_login_at: string | null;
  login_count: number | null;
};

type Photo = {
  id: string | number;
  guest_name: string | null;
  image_url: string | null;
  caption: string | null;
  is_best_photo: boolean | null;
  is_heartwarming_award: boolean | null;
  award_title: string | null;
};

type Mission = {
  id: string | number;
  title: string | null;
  mission_type: string | null;
  is_active: boolean | null;
};

type MissionLog = {
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

type CountRanking = {
  count: number;
  name: string;
};

type MissionAchievementRanking = {
  completedCount: number;
  guestName: string;
  rate: number;
  totalCount: number;
};

type TableScore = {
  missionCount: number;
  photoCount: number;
  score: number;
  tableName: string;
};

type FirstMissionClear = {
  guestName: string;
  missionTitle: string;
};

type PhotographerAward = {
  guestNames: string[];
  photoMissionTypeCount: number;
};

type HeartwarmingAward = {
  awardTitle: string | null;
  guestName: string;
  text: string;
  type: "photo" | "story";
};

type AwardData = {
  arrivals: Guest[];
  bestPhotos: Photo[];
  bestTable: TableScore | null;
  firstMissionClear: FirstMissionClear | null;
  heartwarmingAwards: HeartwarmingAward[];
  missionAchievementRanking: MissionAchievementRanking[];
  photographerAward: PhotographerAward | null;
  photoRanking: CountRanking[];
  tableMissionRanking: CountRanking[];
  allTableMissionRanking: CountRanking[];
};

type AwardState = "loading" | "done" | "error";

const arrivalRanks = [1, 7, 22];

function getGuestName(value: string | null) {
  return value?.trim() || "";
}

function buildGuestTableMap(guests: Guest[]) {
  const map = new Map<string, string>();

  for (const guest of guests) {
    const guestName = getGuestName(guest.name);

    if (!guestName) {
      continue;
    }

    map.set(guestName, guest.table_name?.trim() || "未設定");
  }

  return map;
}

function incrementCount(map: Map<string, number>, key: string, amount = 1) {
  map.set(key, (map.get(key) ?? 0) + amount);
}

function toRanking(map: Map<string, number>, limit?: number) {
  const ranking = Array.from(map.entries())
    .map(([name, count]) => ({ count, name }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, "ja"));

  return typeof limit === "number" ? ranking.slice(0, limit) : ranking;
}

function createPhotoRanking(photos: Photo[]) {
  const counts = new Map<string, number>();

  for (const photo of photos) {
    const guestName = getGuestName(photo.guest_name);

    if (guestName) {
      incrementCount(counts, guestName);
    }
  }

  return toRanking(counts, 3);
}

function createMissionAchievementRanking(
  logs: MissionLog[],
  activeMissionIds: Set<string>,
  activeMissionCount: number,
) {
  if (activeMissionCount === 0) {
    return [];
  }

  const completedMissionIdsByGuest = new Map<string, Set<string>>();

  for (const log of logs) {
    const guestName = getGuestName(log.guest_name);
    const missionId = log.mission_id ? String(log.mission_id) : "";

    if (log.status !== "completed" || !guestName || !activeMissionIds.has(missionId)) {
      continue;
    }

    const completedMissionIds =
      completedMissionIdsByGuest.get(guestName) ?? new Set<string>();
    completedMissionIds.add(missionId);
    completedMissionIdsByGuest.set(guestName, completedMissionIds);
  }

  return Array.from(completedMissionIdsByGuest.entries())
    .map(([guestName, completedMissionIds]) => {
      const completedCount = completedMissionIds.size;

      return {
        completedCount,
        guestName,
        rate: Math.round((completedCount / activeMissionCount) * 100),
        totalCount: activeMissionCount,
      };
    })
    .filter((ranking) => ranking.rate > 0)
    .sort(
      (a, b) =>
        b.rate - a.rate ||
        b.completedCount - a.completedCount ||
        a.guestName.localeCompare(b.guestName, "ja"),
    )
    .slice(0, 3);
}

function createTableMissionRanking(logs: MissionLog[], guestTableMap: Map<string, string>) {
  const counts = new Map<string, number>();

  for (const log of logs) {
    const guestName = getGuestName(log.guest_name);

    if (log.status !== "completed" || !guestName) {
      continue;
    }

    incrementCount(counts, guestTableMap.get(guestName) ?? "未設定");
  }

  return toRanking(counts);
}

function createBestTable(
  logs: MissionLog[],
  photos: Photo[],
  guestTableMap: Map<string, string>,
) {
  const missionCounts = new Map<string, number>();
  const photoCounts = new Map<string, number>();
  const allTableNames = new Set<string>();

  for (const log of logs) {
    const guestName = getGuestName(log.guest_name);

    if (log.status !== "completed" || !guestName) {
      continue;
    }

    const tableName = guestTableMap.get(guestName) ?? "未設定";
    allTableNames.add(tableName);
    incrementCount(missionCounts, tableName);
  }

  for (const photo of photos) {
    const guestName = getGuestName(photo.guest_name);

    if (!guestName) {
      continue;
    }

    const tableName = guestTableMap.get(guestName) ?? "未設定";
    allTableNames.add(tableName);
    incrementCount(photoCounts, tableName);
  }

  const scores = Array.from(allTableNames).map((tableName) => {
    const missionCount = missionCounts.get(tableName) ?? 0;
    const photoCount = photoCounts.get(tableName) ?? 0;

    return {
      missionCount,
      photoCount,
      score: missionCount + photoCount,
      tableName,
    };
  });

  return (
    scores.sort(
      (a, b) => b.score - a.score || a.tableName.localeCompare(b.tableName, "ja"),
    )[0] ?? null
  );
}

function findFirstMissionClear(logs: MissionLog[], missionTitleMap: Map<string, string>) {
  const firstLog = logs
    .filter((log) => log.status === "completed" && getGuestName(log.guest_name))
    .sort(
      (a, b) =>
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
    )[0];

  if (!firstLog) {
    return null;
  }

  return {
    guestName: getGuestName(firstLog.guest_name),
    missionTitle:
      missionTitleMap.get(String(firstLog.mission_id ?? "")) ?? "Mission",
  };
}

function createPhotographerAward(logs: MissionLog[], photoMissionIds: Set<string>) {
  const completedPhotoMissionIdsByGuest = new Map<string, Set<string>>();

  for (const log of logs) {
    const guestName = getGuestName(log.guest_name);
    const missionId = log.mission_id ? String(log.mission_id) : "";

    if (
      log.status !== "completed" ||
      !guestName ||
      !log.submitted_image_url ||
      !photoMissionIds.has(missionId)
    ) {
      continue;
    }

    const completedMissionIds =
      completedPhotoMissionIdsByGuest.get(guestName) ?? new Set<string>();
    completedMissionIds.add(missionId);
    completedPhotoMissionIdsByGuest.set(guestName, completedMissionIds);
  }

  const rankings = Array.from(completedPhotoMissionIdsByGuest.entries())
    .map(([guestName, missionIds]) => ({
      guestName,
      photoMissionTypeCount: missionIds.size,
    }))
    .filter((ranking) => ranking.photoMissionTypeCount > 0);

  const maxCount = Math.max(0, ...rankings.map((ranking) => ranking.photoMissionTypeCount));

  if (maxCount === 0) {
    return null;
  }

  return {
    guestNames: rankings
      .filter((ranking) => ranking.photoMissionTypeCount === maxCount)
      .map((ranking) => ranking.guestName)
      .sort((a, b) => a.localeCompare(b, "ja")),
    photoMissionTypeCount: maxCount,
  };
}

function createHeartwarmingAwards(
  photos: Photo[],
  logs: MissionLog[],
  storyMissionIds: Set<string>,
) {
  const photoAwards = photos
    .filter((photo) => photo.is_heartwarming_award && photo.caption?.trim())
    .map((photo) => ({
      awardTitle: photo.award_title,
      guestName: photo.guest_name || "未設定",
      text: photo.caption ?? "",
      type: "photo" as const,
    }));
  const storyAwards = logs
    .filter((log) => {
      const missionId = log.mission_id ? String(log.mission_id) : "";

      return (
        log.is_heartwarming_award &&
        log.submitted_text?.trim() &&
        storyMissionIds.has(missionId)
      );
    })
    .map((log) => ({
      awardTitle: log.award_title,
      guestName: log.guest_name || "未設定",
      text: log.submitted_text ?? "",
      type: "story" as const,
    }));

  return [...photoAwards, ...storyAwards];
}

async function fetchAwardData(): Promise<AwardData> {
  const [guestsResponse, photosResponse, missionsResponse, logsResponse] =
    await Promise.all([
      supabase
        .from("guests")
        .select("id,name,table_name,first_login_at,login_count")
        .returns<Guest[]>(),
      supabase
        .from("photos")
        .select(
          "id,guest_name,image_url,caption,is_best_photo,is_heartwarming_award,award_title",
        )
        .returns<Photo[]>(),
      supabase
        .from("missions")
        .select("id,title,mission_type,is_active")
        .eq("is_active", true)
        .returns<Mission[]>(),
      supabase
        .from("mission_logs")
        .select(
          "id,created_at,guest_name,mission_id,status,submitted_text,submitted_image_url,is_heartwarming_award,award_title",
        )
        .eq("status", "completed")
        .returns<MissionLog[]>(),
    ]);

  if (guestsResponse.error) {
    throw new Error(`ゲスト情報の取得に失敗しました: ${guestsResponse.error.message}`);
  }

  if (photosResponse.error) {
    throw new Error(`写真情報の取得に失敗しました: ${photosResponse.error.message}`);
  }

  if (missionsResponse.error) {
    throw new Error(`Mission情報の取得に失敗しました: ${missionsResponse.error.message}`);
  }

  if (logsResponse.error) {
    throw new Error(`Missionログの取得に失敗しました: ${logsResponse.error.message}`);
  }

  const guests = guestsResponse.data ?? [];
  const photos = photosResponse.data ?? [];
  const missions = missionsResponse.data ?? [];
  const logs = logsResponse.data ?? [];
  const guestTableMap = buildGuestTableMap(guests);
  const activeMissionIds = new Set(missions.map((mission) => String(mission.id)));
  const missionTitleMap = new Map(
    missions.map((mission) => [String(mission.id), mission.title || "Mission"]),
  );
  const photoMissionIds = new Set(
    missions
      .filter((mission) => mission.mission_type === "photo")
      .map((mission) => String(mission.id)),
  );
  const storyMissionIds = new Set(
    missions
      .filter((mission) => mission.mission_type === "text")
      .map((mission) => String(mission.id)),
  );
  const tableMissionRanking = createTableMissionRanking(logs, guestTableMap);

  return {
    allTableMissionRanking: tableMissionRanking,
    arrivals: guests
      .filter((guest) => guest.first_login_at)
      .sort(
        (a, b) =>
          new Date(a.first_login_at ?? "").getTime() -
          new Date(b.first_login_at ?? "").getTime(),
      ),
    bestPhotos: photos.filter((photo) => photo.is_best_photo),
    bestTable: createBestTable(logs, photos, guestTableMap),
    firstMissionClear: findFirstMissionClear(logs, missionTitleMap),
    heartwarmingAwards: createHeartwarmingAwards(photos, logs, storyMissionIds),
    missionAchievementRanking: createMissionAchievementRanking(
      logs,
      activeMissionIds,
      missions.length,
    ),
    photographerAward: createPhotographerAward(logs, photoMissionIds),
    photoRanking: createPhotoRanking(photos),
    tableMissionRanking: tableMissionRanking.slice(0, 3),
  };
}

function AwardCard({
  children,
  title,
}: {
  children: React.ReactNode;
  title: string;
}) {
  return (
    <section className="rounded-3xl border border-white/70 bg-white/85 p-7 shadow-2xl backdrop-blur">
      <h2 className="text-3xl font-bold text-stone-900">{title}</h2>
      <div className="mt-5">{children}</div>
    </section>
  );
}

function EmptyText({ children }: { children: React.ReactNode }) {
  return <p className="text-2xl text-stone-600">{children}</p>;
}

export default function AwardsScreenPage() {
  const [awardData, setAwardData] = useState<AwardData | null>(null);
  const [state, setState] = useState<AwardState>("loading");
  const [error, setError] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function loadAwards() {
      try {
        const data = await fetchAwardData();

        if (!isMounted) {
          return;
        }

        setAwardData(data);
        setState("done");
        setError("");
      } catch (awardError) {
        if (!isMounted) {
          return;
        }

        setError(
          awardError instanceof Error
            ? awardError.message
            : "表彰データの取得に失敗しました",
        );
        setState("error");
      }
    }

    void loadAwards();
    const intervalId = window.setInterval(() => {
      void loadAwards();
    }, 30000);

    return () => {
      isMounted = false;
      window.clearInterval(intervalId);
    };
  }, []);

  return (
    <main className="relative min-h-screen overflow-hidden bg-rose-100 px-10 py-8 text-stone-900">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(244,114,182,0.26),_transparent_34%),radial-gradient(circle_at_bottom_right,_rgba(251,191,36,0.28),_transparent_32%)]" />
      <div className="relative mx-auto flex min-h-[calc(100vh-4rem)] max-w-[1760px] flex-col gap-6">
        <header className="flex items-end justify-between">
          <div>
            <p className="text-2xl font-semibold text-rose-600">Wedding Awards</p>
            <h1 className="mt-1 text-6xl font-black tracking-wide text-stone-950">
              表彰式
            </h1>
          </div>
          <p className="rounded-full bg-white/80 px-6 py-3 text-xl font-semibold shadow-lg">
            Live Awards Screen
          </p>
        </header>

        {state === "loading" ? (
          <div className="flex flex-1 items-center justify-center rounded-3xl bg-white/80 text-5xl font-bold shadow-2xl">
            集計中...
          </div>
        ) : null}

        {state === "error" ? (
          <div className="rounded-3xl border border-red-100 bg-red-50 p-10 text-3xl font-bold text-red-700 shadow-2xl">
            {error}
          </div>
        ) : null}

        {state === "done" && awardData ? (
          <div className="grid flex-1 grid-cols-12 gap-6">
            <div className="col-span-4 flex flex-col gap-6">
              <AwardCard title="Best Table Award">
                {!awardData.bestTable ? (
                  <EmptyText>集計データがまだありません</EmptyText>
                ) : (
                  <div className="rounded-3xl bg-amber-50 p-7 text-center shadow-inner">
                    <p className="text-6xl font-black text-amber-600">
                      {awardData.bestTable.tableName}
                    </p>
                    <p className="mt-5 text-2xl font-bold">
                      Mission {awardData.bestTable.missionCount} / Photo{" "}
                      {awardData.bestTable.photoCount} / Total{" "}
                      {awardData.bestTable.score}
                    </p>
                  </div>
                )}
              </AwardCard>

              <AwardCard title="テーブル対抗Missionランキング">
                {awardData.tableMissionRanking.length === 0 ? (
                  <EmptyText>Mission達成はまだありません</EmptyText>
                ) : (
                  <div className="flex flex-col gap-4">
                    {awardData.tableMissionRanking.map((rank, index) => (
                      <div
                        className="flex items-center justify-between rounded-2xl bg-white px-5 py-4 shadow"
                        key={rank.name}
                      >
                        <div className="flex items-center gap-4">
                          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-rose-500 text-2xl font-black text-white">
                            {index + 1}
                          </span>
                          <span className="text-3xl font-bold">{rank.name}</span>
                        </div>
                        <span className="text-4xl font-black text-rose-600">
                          {rank.count}達成
                        </span>
                      </div>
                    ))}
                  </div>
                )}
                {awardData.allTableMissionRanking.length > 3 ? (
                  <div className="mt-5 grid grid-cols-2 gap-2 text-sm font-semibold text-stone-600">
                    {awardData.allTableMissionRanking.slice(3).map((rank) => (
                      <div
                        className="rounded-lg bg-stone-50 px-3 py-2"
                        key={rank.name}
                      >
                        {rank.name}: {rank.count}達成
                      </div>
                    ))}
                  </div>
                ) : null}
              </AwardCard>

              <AwardCard title="First Mission Clear">
                {!awardData.firstMissionClear ? (
                  <EmptyText>Mission達成はまだありません</EmptyText>
                ) : (
                  <div className="rounded-3xl bg-rose-50 p-7">
                    <p className="text-5xl font-black text-rose-600">
                      {awardData.firstMissionClear.guestName}さん
                    </p>
                    <p className="mt-4 text-2xl font-bold leading-9">
                      「{awardData.firstMissionClear.missionTitle}」を最初に達成！
                    </p>
                  </div>
                )}
              </AwardCard>
            </div>

            <div className="col-span-4 flex flex-col gap-6">
              <AwardCard title="ベスト写真賞">
                {awardData.bestPhotos.length === 0 ? (
                  <EmptyText>表彰写真はまだありません</EmptyText>
                ) : (
                  <div className="grid gap-4">
                    {awardData.bestPhotos.slice(0, 2).map((photo) => (
                      <article
                        className="overflow-hidden rounded-2xl bg-rose-50 shadow-lg"
                        key={photo.id}
                      >
                        {photo.image_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            alt={photo.award_title || "ベスト写真賞"}
                            className="h-52 w-full object-cover"
                            src={photo.image_url}
                          />
                        ) : null}
                        <div className="p-4">
                          <p className="text-2xl font-bold text-rose-700">
                            {photo.award_title || "ベスト写真賞"}
                          </p>
                          <p className="mt-1 text-xl font-semibold">
                            投稿者: {photo.guest_name || "未設定"}
                          </p>
                          {photo.caption ? (
                            <p className="mt-1 text-lg text-stone-700">
                              {photo.caption}
                            </p>
                          ) : null}
                        </div>
                      </article>
                    ))}
                  </div>
                )}
              </AwardCard>

              <AwardCard title="Today's Photographer Award">
                {!awardData.photographerAward ? (
                  <EmptyText>Photo Mission達成者はまだいません</EmptyText>
                ) : (
                  <div className="rounded-3xl bg-amber-50 p-7 shadow-inner">
                    <div className="flex flex-col gap-3">
                      {awardData.photographerAward.guestNames.map((guestName) => (
                        <p className="text-4xl font-black" key={guestName}>
                          {guestName}さん
                        </p>
                      ))}
                    </div>
                    <p className="mt-5 text-3xl font-bold text-amber-700">
                      {awardData.photographerAward.photoMissionTypeCount}
                      種類のPhoto Missionを達成！
                    </p>
                  </div>
                )}
              </AwardCard>

              <AwardCard title="心温まるコメント賞">
                {awardData.heartwarmingAwards.length === 0 ? (
                  <EmptyText>表彰コメントはまだありません</EmptyText>
                ) : (
                  <div className="flex flex-col gap-3">
                    {awardData.heartwarmingAwards.slice(0, 3).map((award) => (
                      <article
                        className="rounded-2xl bg-white px-5 py-4 shadow"
                        key={`${award.type}-${award.guestName}-${award.text}`}
                      >
                        <p className="text-sm font-black uppercase tracking-wide text-rose-500">
                          {award.awardTitle || "心温まるコメント賞"}
                        </p>
                        <p className="text-xl font-bold text-rose-700">
                          {award.guestName}さん
                        </p>
                        <p className="mt-2 text-lg leading-7 text-stone-700">
                          {award.text}
                        </p>
                      </article>
                    ))}
                  </div>
                )}
              </AwardCard>
            </div>

            <div className="col-span-4 flex flex-col gap-6">
              <AwardCard title="今日来てくれた人">
                <div className="flex flex-col gap-4">
                  {arrivalRanks.map((rank) => {
                    const arrival = awardData.arrivals[rank - 1];

                    return (
                      <div
                        className="rounded-2xl bg-amber-50 px-6 py-5 shadow"
                        key={rank}
                      >
                        <p className="text-xl font-semibold text-amber-700">
                          今日{rank}番目に来てくれた人
                        </p>
                        <p className="mt-2 text-4xl font-black">
                          {arrival?.name || "まだ集計中"}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </AwardCard>

              <AwardCard title="Mission達成率">
                {awardData.missionAchievementRanking.length === 0 ? (
                  <EmptyText>Mission達成者はまだいません</EmptyText>
                ) : (
                  <ol className="flex flex-col gap-4">
                    {awardData.missionAchievementRanking.map((rank, index) => (
                      <li
                        className="rounded-2xl bg-rose-50 px-5 py-4 shadow"
                        key={rank.guestName}
                      >
                        <div className="flex items-center justify-between gap-4">
                          <div className="flex items-center gap-4">
                            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-rose-500 text-2xl font-black text-white">
                              {index + 1}
                            </span>
                            <div>
                              <p className="text-3xl font-bold">
                                {rank.guestName}
                              </p>
                              <p className="mt-1 text-lg text-stone-600">
                                {rank.completedCount} / {rank.totalCount} Mission
                              </p>
                            </div>
                          </div>
                          <span className="text-5xl font-black text-rose-600">
                            {rank.rate}%
                          </span>
                        </div>
                      </li>
                    ))}
                  </ol>
                )}
              </AwardCard>

              <AwardCard title="写真投稿枚数最多">
                {awardData.photoRanking.length === 0 ? (
                  <EmptyText>写真投稿はまだありません</EmptyText>
                ) : (
                  <ol className="flex flex-col gap-4">
                    {awardData.photoRanking.map((rank, index) => (
                      <li
                        className="flex items-center justify-between rounded-2xl bg-white px-5 py-4 shadow"
                        key={rank.name}
                      >
                        <div className="flex items-center gap-4">
                          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-rose-500 text-2xl font-black text-white">
                            {index + 1}
                          </span>
                          <span className="text-3xl font-bold">{rank.name}</span>
                        </div>
                        <span className="text-4xl font-black text-rose-600">
                          {rank.count}枚
                        </span>
                      </li>
                    ))}
                  </ol>
                )}
              </AwardCard>
            </div>
          </div>
        ) : null}
      </div>
      <p className="absolute bottom-5 right-8 text-sm font-semibold text-stone-500">
        Wedding Awards
      </p>
    </main>
  );
}

"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ChangeEvent,
  FormEvent,
  use,
  useEffect,
  useRef,
  useState,
} from "react";
import { AuthGuard } from "@/components/AuthGuard";
import { type LoggedInGuest } from "@/lib/guest-auth";
import { supabase } from "@/lib/supabase";

const bucketName = "wedding-photos";

type Mission = {
  id: string | number;
  created_at: string;
  title: string;
  description: string | null;
  category: string | null;
  mission_type: "photo" | "text" | "challenge" | string | null;
  points: number | null;
  is_active: boolean | null;
  display_order: number | null;
};

type CompletedMissionLog = {
  id: string | number;
  created_at: string;
  guest_name: string | null;
  mission_id: string | number | null;
  status: string | null;
  submitted_text: string | null;
  submitted_image_url: string | null;
};

type DetailState = "loading" | "done" | "error";

function formatSupabaseError(error: unknown) {
  if (error && typeof error === "object") {
    const detail = error as {
      message?: string;
      name?: string;
      statusCode?: string | number;
      error?: string;
    };
    const parts = [
      detail.message,
      detail.error,
      detail.name,
      detail.statusCode ? `status: ${detail.statusCode}` : null,
    ].filter(Boolean);

    if (parts.length > 0) {
      return parts.join(" / ");
    }
  }

  return "原因不明のエラーです";
}

function getFileExtension(fileName: string) {
  const extension = fileName.split(".").pop();

  if (!extension || extension === fileName) {
    return "jpg";
  }

  return extension.toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
}

function createFilePath(guestId: string, missionId: string, fileName: string) {
  const safeGuestId = guestId.replace(/[^a-zA-Z0-9_-]/g, "") || "guest";
  const safeMissionId = missionId.replace(/[^a-zA-Z0-9_-]/g, "") || "mission";
  const extension = getFileExtension(fileName);

  return `missions/${safeMissionId}/guest-${safeGuestId}/${Date.now()}-${crypto.randomUUID()}.${extension}`;
}

function PhotoMissionForm({
  guest,
  mission,
  onCompleted,
}: {
  guest: LoggedInGuest;
  mission: Mission;
  onCompleted: () => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [caption, setCaption] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;

    setError("");
    setMessage("");

    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }

    if (!file) {
      setSelectedFile(null);
      setPreviewUrl("");
      return;
    }

    if (!file.type.startsWith("image/")) {
      setSelectedFile(null);
      setPreviewUrl("");
      setError("画像ファイルを選択してください");
      return;
    }

    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");

    if (!selectedFile) {
      setError("画像を選択してください");
      return;
    }

    if (!selectedFile.type.startsWith("image/")) {
      setError("画像ファイルを選択してください");
      return;
    }

    setIsSubmitting(true);

    const filePath = createFilePath(
      guest.id,
      String(mission.id),
      selectedFile.name,
    );
    const { error: uploadError } = await supabase.storage
      .from(bucketName)
      .upload(filePath, selectedFile, {
        contentType: selectedFile.type,
        upsert: false,
      });

    if (uploadError) {
      setIsSubmitting(false);
      setError(`アップロードに失敗しました: ${formatSupabaseError(uploadError)}`);
      return;
    }

    const { data: publicUrlData } = supabase.storage
      .from(bucketName)
      .getPublicUrl(filePath);
    const submittedText = caption.trim();

    const { error: photoError } = await supabase.from("photos").insert({
      guest_name: guest.name,
      image_url: publicUrlData.publicUrl,
      file_path: filePath,
      caption: submittedText || null,
    });

    if (photoError) {
      setIsSubmitting(false);
      setError(`写真情報の保存に失敗しました: ${formatSupabaseError(photoError)}`);
      return;
    }

    const { error: logError } = await supabase.from("mission_logs").insert({
      guest_name: guest.name,
      mission_id: mission.id,
      status: "completed",
      submitted_image_url: publicUrlData.publicUrl,
      submitted_text: submittedText || null,
    });

    setIsSubmitting(false);

    if (logError) {
      setError(`Missionログの保存に失敗しました: ${formatSupabaseError(logError)}`);
      return;
    }

    setIsCompleted(true);
    setMessage("Missionクリア！Mission一覧へ戻ります...");
    setSelectedFile(null);
    setCaption("");
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setPreviewUrl("");

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }

    onCompleted();
  }

  if (isCompleted) {
    return (
      <section className="rounded-lg border border-green-200 bg-green-50 p-5 shadow-sm">
        <p className="font-semibold text-green-700">Missionクリア！</p>
        <p className="mt-2 text-sm text-stone-700">
          Mission一覧へ戻ります...
        </p>
      </section>
    );
  }

  return (
    <form
      className="rounded-lg border border-rose-100 bg-white p-5 shadow-sm"
      onSubmit={handleSubmit}
    >
      <div className="flex flex-col gap-5">
        <label className="flex flex-col gap-2 text-sm font-semibold">
          写真を選択
          <input
            accept="image/*"
            className="block w-full rounded-md border border-stone-300 bg-white px-3 py-3 text-sm file:mr-4 file:rounded-md file:border-0 file:bg-rose-100 file:px-4 file:py-2 file:font-semibold file:text-rose-700"
            onChange={handleFileChange}
            ref={fileInputRef}
            type="file"
          />
        </label>

        {previewUrl ? (
          <div className="overflow-hidden rounded-lg border border-stone-200 bg-stone-50">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              alt="選択した画像のプレビュー"
              className="max-h-[420px] w-full object-contain"
              src={previewUrl}
            />
          </div>
        ) : null}

        <label className="flex flex-col gap-2 text-sm font-semibold">
          コメント
          <textarea
            className="min-h-28 rounded-md border border-stone-300 px-3 py-3 text-base outline-none transition focus:border-rose-400 focus:ring-2 focus:ring-rose-100"
            onChange={(event) => setCaption(event.target.value)}
            placeholder="写真に添えるコメントを入力できます"
            value={caption}
          />
        </label>

        {error ? (
          <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        ) : null}

        {message ? (
          <p className="rounded-md bg-green-50 px-3 py-2 text-sm text-green-700">
            {message}
          </p>
        ) : null}

        <button
          className="rounded-md bg-rose-500 px-4 py-3 font-semibold text-white transition hover:bg-rose-600 disabled:cursor-not-allowed disabled:bg-rose-300"
          disabled={isSubmitting}
          type="submit"
        >
          {isSubmitting ? "投稿中..." : "写真を投稿する"}
        </button>
      </div>
    </form>
  );
}

function StoryMissionForm({
  guest,
  mission,
  onCompleted,
}: {
  guest: LoggedInGuest;
  mission: Mission;
  onCompleted: () => void;
}) {
  const [answer, setAnswer] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");

    const submittedText = answer.trim();

    if (!submittedText) {
      setError("回答を入力してください");
      return;
    }

    setIsSubmitting(true);

    const { error: insertError } = await supabase
      .from("mission_logs")
      .insert({
        guest_name: guest.name,
        mission_id: mission.id,
        status: "completed",
        submitted_text: submittedText,
      });

    setIsSubmitting(false);

    if (insertError) {
      setError(`回答の保存に失敗しました: ${formatSupabaseError(insertError)}`);
      return;
    }

    setIsCompleted(true);
    setMessage("Missionクリア！Mission一覧へ戻ります...");
    setAnswer("");
    onCompleted();
  }

  if (isCompleted) {
    return (
      <section className="rounded-lg border border-green-200 bg-green-50 p-5 shadow-sm">
        <p className="font-semibold text-green-700">Missionクリア！</p>
        <p className="mt-2 text-sm text-stone-700">
          Mission一覧へ戻ります...
        </p>
      </section>
    );
  }

  return (
    <form
      className="rounded-lg border border-rose-100 bg-white p-5 shadow-sm"
      onSubmit={handleSubmit}
    >
      <div className="flex flex-col gap-5">
        <label className="flex flex-col gap-2 text-sm font-semibold">
          回答
          <textarea
            className="min-h-36 rounded-md border border-stone-300 px-3 py-3 text-base outline-none transition focus:border-rose-400 focus:ring-2 focus:ring-rose-100"
            onChange={(event) => setAnswer(event.target.value)}
            placeholder="回答を入力してください"
            value={answer}
          />
        </label>

        {error ? (
          <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        ) : null}

        {message ? (
          <p className="rounded-md bg-green-50 px-3 py-2 text-sm text-green-700">
            {message}
          </p>
        ) : null}

        <button
          className="rounded-md bg-rose-500 px-4 py-3 font-semibold text-white transition hover:bg-rose-600 disabled:cursor-not-allowed disabled:bg-rose-300"
          disabled={isSubmitting}
          type="submit"
        >
          {isSubmitting ? "送信中..." : "回答を送信する"}
        </button>
      </div>
    </form>
  );
}

function ChallengeMissionPanel({
  completedLog,
  guest,
  mission,
}: {
  completedLog: CompletedMissionLog | null;
  guest: LoggedInGuest;
  mission: Mission;
}) {
  const [photoCount, setPhotoCount] = useState<number | null>(null);
  const [isCompleted, setIsCompleted] = useState(Boolean(completedLog));
  const [error, setError] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function fetchPhotoCount() {
      const { count, error: countError } = await supabase
        .from("photos")
        .select("id", { count: "exact", head: true })
        .eq("guest_name", guest.name);

      if (!isMounted) {
        return;
      }

      if (countError) {
        setError(`投稿枚数の取得に失敗しました: ${countError.message}`);
        return;
      }

      const currentPhotoCount = count ?? 0;
      setPhotoCount(currentPhotoCount);

      if (currentPhotoCount < 5 || completedLog) {
        return;
      }

      const { error: insertError } = await supabase
        .from("mission_logs")
        .insert({
          guest_name: guest.name,
          mission_id: mission.id,
          status: "completed",
          submitted_text: `写真を${currentPhotoCount}枚投稿しました`,
        });

      if (!isMounted) {
        return;
      }

      if (insertError) {
        setError(
          `Missionクリア情報の保存に失敗しました: ${insertError.message}`,
        );
        return;
      }

      setIsCompleted(true);
    }

    void fetchPhotoCount();

    return () => {
      isMounted = false;
    };
  }, [completedLog, guest.name, mission.id]);

  return (
    <section
      className={`rounded-lg border p-5 shadow-sm ${
        isCompleted
          ? "border-green-200 bg-green-50"
          : "border-rose-100 bg-white"
      }`}
    >
      <div className="flex flex-col gap-3">
        <h2 className="text-lg font-bold">Challenge Mission</h2>
        <p className="text-sm leading-6 text-stone-700">
          このChallenge Missionは後で実装します
        </p>
        {error ? <p className="text-sm text-red-700">{error}</p> : null}
        {photoCount === null && !error ? (
          <p className="text-sm text-stone-500">投稿枚数を確認中...</p>
        ) : null}
        {photoCount !== null ? (
          <div className="rounded-md bg-white px-4 py-3">
            <p className="font-semibold">現在の投稿枚数: {photoCount}枚</p>
            <p className="mt-1 text-sm text-stone-600">
              {isCompleted ? "Missionクリア！" : "5枚以上で達成です"}
            </p>
          </div>
        ) : null}
        {isCompleted ? (
          <p className="rounded-md bg-green-100 px-4 py-3 text-sm font-semibold text-green-700">
            達成！
          </p>
        ) : null}
      </div>
    </section>
  );
}

function CompletedMissionPanel({
  mission,
  completedLog,
}: {
  mission: Mission;
  completedLog: CompletedMissionLog;
}) {
  return (
    <section className="rounded-lg border border-green-200 bg-green-50 p-5 shadow-sm">
      <div className="flex flex-col gap-4">
        <div>
          <p className="text-sm font-semibold text-green-700">Missionクリア済み</p>
          <h2 className="mt-1 text-lg font-bold">投稿済みの内容</h2>
        </div>

        {mission.mission_type === "photo" && completedLog.submitted_image_url ? (
          <div className="overflow-hidden rounded-lg border border-green-100 bg-white">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              alt={`${mission.title}で投稿した写真`}
              className="max-h-[420px] w-full object-contain"
              src={completedLog.submitted_image_url}
            />
          </div>
        ) : null}

        {completedLog.submitted_text ? (
          <div className="rounded-md bg-white px-4 py-3">
            <p className="whitespace-pre-wrap text-sm leading-6 text-stone-700">
              {completedLog.submitted_text}
            </p>
          </div>
        ) : (
          <p className="text-sm text-stone-600">コメント・回答はありません</p>
        )}

        <p className="text-xs text-stone-500">
          完了日時: {new Date(completedLog.created_at).toLocaleString("ja-JP")}
        </p>
      </div>
    </section>
  );
}

function MissionDetailContent({
  guest,
  missionId,
}: {
  guest: LoggedInGuest;
  missionId: string;
}) {
  const router = useRouter();
  const [mission, setMission] = useState<Mission | null>(null);
  const [completedLog, setCompletedLog] =
    useState<CompletedMissionLog | null>(null);
  const [state, setState] = useState<DetailState>("loading");
  const [error, setError] = useState("");

  function handleMissionCompleted() {
    window.setTimeout(() => {
      router.replace("/missions");
    }, 2200);
  }

  useEffect(() => {
    let isMounted = true;

    async function fetchMission() {
      const [missionResponse, logResponse] = await Promise.all([
        supabase
          .from("missions")
          .select("*")
          .eq("id", missionId)
          .single<Mission>(),
        supabase
          .from("mission_logs")
          .select("*")
          .eq("guest_name", guest.name)
          .eq("mission_id", missionId)
          .eq("status", "completed")
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle<CompletedMissionLog>(),
      ]);

      if (!isMounted) {
        return;
      }

      if (missionResponse.error) {
        setError(`Missionの取得に失敗しました: ${missionResponse.error.message}`);
        setState("error");
        return;
      }

      if (logResponse.error) {
        setError(
          `Missionクリア状況の取得に失敗しました: ${logResponse.error.message}`,
        );
        setState("error");
        return;
      }

      setMission(missionResponse.data);
      setCompletedLog(logResponse.data ?? null);
      setState("done");
    }

    void fetchMission();

    return () => {
      isMounted = false;
    };
  }, [guest.name, missionId]);

  return (
    <main className="min-h-screen bg-rose-50 px-6 py-8 text-stone-900">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-5">
        <div className="flex flex-col gap-3 sm:flex-row">
          <Link
            className="rounded-md border border-stone-300 bg-white px-4 py-3 text-center font-semibold text-stone-700 shadow-sm transition hover:bg-stone-50"
            href="/home"
          >
            HOMEに戻る
          </Link>
          <Link
            className="rounded-md border border-rose-200 bg-white px-4 py-3 text-center font-semibold text-rose-700 shadow-sm transition hover:bg-rose-50"
            href="/missions"
          >
            Mission一覧に戻る
          </Link>
        </div>

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

        {state === "done" && mission ? (
          <>
            <section className="rounded-lg border border-rose-100 bg-white p-5 shadow-sm">
              <p className="text-sm font-semibold text-rose-500">
                {mission.category ?? "Mission"}
              </p>
              <div className="mt-2 flex items-start justify-between gap-3">
                <h1 className="text-2xl font-bold leading-9">{mission.title}</h1>
                <span className="shrink-0 rounded-full bg-rose-100 px-3 py-1 text-sm font-semibold text-rose-700">
                  {mission.points ?? 0} pt
                </span>
              </div>
              {mission.description ? (
                <p className="mt-3 text-sm leading-6 text-stone-700">
                  {mission.description}
                </p>
              ) : null}
            </section>

            {completedLog && mission.mission_type !== "challenge" ? (
              <CompletedMissionPanel
                completedLog={completedLog}
                mission={mission}
              />
            ) : null}

            {!completedLog && mission.mission_type === "photo" ? (
              <PhotoMissionForm
                guest={guest}
                mission={mission}
                onCompleted={handleMissionCompleted}
              />
            ) : null}

            {!completedLog && mission.mission_type === "text" ? (
              <StoryMissionForm
                guest={guest}
                mission={mission}
                onCompleted={handleMissionCompleted}
              />
            ) : null}

            {mission.mission_type === "challenge" ? (
              <ChallengeMissionPanel
                completedLog={completedLog}
                guest={guest}
                mission={mission}
              />
            ) : null}

            {!completedLog && !["photo", "text", "challenge"].includes(
              mission.mission_type ?? "",
            ) ? (
              <section className="rounded-lg border border-rose-100 bg-white p-5 text-stone-600 shadow-sm">
                このMissionタイプは後で実装します
              </section>
            ) : null}
          </>
        ) : null}
      </div>
    </main>
  );
}

export default function MissionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);

  return (
    <AuthGuard>
      {(guest) => <MissionDetailContent guest={guest} missionId={id} />}
    </AuthGuard>
  );
}

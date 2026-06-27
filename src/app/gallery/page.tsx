"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AuthGuard } from "@/components/AuthGuard";
import { supabase } from "@/lib/supabase";

type Photo = {
  id: string | number;
  created_at: string;
  guest_id: string | number | null;
  guest_name: string | null;
  image_url: string | null;
  file_path: string | null;
  caption: string | null;
};

type GalleryState = "loading" | "done" | "error";

function GalleryContent() {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [state, setState] = useState<GalleryState>("loading");
  const [error, setError] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function fetchPhotos() {
      const { data, error: fetchError } = await supabase
        .from("photos")
        .select("*")
        .order("created_at", { ascending: false })
        .returns<Photo[]>();

      if (!isMounted) {
        return;
      }

      if (fetchError) {
        setError(`画像一覧の取得に失敗しました: ${fetchError.message}`);
        setState("error");
        return;
      }

      setPhotos(data ?? []);
      setState("done");
    }

    void fetchPhotos();

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <main className="min-h-screen bg-rose-50 px-6 py-8 text-stone-900">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-5">
        <header className="rounded-lg border border-rose-100 bg-white p-5 shadow-sm">
          <p className="text-sm font-semibold text-rose-500">Gallery</p>
          <h1 className="mt-2 text-2xl font-bold">画像閲覧画面</h1>
          <p className="mt-2 text-sm text-stone-600">
            投稿された写真を新しい順に表示します。
          </p>
        </header>

        <div className="flex flex-col gap-3 sm:flex-row">
          <Link
            className="rounded-md bg-rose-500 px-4 py-3 text-center font-semibold text-white shadow-sm transition hover:bg-rose-600"
            href="/upload"
          >
            写真を投稿する
          </Link>
          <Link
            className="rounded-md border border-stone-300 bg-white px-4 py-3 text-center font-semibold text-stone-700 shadow-sm transition hover:bg-stone-50"
            href="/home"
          >
            HOMEへ戻る
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

        {state === "done" && photos.length === 0 ? (
          <section className="rounded-lg border border-rose-100 bg-white p-5 text-stone-600 shadow-sm">
            まだ写真が投稿されていません
          </section>
        ) : null}

        {photos.length > 0 ? (
          <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {photos.map((photo) => (
              <article
                className="overflow-hidden rounded-lg border border-rose-100 bg-white shadow-sm"
                key={photo.id}
              >
                <div className="aspect-[4/3] bg-stone-100">
                  {photo.image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      alt={photo.caption || `${photo.guest_name ?? "ゲスト"}の写真`}
                      className="h-full w-full object-cover"
                      src={photo.image_url}
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center px-4 text-center text-sm text-stone-500">
                      画像URLがありません
                    </div>
                  )}
                </div>
                <div className="flex flex-col gap-2 p-4">
                  <p className="font-semibold">
                    {photo.guest_name ?? "ゲスト名未設定"}
                  </p>
                  {photo.caption ? (
                    <p className="text-sm leading-6 text-stone-700">
                      {photo.caption}
                    </p>
                  ) : (
                    <p className="text-sm text-stone-400">キャプションなし</p>
                  )}
                </div>
              </article>
            ))}
          </section>
        ) : null}
      </div>
    </main>
  );
}

export default function GalleryPage() {
  return <AuthGuard>{() => <GalleryContent />}</AuthGuard>;
}

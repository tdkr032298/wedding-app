"use client";

import Link from "next/link";
import { ChangeEvent, FormEvent, useEffect, useRef, useState } from "react";
import { AuthGuard } from "@/components/AuthGuard";
import { supabase } from "@/lib/supabase";

const bucketName = "wedding-photos";

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

function createFilePath(guestId: string, fileName: string) {
  const safeGuestId = guestId.replace(/[^a-zA-Z0-9_-]/g, "") || "guest";
  const extension = getFileExtension(fileName);

  return `guest-${safeGuestId}/${Date.now()}-${crypto.randomUUID()}.${extension}`;
}

export default function UploadPage() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [caption, setCaption] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    return () => {
      previewUrls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [previewUrls]);

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);

    setError("");
    setMessage("");
    previewUrls.forEach((url) => URL.revokeObjectURL(url));

    if (files.length === 0) {
      setSelectedFiles([]);
      setPreviewUrls([]);
      return;
    }

    const invalidFile = files.find((file) => !file.type.startsWith("image/"));

    if (invalidFile) {
      setSelectedFiles([]);
      setPreviewUrls([]);
      setError("画像ファイルを選択してください");
      return;
    }

    setSelectedFiles(files);
    setPreviewUrls(files.map((file) => URL.createObjectURL(file)));
  }

  async function handleUpload(
    event: FormEvent<HTMLFormElement>,
    guestId: string,
    guestName: string,
  ) {
    event.preventDefault();
    setError("");
    setMessage("");

    if (selectedFiles.length === 0) {
      setError("画像を選択してください");
      return;
    }

    if (selectedFiles.some((file) => !file.type.startsWith("image/"))) {
      setError("画像ファイルを選択してください");
      return;
    }

    setIsUploading(true);

    const uploadedPhotos = [];

    for (const file of selectedFiles) {
      const filePath = createFilePath(guestId, file.name);
      const { error: uploadError } = await supabase.storage
        .from(bucketName)
        .upload(filePath, file, {
          contentType: file.type,
          upsert: false,
        });

      if (uploadError) {
        setIsUploading(false);
        setError(`アップロードに失敗しました: ${formatSupabaseError(uploadError)}`);
        return;
      }

      const { data: publicUrlData } = supabase.storage
        .from(bucketName)
        .getPublicUrl(filePath);

      uploadedPhotos.push({
        guest_name: guestName,
        image_url: publicUrlData.publicUrl,
        file_path: filePath,
        caption: caption.trim() || null,
      });
    }

    const { error: insertError } = await supabase
      .from("photos")
      .insert(uploadedPhotos);

    setIsUploading(false);

    if (insertError) {
      setError(
        `写真情報の保存に失敗しました: ${formatSupabaseError(insertError)}`,
      );
      return;
    }

    setMessage(`${uploadedPhotos.length}枚アップロードしました`);
    setSelectedFiles([]);
    setCaption("");
    previewUrls.forEach((url) => URL.revokeObjectURL(url));
    setPreviewUrls([]);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  return (
    <AuthGuard>
      {(guest) => (
        <main className="min-h-screen bg-rose-50 px-6 py-8 text-stone-900">
          <div className="mx-auto flex w-full max-w-2xl flex-col gap-5">
            <header className="rounded-lg border border-rose-100 bg-white p-5 shadow-sm">
              <p className="text-sm font-semibold text-rose-500">
                Photo Upload
              </p>
              <h1 className="mt-2 text-2xl font-bold">画像添付画面</h1>
              <p className="mt-2 text-sm text-stone-600">
                {guest.name} 様の名前で写真を投稿します。
              </p>
            </header>

            <form
              className="rounded-lg border border-rose-100 bg-white p-5 shadow-sm"
              onSubmit={(event) => handleUpload(event, guest.id, guest.name)}
            >
              <div className="flex flex-col gap-5">
                <label className="flex flex-col gap-2 text-sm font-semibold">
                  画像を選択
                  <input
                    accept="image/*"
                    className="block w-full rounded-md border border-stone-300 bg-white px-3 py-3 text-sm file:mr-4 file:rounded-md file:border-0 file:bg-rose-100 file:px-4 file:py-2 file:font-semibold file:text-rose-700"
                    multiple
                    onChange={handleFileChange}
                    ref={fileInputRef}
                    type="file"
                  />
                </label>

                {previewUrls.length > 0 ? (
                  <div className="rounded-lg border border-stone-200 bg-stone-50 p-3">
                    <p className="mb-3 text-sm font-semibold text-stone-600">
                      {previewUrls.length}枚選択中
                    </p>
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                      {previewUrls.map((previewUrl, index) => (
                        <div
                          className="overflow-hidden rounded-md border border-stone-200 bg-white"
                          key={previewUrl}
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            alt={`選択した画像のプレビュー ${index + 1}`}
                            className="aspect-square w-full object-cover"
                            src={previewUrl}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}

                <label className="flex flex-col gap-2 text-sm font-semibold">
                  キャプション 任意
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
                  disabled={isUploading}
                  type="submit"
                >
                  {isUploading ? "アップロード中..." : "アップロード"}
                </button>
              </div>
            </form>

            <div className="flex flex-col gap-3 sm:flex-row">
              <Link
                className="rounded-md border border-rose-200 bg-white px-4 py-3 text-center font-semibold text-rose-700 shadow-sm transition hover:bg-rose-50"
                href="/gallery"
              >
                画像閲覧画面へ
              </Link>
              <Link
                className="rounded-md border border-stone-300 bg-white px-4 py-3 text-center font-semibold text-stone-700 shadow-sm transition hover:bg-stone-50"
                href="/home"
              >
                HOMEへ戻る
              </Link>
            </div>
          </div>
        </main>
      )}
    </AuthGuard>
  );
}

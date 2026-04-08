"use client";

import { useRef, useState } from "react";
import { saveVideo, getOrder, saveOrder } from "@/lib/db";

type Props = {
  onUploaded: () => void;
};

export default function UploadButton({ onUploaded }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleClick = () => {
    inputRef.current?.click();
  };

  const handleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const ext = file.name.split(".").pop()?.toLowerCase();
    const isGif = ext === "gif";
    const isVideo = ["mp4", "mov", "webm"].includes(ext || "");

    if (!isGif && !isVideo) {
      alert("mp4 / mov / webm / gif のみ対応しています");
      return;
    }

    // 50MBチェック
    if (file.size > 50 * 1024 * 1024) {
      alert("ファイルサイズは50MB以内にしてください");
      return;
    }

    // 動画のみ15秒チェック（GIFはスキップ）
    if (isVideo) {
      const duration = await getVideoDuration(file);
      if (duration > 15) {
        alert("動画は15秒以内にしてください");
        if (inputRef.current) inputRef.current.value = "";
        return;
      }
    }

    setUploading(true);

    try {
      const id = await saveVideo(file);
      const order = await getOrder();
      await saveOrder([id, ...order]);
      onUploaded();
    } catch {
      alert("保存に失敗しました");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept="video/mp4,video/quicktime,video/webm,image/gif"
        className="hidden"
        onChange={handleChange}
      />
      <button
        onClick={handleClick}
        disabled={uploading}
        className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-white text-black flex items-center justify-center text-3xl font-light shadow-lg hover:scale-110 transition-transform disabled:opacity-50"
        aria-label="アップロード"
      >
        {uploading ? (
          <span className="animate-spin text-xl">⏳</span>
        ) : (
          "+"
        )}
      </button>
    </>
  );
}

function getVideoDuration(file: File): Promise<number> {
  return new Promise((resolve, reject) => {
    const video = document.createElement("video");
    video.preload = "metadata";
    video.onloadedmetadata = () => {
      URL.revokeObjectURL(video.src);
      resolve(video.duration);
    };
    video.onerror = () => {
      URL.revokeObjectURL(video.src);
      reject(new Error("動画の読み込みに失敗しました"));
    };
    video.src = URL.createObjectURL(file);
  });
}

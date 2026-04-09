"use client";

import { useRef, useState } from "react";
import { saveVideo, getOrder, saveOrder } from "@/lib/db";

type Props = {
  onUploaded: () => void;
};

export default function UploadButton({ onUploaded }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [trimming, setTrimming] = useState(false);

  const handleClick = () => {
    inputRef.current?.click();
  };

  // トリミング・圧縮を1パスで処理する
  // needsTrim: 15秒でカット / needsCompress: 1Mbpsで再エンコード
  const processVideo = (file: File, needsTrim: boolean, needsCompress: boolean): Promise<File> => {
    return new Promise((resolve, reject) => {
      const video = document.createElement("video");
      video.preload = "metadata";
      video.muted = true;
      video.src = URL.createObjectURL(file);

      video.onloadedmetadata = () => {
        const stream = (video as HTMLVideoElement & { captureStream(): MediaStream }).captureStream();
        const mimeType = MediaRecorder.isTypeSupported("video/webm;codecs=vp9")
          ? "video/webm;codecs=vp9"
          : "video/webm";
        const options: MediaRecorderOptions = { mimeType };
        if (needsCompress) options.videoBitsPerSecond = 1_000_000; // 1Mbps
        const recorder = new MediaRecorder(stream, options);
        const chunks: BlobPart[] = [];

        recorder.ondataavailable = (e) => {
          if (e.data.size > 0) chunks.push(e.data);
        };

        recorder.onstop = () => {
          URL.revokeObjectURL(video.src);
          const blob = new Blob(chunks, { type: mimeType });
          const processedFile = new File([blob], file.name.replace(/\.[^.]+$/, ".webm"), {
            type: mimeType,
          });
          resolve(processedFile);
        };

        recorder.onerror = () => {
          URL.revokeObjectURL(video.src);
          reject(new Error("処理に失敗しました"));
        };

        video.oncanplay = () => {
          recorder.start();
          video.play();

          if (needsTrim) {
            setTimeout(() => {
              recorder.stop();
              video.pause();
            }, 15000);
          }
        };

        // トリミング不要の場合は動画終了時に止める
        if (!needsTrim) {
          video.onended = () => {
            recorder.stop();
          };
        }
      };

      video.onerror = () => {
        URL.revokeObjectURL(video.src);
        reject(new Error("動画の読み込みに失敗しました"));
      };
    });
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

    setUploading(true);

    try {
      let fileToSave = file;

      if (isVideo) {
        const duration = await getVideoDuration(file);
        const needsTrim = duration > 15;
        const needsCompress = file.size > 10 * 1024 * 1024; // 10MB超

        if (needsTrim || needsCompress) {
          setTrimming(true);
          fileToSave = await processVideo(file, needsTrim, needsCompress);
          setTrimming(false);
        }
      }

      const id = await saveVideo(fileToSave);
      const order = await getOrder();
      await saveOrder([id, ...order]);
      onUploaded();
    } catch {
      alert("保存に失敗しました");
    } finally {
      setUploading(false);
      setTrimming(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const label = trimming ? "✂️" : uploading ? "⏳" : "+";

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
        <span className={trimming || (uploading && !trimming) ? "animate-spin text-xl" : ""}>
          {label}
        </span>
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

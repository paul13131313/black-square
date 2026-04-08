"use client";

import { useEffect, useState } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { getVideoURL, getMediaType } from "@/lib/db";

type Props = {
  id: string;
  onDelete: (id: string) => void;
};

export default function VideoPanel({ id, onDelete }: Props) {
  const [src, setSrc] = useState<string | null>(null);
  const [type, setType] = useState<"video" | "image">("video");

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  useEffect(() => {
    getVideoURL(id).then(setSrc);
    getMediaType(id).then(setType);
    return () => {
      if (src) URL.revokeObjectURL(src);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    boxShadow: isDragging ? "0 8px 32px rgba(0,0,0,0.8)" : "none",
    zIndex: isDragging ? 50 : ("auto" as const),
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    onDelete(id);
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="aspect-square overflow-hidden cursor-grab active:cursor-grabbing relative group"
    >
      {src && type === "video" && (
        <video
          src={src}
          autoPlay
          muted
          loop
          playsInline
          className="w-full h-full object-cover pointer-events-none"
        />
      )}
      {src && type === "image" && (
        <img
          src={src}
          alt=""
          className="w-full h-full object-cover pointer-events-none"
        />
      )}

      {/* 削除ボタン: ホバーで表示 */}
      <button
        onClick={handleDelete}
        onPointerDown={(e) => e.stopPropagation()}
        className="absolute top-1 right-1 w-7 h-7 rounded-full bg-black/70 text-white text-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
        aria-label="削除"
      >
        ×
      </button>
    </div>
  );
}

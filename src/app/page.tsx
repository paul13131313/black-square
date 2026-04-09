"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  rectSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import VideoPanel from "@/components/VideoPanel";
import UploadButton from "@/components/UploadButton";
import { getOrder, saveOrder, deleteVideo } from "@/lib/db";

export default function Home() {
  const [videoIds, setVideoIds] = useState<string[]>([]);
  const isDragging = useRef(false);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 200, tolerance: 5 },
    })
  );

  const loadOrder = useCallback(async () => {
    const order = await getOrder();
    setVideoIds(order);
  }, []);

  useEffect(() => {
    loadOrder();
  }, [loadOrder]);

  const handleDragStart = () => {
    isDragging.current = true;
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    isDragging.current = false;

    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = videoIds.indexOf(active.id as string);
    const newIndex = videoIds.indexOf(over.id as string);
    const newOrder = arrayMove(videoIds, oldIndex, newIndex);

    setVideoIds(newOrder);
    await saveOrder(newOrder);
  };

  const handleDelete = async (id: string) => {
    await deleteVideo(id);
    await loadOrder();
  };

  return (
    <main className="min-h-screen bg-black">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={videoIds} strategy={rectSortingStrategy}>
          <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-0">
            {videoIds.map((id) => (
              <VideoPanel key={id} id={id} onDelete={handleDelete} />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      <UploadButton onUploaded={loadOrder} />
    </main>
  );
}

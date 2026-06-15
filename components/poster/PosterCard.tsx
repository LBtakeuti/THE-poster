"use client";

// カードの DOM（縦長 3:4 の枠）。drei <View track={ref}> でこの矩形に Poster を描画する。
// 操作（ドラッグ回転）は View 経由で Poster 内の PresentationControls が受ける。
import { useRef } from "react";
import { View } from "@react-three/drei";
import { Poster } from "./Poster";
import type { PosterComposition } from "@/lib/sample-products";

type PosterCardProps = {
  title: string;
  editionSize: number;
  sold: boolean;
  reducedMotion: boolean;
  imageUrl?: string | null;
  comp?: PosterComposition;
  accent?: string;
};

export function PosterCard(props: PosterCardProps) {
  const ref = useRef<HTMLDivElement>(null!);

  return (
    <div className="relative w-full" style={{ aspectRatio: "3 / 4" }}>
      <div
        ref={ref}
        className="absolute inset-0 touch-none"
        // hit レイヤー。ドラッグで回転（cursor は drei 側で grab/grabbing）。
        style={{ cursor: props.sold ? "default" : "grab" }}
      />
      <View track={ref} className="pointer-events-none">
        <Poster {...props} />
      </View>
    </div>
  );
}

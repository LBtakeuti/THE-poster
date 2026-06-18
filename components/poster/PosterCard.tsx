"use client";

// カードの DOM（縦長 3:4 の枠）。drei v10 の <View> は「自分が描画する div」を追跡する。
// そのため track 用の別要素は使わず、<View> 自体を 3:4 の枠として絶対配置で広げ、
// その矩形に Poster を描画する。操作（ドラッグ回転）は Poster 内の PresentationControls が受ける。
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
  return (
    <div className="poster-box" style={{ aspectRatio: "3 / 4" }}>
      {/* drei v10: View 自身が追跡対象。inset:0 で枠いっぱいに広げて高さを確保する。 */}
      <View
        style={{
          position: "absolute",
          inset: 0,
          cursor: props.sold ? "default" : "grab",
        }}
      >
        <Poster {...props} />
      </View>
    </div>
  );
}

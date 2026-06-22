"use client";

// ポスター詳細ページの大きい 3D ビュー（第一弾）。
// - 一覧の固定 Canvas とは別に、このページ専用の <Canvas> を1つ置く（衝突しない）。
// - ドラッグ回転は Poster 内の PresentationControls が受ける。
// - ズームは「+ / −」ボタンの2段階。カメラ距離（dolly）を制限内で動かす。
//   中解像度しか無いので近づいても粗くなる＝それ以上見せない自然な上限になる。
// - 透かしは Poster 経由で焼かれる（lib/poster/watermark.ts）。
import { useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Poster } from "./Poster";
import { usePrefersReducedMotion } from "@/lib/hooks/usePrefersReducedMotion";
import type { PosterComposition } from "@/lib/sample-products";

// ポスターは Poster.tsx で mesh scale=1.7・実寸 幅約3.4 / 高さ約4.81。
// 360度回転すると対角（約5.9）が縦に投影されるため、fov35 で全体が余白付きに
// 収まる距離が要る。視野高さ = 2*D*tan(fov/2) = 0.6306*D。
// D=11.0 で視野高さ約6.9 → 対角5.9 に上下左右の余白が出る（モバイル390px幅で実測確認）。
const MIN_DISTANCE = 5.0; // 最も近づいた状態（ズームイン上限・拡大鑑賞）
const MAX_DISTANCE = 11.0; // 既定（引き）。回転・浮遊しても全体が余白付きで収まる。
const ZOOM_STEPS = [MAX_DISTANCE, 7.5, MIN_DISTANCE];

type PosterDetailProps = {
  title: string;
  editionSize: number;
  sold: boolean;
  imageUrl?: string | null;
  comp?: PosterComposition;
  accent?: string;
};

// カメラ距離（dolly）を目標値へなめらかに寄せる。Canvas 配下でのみ動く。
function CameraDolly({ distance }: { distance: number }) {
  const { camera } = useThree();
  const target = useRef(distance);
  target.current = distance;
  useFrame(() => {
    const z = camera.position.z;
    camera.position.z = z + (target.current - z) * 0.12;
    camera.lookAt(0, 0, 0);
  });
  return null;
}

export function PosterDetail(props: PosterDetailProps) {
  const reducedMotion = usePrefersReducedMotion();
  const [zoomIndex, setZoomIndex] = useState(0);
  const distance = ZOOM_STEPS[zoomIndex];

  const zoomIn = () =>
    setZoomIndex((i) => Math.min(i + 1, ZOOM_STEPS.length - 1));
  const zoomOut = () => setZoomIndex((i) => Math.max(i - 1, 0));

  return (
    <div className="poster-detail-stage">
      <Canvas
        gl={{ antialias: true, alpha: false }}
        dpr={[1, 2]}
        camera={{ position: [0, 0, MAX_DISTANCE], fov: 35 }}
        onCreated={({ gl }) => {
          gl.setClearColor(0xffffff, 1);
        }}
        style={{ touchAction: "none" }}
      >
        <CameraDolly distance={distance} />
        <Poster
          title={props.title}
          editionSize={props.editionSize}
          sold={props.sold}
          reducedMotion={reducedMotion}
          imageUrl={props.imageUrl}
          comp={props.comp}
          accent={props.accent}
          calmFloat
        />
      </Canvas>

      <div className="poster-detail-zoom">
        <button
          type="button"
          aria-label="Zoom out"
          onClick={zoomOut}
          disabled={zoomIndex === 0}
        >
          −
        </button>
        <button
          type="button"
          aria-label="Zoom in"
          onClick={zoomIn}
          disabled={zoomIndex === ZOOM_STEPS.length - 1}
        >
          +
        </button>
      </div>
    </div>
  );
}

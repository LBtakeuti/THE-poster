"use client";

// ポスター詳細ページの大きい 3D ビュー（第一弾）。
// - 一覧の固定 Canvas とは別に、このページ専用の <Canvas> を1つ置く（衝突しない）。
// - ドラッグ回転は Poster 内の PresentationControls が受ける。
// - ズームは「+ / −」ボタンの2段階。カメラ距離（dolly）を制限内で動かす。
//   中解像度しか無いので近づいても粗くなる＝それ以上見せない自然な上限になる。
// - 透かしは Poster 経由で焼かれる（lib/poster/watermark.ts）。
import { useEffect, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Poster } from "./Poster";
import type { PosterComposition } from "@/lib/sample-products";

const MIN_DISTANCE = 2.6; // 最も近づいた状態（ズームイン上限）
const MAX_DISTANCE = 5.2; // 既定（引き）
const ZOOM_STEPS = [MAX_DISTANCE, 4.0, MIN_DISTANCE];

type PosterDetailProps = {
  title: string;
  editionSize: number;
  sold: boolean;
  imageUrl?: string | null;
  comp?: PosterComposition;
  accent?: string;
};

function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const onChange = () => setReduced(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
  return reduced;
}

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

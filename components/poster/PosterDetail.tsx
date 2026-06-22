"use client";

// ポスター詳細ページの大きい 3D ビュー。
// - 一覧の固定 Canvas とは別に、このページ専用の <Canvas> を1つ置く（衝突しない）。
// - 回転は drei OrbitControls。指（タッチ）/マウスのドラッグで左右に自由回転し、
//   離してもその向きを保持する（正面にスナップで戻らない）。
// - 上下（polar）は見やすい範囲に軽く制限し、裏返りすぎないようにする。
// - 未操作時はゆっくり自動回転（autoRotate）。ユーザーが触ると自動回転は止まる。
// - ズームは「+ / −」ボタンの2段階。OrbitControls の距離（dolly）を制限内で動かす。
//   中解像度しか無いので近づいても粗くなる＝それ以上見せない自然な上限になる。
// - 透かしは Poster 経由で焼かれる（lib/poster/watermark.ts）。
import { useEffect, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import { Poster } from "./Poster";
import { usePrefersReducedMotion } from "@/lib/hooks/usePrefersReducedMotion";
import type { PosterComposition } from "@/lib/sample-products";

// ポスターは Poster.tsx で mesh scale=1.7・実寸 幅約3.4 / 高さ約4.81。
// 360度回転すると対角（約5.9）が縦に投影されるため、fov35 で全体が余白付きに
// 収まる距離が要る。視野高さ = 2*D*tan(fov/2) = 0.6306*D。
// D=11.0 で視野高さ約6.9 → 対角5.9 に上下左右の余白が出る（モバイル390px幅で実測確認）。
const MIN_DISTANCE = 5.0; // 最も近づいた状態（ズームイン上限・拡大鑑賞）
const MAX_DISTANCE = 11.0; // 既定（引き）。回転しても全体が余白付きで収まる。
const ZOOM_STEPS = [MAX_DISTANCE, 7.5, MIN_DISTANCE];

// 上下の制限（polar）。水平を中心に ±約25度の範囲だけ許す（裏返りすぎ防止）。
const POLAR_CENTER = Math.PI / 2;
const POLAR_SPAN = (25 * Math.PI) / 180;

type PosterDetailProps = {
  title: string;
  editionSize: number;
  sold: boolean;
  imageUrl?: string | null;
  comp?: PosterComposition;
  accent?: string;
};

// OrbitControls の距離（dolly）を目標値へなめらかに寄せる。
// OrbitControls がカメラ位置を管理するので、camera.position.z を直接書かず、
// target からカメラへの方向を保ったまま長さ（距離）だけ補間して update() で同期する。
function OrbitDolly({
  controlsRef,
  distance,
}: {
  controlsRef: React.RefObject<OrbitControlsImpl | null>;
  distance: number;
}) {
  const { camera } = useThree();
  const target = useRef(distance);
  target.current = distance;
  useFrame(() => {
    const controls = controlsRef.current;
    if (!controls) return;
    const c = controls.target;
    const dx = camera.position.x - c.x;
    const dy = camera.position.y - c.y;
    const dz = camera.position.z - c.z;
    const len = Math.hypot(dx, dy, dz);
    if (len < 1e-4) return;
    const next = len + (target.current - len) * 0.12;
    const k = next / len;
    camera.position.set(c.x + dx * k, c.y + dy * k, c.z + dz * k);
    controls.update();
  });
  return null;
}

export function PosterDetail(props: PosterDetailProps) {
  const reducedMotion = usePrefersReducedMotion();
  const [zoomIndex, setZoomIndex] = useState(0);
  const distance = ZOOM_STEPS[zoomIndex];
  const controlsRef = useRef<OrbitControlsImpl | null>(null);
  const [autoRotate, setAutoRotate] = useState(!reducedMotion);

  // reducedMotion がロード後に確定したら自動回転の初期値を合わせる
  // （ユーザーがまだ触っていない場合のみ）。
  const touched = useRef(false);
  useEffect(() => {
    if (!touched.current) setAutoRotate(!reducedMotion);
  }, [reducedMotion]);

  const zoomIn = () =>
    setZoomIndex((i) => Math.min(i + 1, ZOOM_STEPS.length - 1));
  const zoomOut = () => setZoomIndex((i) => Math.max(i - 1, 0));

  const handleStart = () => {
    touched.current = true;
    setAutoRotate(false);
  };

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
        <OrbitControls
          ref={controlsRef}
          enablePan={false}
          enableZoom={false}
          enableDamping
          dampingFactor={0.08}
          rotateSpeed={0.7}
          autoRotate={autoRotate}
          autoRotateSpeed={0.6}
          minPolarAngle={POLAR_CENTER - POLAR_SPAN}
          maxPolarAngle={POLAR_CENTER + POLAR_SPAN}
          onStart={handleStart}
        />
        <OrbitDolly controlsRef={controlsRef} distance={distance} />
        <Poster
          title={props.title}
          editionSize={props.editionSize}
          sold={props.sold}
          reducedMotion={reducedMotion}
          imageUrl={props.imageUrl}
          comp={props.comp}
          accent={props.accent}
          calmFloat
          interactive
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

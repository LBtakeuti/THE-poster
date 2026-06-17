"use client";

// ページに 1 つだけ置く固定 <Canvas>。drei <View> が各カードの DOM 矩形へ個別描画する。
// 商品が増えても WebGL コンテキストは 1 つで済む（docs/06）。
import { Canvas } from "@react-three/fiber";
import { View, Preload } from "@react-three/drei";

export function PosterCanvas() {
  return (
    <Canvas
      // 背景は純白。pointer-events は無効化し、各カードの hit レイヤーで操作する。
      eventSource={typeof document !== "undefined" ? document.body : undefined}
      className="poster-canvas-fixed"
      style={{ pointerEvents: "none" }}
      gl={{ antialias: true, alpha: false }}
      dpr={[1, 2]}
      onCreated={({ gl }) => {
        gl.setClearColor(0xffffff, 1);
      }}
    >
      <View.Port />
      <Preload all />
    </Canvas>
  );
}

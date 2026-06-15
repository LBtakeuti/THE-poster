"use client";

// 1 枚ぶんの回る紙（薄い箱 + テクスチャ + 影 + 操作）。docs/06「回る 3D ポスター」を踏襲。
// - 薄い boxGeometry（幅2 / 高さ2.828 / 奥行0.012）。正面=作品、裏面=白紙、側面=白。
// - meshStandardMaterial（roughness 高め, metalness 0）で紙のマット感。紙は真っ白。
// - PresentationControls でドラッグ回転 + スナップバック + 慣性、Float で微小に浮遊。
// - 売り切れ(sold)は少し褪せさせ、浮遊・自動回転を止める。
// - prefers-reduced-motion を尊重。
import { useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Float, PresentationControls } from "@react-three/drei";
import * as THREE from "three";
import { paintBack, paintFront } from "./paint";
import type { PosterComposition } from "@/lib/sample-products";

const PW = 2.0;
const PH = PW * 1.414;
const PD = 0.012;

type PosterProps = {
  title: string;
  editionSize: number;
  sold: boolean;
  reducedMotion: boolean;
  // サンプル（実画像なし）はコードで絵柄を描く。実画像 URL があればそれを優先。
  imageUrl?: string | null;
  comp?: PosterComposition;
  accent?: string;
};

function useCanvasTexture(make: () => HTMLCanvasElement) {
  return useMemo(() => {
    const tex = new THREE.CanvasTexture(make());
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 8;
    return tex;
    // make は描画関数。マウント時に一度だけ生成する。
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}

export function Poster({
  title,
  editionSize,
  sold,
  reducedMotion,
  imageUrl,
  comp = "sun",
  accent = "#d8442b",
}: PosterProps) {
  const { gl } = useThree();

  const frontTex = useCanvasTexture(() =>
    paintFront({ title, comp, accent, editionSize }),
  );
  const backTex = useCanvasTexture(paintBack);

  // 実画像があれば正面テクスチャを差し替える（Storage 公開 URL）。
  const realTex = useMemo(() => {
    if (!imageUrl) return null;
    const loader = new THREE.TextureLoader();
    loader.setCrossOrigin("anonymous");
    const tex = loader.load(imageUrl);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = gl.capabilities.getMaxAnisotropy();
    return tex;
  }, [imageUrl, gl]);

  const frontMap = realTex ?? frontTex;

  // 側面/裏面の素材。
  const materials = useMemo(() => {
    const edge = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.95,
      metalness: 0,
      transparent: true,
    });
    const front = new THREE.MeshStandardMaterial({
      map: frontMap,
      roughness: 0.82,
      metalness: 0,
      transparent: true,
    });
    const back = new THREE.MeshStandardMaterial({
      map: backTex,
      roughness: 0.9,
      metalness: 0,
      transparent: true,
    });
    // BoxGeometry の面順: +x,-x,+y,-y,+z(正面),-z(裏面)。
    return [edge, edge, edge, edge, front, back];
  }, [frontMap, backTex]);

  const meshRef = useRef<THREE.Mesh>(null);

  // 売り切れは褪色。opacity をなめらかに目標へ寄せる。
  useFrame(() => {
    const target = sold ? 0.5 : 1.0;
    for (const m of materials) {
      m.opacity += (target - m.opacity) * 0.06;
    }
  });

  const idleRotate = !reducedMotion && !sold;

  return (
    <>
      <hemisphereLight args={[0xffffff, 0xededee, 0.75]} />
      <directionalLight position={[-2.4, 3.0, 3.2]} intensity={1.0} />
      <directionalLight position={[3, 1, 2]} intensity={0.25} />

      <PresentationControls
        global={false}
        cursor
        snap
        speed={1.2}
        damping={0.2}
        polar={[-0.4, 0.4]}
        azimuth={[-Math.PI, Math.PI]}
      >
        <Float
          enabled={idleRotate}
          speed={idleRotate ? 1.4 : 0}
          rotationIntensity={idleRotate ? 0.15 : 0}
          floatIntensity={idleRotate ? 0.5 : 0}
        >
          <mesh ref={meshRef} geometry={geometry} material={materials} />
        </Float>
      </PresentationControls>
    </>
  );
}

// ジオメトリは全カードで共有（薄い箱）。
const geometry = new THREE.BoxGeometry(PW, PH, PD);

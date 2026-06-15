// Phase 1 のプレースホルダ。ストア（グリッド + 回る 3D ポスター）は Phase 2 で実装。
// 見た目の正は reference/poster-store-prototype.html。ここでは装飾を足さない。
// ロゴは公式 SVG ワードマーク（THE POSTER）。テキストロゴ・旧ひし形マークは廃止（docs/06・不変条件9）。
export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-[820px] flex-col items-center justify-center px-6 text-center">
      {/* eslint-disable-next-line @next/next/no-img-element -- 軽量な単色SVGワードマークのため img で表示（docs/06） */}
      <img src="/logo.svg" alt="THE POSTER" className="h-4 w-auto" />
      <p className="mt-3 text-sm text-muted">Limited prints — coming soon.</p>
    </main>
  );
}

// Phase 1 のプレースホルダ。ストア（グリッド + 回る 3D ポスター）は Phase 2 で実装。
// 見た目の正は reference/poster-store-prototype.html。ここでは装飾を足さない。
export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-[820px] flex-col items-center justify-center px-6 text-center">
      <span
        aria-hidden
        className="mb-4 inline-block h-[13px] w-[13px] rotate-45 border-[1.6px] border-ink"
      />
      <h1 className="text-sm uppercase tracking-logo">Yohaku</h1>
      <p className="mt-3 text-sm text-muted">Limited prints — coming soon.</p>
    </main>
  );
}

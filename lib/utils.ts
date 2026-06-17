// shadcn 流儀の className 結合ヘルパ。
// 本プロジェクトは「素のHTML風」モード（Tailwind 不使用）のため、
// tailwind-merge は不要。falsy を除いて join するだけの軽量版にしている。
// 将来 Tailwind を復活させる場合は clsx + tailwind-merge へ差し替え可。
export function cn(
  ...classes: Array<string | false | null | undefined>
): string {
  return classes.filter(Boolean).join(" ");
}

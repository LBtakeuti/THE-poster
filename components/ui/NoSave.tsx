"use client";

// サイト全体で画像保存の手間を上げる抑止レイヤー（第一弾）。
// - 右クリックメニュー（contextmenu）を抑止
// - 画像ドラッグ保存（dragstart）を抑止
// - 長押し保存（iOS）は globals.css の -webkit-touch-callout で併用
// 注意：フォーム入力（input/textarea）の操作は妨げない。テキスト選択も全面禁止しない。
// 100%の防止は不可能（Webの仕組み上）。第二弾でサーバー配信・署名URLを追加する。
import { useEffect } from "react";

export function NoSave() {
  useEffect(() => {
    // フォーム部品はそのまま使えるようにする（右クリック対象から除外）。
    const isFormField = (el: EventTarget | null): boolean => {
      if (!(el instanceof HTMLElement)) return false;
      const tag = el.tagName;
      return (
        tag === "INPUT" ||
        tag === "TEXTAREA" ||
        tag === "SELECT" ||
        el.isContentEditable
      );
    };

    const onContextMenu = (e: MouseEvent) => {
      if (isFormField(e.target)) return;
      e.preventDefault();
    };
    const onDragStart = (e: DragEvent) => {
      e.preventDefault();
    };

    document.addEventListener("contextmenu", onContextMenu);
    document.addEventListener("dragstart", onDragStart);
    return () => {
      document.removeEventListener("contextmenu", onContextMenu);
      document.removeEventListener("dragstart", onDragStart);
    };
  }, []);

  return null;
}

"use client";

// 全画面ハンバーガーメニュー。PC/SP 共通。中身は INSTAGRAM のみ。
import { useState } from "react";
import { CenterUnderline } from "@/components/ui/underline-animation";

export function SiteMenu() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        className="menu-toggle"
        aria-label={open ? "Close menu" : "Open menu"}
        aria-expanded={open ? "true" : "false"}
        onClick={() => setOpen((v) => !v)}
      >
        <span className="menu-toggle-bar" />
        <span className="menu-toggle-bar" />
        <span className="menu-toggle-bar" />
      </button>

      {open && (
        <div
          className="poster-menu"
          role="dialog"
          aria-modal="true"
          aria-label="Site menu"
          onClick={() => setOpen(false)}
        >
          <nav className="poster-menu-inner" onClick={(e) => e.stopPropagation()}>
            <a
              href="https://www.instagram.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="poster-menu-link"
            >
              <CenterUnderline label="INSTAGRAM" />
            </a>
          </nav>
        </div>
      )}
    </>
  );
}

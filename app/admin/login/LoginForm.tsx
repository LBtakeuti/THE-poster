"use client";

// 管理ログインフォーム。デザインはストアと同じミニマル基調（docs/07）。
import { useActionState } from "react";
import { loginAction, type LoginState } from "./actions";

const initialState: LoginState = { error: null };

export function LoginForm() {
  const [state, formAction, pending] = useActionState(loginAction, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <div className="flex flex-col gap-[6px]">
        <label htmlFor="email" className="text-[11px] tracking-[0.04em] text-subtle">
          メールアドレス
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          className="rounded-[10px] border border-line bg-white px-[13px] py-3 text-sm text-ink outline-none transition focus:border-ink focus:shadow-[0_0_0_3px_rgba(23,21,19,.06)]"
        />
      </div>
      <div className="flex flex-col gap-[6px]">
        <label htmlFor="password" className="text-[11px] tracking-[0.04em] text-subtle">
          パスワード
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className="rounded-[10px] border border-line bg-white px-[13px] py-3 text-sm text-ink outline-none transition focus:border-ink focus:shadow-[0_0_0_3px_rgba(23,21,19,.06)]"
        />
      </div>

      {state.error ? (
        <p className="text-[12px] text-danger">{state.error}</p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="mt-2 rounded-xl bg-ink px-4 py-[13px] text-sm font-semibold tracking-[0.04em] text-white transition disabled:cursor-not-allowed disabled:opacity-45"
      >
        {pending ? "処理中…" : "ログイン"}
      </button>
    </form>
  );
}

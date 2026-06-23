# 作業指示書: スマホは🍔を右下固定、PCはランダム維持

## 目的
🍔の初期位置を、スマホ（狭幅）では「右下に固定」、PC（広幅）では従来どおり「ランダム」にする。
どちらもドラッグ移動は可能のまま（初期位置だけ分岐する）。

## 前提（厳守）
- 素モード。PORT=3137 稼働中。`npm run build` 厳禁。
- 判定はクライアントのマウント後（既存 useEffect 内）で行う（SSR不一致回避）。

## 受け入れ条件
1. 画面幅 640px 以下で読み込むと🍔が右下（端から12px）に出る。
2. 画面幅 640px 超で読み込むと🍔がランダム位置に出る（従来どおり）。
3. どちらもドラッグ移動・クリック開閉は従来どおり動く。
4. tsc 0 / lint 0。

## 手順

### `components/store/SiteMenu.tsx` の初期位置 useEffect を下記に置換
現状の「ランダム位置を決める useEffect」を、下記の分岐版に差し替える（BTN/MARGIN 定数は既存のものを使用）:
```tsx
  // 初期位置をマウント後に決定（SSR不一致回避）。
  // スマホ(<=640px)は右下固定、PCはランダム。どちらもドラッグ移動は可。
  useEffect(() => {
    const maxX = Math.max(MARGIN, window.innerWidth - BTN - MARGIN);
    const maxY = Math.max(MARGIN, window.innerHeight - BTN - MARGIN);
    const isMobile = window.innerWidth <= 640;
    if (isMobile) {
      setPos({ x: maxX, y: maxY }); // 右下固定
    } else {
      setPos({
        x: MARGIN + Math.random() * (maxX - MARGIN),
        y: MARGIN + Math.random() * (maxY - MARGIN),
      });
    }
  }, []);
```
他（ポインタハンドラ・clamp・JSX）は変更しない。

### コミット
- コミットメッセージ例: `feat: スマホは🍔を右下固定、PCはランダム配置に分岐`
- 変更ファイル: components/store/SiteMenu.tsx / docs/instructions/hamburger-mobile-fixed.md

## 報告に含めること
- 受け入れ条件の達否・コミットハッシュ（tsc/lint はリード側で実行する）

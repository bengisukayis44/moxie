"use client";

import { useEffect, useState } from "react";

type BIPEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<unknown> };

let deferred: BIPEvent | null = null;
if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (e) => { e.preventDefault(); deferred = e as BIPEvent; });
}

type Env = { standalone: boolean; ios: boolean; android: boolean; inApp: boolean; iosNonSafari: boolean; ios26: boolean };

function detect(): Env {
  const ua = navigator.userAgent;
  const ios = /iPhone|iPad|iPod/i.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  return {
    standalone: matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true,
    ios,
    android: /Android/i.test(ua),
    inApp: /Instagram|FBAN|FBAV|FB_IAB|WhatsApp|Line\/|Snapchat|TikTok|musical_ly|BytedanceWebview|Twitter|LinkedInApp|Pinterest|GSA\//i.test(ua),
    iosNonSafari: ios && /CriOS|FxiOS|EdgiOS/i.test(ua),
    ios26: Number((ua.match(/Version\/(\d+)/) ?? [])[1] ?? 0) >= 26,
  };
}

/** Uygulama zaten yüklü değilse true. */
export function useCanInstall() {
  const [can, setCan] = useState(false);
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setCan(!detect().standalone), []);
  return can;
}

/** Nerede açıldığına göre "ana ekrana ekle" talimatı gösteren alt panel. */
export function InstallSheet({ onClose }: { onClose: () => void }) {
  const [env, setEnv] = useState<Env | null>(null);
  const [copied, setCopied] = useState(false);
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setEnv(detect()), []);
  if (!env) return null;
  const url = window.location.origin;
  const browser = env.ios ? "Safari" : "Chrome";

  let title = "Telefonuna yükle";
  let lead = "MOXIE mağazadan değil, buradan yükleniyor. 10 saniye sürer.";
  let steps: React.ReactNode[] = [];
  let warn: React.ReactNode = null;

  if (env.inApp) {
    title = "Önce tarayıcıda aç";
    lead = "Bu sayfa bir uygulamanın (Instagram, WhatsApp, TikTok…) içinde açılmış. Buradan ana ekrana eklenemiyor.";
    steps = [
      env.ios
        ? <>Sağ üstteki <b>⋯</b> ya da alttaki pusula ikonuna bas, <b>Safari&apos;de aç</b>&apos;ı seç.</>
        : <>Sağ üstteki <b>⋮</b> menüsüne bas, <b>Tarayıcıda aç</b>&apos;ı seç.</>,
      <>Bulamazsan aşağıdan linki kopyala, {browser}&apos;yi aç ve adres çubuğuna yapıştır.</>,
      <>Açılınca giriş ekranındaki <b>Telefonuna yükle</b>&apos;ye tekrar bas.</>,
    ];
  } else if (env.ios) {
    title = "Ana ekrana ekle";
    if (env.iosNonSafari) warn = <>Chrome kullanıyorsun. Adımlar Chrome&apos;da da çalışır; olmazsa linki <b>Safari</b>&apos;de aç.</>;
    steps = [
      env.iosNonSafari
        ? <>Adres çubuğunun sağındaki <b>paylaş</b> ikonuna bas.</>
        : env.ios26
          ? <>Sağ alttaki <b>⋯</b> (üç nokta) butonuna bas, sonra <b>Paylaş</b>&apos;a bas.</>
          : <>Ekranın altındaki <b>Paylaş</b> butonuna bas (yukarı ok olan kare).</>,
      <>Listeyi aşağı kaydır ve <b>Ana Ekrana Ekle</b>&apos;ye bas.</>,
      <><b>Web Uygulaması olarak aç</b> seçeneği varsa açık bırak, sağ üstteki <b>Ekle</b>&apos;ye bas.</>,
    ];
  } else if (env.android) {
    steps = deferred
      ? [<>Aşağıdaki <b>Yükle</b> butonuna basman yeterli.</>]
      : [<>Linki <b>Chrome</b>&apos;da aç.</>, <>Sağ üstteki <b>⋮</b> menüsüne bas.</>, <><b>Uygulamayı yükle</b> ya da <b>Ana ekrana ekle</b>&apos;yi seç.</>];
  } else {
    lead = "En iyi telefonda çalışır. Bu linki telefonuna gönder:";
    steps = [
      <>iPhone: Safari&apos;de aç → Paylaş → <b>Ana Ekrana Ekle</b>.</>,
      <>Android: Chrome&apos;da aç → ⋮ → <b>Uygulamayı yükle</b>.</>,
    ];
  }

  async function install() {
    if (!deferred) return;
    await deferred.prompt();
    try { await deferred.userChoice; } catch {}
    deferred = null;
    onClose();
  }
  async function copy() {
    try { await navigator.clipboard.writeText(url); setCopied(true); } catch { setCopied(false); }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-ink/55" onClick={onClose} role="dialog" aria-modal="true" aria-label={title}>
      <div className="max-h-[85dvh] w-full max-w-md overflow-y-auto rounded-t-3xl bg-bg px-6 pb-[calc(1.75rem+env(safe-area-inset-bottom))] pt-6 text-ink" onClick={(e) => e.stopPropagation()}>
        <h2 className="font-serif text-[1.65rem] font-medium leading-tight">{title}</h2>
        <p className="mb-4 mt-1 text-sm text-muted">{lead}</p>
        {warn && <p className="mb-4 rounded-xl bg-blush px-3.5 py-3 text-sm text-royal-dark">{warn}</p>}
        <ol className="space-y-3">
          {steps.map((s, i) => (
            <li key={i} className="relative min-h-7 pl-10 text-[15px] leading-snug">
              <span className="absolute left-0 top-[-1px] flex h-7 w-7 items-center justify-center rounded-full bg-royal text-[13px] font-semibold text-bg">{i + 1}</span>
              {s}
            </li>
          ))}
        </ol>
        {!env.inApp && env.ios && (
          <p className="mt-4 rounded-xl bg-blush px-3.5 py-3 text-sm text-royal-dark">
            “Ana Ekrana Ekle” hiç çıkmıyorsa sayfa bir uygulamanın içinde açılmış olabilir: linki kopyalayıp Safari&apos;ye yapıştır.
          </p>
        )}
        {!env.ios && !env.android && !env.inApp && <p className="mt-4 rounded-xl border border-line bg-card px-3 py-2 text-sm">{url}</p>}
        <div className="mt-5 flex gap-2">
          {deferred && !env.inApp ? (
            <button onClick={install} className="h-12 flex-1 rounded-full bg-royal font-semibold text-bg">Yükle</button>
          ) : (
            <button onClick={copy} className="h-12 flex-1 rounded-full bg-royal font-semibold text-bg">{copied ? "Kopyalandı" : "Linki kopyala"}</button>
          )}
          <button onClick={onClose} className="h-12 flex-1 rounded-full border border-line font-semibold">Kapat</button>
        </div>
      </div>
    </div>
  );
}

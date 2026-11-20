"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { photoUrl } from "@/lib/domain/looks";
import { createClient } from "@/lib/supabase/client";
import { InstallSheet, useCanInstall } from "./InstallHelp";
import { HeelMark } from "./Logo";

// Uygulama her açıldığında gelen karşılama: "Got your MOXIE?" (sayfa içi geçişlerde tekrar çıkmaz)
export function Intro({ loggedIn }: { loggedIn: boolean }) {
  const [open, setOpen] = useState(true);
  const [leaving, setLeaving] = useState(false);
  const [covers, setCovers] = useState<string[]>([]);
  const [install, setInstall] = useState(false);
  const canInstall = useCanInstall();

  useEffect(() => {
    createClient().rpc("feed_explore", { p_limit: 3 }).then(({ data }) => {
      const urls = ((data ?? []) as { cover_path: string | null }[]).map((c) => photoUrl(c.cover_path, "look-photos")).filter(Boolean) as string[];
      setCovers(urls);
    });
  }, []);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  if (!open) return null;
  const close = () => { setLeaving(true); setTimeout(() => setOpen(false), 350); };
  const fan = [covers[1], covers[0], covers[2]];

  return (
    <div
      className={`fixed inset-0 z-50 flex justify-center bg-royal text-bg transition duration-300 motion-reduce:transition-none ${leaving ? "-translate-y-3 opacity-0" : ""}`}
      role="dialog" aria-modal="true" aria-label="MOXIE'ye hoş geldin"
    >
      <div className="flex w-full max-w-md flex-col items-center px-7 pb-[calc(2rem+env(safe-area-inset-bottom))] pt-[max(3rem,env(safe-area-inset-top))] text-center">
        <HeelMark className="h-10 w-11 text-bg/90" />
        <div className="relative my-auto h-60 w-64" aria-hidden>
          {fan.map((src, i) => (
            <span
              key={i}
              className="absolute left-[4.25rem] top-2 h-44 w-32 overflow-hidden rounded-2xl border-4 border-bg bg-royal-dark shadow-[0_14px_30px_rgba(0,0,0,.35)]"
              style={{ transform: ["rotate(-14deg) translate(-62px,22px)", "translateY(-4px)", "rotate(12deg) translate(64px,22px)"][i], zIndex: i === 1 ? 1 : 0 }}
            >
              {src && <Image src={src} alt="" fill sizes="128px" className="object-cover" />}
            </span>
          ))}
        </div>
        <h1 lang="en" className="font-serif text-[2.75rem] italic leading-none">
          Got your<br /><span className="font-medium not-italic tracking-[0.1em]">MOXIE?</span>
        </h1>
        <p lang="en" className="mt-3 text-xs uppercase tracking-[0.32em] text-bg/80">Real people. Real sizes. Real fits.</p>
        <p className="mb-6 mt-3 max-w-72 text-sm leading-relaxed text-bg/75">
          Kombini mankende değil, sana benzeyen gerçek insanlarda gör. Hangi bedeni almışlar, kalıbı nasıl, fotoğrafıyla.
        </p>
        <button onClick={close} className="h-13 w-full max-w-80 rounded-full bg-bg py-3.5 text-[17px] font-semibold text-ink">Keşfetmeye başla</button>
        {canInstall && (
          <button onClick={() => setInstall(true)} className="mt-2.5 min-h-11 rounded-full border border-bg/45 px-5 text-sm">
            Telefonuna uygulama olarak yükle
          </button>
        )}
        {!loggedIn && (
          <Link href="/giris" onClick={() => setOpen(false)} className="mt-3 text-sm text-bg/70 underline underline-offset-4">Giriş yap</Link>
        )}
      </div>
      {install && <InstallSheet onClose={() => setInstall(false)} />}
    </div>
  );
}

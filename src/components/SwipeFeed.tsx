"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { formatPrice, photoUrl } from "@/lib/domain/looks";
import { SWIPE_PAGE, loadSwipeLooks, type SwipeLook } from "@/lib/domain/swipe";
import { createClient } from "@/lib/supabase/client";
import { Avatar } from "./Avatar";
import { Disclosure } from "./ProductRow";

// Keşfet: her kombin tam ekran, aşağı kaydırınca sıradaki; ürünler altta sağa kaydırılır.
export function SwipeFeed({ initial, empty }: { initial: SwipeLook[]; empty?: React.ReactNode }) {
  const [looks, setLooks] = useState(initial);
  const [done, setDone] = useState(initial.length < SWIPE_PAGE);
  const loading = useRef(false);
  const sentinel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (done) return;
    const el = sentinel.current;
    if (!el) return;
    const io = new IntersectionObserver(async ([entry]) => {
      if (!entry.isIntersecting || loading.current) return;
      loading.current = true;
      const next = await loadSwipeLooks(createClient(), looks.length);
      setLooks((prev) => [...prev, ...next.filter((n) => !prev.some((p) => p.id === n.id))]);
      if (next.length < SWIPE_PAGE) setDone(true);
      loading.current = false;
    }, { rootMargin: "200% 0px" });
    io.observe(el);
    return () => io.disconnect();
  }, [done, looks.length]);

  if (looks.length === 0 && empty) return <div className="px-4 pt-4">{empty}</div>;

  return (
    <div
      className="no-scrollbar snap-y snap-mandatory overflow-y-auto overscroll-contain"
      style={{ height: "calc(100dvh - 9.25rem - env(safe-area-inset-bottom))" }}
    >
      {looks.map((look, i) => <Slide key={look.id} look={look} priority={i < 2} />)}
      {!done ? <div ref={sentinel} className="h-px" /> : <div className="snap-end"><Disclosure /></div>}
    </div>
  );
}

function Slide({ look, priority }: { look: SwipeLook; priority: boolean }) {
  const cover = photoUrl(look.photo, "look-photos");
  const name = look.creator?.display_name ?? look.creator?.username ?? null;
  return (
    <section className="flex h-full snap-start snap-always flex-col pt-3" aria-label={look.title}>
      <div className="relative mx-4 min-h-0 flex-1 overflow-hidden rounded-[18px] bg-placeholder shadow-[0_6px_18px_rgba(60,45,30,.12)]">
        <Link href={`/k/${look.id}`} className="absolute inset-0" aria-label={`${look.title} kombinine git`}>
          {cover && <Image src={cover} alt={look.title} fill sizes="(max-width: 448px) 100vw, 448px" priority={priority} className="object-cover object-[50%_30%]" />}
        </Link>
        {look.creator && name && (
          <Link href={`/u/${look.creator.username}`} className="absolute left-3 top-3 flex items-center gap-2 rounded-full bg-card/90 py-1 pl-1 pr-3 text-sm font-semibold text-ink backdrop-blur">
            <Avatar path={look.creator.avatar_url} name={name} size={26} />
            {name}
          </Link>
        )}
        {look.photoCount > 1 && (
          <span className="absolute right-3 top-3 rounded-full bg-ink/45 px-2 py-0.5 text-[11px] text-bg backdrop-blur">{look.photoCount} fotoğraf</span>
        )}
        <Link href={`/k/${look.id}`} className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-ink/75 to-transparent px-4 pb-4 pt-14 text-bg">
          <h2 className="font-serif text-2xl font-medium leading-tight">{look.title}</h2>
          <p className="mt-1 flex flex-wrap items-center gap-x-2 text-[13px] text-bg/85">
            <span>{look.tryonTotal > 0 ? `${look.tryonTotal} kişi denedi` : "İlk deneyen sen ol"}</span>
            {look.nearTryon && <span className="rounded-full bg-lilac px-2 py-0.5 text-[11px] font-semibold text-royal-dark">Sana yakın biri denedi</span>}
            {look.items.length > 0 && <span>· {look.items.length} parça</span>}
          </p>
        </Link>
      </div>
      {look.items.length > 0 ? (
        <ul className="no-scrollbar flex shrink-0 snap-x snap-mandatory gap-2.5 overflow-x-auto scroll-px-4 px-4 pb-3 pt-3">
          {look.items.map((p) => <ProductMini key={p.id} product={p} />)}
        </ul>
      ) : (
        <div className="h-3 shrink-0" />
      )}
    </section>
  );
}

function ProductMini({ product }: { product: SwipeLook["items"][number] }) {
  const img = photoUrl(product.image_path, "product-images");
  return (
    <li className="w-[7.25rem] shrink-0 snap-start">
      <Link href={`/urun/${product.id}`} className={`block h-full rounded-xl border border-line bg-card p-1.5 ${product.in_stock ? "" : "opacity-70"}`}>
        <span className="relative block aspect-square overflow-hidden rounded-lg bg-placeholder">
          {img && <Image src={img} alt={product.name} fill sizes="116px" className={`object-cover ${product.in_stock ? "" : "grayscale"}`} />}
          <span className={`absolute left-1.5 top-1.5 rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${product.in_stock ? "bg-card/90 text-ink" : "bg-ink/70 text-bg"}`}>
            {product.in_stock ? (product.stale ? "Kontrol ediliyor" : "Stokta") : "Satışta değil"}
          </span>
        </span>
        <span className="mt-1.5 block truncate px-0.5 text-[13px] font-semibold leading-tight">{product.category_label ?? product.brand ?? product.name}</span>
        <span className="block truncate px-0.5 text-xs text-muted">
          {product.price != null ? formatPrice(product.price) : product.brand ?? product.store ?? ""}
        </span>
      </Link>
    </li>
  );
}

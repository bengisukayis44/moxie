"use client";

import { useEffect, useRef, useState } from "react";
import { PAGE_SIZE } from "@/lib/domain/looks";
import type { FeedItem, ProductCard } from "@/lib/domain/types";
import { createClient } from "@/lib/supabase/client";
import { CardSkeleton, FeedItemView, ProductCardView } from "./Cards";

type Item = FeedItem | ProductCard;

// İlk sayfa sunucudan gelir; aşağı kaydırdıkça aynı RPC'den (p_limit/p_offset) devamı çekilir.
export function InfiniteGrid({
  initial, rpc, args = {}, empty,
}: {
  initial: Item[]; rpc: string; args?: Record<string, unknown>; empty?: React.ReactNode;
}) {
  const [items, setItems] = useState(initial);
  const [done, setDone] = useState(initial.length < PAGE_SIZE);
  const [loading, setLoading] = useState(false);
  const sentinel = useRef<HTMLDivElement>(null);

  // Sunucudan yeni ilk sayfa gelince (filtre değişti / yenilendi) listeyi sıfırla
  const [prevInitial, setPrevInitial] = useState(initial);
  if (initial !== prevInitial) {
    setPrevInitial(initial);
    setItems(initial);
    setDone(initial.length < PAGE_SIZE);
  }

  useEffect(() => {
    if (done) return;
    const el = sentinel.current;
    if (!el) return;
    const io = new IntersectionObserver(async ([entry]) => {
      if (!entry.isIntersecting || loading) return;
      setLoading(true);
      const { data } = await createClient().rpc(rpc, { ...args, p_limit: PAGE_SIZE, p_offset: items.length });
      const next = (data ?? []) as Item[];
      setItems((prev) => [...prev, ...next.filter((n) => !prev.some((p) => p.id === n.id && p.kind === n.kind))]);
      if (next.length < PAGE_SIZE) setDone(true);
      setLoading(false);
    }, { rootMargin: "600px" });
    io.observe(el);
    return () => io.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [done, loading, items.length, rpc, JSON.stringify(args)]);

  if (items.length === 0 && empty) return <>{empty}</>;

  return (
    <>
      <div className="grid grid-cols-2 gap-x-3 gap-y-4">
        {items.map((it, i) =>
          it.kind === "product"
            ? <ProductCardView key={`p${it.id}`} product={it} />
            : <FeedItemView key={`${it.kind}${it.id}`} item={it} priority={i < 4} />,
        )}
        {loading && [0, 1].map((i) => <CardSkeleton key={`s${i}`} />)}
      </div>
      {!done && <div ref={sentinel} className="h-10" />}
    </>
  );
}

"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { CloseIcon, SearchIcon } from "@/components/Icons";
import type { Category, StyleTag } from "@/lib/domain/types";

const TABS = [
  ["kombinler", "Kombinler"],
  ["urunler", "Ürünler"],
  ["markalar", "Markalar"],
  ["kullanicilar", "Kullanıcılar"],
] as const;

export function SearchControls({ tab, categories, styles, loggedIn, brandName }: {
  tab: string; categories: Category[]; styles: StyleTag[]; loggedIn: boolean; brandName: string | null;
}) {
  const router = useRouter();
  const path = usePathname();
  const sp = useSearchParams();
  const [q, setQ] = useState(sp.get("q") ?? "");
  const [open, setOpen] = useState(false);

  const set = (patch: Record<string, string | null>) => {
    const next = new URLSearchParams(sp.toString());
    for (const [k, v] of Object.entries(patch)) {
      if (v) next.set(k, v);
      else next.delete(k);
    }
    router.replace(`${path}?${next.toString()}`, { scroll: false });
  };

  const filterKeys = tab === "urunler" ? ["kategori"] : ["kategori", "tarz", "beden", "boymin", "boymax", "kilomin", "kilomax", "yakin"];
  const filterCount = filterKeys.filter((k) => sp.get(k)).length;
  const field = "w-full rounded-xl border border-line bg-card px-3 py-2 text-[15px]";
  const showFilters = tab === "kombinler" || tab === "urunler";

  return (
    <div>
      <form onSubmit={(e) => { e.preventDefault(); set({ q: q.trim() || null }); }} className="flex items-center gap-2 rounded-full border border-line bg-card px-4 py-2.5">
        <SearchIcon className="h-5 w-5 shrink-0 text-muted" />
        <input value={q} onChange={(e) => setQ(e.target.value)} enterKeyHint="search" placeholder="Kombin, ürün, marka… ör. bej trençkot"
          className="min-w-0 flex-1 bg-transparent text-[15px] outline-none" />
        {q && <button type="button" onClick={() => { setQ(""); set({ q: null }); }} aria-label="Temizle"><CloseIcon className="h-4 w-4 text-muted" /></button>}
      </form>

      <div className="no-scrollbar mt-3 flex gap-5 overflow-x-auto border-b border-line text-sm">
        {TABS.map(([key, label]) => (
          <button key={key} type="button" onClick={() => set({ sekme: key === "kombinler" ? null : key })}
            className={`-mb-px shrink-0 border-b-2 pb-2 ${tab === key ? "border-royal font-semibold" : "border-transparent text-muted"}`}>
            {label}
          </button>
        ))}
      </div>

      {showFilters && (
        <>
          <div className="no-scrollbar mt-3 flex gap-2 overflow-x-auto">
            {brandName && <Chip active onClick={() => set({ marka: null })}>{brandName} ✕</Chip>}
            <Chip active={open || filterCount > 0} onClick={() => setOpen(!open)}>Filtreler{filterCount ? ` (${filterCount})` : ""}</Chip>
            {tab === "kombinler" && loggedIn && (
              <Chip active={sp.get("yakin") === "1"} onClick={() => set({ yakin: sp.get("yakin") === "1" ? null : "1" })}>Ölçülerime yakın denemesi olanlar</Chip>
            )}
            {tab === "kombinler" && (
              <select value={sp.get("sirala") ?? "new"} onChange={(e) => set({ sirala: e.target.value === "new" ? null : e.target.value })}
                className="shrink-0 rounded-full border border-line bg-card px-3 py-1.5 text-sm">
                <option value="new">En yeni</option>
                <option value="tryons">En çok denenen</option>
                {loggedIn && <option value="near">En yakın vücut</option>}
                <option value="saves">En çok kaydedilen</option>
              </select>
            )}
          </div>

          {open && (
            <div className="mt-3 space-y-3 rounded-[var(--radius-card)] border border-line bg-card p-4">
              <select value={sp.get("kategori") ?? ""} onChange={(e) => set({ kategori: e.target.value || null })} className={field}>
                <option value="">Tüm kategoriler</option>
                {categories.map((c) => <option key={c.slug} value={c.slug}>{c.label}</option>)}
              </select>
              {tab === "kombinler" && (
                <>
                  <div>
                    <p className="mb-1.5 text-sm text-muted">Tarz</p>
                    <div className="flex flex-wrap gap-1.5">
                      {styles.map((s) => {
                        const on = sp.get("tarz") === s.slug;
                        return (
                          <button key={s.slug} type="button" onClick={() => set({ tarz: on ? null : s.slug })}
                            className={`rounded-full border px-3 py-1 text-xs ${on ? "border-royal bg-royal text-bg" : "border-line"}`}>{s.label}</button>
                        );
                      })}
                    </div>
                  </div>
                  <input defaultValue={sp.get("beden") ?? ""} onBlur={(e) => set({ beden: e.target.value.trim() || null })} placeholder="Denenen beden (ör. 38, M)" className={field} />
                  <Range label="Deneyenin boyu (cm)" min="boymin" max="boymax" sp={sp} set={set} />
                  <Range label="Deneyenin kilosu (kg)" min="kilomin" max="kilomax" sp={sp} set={set} />
                </>
              )}
              <button type="button" onClick={() => set(Object.fromEntries(filterKeys.map((k) => [k, null])))} className="text-sm text-muted underline">Filtreleri temizle</button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick} className={`shrink-0 rounded-full border px-3 py-1.5 text-sm ${active ? "border-ink bg-ink text-bg" : "border-line bg-card"}`}>{children}</button>
  );
}

function Range({ label, min, max, sp, set }: { label: string; min: string; max: string; sp: URLSearchParams; set: (p: Record<string, string | null>) => void }) {
  const cls = "w-full min-w-0 rounded-xl border border-line bg-bg px-3 py-2 text-[15px]";
  return (
    <div>
      <p className="mb-1 text-sm text-muted">{label}</p>
      <div className="flex items-center gap-2">
        <input inputMode="numeric" defaultValue={sp.get(min) ?? ""} onBlur={(e) => set({ [min]: e.target.value || null })} placeholder="En az" className={cls} />
        <span className="text-muted">–</span>
        <input inputMode="numeric" defaultValue={sp.get(max) ?? ""} onBlur={(e) => set({ [max]: e.target.value || null })} placeholder="En çok" className={cls} />
      </div>
    </div>
  );
}

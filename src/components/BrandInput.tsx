"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

// Marka: yazdıkça mevcut markalar önerilir, listede yoksa yazılan yeni marka olarak eklenir
export function BrandInput({ value, onChange, className }: { value: string; onChange: (v: string) => void; className: string }) {
  const [open, setOpen] = useState(false);
  const [options, setOptions] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    if (!open) return;
    const t = setTimeout(async () => {
      const { data } = await createClient().rpc("search_brands", { p_q: value, p_limit: value.trim() ? 50 : 500 });
      setOptions(data ?? []);
    }, 200);
    return () => clearTimeout(t);
  }, [value, open]);

  const exact = options.some((o) => o.name.toLocaleLowerCase("tr-TR") === value.trim().toLocaleLowerCase("tr-TR"));
  return (
    <div className="relative">
      <input
        value={value}
        onChange={(e) => { onChange(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        maxLength={60}
        placeholder="Marka * (ör. Zara)"
        className={`${className} font-semibold`}
        autoComplete="off"
      />
      {open && (options.length > 0 || value.trim()) && (
        // Liste içinde kaydırırken input odağı kaybolmasın diye mousedown engellenir
        <ul onMouseDown={(e) => e.preventDefault()} className="absolute inset-x-0 top-full z-20 mt-1 max-h-72 overflow-y-auto overscroll-contain rounded-xl border border-line bg-card shadow-lg">
          {value.trim() && !exact && (
            <li className="sticky top-0 border-b border-line bg-card">
              <button type="button" onClick={() => setOpen(false)} className="w-full px-3 py-2.5 text-left text-sm text-muted hover:bg-bg">
                &ldquo;{value.trim()}&rdquo; yeni marka olarak ekle
              </button>
            </li>
          )}
          {options.map((o) => (
            <li key={o.id}>
              <button type="button" onClick={() => { onChange(o.name); setOpen(false); }} className="w-full px-3 py-2.5 text-left text-sm hover:bg-bg">{o.name}</button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

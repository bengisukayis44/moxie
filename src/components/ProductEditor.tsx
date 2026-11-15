"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import { attributesFor, photoUrl } from "@/lib/domain/looks";
import type { AttributeDef, Category, ItemAttributes, ProductCard } from "@/lib/domain/types";
import { createClient } from "@/lib/supabase/client";
import { uploadImage } from "@/lib/upload";
import { AdvancedDetails } from "./AdvancedDetails";
import { BrandInput } from "./BrandInput";

export type ProductDraft = {
  brand: string; name: string; category: string; store: string; url: string; affiliate_url: string;
  image_path: string; price: string; attributes: ItemAttributes;
};

export const emptyProduct: ProductDraft = { brand: "", name: "", category: "", store: "", url: "", affiliate_url: "", image_path: "", price: "", attributes: {} };

// Linkten mağaza adını tahmin eder: trendyol.com → trendyol
export function storeFromUrl(url: string) {
  try {
    const host = new URL(/^https?:\/\//.test(url) ? url : `https://${url}`).hostname.replace(/^www\./, "");
    const known = ["trendyol", "hepsiburada", "zara", "bershka", "mango", "hm", "pullandbear", "stradivarius", "massimodutti", "lcw", "koton", "defacto", "mavi", "boyner", "beymen", "amazon", "n11", "modanisa"];
    return known.find((k) => host.includes(k)) ?? host.split(".")[0];
  } catch {
    return "";
  }
}

// Ürün ekleme/düzenleme formu (kombin oluşturma içinde açılır)
export function ProductEditor({ productId, initial, categories, attributeDefs, onSaved, onCancel }: {
  productId?: string; initial?: ProductDraft; categories: Category[]; attributeDefs: AttributeDef[];
  onSaved: (product: ProductCard) => void; onCancel: () => void;
}) {
  const supabase = createClient();
  const [p, setP] = useState<ProductDraft>(initial ?? emptyProduct);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const field = "w-full rounded-xl border border-line bg-bg px-3 py-2.5 text-[15px]";
  const set = (patch: Partial<ProductDraft>) => setP((x) => ({ ...x, ...patch }));

  async function pickImage(file: File) {
    setUploading(true);
    try {
      // Ürün görselleri kullanıcı klasöründe değil ortak "products/" klasöründe durur
      const path = await uploadImage(supabase, "product-images", "products", file, { maxSide: 1200 });
      set({ image_path: path });
    } catch {
      setError("Görsel yüklenemedi.");
    } finally {
      setUploading(false);
    }
  }

  async function save() {
    setBusy(true);
    setError(null);
    const norm = (u: string) => (u.trim() && !/^https?:\/\//i.test(u.trim()) ? `https://${u.trim()}` : u.trim());
    const payload = {
      ...p,
      url: norm(p.url),
      affiliate_url: norm(p.affiliate_url),
      price: p.price.replace(",", "."),
      attributes: Object.fromEntries(attributesFor(attributeDefs, p.category).map((d) => [d.key, p.attributes[d.key] ?? []]).filter(([, v]) => v.length)),
    };
    const { data: id, error } = await supabase.rpc("save_product", { p_id: productId ?? null, p: payload });
    if (error || !id) {
      setBusy(false);
      return setError("Ürün kaydedilemedi. Link ve fiyat alanlarını kontrol eder misin?");
    }
    const { data } = await supabase.rpc("product_card", { p_product: id });
    setBusy(false);
    onSaved(data as ProductCard);
  }

  const img = photoUrl(p.image_path, "product-images");
  return (
    <div className="space-y-3">
      <input value={p.url} onChange={(e) => set({ url: e.target.value, store: p.store || storeFromUrl(e.target.value) })}
        inputMode="url" placeholder="Mağaza linki (ör. trendyol.com/...)" className={field} />
      <div className="flex gap-3">
        <button type="button" onClick={() => fileInput.current?.click()} className="relative flex h-28 w-20 shrink-0 items-center justify-center overflow-hidden rounded-xl border-2 border-dashed border-placeholder text-center text-[11px] text-muted">
          {img ? <Image src={img} alt="" fill sizes="80px" className="object-cover" /> : uploading ? "Yükleniyor…" : "Görsel ekle"}
        </button>
        <input ref={fileInput} type="file" accept="image/*" hidden onChange={(e) => e.target.files?.[0] && pickImage(e.target.files[0])} />
        <div className="min-w-0 flex-1 space-y-2">
          <BrandInput value={p.brand} onChange={(brand) => set({ brand })} className={field} />
          <input value={p.name} onChange={(e) => set({ name: e.target.value })} maxLength={160} placeholder="Ürün adı *" className={field} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <select value={p.category} onChange={(e) => set({ category: e.target.value })} className={`${field} ${p.category ? "" : "text-muted"}`}>
          <option value="">Kategori *</option>
          {categories.map((c) => <option key={c.slug} value={c.slug}>{c.label}</option>)}
        </select>
        <input value={p.price} onChange={(e) => set({ price: e.target.value.replace(/[^\d.,]/g, "") })} inputMode="decimal" placeholder="Fiyat (TL)" className={field} />
        <input value={p.store} onChange={(e) => set({ store: e.target.value })} maxLength={40} placeholder="Mağaza" className={field} />
        <input value={p.affiliate_url} onChange={(e) => set({ affiliate_url: e.target.value })} inputMode="url" placeholder="Affiliate linki (varsa)" className={field} />
      </div>
      <p className="text-[11px] text-muted">Görsel: sadece mağazanın affiliate programının izin verdiği görseller veya kendi çekimimiz.</p>
      <AdvancedDetails defs={attributeDefs} category={p.category} value={p.attributes} onChange={(attributes) => set({ attributes })} />
      {error && <p className="rounded-lg bg-error/10 px-3 py-2 text-sm text-error">{error}</p>}
      <div className="flex gap-2">
        <button type="button" onClick={onCancel} className="flex-1 rounded-full border border-line py-3 text-sm">Vazgeç</button>
        <button type="button" onClick={save} disabled={busy || uploading || !p.brand.trim() || !p.name.trim() || !p.category}
          className="flex-1 rounded-full bg-royal py-3 text-sm font-semibold text-bg disabled:opacity-40">
          {busy ? "Kaydediliyor…" : productId ? "Ürünü güncelle" : "Ürünü ekle"}
        </button>
      </div>
    </div>
  );
}

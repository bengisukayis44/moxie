"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { MAX_LOOK_ITEMS, MAX_LOOK_PHOTOS, photoUrl } from "@/lib/domain/looks";
import type { AttributeDef, Category, ProductCard, StyleTag } from "@/lib/domain/types";
import { createClient } from "@/lib/supabase/client";
import { uploadImage } from "@/lib/upload";
import { ArrowLeftIcon, ArrowRightIcon, BackIcon, CloseIcon, PlusIcon, SearchIcon } from "./Icons";
import { ProductEditor } from "./ProductEditor";

type Photo = { key: string; preview: string; path: string | null; failed?: boolean; existing?: boolean };

export type EditableLook = {
  id: string; title: string; description: string | null; style_tags: string[]; note: string | null;
  status: string; photos: string[]; items: ProductCard[];
};

export function LookForm({ userId, categories, attributeDefs, styleTags, initial }: {
  userId: string; categories: Category[]; attributeDefs: AttributeDef[]; styleTags: StyleTag[]; initial?: EditableLook;
}) {
  const router = useRouter();
  const supabase = createClient();
  const [step, setStep] = useState(1);
  const [photos, setPhotos] = useState<Photo[]>(
    () => initial?.photos.map((p) => ({ key: crypto.randomUUID(), preview: photoUrl(p, "look-photos")!, path: p, existing: true })) ?? [],
  );
  const [removed, setRemoved] = useState<string[]>([]);
  const [items, setItems] = useState<ProductCard[]>(initial?.items ?? []);
  const [title, setTitle] = useState(initial?.title ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [tags, setTags] = useState<string[]>(initial?.style_tags ?? []);
  const [note, setNote] = useState(initial?.note ?? "");
  const [adding, setAdding] = useState<"search" | "new" | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedId, setSavedId] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  const uploading = photos.some((p) => !p.path && !p.failed);
  const photosValid = photos.length > 0 && !uploading && photos.every((p) => p.path);

  async function addFiles(files: FileList | null) {
    if (!files) return;
    const picked = Array.from(files).slice(0, MAX_LOOK_PHOTOS - photos.length);
    const fresh: Photo[] = picked.map((f) => ({ key: crypto.randomUUID(), preview: URL.createObjectURL(f), path: null }));
    setPhotos((p) => [...p, ...fresh]);
    await Promise.all(picked.map(async (file, i) => {
      try {
        const path = await uploadImage(supabase, "look-photos", userId, file);
        setPhotos((p) => p.map((x) => (x.key === fresh[i].key ? { ...x, path } : x)));
      } catch {
        setPhotos((p) => p.map((x) => (x.key === fresh[i].key ? { ...x, failed: true } : x)));
      }
    }));
  }

  function removePhoto(key: string) {
    const ph = photos.find((p) => p.key === key);
    if (ph?.existing && ph.path) setRemoved((r) => [...r, ph.path!]);
    else if (ph?.path) supabase.storage.from("look-photos").remove([ph.path]);
    setPhotos((p) => p.filter((x) => x.key !== key));
  }

  function move<T>(list: T[], i: number, d: -1 | 1): T[] {
    const j = i + d;
    if (j < 0 || j >= list.length) return list;
    const c = [...list];
    [c[i], c[j]] = [c[j], c[i]];
    return c;
  }

  async function save(status: "published" | "draft") {
    setBusy(true);
    setError(null);
    const { data, error } = await supabase.rpc("save_look", {
      p_id: initial?.id ?? null,
      p_title: title,
      p_description: description,
      p_style_tags: tags,
      p_note: note,
      p_photos: photos.map((p) => p.path),
      p_product_ids: items.map((p) => p.id),
      p_status: status,
    });
    setBusy(false);
    if (error || !data) return setError("Kaydedilemedi. Bilgileri kontrol edip tekrar dener misin?");
    if (removed.length) await supabase.storage.from("look-photos").remove(removed);
    if (initial || status === "draft") {
      router.replace(`/k/${data}`);
      router.refresh();
    } else {
      setSavedId(data as string);
    }
  }

  if (savedId) {
    return (
      <main className="flex min-h-[80dvh] flex-col items-center justify-center px-6 text-center">
        <div className="animate-pop text-6xl">✨</div>
        <h1 className="mt-5 font-serif text-3xl">Kombin yayında!</h1>
        <p className="mt-2 max-w-xs text-muted">Bu kombini sen de giydin mi? İlk denemeyi sen ekle, başkaları da cesaretlensin.</p>
        <div className="mt-8 w-full space-y-2">
          <Link href={`/k/${savedId}/dene`} className="block rounded-full bg-royal py-4 font-semibold text-bg">İlk denemeyi ekle</Link>
          <Link href={`/k/${savedId}`} className="block rounded-full border border-ink py-4 font-semibold">Kombine git</Link>
        </div>
      </main>
    );
  }

  const field = "w-full rounded-xl border border-line bg-card px-3 py-2.5 text-[15px]";

  return (
    <main className="px-4 pt-3">
      <header className="flex items-center justify-between">
        <button type="button" onClick={step === 1 ? () => router.back() : () => setStep(step - 1)} className="-ml-2 rounded-full p-2" aria-label="Geri">
          {step === 1 ? <CloseIcon className="h-5 w-5" /> : <BackIcon className="h-5 w-5" />}
        </button>
        <p className="text-sm font-semibold">{initial ? "Kombini düzenle" : "Kombin oluştur"} · {step}/3</p>
        <span className="w-9" />
      </header>

      {step === 1 && (
        <section className="animate-step pt-4">
          <h1 className="font-serif text-3xl">Kapak fotoğrafları</h1>
          <p className="mt-1 text-sm text-muted">Fotoğrafı ekip ya da sen çekmiş olmalı. Pinterest, Instagram, TikTok fotoğrafları yüklenmez; onlar sadece ilham kaynağı.</p>
          <div className="mt-5 grid grid-cols-3 gap-2">
            {photos.map((p, i) => (
              <div key={p.key} className="relative aspect-[3/4] overflow-hidden rounded-xl bg-placeholder">
                <Image src={p.preview} alt="" fill unoptimized={!p.existing} sizes="33vw" className={`object-cover ${p.path ? "" : "opacity-50"}`} />
                {i === 0 && <span className="absolute left-1.5 top-1.5 rounded bg-ink/60 px-1.5 text-[10px] text-bg">Kapak</span>}
                {p.failed && <span className="absolute inset-0 flex items-center justify-center bg-error/80 text-xs text-white">Yüklenemedi</span>}
                <button type="button" onClick={() => removePhoto(p.key)} className="absolute right-1.5 top-1.5 rounded-full bg-ink/60 p-1 text-bg" aria-label="Kaldır"><CloseIcon className="h-3.5 w-3.5" /></button>
                <div className="absolute inset-x-1.5 bottom-1.5 flex justify-between">
                  <button type="button" disabled={i === 0} onClick={() => setPhotos((l) => move(l, i, -1))} className="rounded-full bg-card/90 p-1 disabled:invisible" aria-label="Sola taşı"><ArrowLeftIcon className="h-3.5 w-3.5" /></button>
                  <button type="button" disabled={i === photos.length - 1} onClick={() => setPhotos((l) => move(l, i, 1))} className="rounded-full bg-card/90 p-1 disabled:invisible" aria-label="Sağa taşı"><ArrowRightIcon className="h-3.5 w-3.5" /></button>
                </div>
              </div>
            ))}
            {photos.length < MAX_LOOK_PHOTOS && (
              <button type="button" onClick={() => fileInput.current?.click()} className="flex aspect-[3/4] flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-placeholder text-muted">
                <PlusIcon className="h-7 w-7" /><span className="text-xs">Fotoğraf seç</span>
              </button>
            )}
          </div>
          <input ref={fileInput} type="file" accept="image/*" multiple hidden onChange={(e) => { addFiles(e.target.files); e.target.value = ""; }} />
          <Next disabled={!photosValid} onClick={() => setStep(2)}>{uploading ? "Yükleniyor…" : "Devam"}</Next>
        </section>
      )}

      {step === 2 && (
        <section className="animate-step pt-4">
          <h1 className="font-serif text-3xl">Ürünler</h1>
          <p className="mt-1 text-sm text-muted">Kombindeki her parça için Türkiye&apos;de satılan bir ürün ekle. Var olanı ara ya da mağaza linkiyle yenisini ekle.</p>
          <ul className="mt-5 space-y-2">
            {items.map((p, i) => (
              <li key={p.id} className="flex items-center gap-3 rounded-[var(--radius-card)] border border-line bg-card p-2.5">
                <div className="relative h-14 w-11 shrink-0 overflow-hidden rounded-lg bg-placeholder">
                  {p.image_path && <Image src={photoUrl(p.image_path, "product-images")!} alt="" fill sizes="44px" className="object-cover" />}
                </div>
                <div className="min-w-0 flex-1 text-sm">
                  <p className="truncate font-semibold">{p.brand}</p>
                  <p className="truncate">{p.name}</p>
                </div>
                <div className="flex shrink-0 items-center">
                  <button type="button" disabled={i === 0} onClick={() => setItems((l) => move(l, i, -1))} className="p-1.5 disabled:opacity-20" aria-label="Yukarı"><ArrowLeftIcon className="h-4 w-4 rotate-90" /></button>
                  <button type="button" disabled={i === items.length - 1} onClick={() => setItems((l) => move(l, i, 1))} className="p-1.5 disabled:opacity-20" aria-label="Aşağı"><ArrowRightIcon className="h-4 w-4 rotate-90" /></button>
                  <button type="button" onClick={() => setItems((l) => l.filter((x) => x.id !== p.id))} className="p-1.5 text-muted" aria-label="Çıkar"><CloseIcon className="h-4 w-4" /></button>
                </div>
              </li>
            ))}
          </ul>
          {items.length < MAX_LOOK_ITEMS && !adding && (
            <div className="mt-3 grid grid-cols-2 gap-2">
              <button type="button" onClick={() => setAdding("search")} className="rounded-[var(--radius-card)] border-2 border-dashed border-placeholder py-3 text-sm font-semibold text-muted">Var olan ürünü seç</button>
              <button type="button" onClick={() => setAdding("new")} className="rounded-[var(--radius-card)] border-2 border-dashed border-placeholder py-3 text-sm font-semibold text-muted">+ Yeni ürün (link)</button>
            </div>
          )}
          {adding === "search" && (
            <ProductSearch exclude={items.map((i) => i.id)} onPick={(p) => { setItems((l) => [...l, p]); setAdding(null); }} onCancel={() => setAdding(null)} />
          )}
          {adding === "new" && (
            <div className="mt-3 rounded-[var(--radius-card)] border border-line bg-card p-4">
              <ProductEditor categories={categories} attributeDefs={attributeDefs}
                onSaved={(p) => { setItems((l) => [...l, p]); setAdding(null); }} onCancel={() => setAdding(null)} />
            </div>
          )}
          <Next disabled={items.length === 0 || !!adding} onClick={() => setStep(3)}>Devam</Next>
        </section>
      )}

      {step === 3 && (
        <section className="animate-step space-y-4 pt-4">
          <h1 className="font-serif text-3xl">Ad ve tarz</h1>
          <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} placeholder="Kombin adı * (ör. Bej trençkotla ofis)" className={`${field} font-semibold`} />
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} maxLength={1000} rows={3} placeholder="Kısa açıklama (opsiyonel)" className={field} />
          <div>
            <p className="mb-2 text-sm font-semibold">Tarz etiketleri</p>
            <div className="flex flex-wrap gap-1.5">
              {styleTags.map((s) => {
                const on = tags.includes(s.slug);
                return (
                  <button key={s.slug} type="button" onClick={() => setTags((t) => (on ? t.filter((x) => x !== s.slug) : [...t, s.slug]))}
                    className={`rounded-full border px-3 py-1.5 text-sm ${on ? "border-royal bg-royal text-bg" : "border-line bg-card"}`}>
                    {s.label}
                  </button>
                );
              })}
            </div>
          </div>
          <div>
            <p className="text-sm font-semibold">İlham kaynağı notu <span className="font-normal text-muted">· sadece ekip görür</span></p>
            <textarea value={note} onChange={(e) => setNote(e.target.value)} maxLength={1000} rows={2} placeholder="ör. Pinterest'teki @… paylaşımından ilham" className={`${field} mt-1`} />
          </div>
          {error && <p className="rounded-lg bg-error/10 px-3 py-2 text-sm text-error">{error}</p>}
          <div className="sticky bottom-20 space-y-2 pb-2 pt-4">
            <button type="button" disabled={busy || !title.trim()} onClick={() => save("published")} className="w-full rounded-full bg-royal py-4 font-semibold text-bg shadow-lg disabled:opacity-40">
              {busy ? "Kaydediliyor…" : initial?.status === "published" ? "Kaydet" : "Yayınla"}
            </button>
            {(!initial || initial.status === "draft") && (
              <button type="button" disabled={busy || !title.trim()} onClick={() => save("draft")} className="w-full rounded-full border border-ink bg-bg py-3 font-semibold disabled:opacity-40">Taslak olarak kaydet</button>
            )}
          </div>
        </section>
      )}
    </main>
  );
}

function Next({ children, disabled, onClick }: { children: React.ReactNode; disabled?: boolean; onClick: () => void }) {
  return (
    <div className="sticky bottom-20 mt-8 pb-2">
      <button type="button" disabled={disabled} onClick={onClick} className="w-full rounded-full bg-royal py-4 font-semibold text-bg shadow-lg disabled:opacity-40">{children}</button>
    </div>
  );
}

function ProductSearch({ exclude, onPick, onCancel }: { exclude: string[]; onPick: (p: ProductCard) => void; onCancel: () => void }) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<ProductCard[]>([]);
  useEffect(() => {
    const t = setTimeout(async () => {
      const { data } = await createClient().rpc("search_products", { p_q: q, p_limit: 30 });
      setResults(((data ?? []) as ProductCard[]).filter((p) => !exclude.includes(p.id)));
    }, 250);
    return () => clearTimeout(t);
  }, [q, exclude]);
  return (
    <div className="mt-3 rounded-[var(--radius-card)] border border-line bg-card p-3">
      <div className="flex items-center gap-2 rounded-full border border-line bg-bg px-3 py-2">
        <SearchIcon className="h-4 w-4 text-muted" />
        <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Marka veya ürün ara" className="min-w-0 flex-1 bg-transparent text-[15px] outline-none" />
        <button type="button" onClick={onCancel} className="text-sm text-muted">Vazgeç</button>
      </div>
      <ul className="mt-2 max-h-80 divide-y divide-line overflow-y-auto">
        {results.map((p) => (
          <li key={p.id}>
            <button type="button" onClick={() => onPick(p)} className="flex w-full items-center gap-3 py-2 text-left">
              <div className="relative h-12 w-9 shrink-0 overflow-hidden rounded bg-placeholder">
                {p.image_path && <Image src={photoUrl(p.image_path, "product-images")!} alt="" fill sizes="36px" className="object-cover" />}
              </div>
              <span className="min-w-0 text-sm"><b className="block truncate">{p.brand}</b><span className="block truncate">{p.name}</span></span>
            </button>
          </li>
        ))}
        {results.length === 0 && <li className="py-4 text-center text-sm text-muted">Ürün bulunamadı. Yeni ürün olarak ekleyebilirsin.</li>}
      </ul>
    </div>
  );
}

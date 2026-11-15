import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BackButton } from "@/components/BackButton";
import { LookCardView, TryonCardView } from "@/components/Cards";
import { Disclosure } from "@/components/ProductRow";
import { FIT_LABELS, formatPrice, photoUrl, storeHref } from "@/lib/domain/looks";
import type { FitRating, ProductDetail } from "@/lib/domain/types";
import { createClient } from "@/lib/supabase/server";

async function load(id: string) {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const supabase = await createClient();
  const { data } = await supabase.rpc("get_product", { p_id: id });
  return data as ProductDetail | null;
}

export async function generateMetadata(props: PageProps<"/urun/[id]">) {
  const p = await load((await props.params).id);
  return { title: p ? `${p.brand ?? ""} ${p.name}`.trim() : "Ürün" };
}

export default async function ProductPage(props: PageProps<"/urun/[id]">) {
  const { id } = await props.params;
  const p = await load(id);
  if (!p) notFound();
  const img = photoUrl(p.image_path, "product-images");
  const s = p.summary;
  // "çoğu tam dedi": en sık fit değerlendirmesi
  const topFit = (Object.entries(s.fit) as [FitRating, number][]).sort((a, b) => b[1] - a[1])[0];

  return (
    <main className="px-4 pt-3">
      <BackButton />
      <section className="mt-3 flex gap-4">
        <div className={`relative aspect-[3/4] w-36 shrink-0 overflow-hidden rounded-[var(--radius-card)] bg-sand ${p.in_stock ? "" : "grayscale"}`}>
          {img && <Image src={img} alt={p.name} fill sizes="144px" className="object-cover" priority />}
        </div>
        <div className="min-w-0 flex-1">
          {p.brand_slug ? <Link href={`/ara?sekme=urunler&marka=${p.brand_slug}`} className="eyebrow">{p.brand}</Link> : <p className="eyebrow">{p.brand}</p>}
          <h1 className="mt-1 font-serif text-2xl leading-tight">{p.name}</h1>
          {p.price != null && <p className="mt-2 text-lg font-semibold">{formatPrice(p.price)}</p>}
          <p className="mt-1 text-xs text-muted">
            {[p.category_label, p.store].filter(Boolean).join(" · ")}
            {p.last_checked_at && <> · son kontrol {new Date(p.last_checked_at).toLocaleDateString("tr-TR")}</>}
          </p>
          <div className="mt-3">
            {!p.in_stock ? (
              <span className="inline-block rounded-full bg-sand px-4 py-2 text-sm text-muted">Satışta değil</span>
            ) : p.has_link ? (
              <a href={storeHref(p.id, "product", p.id)} target="_blank" rel="noopener nofollow sponsored" className="inline-block rounded-full bg-ink px-4 py-2 text-sm font-semibold text-cream">
                Mağazada gör
              </a>
            ) : null}
            {p.is_affiliate && p.in_stock && <span className="ml-2 text-[10px] text-muted">işbirliği linki</span>}
            {p.in_stock && p.stale && <p className="mt-1 text-xs text-muted">Stok durumu kontrol ediliyor.</p>}
          </div>
        </div>
      </section>

      {p.attribute_labels.length > 0 && (
        <dl className="mt-4 flex flex-wrap gap-x-4 gap-y-1.5 text-xs">
          {p.attribute_labels.map((a) => (
            <div key={a.key} className="flex items-center gap-1.5">
              <dt className="text-muted">{a.label}:</dt>
              <dd className="flex items-center gap-1 font-semibold">
                {a.values.map((v) => (
                  <span key={v.value} className="flex items-center gap-1">
                    {v.swatch && <span className="h-3 w-3 rounded-full border border-line" style={{ background: v.swatch }} />}
                    {v.label}
                  </span>
                ))}
              </dd>
            </div>
          ))}
        </dl>
      )}

      <section className="mt-6 rounded-[var(--radius-card)] bg-ink p-4 text-cream">
        <p className="eyebrow !text-peach">Beden özeti</p>
        {s.count === 0 ? (
          <p className="mt-1 text-sm text-cream/80">Bu ürünü henüz kimse denemedi.</p>
        ) : (
          <>
            <p className="mt-1 font-serif text-lg leading-snug">
              Bu üründe {s.count} kişi denedi
              {topFit && <> · çoğu {FIT_LABELS[topFit[0]].toLocaleLowerCase("tr-TR")} dedi</>}
              {s.top_size && <> · en çok alınan: <b className="text-peach">{s.top_size}</b></>}
            </p>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {Object.entries(s.sizes).sort((a, b) => b[1] - a[1]).map(([size, n]) => (
                <span key={size} className="rounded-full bg-cream/10 px-2.5 py-1 text-xs"><b>{size}</b> · {n}</span>
              ))}
            </div>
          </>
        )}
      </section>

      {p.tryons.length > 0 && (
        <section className="mt-6">
          <h2 className="eyebrow mb-3">Bu ürünü deneyenler</h2>
          <div className="grid grid-cols-2 gap-x-3 gap-y-4">
            {p.tryons.map((t, i) => <TryonCardView key={t.id} tryon={t} closest={i === 0 && t.proximity != null} />)}
          </div>
        </section>
      )}

      {p.looks.length > 0 && (
        <section className="mt-6">
          <h2 className="eyebrow mb-3">Bu ürünün geçtiği kombinler</h2>
          <div className="grid grid-cols-2 gap-x-3 gap-y-4">
            {p.looks.map((l) => <LookCardView key={l.id} look={l} />)}
          </div>
        </section>
      )}
      <Disclosure />
    </main>
  );
}

import Image from "next/image";
import Link from "next/link";
import { formatPrice, photoUrl, storeHref } from "@/lib/domain/looks";
import type { ProductCard } from "@/lib/domain/types";

// Kombin ve deneme sayfalarındaki ürün satırı: görsel, marka · ad, fiyat, "Mağazada gör"
export function ProductRow({ product, from, sourceId, children }: {
  product: ProductCard; from: "look" | "tryon" | "product"; sourceId: string; children?: React.ReactNode;
}) {
  const img = photoUrl(product.image_path, "product-images");
  return (
    <div className={`rounded-[var(--radius-card)] border border-line bg-card p-3 ${product.in_stock ? "" : "opacity-70"}`}>
      <div className="flex gap-3">
        <Link href={`/urun/${product.id}`} className="relative h-20 w-16 shrink-0 overflow-hidden rounded-lg bg-sand">
          {img && <Image src={img} alt={product.name} fill sizes="64px" className={`object-cover ${product.in_stock ? "" : "grayscale"}`} />}
        </Link>
        <div className="min-w-0 flex-1">
          <Link href={`/urun/${product.id}`} className="block">
            <span className="block truncate text-sm font-semibold">{product.brand ?? "—"}</span>
            <span className="line-clamp-2 text-sm leading-snug">{product.name}</span>
          </Link>
          <div className="mt-1 flex items-center gap-2 text-xs text-muted">
            {product.price != null && <span className="font-semibold text-ink">{formatPrice(product.price)}</span>}
            {product.store && <span>{product.store}</span>}
            {product.in_stock && product.stale && <span>· kontrol ediliyor</span>}
          </div>
        </div>
        <div className="flex shrink-0 flex-col items-end justify-center gap-1">
          {!product.in_stock ? (
            <span className="rounded-full bg-sand px-3 py-1.5 text-xs text-muted">Satışta değil</span>
          ) : product.has_link ? (
            <a href={storeHref(product.id, from, sourceId)} target="_blank" rel="noopener nofollow sponsored" className="rounded-full bg-ink px-3 py-1.5 text-xs font-semibold text-cream">
              Mağazada gör
            </a>
          ) : null}
          {product.is_affiliate && product.in_stock && <span className="text-[10px] text-muted">işbirliği linki</span>}
        </div>
      </div>
      {children}
    </div>
  );
}

export function Disclosure() {
  return (
    <p className="px-4 py-6 text-center text-[11px] leading-relaxed text-muted">
      Bazı linklerden komisyon alırız. Komisyon yüzünden ürün öne çıkarmayız.
    </p>
  );
}

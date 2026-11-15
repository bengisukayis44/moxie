import Image from "next/image";
import Link from "next/link";
import { formatMasked } from "@/lib/domain/measurements";
import { formatPrice, mainItemLabel, photoUrl, proximityLabel } from "@/lib/domain/looks";
import type { FeedItem, LookCard, ProductCard, TryonCard } from "@/lib/domain/types";

const STATUS_LABEL: Record<string, string> = { pending: "Onay bekliyor", rejected: "Reddedildi", hidden: "Gizlendi", removed: "Kaldırıldı", draft: "Taslak" };

export function LookCardView({ look, priority = false }: { look: LookCard; priority?: boolean }) {
  const url = photoUrl(look.cover_path, "look-photos");
  return (
    <Link href={`/k/${look.id}`} className="group block">
      <div className="relative aspect-[3/4] overflow-hidden rounded-[var(--radius-card)] bg-placeholder">
        {url && <Image src={url} alt={look.title} fill sizes="(max-width: 448px) 50vw, 224px" className="object-cover" priority={priority} />}
        {look.near_tryon && (
          <span className="absolute left-2 top-2 rounded-full bg-lilac/95 px-2 py-0.5 text-[10px] font-semibold text-royal-dark backdrop-blur">
            Sana yakın biri denedi
          </span>
        )}
        {STATUS_LABEL[look.status] && (
          <span className="absolute right-2 top-2 rounded-full bg-ink/70 px-2 py-0.5 text-[10px] text-bg">{STATUS_LABEL[look.status]}</span>
        )}
        <span className="absolute bottom-2 left-2 rounded-full bg-ink/60 px-2 py-0.5 text-[11px] font-semibold text-bg backdrop-blur">
          {look.tryon_count ? `${look.tryon_count} kişi denedi` : "İlk deneyen sen ol"}
        </span>
      </div>
      <p className="mt-1.5 line-clamp-2 px-0.5 text-[13px] font-semibold leading-snug">{look.title}</p>
    </Link>
  );
}

export function TryonCardView({ tryon, priority = false, closest = false, onOpen }: {
  tryon: TryonCard; priority?: boolean; closest?: boolean; onOpen?: () => void;
}) {
  const url = photoUrl(tryon.cover_path, "tryon-photos");
  const height = formatMasked("height_cm", tryon.height);
  const size = tryon.product_size ?? mainItemLabel(tryon.main);
  const near = proximityLabel(tryon.proximity, closest);
  const inner = (
    <>
      <div className="relative aspect-[3/4] overflow-hidden rounded-[var(--radius-card)] bg-placeholder">
        {url && <Image src={url} alt={`@${tryon.user.username} denemesi`} fill sizes="(max-width: 448px) 50vw, 224px" className="object-cover" priority={priority} />}
        {near && (
          <span className={`absolute left-2 top-2 rounded-full px-2 py-0.5 text-[10px] font-semibold backdrop-blur ${closest ? "bg-royal text-bg" : "bg-lilac/95 text-royal-dark"}`}>
            {near}
          </span>
        )}
        {STATUS_LABEL[tryon.status] && (
          <span className="absolute right-2 top-2 rounded-full bg-ink/70 px-2 py-0.5 text-[10px] text-bg">{STATUS_LABEL[tryon.status]}</span>
        )}
        {size && (
          <span className="absolute bottom-2 right-2 rounded-lg bg-royal px-2 py-0.5 text-sm font-bold text-bg shadow">{size}</span>
        )}
      </div>
      <div className="mt-1.5 px-0.5 text-left">
        <p className="truncate text-[13px] font-semibold">{[height, size].filter(Boolean).join(" · ") || `@${tryon.user.username}`}</p>
        <p className="truncate text-xs text-muted">@{tryon.user.username}{tryon.is_first ? " · İlk deneyen" : ""}</p>
      </div>
    </>
  );
  return onOpen ? (
    <button type="button" onClick={onOpen} className="block w-full">{inner}</button>
  ) : (
    <Link href={`/d/${tryon.id}`} className="block">{inner}</Link>
  );
}

export function FeedItemView({ item, priority }: { item: FeedItem; priority?: boolean }) {
  return item.kind === "look" ? <LookCardView look={item} priority={priority} /> : <TryonCardView tryon={item} priority={priority} />;
}

export function ProductCardView({ product }: { product: ProductCard }) {
  const url = photoUrl(product.image_path, "product-images");
  return (
    <Link href={`/urun/${product.id}`} className="block">
      <div className={`relative aspect-[3/4] overflow-hidden rounded-[var(--radius-card)] bg-placeholder ${product.in_stock ? "" : "opacity-50 grayscale"}`}>
        {url && <Image src={url} alt={product.name} fill sizes="(max-width: 448px) 50vw, 224px" className="object-cover" />}
        {product.tryon_count > 0 && (
          <span className="absolute bottom-2 left-2 rounded-full bg-ink/60 px-2 py-0.5 text-[11px] font-semibold text-bg">{product.tryon_count} kişi denedi</span>
        )}
      </div>
      <p className="mt-1.5 truncate px-0.5 text-[13px] font-semibold">{product.brand ?? "—"}</p>
      <p className="truncate px-0.5 text-xs text-muted">{product.name}{product.price != null ? ` · ${formatPrice(product.price)}` : ""}</p>
    </Link>
  );
}

export function CardSkeleton() {
  return (
    <div>
      <div className="aspect-[3/4] animate-pulse rounded-[var(--radius-card)] bg-placeholder/60" />
      <div className="mt-2 h-3 w-2/3 rounded bg-placeholder" />
    </div>
  );
}

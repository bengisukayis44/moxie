import Link from "next/link";
import { FIT_LABELS, LENGTH_LABELS, proximityLabel, ROLE_BADGE } from "@/lib/domain/looks";
import type { TryonDetail } from "@/lib/domain/types";
import { FollowButton, LikeButton, ReportButton } from "./Actions";
import { Avatar } from "./Avatar";
import { Gallery } from "./Gallery";
import { MeasurementChips } from "./MeasurementChips";
import { ProductRow } from "./ProductRow";

const STATUS_NOTE: Record<string, string> = {
  pending: "İncelemeden sonra yayında olacak.",
  rejected: "Bu deneme yayına alınmadı.",
  hidden: "Bu deneme gizlendi.",
  removed: "Bu deneme kaldırıldı.",
};

// Deneme detayı: /d/[id] sayfası ve kombin sayfasındaki alt panel aynı içeriği gösterir
export function TryonView({ tryon, showLookLink = true }: { tryon: TryonDetail; showLookLink?: boolean }) {
  const near = proximityLabel(tryon.proximity);
  const badge = ROLE_BADGE[tryon.user.role ?? "user"];
  return (
    <div>
      <Gallery photos={tryon.photos} bucket="tryon-photos" alt={`@${tryon.user.username} denemesi`} />

      {STATUS_NOTE[tryon.status] && (
        <div className="bg-royal px-4 py-2 text-sm text-bg">
          {STATUS_NOTE[tryon.status]}
          {tryon.reject_reason && <span className="block opacity-90">Sebep: {tryon.reject_reason}</span>}
        </div>
      )}

      <div className="space-y-5 px-4 pt-3">
        <div className="flex items-center gap-1">
          <LikeButton kind="tryon" id={tryon.id} liked={tryon.liked} count={tryon.like_count} />
          <div className="ml-auto flex items-center">
            {tryon.is_owner && (
              <Link href={`/k/${tryon.look.id}/dene`} className="px-2 py-1.5 text-sm font-semibold">Düzenle</Link>
            )}
            {!tryon.is_owner && <ReportButton targetType="tryon" targetId={tryon.id} />}
          </div>
        </div>

        <section className="rounded-[var(--radius-card)] border border-line bg-card p-4">
          <div className="flex items-center gap-3">
            <Link href={`/u/${tryon.user.username}`} className="flex min-w-0 flex-1 items-center gap-3">
              <Avatar path={tryon.user.avatar_url} name={tryon.user.display_name ?? tryon.user.username} size={40} />
              <div className="min-w-0">
                <p className="truncate font-semibold">{tryon.user.display_name ?? tryon.user.username}</p>
                <p className="truncate text-xs text-muted">@{tryon.user.username}</p>
              </div>
            </Link>
            {!tryon.user.is_me && <FollowButton userId={tryon.user.id} following={tryon.user.is_following} small />}
          </div>
          {(near || tryon.is_first || badge) && (
            <div className="mt-3 flex flex-wrap gap-1.5 text-xs font-semibold">
              {near && <span className="rounded-full bg-lilac px-2.5 py-1 text-royal-dark">{near}</span>}
              {tryon.is_first && <span className="rounded-full bg-blush px-2.5 py-1 text-royal-dark">İlk deneyen</span>}
              {badge && <span className="rounded-full border border-line px-2.5 py-1">{badge}</span>}
            </div>
          )}
          <p className="eyebrow mb-2 mt-4">Denerkenki ölçüleri</p>
          <MeasurementChips m={tryon.measurements} extra={[["Genelde üst", tryon.usual_sizes.top], ["Genelde alt", tryon.usual_sizes.bottom]]} />
        </section>

        {tryon.note && <p className="whitespace-pre-line text-[15px] leading-relaxed">{tryon.note}</p>}

        <section>
          <h2 className="eyebrow mb-3">Kombindeki parçalar</h2>
          <ul className="space-y-3">
            {tryon.items.map((it) => (
              <li key={it.look_item_id}>
                <ProductRow product={it} from="tryon" sourceId={tryon.id}>
                  {it.worn === "not_worn" ? (
                    <p className="mt-3 text-sm text-muted">Bu parçayı denemedi.</p>
                  ) : (
                    <div className="mt-3 border-t border-line pt-3">
                      <div className="flex items-start gap-3">
                        <div className="min-w-0 flex-1 text-sm">
                          {it.worn === "similar" && (
                            <p className="mb-1 text-muted">
                              Benzerini giydi:{" "}
                              {it.similar_url ? (
                                <a href={it.similar_url} target="_blank" rel="noopener nofollow" className="font-semibold text-ink underline">
                                  {[it.similar_brand, it.similar_name].filter(Boolean).join(" ") || "link"}
                                </a>
                              ) : (
                                <b className="text-ink">{[it.similar_brand, it.similar_name].filter(Boolean).join(" ") || "—"}</b>
                              )}
                            </p>
                          )}
                          <div className="flex flex-wrap gap-2 text-xs">
                            {it.fit_rating && <Chip label="Kalıp" value={FIT_LABELS[it.fit_rating]} />}
                            {it.length_rating && <Chip label="Boy" value={LENGTH_LABELS[it.length_rating]} />}
                          </div>
                          {it.fit_note && <p className="mt-2 leading-relaxed text-mocha-text"><span className="text-muted">Fit: </span>{it.fit_note}</p>}
                          {it.fabric_note && <p className="mt-1 leading-relaxed text-mocha-text"><span className="text-muted">Kumaş: </span>{it.fabric_note}</p>}
                        </div>
                        <div className="shrink-0 rounded-xl bg-royal px-3 py-1.5 text-center text-bg">
                          <span className="block text-[9px] uppercase tracking-widest opacity-80">Aldığı beden</span>
                          <span className="block text-2xl font-bold leading-tight">{it.size_bought}</span>
                        </div>
                      </div>
                    </div>
                  )}
                </ProductRow>
              </li>
            ))}
          </ul>
        </section>

        {showLookLink && (
          <Link href={`/k/${tryon.look.id}`} className="block rounded-full border border-ink py-3 text-center font-semibold">
            Kombine dön: {tryon.look.title}
          </Link>
        )}
      </div>
    </div>
  );
}

function Chip({ label, value }: { label: string; value: string }) {
  return (
    <span className="rounded-full border border-line px-2.5 py-1 text-ink">
      <span className="text-muted">{label}:</span> <b>{value}</b>
    </span>
  );
}

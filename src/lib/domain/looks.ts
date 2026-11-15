import type { FitRating, LengthRating, TryonCard } from "./types";

export const FIT_LABELS: Record<FitRating, string> = { tight: "Dar", true: "Tam", loose: "Bol" };
export const LENGTH_LABELS: Record<LengthRating, string> = { short: "Kısa", true: "Tam", long: "Uzun" };
export const POSE_LABELS: Record<string, string> = { front: "Önden", side: "Yandan", sitting: "Otururken", other: "Diğer" };

export const MAX_LOOK_PHOTOS = 6;
export const MAX_TRYON_PHOTOS = 4;
export const MAX_LOOK_ITEMS = 12;
export const PAGE_SIZE = 20;

export type Bucket = "look-photos" | "tryon-photos" | "avatars" | "product-images";

// Puan → arayüz etiketi. Ham sayı gösterilmez. Listede ilk sıradaki ve puanı olan "Sana en yakın".
export function proximityLabel(score: number | null | undefined, isClosest = false): string | null {
  if (score == null) return null;
  if (isClosest && score >= 70) return "Sana en yakın";
  if (score >= 85) return "Çok yakın";
  if (score >= 70) return "Yakın";
  return null;
}

export function photoUrl(path: string | null | undefined, bucket: Bucket = "look-photos"): string | null {
  if (!path) return null;
  if (path.startsWith("http")) return path;
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${bucket}/${path}`;
}

// "jean 38"
export function mainItemLabel(main: TryonCard["main"]): string | null {
  if (!main?.size) return null;
  return [main.category_label?.toLocaleLowerCase("tr-TR"), main.size].filter(Boolean).join(" ");
}

export const formatPrice = (n: number | null | undefined) =>
  n == null ? null : `${n.toLocaleString("tr-TR", { minimumFractionDigits: n % 1 ? 2 : 0, maximumFractionDigits: 2 })} TL`;

// "Mağazada gör" linki: tıklama kaydı için yönlendirmeden geçer
export const storeHref = (productId: string, from: "look" | "tryon" | "product", sourceId: string) =>
  `/git/${productId}?from=${from}&id=${sourceId}`;

// Türkçe büyük harf
export const upperTr = (s: string) => s.toLocaleUpperCase("tr-TR");

// Bu kategoride sorulan özellikler
export function attributesFor<T extends { categories: string[] | null }>(defs: T[], category: string): T[] {
  return defs.filter((d) => !d.categories || (!!category && d.categories.includes(category)));
}

export const ROLE_BADGE: Record<string, string | null> = { creator: "Onaylı içerik üreticisi", admin: "Moxie ekibi", user: null };

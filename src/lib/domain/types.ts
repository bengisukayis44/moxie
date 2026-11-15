// Web ve ileride mobil uygulamanın ortak kullanacağı tipler (React'ten bağımsız).

export type Visibility = "public" | "range" | "hidden";

export const MEASUREMENT_KEYS = [
  "height_cm",
  "weight_kg",
  "bust_cm",
  "waist_cm",
  "hip_cm",
  "inseam_cm",
  "shoe_size",
] as const;
export type MeasurementKey = (typeof MEASUREMENT_KEYS)[number];

// Maskelenmiş tek ölçü: ya tam değer ya aralık
export type MaskedValue = { value: number } | { min: number; max: number };
export type MaskedMeasurements = Partial<Record<MeasurementKey, MaskedValue>> & {
  body_type?: { value: string };
};

export type BodyMeasurements = {
  user_id: string;
  height_cm: number | null;
  weight_kg: number | null;
  bust_cm: number | null;
  waist_cm: number | null;
  hip_cm: number | null;
  inseam_cm: number | null;
  shoe_size: number | null;
  usual_top_size: string | null;
  usual_bottom_size: string | null;
  body_type: string | null;
  visibility: Partial<Record<MeasurementKey | "body_type", Visibility>>;
};

export type Role = "user" | "creator" | "admin";

export type Profile = {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  role: Role;
  is_trusted: boolean;
  is_suspended: boolean;
  style_tags: string[];
};

export type ProfilePrivate = {
  user_id: string;
  birth_year: number | null;
  kvkk_accepted_at: string | null;
  measurement_consent_at: string | null;
  onboarding_step: number;
  onboarding_done: boolean;
  completion_card_hidden_until: string | null;
  notify_new_looks: boolean;
};

export type FitRating = "tight" | "true" | "loose";
export type LengthRating = "short" | "true" | "long";
export type Worn = "same" | "similar" | "not_worn";

// Ürünün gelişmiş detayları: {"color": ["siyah"], "sleeve": ["uzun"]}
export type ItemAttributes = Record<string, string[]>;
export type AttributeOption = { value: string; label: string; swatch: string | null; position: number };
export type AttributeDef = {
  key: string;
  label: string;
  multi: boolean;
  max_select: number;
  categories: string[] | null;
  position: number;
  attribute_options: AttributeOption[];
};
export type AttributeLabel = { key: string; label: string; values: { value: string; label: string; swatch: string | null }[] };

export type Category = { slug: string; label: string; group_key: string; position: number };
export type StyleTag = { slug: string; label: string; position?: number };

export type UserMini = { username: string; display_name?: string | null; avatar_url: string | null; role?: Role };

// ── Kartlar (feed, listeler) ──

export type LookCard = {
  kind: "look";
  id: string;
  title: string;
  status: string;
  is_featured: boolean;
  created_at: string;
  tryon_count: number;
  cover_path: string | null;
  creator: { username: string | null; avatar_url: string | null };
  near_tryon: boolean;
  save_count: number;
};

export type TryonCard = {
  kind: "tryon";
  id: string;
  look_id: string;
  look_title: string;
  status: TryonStatus;
  is_first: boolean;
  created_at: string;
  user: UserMini;
  cover_path: string | null;
  height: MaskedValue | null;
  main: { category: string | null; category_label: string | null; size: string | null } | null;
  proximity: number | null;
  like_count: number;
  // Ürün sayfasında: bu üründen aldığı beden
  product_size?: string;
  product_fit?: FitRating | null;
};

export type ProductCard = {
  kind: "product";
  id: string;
  name: string;
  brand: string | null;
  brand_slug: string | null;
  category: string | null;
  category_label: string | null;
  store: string | null;
  image_path: string | null;
  price: number | null;
  in_stock: boolean;
  has_link: boolean;
  is_affiliate: boolean;
  stale: boolean;
  last_checked_at: string | null;
  tryon_count: number;
};

export type FeedItem = LookCard | TryonCard;
export type TryonStatus = "pending" | "published" | "rejected" | "hidden" | "removed";

// ── Detaylar ──

export type LookDetail = {
  id: string;
  title: string;
  description: string | null;
  status: string;
  is_featured: boolean;
  created_at: string;
  can_edit: boolean;
  style_tags: StyleTag[];
  creator: (UserMini & { id: string; is_me: boolean; is_following: boolean }) | null;
  photos: string[];
  items: (ProductCard & { look_item_id: string })[];
  tryon_total: number;
  tryons: TryonCard[];
  my_tryon: { id: string; status: TryonStatus; reject_reason: string | null } | null;
  like_count: number;
  save_count: number;
  liked: boolean;
  saved: boolean;
  similar: LookCard[];
};

export type TryonItem = ProductCard & {
  look_item_id: string;
  worn: Worn;
  size_bought: string | null;
  fit_rating: FitRating | null;
  length_rating: LengthRating | null;
  fit_note: string | null;
  fabric_note: string | null;
  similar_brand: string | null;
  similar_name: string | null;
  similar_url: string | null;
};

export type TryonDetail = {
  id: string;
  status: TryonStatus;
  reject_reason: string | null;
  note: string | null;
  is_first: boolean;
  is_owner: boolean;
  created_at: string;
  user: UserMini & { id: string; is_me: boolean; is_following: boolean };
  measurements: MaskedMeasurements | null;
  usual_sizes: { top?: string; bottom?: string };
  proximity: number | null;
  photos: { path: string; pose: string | null }[];
  look: { id: string; title: string; cover_path: string | null };
  items: TryonItem[];
  like_count: number;
  liked: boolean;
};

export type ProductDetail = ProductCard & {
  attribute_labels: AttributeLabel[];
  summary: {
    count: number;
    top_size: string | null;
    sizes: Record<string, number>;
    fit: Partial<Record<FitRating, number>>;
    length: Partial<Record<LengthRating, number>>;
  };
  tryons: TryonCard[];
  looks: LookCard[];
};

export type PublicProfile =
  | { id: string; username: string; unavailable: true }
  | (Omit<Profile, "is_trusted" | "is_suspended" | "style_tags"> & {
      unavailable?: false;
      created_at: string;
      is_me: boolean;
      follower_count: number;
      following_count: number;
      is_following: boolean;
      i_blocked: boolean;
      measurements: MaskedMeasurements | null;
      usual_sizes: { top?: string; bottom?: string; shoe?: number };
      proximity: number | null;
      tryon_count: number;
      look_count: number;
    });

export type FollowUser = UserMini & { id: string; is_me?: boolean; is_following: boolean };

export type NotificationType =
  | "follow" | "tryon_on_your_look" | "like_look" | "like_tryon"
  | "tryon_approved" | "tryon_rejected" | "new_look" | "look_archived";

export type AppNotification = {
  id: string;
  type: NotificationType;
  created_at: string;
  unread: boolean;
  data: { reason?: string; title?: string };
  others: number;
  actor: { username: string; avatar_url: string | null } | null;
  look: { id: string; title: string } | null;
  tryon_id: string | null;
};

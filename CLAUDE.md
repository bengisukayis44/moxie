# Moxie — Proje Rehberi (v1: Web sitesi)

> Claude Code için proje bağlamı. Her oturumda otomatik okunur.

## 1. Proje özeti

Moxie, Türkiye'ye özel bir kombin platformu. İki şeyi tek yerde birleştirir:

1. **İlham:** Türkiye'de satılan ürünlerden kurulmuş, her parçası linkli kombinler.
2. **Gerçek vücutlar:** Her kombinin altında, onu gerçekten giymiş farklı vücutlardaki insanlar: boyları, ölçüleri, her parçadan aldıkları beden ve kısa notlarıyla.

Kullanıcı bir kombin beğendiğinde aynı ekranda şunları bulur: "Bu bende nasıl durur? Kaç beden almalıyım? Nereden alırım?"

Slogan: **Kombini gör. Bedenini bil. Tek tıkla al.**

**Platform sırası:** Şimdi web (mobil öncelikli; TikTok/Instagram bio linkinden gelen kullanıcı telefondan açar). Sonra mobil uygulama (iOS + Android), aynı backend; iş mantığı web arayüzüne gömülmez (bkz. §6).

**Ekip:** 4 kişi, kod tarafında tek geliştirici (Bengisu). İlk kombinleri ve ilk denemeleri ekip oluşturur.

Alan adı: **www.moxie.com.tr**

## 2. Temel kavramlar

Kodda, arayüzde ve konuşmada bu adlar tutarlı kullanılır.

| Kavram | Kodda | Ne | Örnek |
|---|---|---|---|
| Ürün | `product` | Tek bir kıyafet + mağaza linki | Zara Straight Fit Jean |
| Kombin | `look` | Bir araya getirilmiş ürünler | Bej trençkot + beyaz gömlek + düz paça jean + loafer |
| Deneme | `tryon` | Gerçek bir kişinin bir kombini üzerinde giydiği fotoğraf + ölçüleri + her parçadan aldığı beden | "1.60 · 52 kg · jean 36, belde tam, boyu uzun" |

- Bir kombin birden çok üründen oluşur; bir ürün birden çok kombinde yer alabilir.
- Bir kombinin birden çok denemesi olur. Uygulamanın asıl değeri bu.
- Bir ürün sayfası, o ürünün geçtiği tüm kombinlerdeki denemeleri toplar.

## 3. Büyüme aşamaları

| Aşama | Kombin kim oluşturur | Deneme kim yükler |
|---|---|---|
| 1. Başlangıç (v1) | Ekip | Ekip + davetli arkadaşlar + tüm kullanıcılar ("Sen de dene") |
| 2. Influencer | Ekip + onaylı içerik üreticileri (`creator` rolü) | Herkes |
| 3. Topluluk | Herkes | Herkes |

v1 kodu 1. aşamayı çalıştırır; 2. ve 3. aşama sadece yetki ayarıyla açılabilmeli. Kombin oluşturma ekranı baştan yapılır; kimin kullanabileceği rolle belirlenir.

## 4. v1 kapsamı

**Var:** karşılama/kayıt/giriş (e-posta + Google) · adım adım atlanabilir onboarding · profil (kimlik, ölçüler, genelde giydiği bedenler, ölçü gizliliği) · feed: Keşfet · Takip · Bana yakın · kombin sayfası ve "Bu kombini şunlar da denedi" · "Sen de dene" (her kullanıcı her kombine deneme ekler) · kombin oluşturma (v1'de admin + creator) · ürün sayfası (geçtiği kombinler + tüm denemeler ve bedenler) · takip sistemi · beğenme (kombin + deneme), kaydetme (kombin) · uygulama içi bildirimler · arama (kombin, ürün, marka, kullanıcı; beden ve ölçü filtreleri) · mağaza linkleri + tıklama takibi, affiliate'e hazır altyapı · şikayet, engelleme, moderasyon (onay kuyruğu), admin paneli · gizlilik ayarları, hesap silme

**Yok (sonra; önünü kapatma):** mobil uygulama · yorumlar, mesajlaşma · gizli hesaplar · herkese açık kombin oluşturma (sadece rol ayarıyla açılacak) · otomatik beden önerisi · fiyat/stok alarmı, premium · influencer kazanç paneli

## 5. Sayfalar

**Karşılama / Giriş (`/giris`):** logo, slogan, arkada kayan kombin fotoğrafları; kayıt/giriş, Google, şifremi unuttum; "Önce bir göz at". Girişsiz gezinme serbest; beğenme, kaydetme, takip, deneme ekleme ve "Bana yakın" kayıt ekranını açar.

**Onboarding (`/hosgeldin`):** her ekranda tek soru, ilerleme çubuğu, geri butonu, "Şimdilik atla", her cevap anında kaydedilir, kaldığı yerden devam.

| # | Ekran | Zorunlu | Not |
|---|---|---|---|
| 1 | Doğum yılı + KVKK onayı | Evet | Yaş sınırı |
| 2 | Kullanıcı adı + görünen ad | Evet | Canlı müsaitlik kontrolü |
| 3 | Profil fotoğrafı | Hayır | |
| 4 | "Ölçülerin neden önemli?" + açık rıza | Hayır | Onay yoksa 5–8 atlanır |
| 5 | Boy ve kilo | Hayır | |
| 6 | Göğüs, bel, kalça, bacak iç boyu | Hayır | "Nasıl ölçülür" çizimleri |
| 7 | Genelde giydiğin bedenler | Hayır | |
| 8 | Ölçülerin nasıl görünsün? | Hayır | Varsayılan "Aralık" |
| 9 | İlgi alanları (3–5 tarz) + önerilen hesapları takip et | Hayır | Feed ilk günden dolu olsun |
| 10 | Bitti | — | "Keşfetmeye başla" |

Sonrası: eksik ölçüde kapatılabilir "Profilin %X tamam" kartı; "Bana yakın" ölçü yoksa ölçü adımlarını açar.

**Feed (`/`):** Keşfet (öne çıkanlar önce, sonra en yeni kombinler) · Takip (takip edilenlerin yeni kombin ve denemeleri; kimse yoksa önerilen hesaplar) · Bana yakın (ölçüleri en yakın kişilerin denemeleri). Kombin kartı: kapak, ad, "4 kişi denedi", "Sana yakın biri denedi". Deneme kartı: fotoğraf, "1.65 · jean 38", yakınlık rozeti. 2 sütun, ~3:4, sonsuz kaydırma.

**Kombin sayfası (`/k/[id]`) — en önemli ekran:** fotoğraflar, ad, oluşturan (takip et), açıklama, tarz etiketleri · ürünler (görsel, marka · ad, fiyat, "Mağazada gör"; satışta değilse gri) · "Bu kombini şunlar da denedi": yatay kartlar, en yakın vücut ilk sırada "Sana en yakın" etiketiyle, sonra yakınlık ve tarih; karta dokununca deneme detayı alttan açılır; sonda her zaman "+ Sen de dene"; hiç yoksa "İlk deneyen sen ol" · beğen, kaydet, paylaş (link kopyala), şikayet · benzer kombinler.

**Deneme detayı (`/d/[id]`, kombin sayfasında alt panel):** büyük fotoğraflar; kişi + takip et + deneme anındaki ölçüler (gizliliğe göre) + yakınlık; her ürün için aldığı beden (en belirgin), fit, boy, notlar; giymediyse "Bu parçayı denemedi" / "Benzerini giydi: …"; rozetler "İlk deneyen", "Onaylı içerik üreticisi"; kombine dön, beğen, şikayet.

**Sen de dene (`/k/[id]/dene`):** 1–2 dakikada biter. Fotoğraf (1–4; önden, yandan, otururken) → parçalar önceden listeli; her biri için Bunu giydim / Benzerini giydim (marka + ad + link) / Giymedim; giydiyse beden (zorunlu), fit, boy, notlar → kısa not, önizleme, paylaş. Ölçüler profilden kopyalanır (snapshot). Güvenilir olmayan hesabın denemesi onay kuyruğuna düşer: "İncelemeden sonra yayında olacak".

**Kombin oluşturma (`/yeni-kombin`, admin + creator):** kapak fotoğrafları → ürün ekleme (mağaza linki + elle ad/marka/görsel; var olan ürünü arayıp seçme) → ad, açıklama, tarz etiketleri → ilham kaynağı notu (iç kullanım) → kendisi de giydiyse ilk denemeyi ekleme.

**Ürün sayfası (`/urun/[id]`):** görsel, marka, ad, fiyat, "Mağazada gör", son kontrol tarihi · bu ürünü deneyenler (yakınlığa göre) · beden özeti ("12 kişi denedi · çoğu tam dedi · en çok alınan: 38") · geçtiği kombinler.

**Profil (`/u/[username]`):** fotoğraf, ad, bio, rozet · takipçi/takip sayıları (liste), takip et · ölçü kartı, genelde giydiği bedenler · sekmeler: Denemeleri · Kombinleri · Kaydettikleri (sadece kendi) · menü: paylaş, şikayet et, engelle.

**Bildirimler (`/bildirimler`):** uygulama içi. Seni takip etti · kombinini denedi · beğendi (gruplu: "Ayşe ve 4 kişi beğendi") · denemen yayına alındı/reddedildi · takip ettiğin biri yeni kombin paylaştı (kapatılabilir). E-posta sadece hesap/moderasyon için.

**Arama (`/ara`):** sekmeler Kombinler · Ürünler · Markalar · Kullanıcılar; filtreler marka, kategori, tarz, beden, boy/kilo aralığı, "Ölçülerime yakın denemesi olanlar"; sıralama en yeni / en çok denenen / en yakın vücut / en çok kaydedilen; Türkçe karakter duyarsız.

**Ayarlar:** hesap, profil ve ölçüler, ölçü gizliliği, bildirim tercihleri, engellenen hesaplar, hesabı ve tüm verileri sil.

**Admin (`/admin`):** onay kuyruğu (onayla / reddet + sebep) · şikayetler (kombin, deneme, kullanıcı; gizle / sil / uyar / askıya al) · roller (creator ver/al, "güvenilir") · ürünler (kırık link, satışta olmayan) · markalar (birleştirme) · öne çıkan kombinler.

## 6. Teknik tercihler

- Next.js (App Router) + TypeScript + Tailwind CSS; Supabase (Postgres, Auth, Storage, RLS)
- İş mantığı (yakınlık, akış sıralaması, arama, gizlilik maskeleme, moderasyon kuralları) veritabanında (SQL fonksiyonları, RLS) veya paylaşılan TS'de; React bileşenlerinde değil
- Arama: Postgres + `unaccent` + `pg_trgm`
- Fotoğraflar: tarayıcıda küçült (~1600px), EXIF/konum temizle
- "Mağazada gör" → `/git/[productId]?from=look|tryon&id=…` → `link_clicks` kaydı → mağaza (varsa affiliate linki)
- Takip akışı v1'de sorgu anında hesaplanır, tek fonksiyonda
- Deploy: Vercel (bölge `fra1`, veritabanıyla aynı) + Supabase; `main` push = otomatik yayın
- PWA manifest + ikon
- Yeni bağımlılık eklemeden önce sor; sade tut

## 7. Veri modeli

Migration'lar `supabase/migrations/` altında. Özet:

- `profiles` (+ `role` user|creator|admin, `is_trusted`, `is_suspended`, `style_tags`, `follower_count`, `following_count`), `profile_private` (doğum yılı, rızalar, onboarding, bildirim tercihleri), `body_measurements` (ham hali sadece sahibine)
- `follows`, `blocks`
- `brands`, `products` (mağaza, url, affiliate_url, görsel, fiyat, `in_stock`, `last_checked_at`, gelişmiş özellikler `attributes`)
- `looks` (+ `look_notes`: iç kullanım ilham notu), `look_photos`, `look_items`
- `tryons` (status pending|published|rejected|hidden|removed, `is_first`, kişi başı kombin başına bir), `tryon_measurements` (snapshot, sadece sahibine), `tryon_photos`, `tryon_items` (worn same|similar|not_worn)
- `look_likes`, `tryon_likes`, `look_saves`, `notifications`, `reports` (look|tryon|user), `link_clicks`

**Kurallar:** maskelenmemiş ölçü sadece sahibine · yayında olmayan deneme sadece sahibi ve admine · kombin oluşturma `role in (creator, admin)`, rolü sadece admin değiştirir · engellenen kişi engelleyenin içeriğini göremez, takip edemez, kombinini deneyemez; takipler iki yönde silinir · yeni deneme güvenilir/creator/admin ise yayında, değilse onay bekler · kombinin ilk yayınlanan denemesi `is_first`.

## 8. Vücut yakınlığı

Puan 0–100. Ağırlıklar (başlangıç): boy 0.25, kilo 0.15, bel 0.2, kalça 0.2, göğüs 0.15, bacak iç boyu 0.05; fark/tolerans (8 cm / 8 kg), 0–1 kırpılır; sadece iki tarafta dolu alanlar, yeniden normalize, en az 2 ortak alan. Kategoriye göre ağırlıklar `proximity_config` tablosunda. Etiketler: **Sana en yakın** (listede 1.), **Çok yakın** (≥85), **Yakın** (70–84). Hesap Postgres'te. Gizli/aralıklı ölçüler eşleşmede kullanılır, hiçbir yanıtta ham dönmez.

## 9. Gizlilik, güvenlik, moderasyon, KVKK

- KVKK aydınlatma + ölçü için ayrı açık rıza (ön seçili değil); yaş sınırı 18
- Hesap silme: profil, ölçüler, kombinler, denemeler, takipler, bildirimler, fotoğraflar silinir. Silinen kişinin kombinlerindeki başkalarının denemeleri kombinle birlikte arşivlenir ve sahiplerine bildirilir
- EXIF/konum temizliği
- Yeni hesapların denemeleri onay kuyruğuna; 2 denemesi onaylanan kullanıcı otomatik `is_trusted`
- Her içerikte şikayet; 3 farklı kişiden şikayet alan içerik otomatik gizlenir ve admine düşer
- Engelleme her yerde; ölçü değerleriyle kullanıcı listeleme yok; takipçi listeleri açık; yorum yok

## 10. İçerik ve telif

Başka platformlardaki (Pinterest, Instagram, TikTok) fotoğraflar yüklenmez; ilham alınır, kombin Türkiye'de satılan ürünlerle yeniden kurulur ve fotoğrafı ekip/kullanıcı çeker. Ürün görselleri: affiliate programının izin verdiği görseller veya kendi çekimimiz. Kullanıcı sadece kendisine ait ve kendisinin bulunduğu fotoğrafları yükler. Telif kaldırma talepleri için iletişim adresi; adminde "telif nedeniyle kaldırıldı".

## 11. Ürün kuralları

Fit notları düzenlenmez. Ton yargısız; "ideal kilo" yok. Affiliate linkli üründe küçük "işbirliği linki" etiketi; footer: "Bazı linklerden komisyon alırız. Komisyon yüzünden ürün öne çıkarmayız." Satışta olmayan ürünün linki pasif; `last_checked_at` 14 günden eskiyse "kontrol ediliyor".

## 12. Tasarım dili

### Renkler — "Kraliyet moru" paleti

Fikir: blush kızsı ve güven veren taraf; mocha sıcaklık ve doğallık (ten tonlarına yakın, farklı tenleri fotoğrafta güzel gösterir); kraliyet moru güç, cesaret ve Gen Z enerjisi ("Moxie" = cesaret). Mor soğuk alttonlu; blush da buna uygun, hafif soğuk bir gül pembesi.

Token'lar `src/app/globals.css` içinde CSS değişkeni olarak tanımlı (Tailwind sınıfı: `bg-royal`, `text-royal-dark` vb.).

| Token | Hex | Kullanım |
|---|---|---|
| `bg` | `#F9F4F2` | Sayfa arka planı |
| `card` | `#FFFCFB` | Kart arka planı |
| `blush` | `#F4D4DC` | Yumuşak vurgu zeminleri, "İlk deneyen" rozeti, seçili durumlar |
| `lilac` | `#E4D8F2` | "Sana en yakın" rozeti, bilgi zeminleri |
| `mocha` | `#A47864` | İkincil vurgu: ikonlar, ayırıcı detaylar, kategori etiketleri |
| `mocha-text` | `#7A5A4C` | Fit/kumaş notları gibi sıcak ikincil metin |
| `royal` | `#5B2A86` | Ana marka rengi: birincil butonlar ("Sen de dene", "Mağazada gör"), aktif sekme, logo |
| `royal-dark` | `#3E1D5E` | lilac ve blush üzerindeki metin, butonun basılı hali |
| `ink` | `#221A2B` | Ana metin (saf siyah yerine morumsu koyu) |
| `muted` | `#75697A` | İkincil metin, tarih, sayaçlar |
| `line` | `#EADFE3` | İnce kenarlıklar, ayırıcılar |
| `placeholder` | `#EADFDA` | Görsel yüklenirken |
| `error` | `#B3261E` | Sadece form hataları |

Metin bg/card üzerinde ink veya muted; royal buton üzerinde bg rengi. lilac/blush zeminlerde metin her zaman royal-dark.

**Renk kuralları:**
- royal sadece aksiyonlarda ve önemli işaretlerde (butonlar, aktif sekme, "Sana en yakın"). Her yere yayılırsa dikkat çekme gücünü kaybeder.
- Fit etiketleri nötr: Dar / Tam / Bol ve Kısa / Tam / Uzun için kırmızı/yeşil gibi "iyi/kötü" renkleri asla kullanma; hepsi aynı nötr stilde (line kenarlık + ink metin). Vücut ya da beden yargılanıyormuş gibi görünmemeli.
- Hata ve uyarı durumları için ayrı, ölçülü kırmızı (`error`) sadece form hatalarında.
- Fotoğraflar ön planda: arka planlar açık ve sade kalsın ki kıyafet renkleri bozulmadan görünsün.
- Koyu mod v1'de yok; token'lar ileride koyu mod eklenebilecek şekilde CSS değişkeni olarak tanımlı.

### Tipografi

Başlıklar Playfair Display (vurgu için italik); gövde ve arayüz DM Sans; küçük etiketler DM Sans, büyük harf, geniş harf aralığı, royal.

### Genel

- Mobil öncelikli (375–430px); alt sekme çubuğu: Feed · Ara · + · Bildirimler · Profil
- + butonu: creator/admin için "Kombin oluştur" / "Deneme ekle" seçimi; normal kullanıcı için "Bir kombin seç ve dene" (son baktığı ve kaydettiği kombinler önce)
- Yumuşak köşeler (12–16px), ince line kenarlıklar, editoryal his, fotoğraflar ön planda
- Aldığı beden her deneme kartında en göze çarpan bilgi
- "Sen de dene" ve "İlk deneyen sen ol" alanları sıcak ve davetkâr: blush zemin + royal buton
- Tüm metinler Türkçe; büyük harf dönüşümü `toLocaleUpperCase('tr-TR')`

## 13. Kabul kriterleri

- [ ] Onboarding telefonda 1–2 dakika; ölçü adımları atlanabiliyor
- [ ] Ölçüler ve her ölçünün görünürlüğü ayarlanabiliyor
- [ ] Ekip admin panelinden linkli ürünlerle kombin oluşturabiliyor
- [ ] Kombin sayfasında "Bu kombini şunlar da denedi" çalışıyor; en yakın vücut ilk sırada; boşsa "İlk deneyen sen ol"
- [ ] Bir kullanıcı herhangi bir kombine 2 dakikadan kısa sürede deneme ekleyebiliyor; yeni hesabın denemesi onay kuyruğuna düşüyor
- [ ] Takip et / bırak çalışıyor; Takip sekmesi takip edilenlerin içeriğini gösteriyor
- [ ] Bildirimler doğru kişiye düşüyor
- [ ] Engellenen kişi engelleyenin içeriğini göremiyor
- [ ] Ürün sayfası tüm denemeleri ve beden özetini gösteriyor
- [ ] "Mağazada gör" tıklamaları kaydediliyor
- [ ] Arama Türkçe karaktersiz çalışıyor
- [ ] Gizli ölçü hiçbir API yanıtında ham dönmüyor (testle)
- [ ] Hesap silinince tüm veri ve fotoğraflar siliniyor
- [ ] creator rolü verilen kullanıcı kod değişikliği olmadan kombin oluşturabiliyor
- [ ] iOS Safari ve Android Chrome'da düzgün; Lighthouse mobil 85+
- [ ] www.moxie.com.tr canlı

## 14. Sonraki aşamalar (şimdi kodlama, yolu açık tut)

Mobil uygulama (Expo, aynı Supabase) · influencer programı (başvuru, creator onayı, kazanç paneli) · herkese açık kombin oluşturma · otomatik beden önerisi · ürün linkinden otomatik bilgi çekme · yorumlar, mesajlaşma, gizli hesaplar · fiyat/stok alarmı, premium · markalara anonim toplu fit verisi.

Asıl değer "bu ürün, bu vücut, bu beden" kayıtlarıdır. Veri modelini bozacak kısayollardan kaçın.

---

@AGENTS.md

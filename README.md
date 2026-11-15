# moxie

Kombini gör. Bedenini bil. Tek tıkla al.

Türkiye'de satılan ürünlerden kurulmuş linkli kombinler ve altında onları gerçekten giymiş, farklı vücutlardaki insanların denemeleri (boy, ölçü, aldığı beden). Canlı: [www.moxie.com.tr](https://www.moxie.com.tr). Proje rehberi: [CLAUDE.md](CLAUDE.md).

Temel kavramlar: **ürün** (`product`) · **kombin** (`look`) · **deneme** (`tryon`).

## Yığın

- Next.js 16 (App Router) + TypeScript + Tailwind CSS v4
- Supabase: Postgres, Auth, Storage, RLS — iş mantığı (maskeleme, yakınlık, arama) `supabase/migrations` içindeki SQL fonksiyonlarında
- Vercel: `main`'e push = otomatik yayın

## Geliştirme

```bash
npm install
cp .env.example .env.local   # değerleri doldur
npm run dev
```

## Veritabanı

Şema değişiklikleri `supabase/migrations/` altına yeni bir dosya olarak eklenir ve şöyle uygulanır:

```bash
supabase db push
```

Veritabanı kuralları testi (gizlilik, onay kuyruğu, engelleme, takip, bildirim, otomatik gizleme, link takibi, arama, roller, hesap silme). Gerçek projeye karşı geçici kullanıcılarla çalışır ve kendini temizler:

```bash
npm test
```

## Roller

Kombin oluşturma `creator` ve `admin` rollerine açıktır. Rol, admin panelinden (`/admin?sekme=kullanicilar`) verilir; kod değişikliği gerekmez.

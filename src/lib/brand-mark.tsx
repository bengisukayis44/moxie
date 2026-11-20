// Topuklu M: iki stiletto ayakkabı çapraz durup "M" harfini oluşturur.
// Aynı çizim hem arayüzde (Logo) hem ikonlarda (ImageResponse) kullanılır.

export const SHOE_PATH =
  "M6,12 C6,6 12,3.5 18.5,4.5 C21,5 22,7.5 21.5,10 C26,26 34,44 42,58 C46,64 50,68 55,71 C60,74 64,77 66,81 C67,84 65,85.5 61,85.5 L40,85.5 C36,85.5 34,82 33,79 C28,66 20,46 14,32 C12,28 9,25 6,24 C5.5,20 6,16 6,12 Z M7,23 L14,25 L11.2,87 L10.2,87 Z";

/** Topuklu M çizimi. `gap` arkadaki ayakkabıyı öndekinden ayıran boşluğun rengi (zemin rengi). */
export function HeelM({ size, color, gap }: { size: number; color: string; gap: string }) {
  return (
    <svg width={size} height={(size * 92) / 100} viewBox="0 0 100 92" aria-hidden="true">
      <path d={SHOE_PATH} fill={color} transform="matrix(-1 0 0 1 100 0)" />
      <path d={SHOE_PATH} fill={gap} stroke={gap} strokeWidth={5} strokeLinejoin="round" />
      <path d={SHOE_PATH} fill={color} />
    </svg>
  );
}

// PWA / favicon ikonu (ImageResponse ile çizilir)
export function BrandMark({ size }: { size: number }) {
  return (
    <div
      style={{
        width: size,
        height: size,
        background: "#4A1622",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <HeelM size={Math.round(size * 0.6)} color="#F7F2EB" gap="#4A1622" />
    </div>
  );
}

// PWA / favicon ikonu (ImageResponse ile çizilir)
export function BrandMark({ size }: { size: number }) {
  return (
    <div
      style={{
        width: size,
        height: size,
        background: "#5B2A86",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "#F9F4F2",
        fontSize: size * 0.62,
        fontStyle: "italic",
        fontFamily: "serif",
        paddingBottom: size * 0.08,
      }}
    >
      m
    </div>
  );
}

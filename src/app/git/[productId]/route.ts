import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

// "Mağazada gör": tıklamayı link_clicks'e yazar, sonra mağazaya (varsa affiliate linke) yönlendirir
export async function GET(request: NextRequest, ctx: RouteContext<"/git/[productId]">) {
  const { productId } = await ctx.params;
  const from = request.nextUrl.searchParams.get("from");
  const sourceId = request.nextUrl.searchParams.get("id");
  const uuid = /^[0-9a-f-]{36}$/i;
  if (!uuid.test(productId)) return NextResponse.redirect(new URL("/", request.url));

  const supabase = await createClient();
  const { data: url } = await supabase.rpc("track_click", {
    p_product: productId,
    p_source_type: from,
    p_source_id: sourceId && uuid.test(sourceId) ? sourceId : null,
  });
  // Satışta değilse ya da linki yoksa ürün sayfasına dön
  return NextResponse.redirect(url ? url : new URL(`/urun/${productId}`, request.url));
}

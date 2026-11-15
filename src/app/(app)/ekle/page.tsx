import Link from "next/link";
import { redirect } from "next/navigation";
import { PAGE_SIZE } from "@/lib/domain/looks";
import type { LookCard } from "@/lib/domain/types";
import { createClient } from "@/lib/supabase/server";
import { getViewer } from "@/lib/viewer";
import { PickLook } from "./PickLook";

export const metadata = { title: "Ekle" };

// "+" butonu: creator/admin için "Kombin oluştur" / "Deneme ekle"; herkes için "Bir kombin seç ve dene"
export default async function AddPage() {
  const viewer = await getViewer();
  if (!viewer) redirect("/giris?mod=kayit&next=/ekle");
  const supabase = await createClient();
  const [{ data: saved }, { data: explore }] = await Promise.all([
    supabase.rpc("profile_items", { p_username: viewer.profile.username, p_kind: "saved", p_limit: 12 }),
    supabase.rpc("feed_explore", { p_limit: PAGE_SIZE }),
  ]);

  return (
    <main className="px-4 pt-4">
      {viewer.canCreateLooks && (
        <section className="mb-6 grid grid-cols-2 gap-3">
          <Link href="/yeni-kombin" className="rounded-[var(--radius-card)] bg-ink p-4 text-cream">
            <span className="block text-2xl">✨</span>
            <span className="mt-2 block font-serif text-lg">Kombin oluştur</span>
            <span className="text-xs text-cream/70">Linkli ürünlerle yeni kombin</span>
          </Link>
          <a href="#dene" className="rounded-[var(--radius-card)] bg-terracotta p-4 text-cream">
            <span className="block text-2xl">📸</span>
            <span className="mt-2 block font-serif text-lg">Deneme ekle</span>
            <span className="text-xs text-cream/80">Bir kombini üzerinde göster</span>
          </a>
        </section>
      )}
      <h1 id="dene" className="scroll-mt-4 font-serif text-3xl">Bir kombin seç ve dene</h1>
      <p className="mt-1 text-sm text-muted">Giydiğin bir kombini seç; fotoğrafını ve aldığın bedenleri ekle.</p>
      <PickLook saved={(saved ?? []) as LookCard[]} explore={(explore ?? []) as LookCard[]} />
    </main>
  );
}

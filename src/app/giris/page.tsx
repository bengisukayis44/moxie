import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { photoUrl } from "@/lib/domain/looks";
import { getViewer } from "@/lib/viewer";
import { AuthForm } from "./AuthForm";

export const metadata = { title: "Giriş" };

export default async function LoginPage(props: PageProps<"/giris">) {
  const sp = await props.searchParams;
  const next = typeof sp.next === "string" && sp.next.startsWith("/") ? sp.next : "/";
  const mode = sp.mod === "kayit" ? "signup" : sp.mod === "sifre" ? "forgot" : "login";
  if (await getViewer()) redirect(next);

  const supabase = await createClient();
  const { data } = await supabase.rpc("feed_explore", { p_limit: 12 });
  const covers = ((data ?? []) as { cover_path: string | null }[]).map((p) => photoUrl(p.cover_path, "look-photos")).filter(Boolean) as string[];

  return (
    <main className="relative mx-auto flex min-h-dvh max-w-md flex-col overflow-hidden bg-ink text-bg">
      <Backdrop covers={covers} />
      <div className="relative z-10 mt-auto bg-gradient-to-t from-ink via-ink/95 to-transparent px-6 pb-8 pt-24">
        <p className="font-serif text-5xl italic">moxie<span className="text-blush">.</span></p>
        <h1 className="mt-3 font-serif text-2xl leading-snug">
          Kombini gör. <em className="text-blush">Bedenini bil.</em> Tek tıkla al.
        </h1>
        <p className="mt-2 text-sm text-bg/70">
          Türkiye&apos;de satılan ürünlerle kurulmuş kombinler ve onları gerçekten giymiş, sana benzeyen insanlar: boyları, ölçüleri ve aldıkları beden.
        </p>
        <AuthForm initialMode={mode} next={next} />
        <Link href="/" className="mt-5 block text-center text-sm text-bg/60 underline underline-offset-4">
          Önce bir göz at
        </Link>
      </div>
    </main>
  );
}

// Arka planda yavaşça kayan paylaşım fotoğrafları (yoksa sıcak tonlu boş kartlar)
function Backdrop({ covers }: { covers: string[] }) {
  const tiles = covers.length >= 4 ? covers : Array.from({ length: 8 }, () => "");
  const col = (offset: number) => [...tiles.slice(offset), ...tiles.slice(0, offset)];
  return (
    <div className="absolute inset-0 grid grid-cols-3 gap-2 p-2 opacity-60" aria-hidden>
      {[0, 2, 4].map((o, ci) => (
        <div key={o} className={`flex flex-col gap-2 ${ci === 1 ? "animate-drift-slow" : "animate-drift"}`} style={{ marginTop: ci === 1 ? -80 : 0 }}>
          {[...col(o), ...col(o)].map((src, i) => (
            <div key={i} className="relative aspect-[3/4] shrink-0 overflow-hidden rounded-xl" style={{ background: ["#5B2A86", "#F4D4DC", "#EADFDA", "#A47864"][(i + ci) % 4] }}>
              {src && <Image src={src} alt="" fill sizes="33vw" className="object-cover" />}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

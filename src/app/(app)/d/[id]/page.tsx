import { notFound } from "next/navigation";
import { BackButton } from "@/components/BackButton";
import { TryonView } from "@/components/TryonView";
import type { TryonDetail } from "@/lib/domain/types";
import { createClient } from "@/lib/supabase/server";

async function load(id: string) {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const supabase = await createClient();
  const { data } = await supabase.rpc("get_tryon", { p_id: id });
  return data as TryonDetail | null;
}

export async function generateMetadata(props: PageProps<"/d/[id]">) {
  const t = await load((await props.params).id);
  return { title: t ? `@${t.user.username} · ${t.look.title}` : "Deneme" };
}

export default async function TryonPage(props: PageProps<"/d/[id]">) {
  const tryon = await load((await props.params).id);
  if (!tryon) notFound();
  return (
    <main className="pb-6">
      <div className="relative">
        <BackButton className="absolute left-3 top-3 z-10" />
      </div>
      <TryonView tryon={tryon} />
    </main>
  );
}

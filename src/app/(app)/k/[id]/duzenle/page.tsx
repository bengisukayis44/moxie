import { notFound, redirect } from "next/navigation";
import { LookForm } from "@/components/LookForm";
import { loadAttributeDefs } from "@/lib/attributes";
import type { Category, LookDetail, StyleTag } from "@/lib/domain/types";
import { createClient } from "@/lib/supabase/server";
import { getViewer } from "@/lib/viewer";

export const metadata = { title: "Kombini düzenle" };

export default async function EditLookPage(props: PageProps<"/k/[id]/duzenle">) {
  const { id } = await props.params;
  const viewer = await getViewer();
  if (!viewer) redirect(`/giris?next=/k/${id}/duzenle`);
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const supabase = await createClient();
  const [{ data }, { data: note }, { data: categories }, { data: styleTags }, attributeDefs] = await Promise.all([
    supabase.rpc("get_look", { p_id: id }),
    supabase.from("look_notes").select("inspiration_note").eq("look_id", id).maybeSingle(),
    supabase.from("categories").select("*").order("position"),
    supabase.from("style_tags").select("*").order("position"),
    loadAttributeDefs(supabase),
  ]);
  const look = data as LookDetail | null;
  if (!look) notFound();
  if (!look.can_edit) redirect(`/k/${id}`);
  return (
    <LookForm
      userId={viewer.id}
      categories={(categories ?? []) as Category[]}
      styleTags={(styleTags ?? []) as StyleTag[]}
      attributeDefs={attributeDefs}
      initial={{
        id: look.id, title: look.title, description: look.description, style_tags: look.style_tags.map((s) => s.slug),
        note: note?.inspiration_note ?? null, status: look.status, photos: look.photos, items: look.items,
      }}
    />
  );
}

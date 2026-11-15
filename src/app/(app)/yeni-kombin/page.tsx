import { redirect } from "next/navigation";
import { LookForm } from "@/components/LookForm";
import { loadAttributeDefs } from "@/lib/attributes";
import type { Category, StyleTag } from "@/lib/domain/types";
import { createClient } from "@/lib/supabase/server";
import { getViewer } from "@/lib/viewer";

export const metadata = { title: "Kombin oluştur" };

export default async function NewLookPage() {
  const viewer = await getViewer();
  if (!viewer) redirect("/giris?next=/yeni-kombin");
  if (!viewer.canCreateLooks) redirect("/ekle");
  const supabase = await createClient();
  const [{ data: categories }, { data: styleTags }, attributeDefs] = await Promise.all([
    supabase.from("categories").select("*").order("position"),
    supabase.from("style_tags").select("*").order("position"),
    loadAttributeDefs(supabase),
  ]);
  return <LookForm userId={viewer.id} categories={(categories ?? []) as Category[]} styleTags={(styleTags ?? []) as StyleTag[]} attributeDefs={attributeDefs} />;
}

import { notFound, redirect } from "next/navigation";
import type { Category, LookDetail, TryonDetail } from "@/lib/domain/types";
import { createClient } from "@/lib/supabase/server";
import { getMyMeasurements, getViewer } from "@/lib/viewer";
import { TryonForm } from "./TryonForm";

export const metadata = { title: "Sen de dene" };

export default async function TryPage(props: PageProps<"/k/[id]/dene">) {
  const { id } = await props.params;
  const viewer = await getViewer();
  if (!viewer) redirect(`/giris?mod=kayit&next=/k/${id}/dene`);
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();

  const supabase = await createClient();
  const [{ data: lookData }, { data: categories }, measurements] = await Promise.all([
    supabase.rpc("get_look", { p_id: id }),
    supabase.from("categories").select("*").order("position"),
    getMyMeasurements(),
  ]);
  const look = lookData as LookDetail | null;
  if (!look || look.status !== "published") notFound();

  let existing: TryonDetail | null = null;
  if (look.my_tryon) {
    const { data } = await supabase.rpc("get_tryon", { p_id: look.my_tryon.id });
    existing = data as TryonDetail | null;
  }

  return (
    <TryonForm
      userId={viewer.id}
      look={look}
      categories={(categories ?? []) as Category[]}
      existing={existing}
      hasMeasurements={!!measurements && [measurements.height_cm, measurements.weight_kg].some((v) => v != null)}
      suspended={viewer.profile.is_suspended}
    />
  );
}

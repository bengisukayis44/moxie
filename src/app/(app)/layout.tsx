import { redirect } from "next/navigation";
import { BottomNav } from "@/components/BottomNav";
import { createClient } from "@/lib/supabase/server";
import { getViewer, mandatoryStepsDone } from "@/lib/viewer";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const viewer = await getViewer();
  if (viewer && !mandatoryStepsDone(viewer)) redirect("/hosgeldin");
  let unread = 0;
  if (viewer) {
    const supabase = await createClient();
    const { data } = await supabase.rpc("unread_notification_count");
    unread = data ?? 0;
  }
  return (
    <div className="mx-auto min-h-dvh max-w-md bg-cream pb-24">
      {children}
      <BottomNav username={viewer?.profile.username ?? null} unread={unread} />
    </div>
  );
}

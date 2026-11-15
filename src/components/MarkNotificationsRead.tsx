"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

// Bildirimler görüntülenince okundu işaretle (alt menüdeki rozet kaybolsun)
export function MarkNotificationsRead() {
  const router = useRouter();
  useEffect(() => {
    createClient().rpc("mark_notifications_read").then(() => router.refresh());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return null;
}

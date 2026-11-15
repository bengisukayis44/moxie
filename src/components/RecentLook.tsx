"use client";

import { useEffect } from "react";

const KEY = "moxie:recent-looks";

// Son bakılan kombinleri bu cihazda hatırlar ("+" ekranında önce bunlar çıkar)
export function RememberLook({ id }: { id: string }) {
  useEffect(() => {
    try {
      const list: string[] = JSON.parse(localStorage.getItem(KEY) ?? "[]");
      localStorage.setItem(KEY, JSON.stringify([id, ...list.filter((x) => x !== id)].slice(0, 20)));
    } catch {
      // gizli sekme vb.: önemli değil
    }
  }, [id]);
  return null;
}

export function readRecentLooks(): string[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "[]");
  } catch {
    return [];
  }
}

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BellIcon, HomeIcon, PlusIcon, SearchIcon, UserIcon } from "./Icons";

// Alt çubuk: Feed · Ara · + · Bildirimler · Profil
export function BottomNav({ username, unread }: { username: string | null; unread: number }) {
  const path = usePathname();
  const login = (next: string) => `/giris?mod=kayit&next=${next}`;
  const items = [
    { href: "/", label: "Akış", Icon: HomeIcon, active: path === "/" },
    { href: "/ara", label: "Ara", Icon: SearchIcon, active: path.startsWith("/ara") },
    { href: username ? "/ekle" : login("/ekle"), label: "Ekle", Icon: PlusIcon, active: path === "/ekle", accent: true },
    { href: username ? "/bildirimler" : login("/bildirimler"), label: "Bildirimler", Icon: BellIcon, active: path === "/bildirimler", badge: unread },
    { href: username ? `/u/${username}` : login("/"), label: "Profil", Icon: UserIcon, active: path.startsWith(`/u/${username}`) || path.startsWith("/ayarlar") },
  ];
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-card/95 pb-[env(safe-area-inset-bottom)] backdrop-blur">
      <ul className="mx-auto flex max-w-md items-stretch justify-around">
        {items.map(({ href, label, Icon, active, accent, badge }) => (
          <li key={label} className="flex-1">
            <Link href={href} aria-label={label} className={`relative flex flex-col items-center gap-0.5 py-2 text-[10px] ${active ? "text-ink" : "text-muted"}`}>
              {accent ? (
                <span className="flex h-7 w-11 items-center justify-center rounded-full bg-royal text-bg"><Icon className="h-5 w-5" /></span>
              ) : (
                <Icon className="h-6 w-6" />
              )}
              {badge ? (
                <span className="absolute right-[calc(50%-18px)] top-1 min-w-4 rounded-full bg-royal px-1 text-center text-[10px] font-bold leading-4 text-bg">
                  {badge > 9 ? "9+" : badge}
                </span>
              ) : null}
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

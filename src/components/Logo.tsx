import Link from "next/link";

const SHOE_PATH =
  "M6,12 C6,6 12,3.5 18.5,4.5 C21,5 22,7.5 21.5,10 C26,26 34,44 42,58 C46,64 50,68 55,71 C60,74 64,77 66,81 C67,84 65,85.5 61,85.5 L40,85.5 C36,85.5 34,82 33,79 C28,66 20,46 14,32 C12,28 9,25 6,24 C5.5,20 6,16 6,12 Z M7,23 L14,25 L11.2,87 L10.2,87 Z";

/** Topuklu M: iki stiletto, ortada çaprazlanıp M harfi olur. Zemin ne olursa olsun maske ile ayrılır. */
export function HeelMark({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 92" className={className} fill="currentColor" aria-hidden="true">
      <defs>
        <mask id="moxie-heel-cut" maskUnits="userSpaceOnUse" x="0" y="0" width="100" height="92">
          <rect width="100" height="92" fill="#fff" />
          <path d={SHOE_PATH} fill="#000" stroke="#000" strokeWidth={5} strokeLinejoin="round" />
        </mask>
      </defs>
      <g mask="url(#moxie-heel-cut)">
        <path d={SHOE_PATH} transform="matrix(-1 0 0 1 100 0)" />
      </g>
      <path d={SHOE_PATH} />
    </svg>
  );
}

/** Kelime logo: topuklu M + "OXIE". */
export function Wordmark({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-end gap-[0.04em] font-serif font-medium leading-[0.8] tracking-[0.12em] ${className}`} aria-label="MOXIE">
      <HeelMark className="h-[1.12em] w-[1.22em] -mb-[0.02em]" />
      <span aria-hidden="true">OXIE</span>
    </span>
  );
}

export function Logo({ className = "" }: { className?: string }) {
  return (
    <Link href="/" className={`text-2xl text-royal ${className}`} aria-label="MOXIE ana sayfa">
      <Wordmark />
    </Link>
  );
}

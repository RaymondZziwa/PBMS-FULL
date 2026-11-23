import QRCode from "react-qr-code";
import { fileUrl } from "../lib/api";
import { date, initials } from "../lib/format";
import type { Member } from "../lib/types";
import { Logo } from "./ui";

/**
 * Link the card's QR code opens. It carries a code signed by the server, so the
 * check page can tell a genuine, current card from a forged or old copy.
 */
export const verifyUrl = (code: string) => `${window.location.origin}/verify?c=${encodeURIComponent(code)}`;

/** The digital loyalty card, with a QR code for checking it. */
const MemberCard = ({ m }: { m: Member }) => {
  const photo = fileUrl(m.photoUrl);
  const active = m.status === "ACTIVE";
  return (
    <div className="relative aspect-[1.586] w-full max-w-md overflow-hidden rounded-2xl bg-gradient-to-br from-brand-navy via-[#26407E] to-brand p-4 text-white shadow-pop sm:p-5">
      <div aria-hidden="true" className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-white/10" />
      <div aria-hidden="true" className="pointer-events-none absolute -bottom-24 right-24 h-56 w-56 rounded-full bg-white/5" />
      <div className="relative flex h-full flex-col">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="rounded-lg bg-white p-1"><Logo className="h-6" /></span>
            <span className="leading-tight">
              <span className="block text-[13px] font-semibold">Amatugunda</span>
              <span className="block text-[10px] font-semibold uppercase tracking-[0.18em] text-white/75">Monk Club</span>
            </span>
          </div>
          <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${active ? "bg-green-400/20 text-green-100" : "bg-white/15 text-white/80"}`}>{active ? "Active" : "Not active"}</span>
        </div>
        <div className="mt-auto flex items-end gap-3">
          <span className="flex h-14 w-14 flex-none items-center justify-center overflow-hidden rounded-xl bg-white/15 text-lg font-semibold ring-2 ring-white/30">
            {photo ? <img src={photo} alt="" className="h-full w-full object-cover" /> : initials(m.name)}
          </span>
          <div className="min-w-0 flex-1">
            <p className="m-0 truncate text-base font-semibold leading-tight sm:text-lg">{m.title} {m.name}</p>
            <p className="m-0 mt-1 font-mono text-sm tracking-[0.12em] text-white/90 sm:text-base">{m.cardNumber ?? "PBMC-••-••••••"}</p>
            <p className="m-0 mt-0.5 text-[11px] text-white/65">Member since {date(m.activatedAt ?? m.approvedAt)}</p>
          </div>
          {m.cardCode && (
            <div className="flex-none rounded-lg bg-white p-1.5" title="Scan to check this card">
              <QRCode value={verifyUrl(m.cardCode)} size={72} level="M" bgColor="#FFFFFF" fgColor="#1C2C57" aria-label={`QR code for card ${m.cardNumber}`} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MemberCard;

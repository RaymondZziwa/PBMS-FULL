import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { FiAlertTriangle, FiCheckCircle, FiShield, FiXCircle } from "react-icons/fi";
import AuthLayout from "../components/AuthLayout";
import { Spinner } from "../components/ui";
import { api, fileUrl } from "../lib/api";
import { date, dateTime, initials } from "../lib/format";

type Result =
  | { authentic: false; reason: string }
  | { authentic: true; cardNumber: string; name: string; valid: boolean; status: string; memberSince: string | null; place: string | null; photoUrl: string | null; lastCheckedAt: string | null; checks: number };

/**
 * Opened by scanning a membership card's QR code. The server checks the code's
 * signature and version: forged or old copies are reported as not authentic.
 */
const Verify = () => {
  const [params] = useSearchParams();
  const code = params.get("c") ?? "";
  const [data, setData] = useState<Result | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!code) {
      setData({ authentic: false, reason: "This QR code has no security code. Only cards issued by the Amatugunda Monk Club app are accepted." });
      return;
    }
    api<Result>(`/api/club/verify?c=${encodeURIComponent(code)}`, { auth: false }).then(setData).catch((e) => setError(e.message));
  }, [code]);

  const ok = data?.authentic === true ? data : null;
  const photo = fileUrl(ok?.photoUrl);

  return (
    <AuthLayout>
      <p className="m-0 flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.18em] text-ink-muted"><FiShield aria-hidden="true" /> Card check</p>
      {!data && !error ? (
        <div className="flex justify-center py-16 text-brand"><Spinner className="h-8 w-8" /></div>
      ) : error ? (
        <div className="mt-6 rounded-2xl border border-line bg-surface p-6 text-center">
          <p className="m-0 font-semibold">Couldn't check the card</p>
          <p className="m-0 mt-1 text-ink-muted">{error}</p>
        </div>
      ) : data && !data.authentic ? (
        <div className="mt-6 flex flex-col items-center rounded-2xl border border-bad/30 bg-red-50 p-6 text-center dark:bg-red-950/40">
          <FiXCircle className="h-14 w-14 text-bad" aria-hidden="true" />
          <h1 className="m-0 mt-3 font-display text-2xl font-semibold">Not authentic</h1>
          <p className="m-0 mt-2 text-ink-soft">{data.reason}</p>
          <p className="m-0 mt-4 text-sm text-ink-muted">Don't accept this card. Ask the holder to open the card in their Amatugunda Monk Club app.</p>
        </div>
      ) : ok ? (
        <div className={`mt-6 flex flex-col items-center rounded-2xl border p-6 text-center ${ok.valid ? "border-good/30 bg-green-50 dark:bg-green-950/40" : "border-amber-400/40 bg-amber-50 dark:bg-amber-950/40"}`}>
          <p className="m-0 mb-4 inline-flex items-center gap-1.5 rounded-full bg-surface px-3 py-1 text-xs font-semibold text-good"><FiShield aria-hidden="true" /> Genuine card · signature verified</p>
          <span className="flex h-28 w-28 items-center justify-center overflow-hidden rounded-full bg-surface text-3xl font-semibold text-brand-text ring-4 ring-surface">
            {photo ? <img src={photo} alt={`Photo of ${ok.name}`} className="h-full w-full object-cover" /> : initials(ok.name)}
          </span>
          <h1 className="m-0 mt-4 font-display text-2xl font-semibold">{ok.name}</h1>
          <p className="m-0 mt-1 font-mono tracking-wider">{ok.cardNumber}</p>
          <p className={`m-0 mt-4 flex items-center gap-2 text-lg font-semibold ${ok.valid ? "text-good" : "text-amber-700 dark:text-amber-300"}`}>
            {ok.valid ? <FiCheckCircle aria-hidden="true" /> : <FiAlertTriangle aria-hidden="true" />}
            {ok.valid ? "Active member" : "Membership not active"}
          </p>
          <p className="m-0 mt-2 text-sm text-ink-muted">{[ok.place, ok.memberSince ? `Member since ${date(ok.memberSince)}` : null].filter(Boolean).join(" · ")}</p>
          <p className="m-0 mt-4 text-sm text-ink-soft"><strong>Check the photo matches the person</strong> showing the card.</p>
          <p className="m-0 mt-1 text-xs text-ink-muted">Checked {ok.checks} time{ok.checks === 1 ? "" : "s"}{ok.lastCheckedAt ? ` · previous check ${dateTime(ok.lastCheckedAt)}` : ""}</p>
        </div>
      ) : null}
    </AuthLayout>
  );
};

export default Verify;

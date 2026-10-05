import React, { useEffect, useMemo, useState } from "react";
import { getMyReferralSummary } from "../api/referralApi";

const Referrals = () => {
  const [summary, setSummary] = useState(null);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    getMyReferralSummary().then(setSummary).catch(() => setError("We couldn't load your referral details. Please try again."));
  }, []);

  const inviteUrl = useMemo(() => summary ? `${window.location.origin}/register?ref=${encodeURIComponent(summary.referralCode)}` : "", [summary]);
  const copyInvite = async () => {
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("Copying was blocked by your browser. Copy the link from the box instead.");
    }
  };

  if (error && !summary) return <div className="mx-auto max-w-3xl px-4 py-12 text-red-300">{error}</div>;
  if (!summary) return <div className="mx-auto max-w-3xl px-4 py-12 text-slate-300">Loading referrals…</div>;

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:py-14 text-white">
      <div className="mb-8">
        <p className="text-sm font-bold uppercase tracking-[0.2em] text-wurkzi-400">Community rewards</p>
        <h1 className="mt-2 text-3xl font-bold sm:text-4xl">Refer neighbors. Earn together.</h1>
        <p className="mt-3 text-slate-400">There is no referral limit—share your link whenever someone could use Wurkzi.</p>
        <p className="mt-2 text-sm text-violet-300">During an active Community Challenge, each successful referral also earns your leaderboard entry 10 points.</p>
      </div>

      <section className="rounded-2xl border border-slate-700 bg-slate-900 p-5 shadow-xl sm:p-7">
        <label className="block text-sm font-semibold text-slate-300">Your invite link</label>
        <div className="mt-3 flex flex-col gap-3 sm:flex-row">
          <input readOnly value={inviteUrl} className="min-w-0 flex-1 rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-slate-200 outline-none" />
          <button onClick={copyInvite} className="rounded-xl bg-wurkzi-600 px-5 py-3 font-bold text-white transition hover:bg-wurkzi-500">
            {copied ? "Copied!" : "Copy link"}
          </button>
        </div>
        <p className="mt-3 text-sm text-slate-400">Your code: <span className="font-semibold text-white">{summary.referralCode}</span></p>
      </section>

      <section className="mt-6 grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-slate-700 bg-slate-900 p-5"><p className="text-sm text-slate-400">Platform credit</p><p className="mt-2 text-3xl font-bold text-emerald-300">${(summary.platformCreditCents / 100).toFixed(2)}</p></div>
        <div className="rounded-2xl border border-slate-700 bg-slate-900 p-5"><p className="text-sm text-slate-400">10% fee discounts</p><p className="mt-2 text-3xl font-bold text-violet-300">{summary.postingDiscountCount}</p></div>
        <div className="rounded-2xl border border-slate-700 bg-slate-900 p-5"><p className="text-sm text-slate-400">People referred</p><p className="mt-2 text-3xl font-bold text-sky-300">{summary.referralCount}</p></div>
      </section>

      <section className="mt-6 rounded-2xl border border-slate-700 bg-slate-900 p-6">
        <h2 className="text-xl font-bold">How rewards work</h2>
        <div className="mt-5 grid gap-5 sm:grid-cols-2">
          <div><h3 className="font-semibold text-emerald-300">Refer a worker</h3><p className="mt-1 text-sm leading-6 text-slate-400">When their first job is completed and paid, you both receive $5 in Wurkzi platform credit.</p></div>
          <div><h3 className="font-semibold text-violet-300">Refer a neighbor</h3><p className="mt-1 text-sm leading-6 text-slate-400">When their first posted job is completed and paid, you both receive 10% off a future platform fee.</p></div>
        </div>
      </section>
      {error && <p className="mt-4 text-sm text-red-300">{error}</p>}
    </div>
  );
};

export default Referrals;

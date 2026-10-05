import React, { useEffect, useMemo, useState } from "react";
import { enrollInLeaderboard, getActiveLeaderboard, getMyLeaderboardStatus } from "../api/leaderboardApi";

const AUDIENCES = ["STUDENT", "NEIGHBOR"];

const formatCountdown = (endsAt) => {
  const milliseconds = new Date(endsAt).getTime() - Date.now();
  if (milliseconds <= 0) return "Season closed";
  const days = Math.floor(milliseconds / 86400000);
  const hours = Math.floor((milliseconds % 86400000) / 3600000);
  return `${days}d ${hours}h remaining`;
};

const Leaderboard = () => {
  const [audience, setAudience] = useState("STUDENT");
  const [board, setBoard] = useState(null);
  const [mine, setMine] = useState(null);
  const [nickname, setNickname] = useState("");
  const [schoolName, setSchoolName] = useState("");
  const [schoolEmail, setSchoolEmail] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const load = async () => {
    try {
      const [nextBoard, nextMine] = await Promise.all([getActiveLeaderboard(audience), getMyLeaderboardStatus()]);
      setBoard(nextBoard);
      setMine(nextMine);
      setError("");
    } catch {
      setError("We couldn't load the leaderboard. Please try again.");
    }
  };

  useEffect(() => { load(); }, [audience]); // eslint-disable-line react-hooks/exhaustive-deps

  const countdown = useMemo(() => board?.season?.endsAt ? formatCountdown(board.season.endsAt) : "No active season", [board]);
  const enrolled = Boolean(mine?.participant);
  const selectedAudience = mine?.participant?.audience || audience;

  const enroll = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      await enrollInLeaderboard({ audience, nickname, schoolName, schoolEmail });
      await load();
    } catch (requestError) {
      setError(requestError.response?.data?.message || "We couldn't enroll you in this season.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:py-14 text-white">
      <div className="rounded-3xl border border-violet-500/30 bg-gradient-to-br from-violet-950 via-slate-900 to-slate-950 p-6 shadow-2xl sm:p-9">
        <p className="text-sm font-bold uppercase tracking-[0.2em] text-violet-300">Community challenge</p>
        <h1 className="mt-2 text-3xl font-bold sm:text-4xl">Earn points. Lead your community.</h1>
        <div className="mt-5 flex flex-wrap items-center gap-3 text-sm">
          <span className="rounded-full bg-white/10 px-3 py-1.5 font-semibold">{board?.season?.name || "Leaderboard"}</span>
          <span className="rounded-full border border-violet-400/30 px-3 py-1.5 text-violet-200">{countdown}</span>
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.5fr_1fr]">
        <section className="rounded-2xl border border-slate-700 bg-slate-900 p-5 sm:p-6">
          <div className="flex gap-2 border-b border-slate-700 pb-4">
            {AUDIENCES.map((item) => <button key={item} onClick={() => setAudience(item)} className={`rounded-lg px-4 py-2 text-sm font-bold transition ${audience === item ? "bg-violet-600 text-white" : "text-slate-400 hover:bg-slate-800 hover:text-white"}`}>{item === "STUDENT" ? "Students" : "Neighbors"}</button>)}
          </div>
          <div className="mt-5 flex items-start justify-between gap-4"><div><h2 className="text-xl font-bold">{audience === "STUDENT" ? "Student leaderboard" : "Neighbor leaderboard"}</h2>{audience === "STUDENT" && <p className="mt-1 text-sm leading-6 text-slate-400">{board?.prize}</p>}</div><span className="text-2xl">🏆</span></div>
          <ol className="mt-5 space-y-2">
            {board?.entries?.length ? board.entries.map((entry) => <li key={`${entry.rank}-${entry.nickname}`} className="flex items-center gap-4 rounded-xl bg-slate-800/70 px-4 py-3"><span className="w-7 text-center font-black text-violet-300">{entry.rank}</span><span className="min-w-0 flex-1 truncate font-semibold">{entry.nickname}</span><span className="font-bold text-emerald-300">{entry.points} pts</span></li>) : <li className="rounded-xl border border-dashed border-slate-700 p-6 text-center text-sm text-slate-400">No one is on this board yet. Be the first to join.</li>}
          </ol>
          <p className="mt-5 text-xs leading-5 text-slate-500">Points: +10 for one successful referral, +5 for a completed paid job in your board’s role. Rankings use paid jobs, referrals, then the earliest final score to break ties.</p>
        </section>

        <aside className="rounded-2xl border border-slate-700 bg-slate-900 p-5 sm:p-6">
          {enrolled ? <div><p className="text-sm font-bold uppercase tracking-wider text-violet-300">Your standing</p><h2 className="mt-2 text-2xl font-bold">#{mine.rank} · {mine.participant.points} points</h2><p className="mt-2 text-sm text-slate-400">You’re competing on the {selectedAudience === "STUDENT" ? "Student" : "Neighbor"} board as <span className="font-semibold text-white">{mine.participant.nickname}</span>.</p><div className="mt-5 space-y-2 rounded-xl bg-slate-800 p-4 text-sm"><p>Paid jobs: <strong>{mine.participant.qualifyingJobCount}</strong></p><p>Successful referrals: <strong>{mine.participant.successfulReferralCount}</strong></p>{selectedAudience === "STUDENT" && <p>Eligibility review: <strong className={mine.participant.verificationStatus === "VERIFIED" ? "text-emerald-300" : "text-amber-300"}>{mine.participant.verificationStatus === "VERIFIED" ? "Verified" : "Pending"}</strong></p>}</div></div> : <form onSubmit={enroll}><p className="text-sm font-bold uppercase tracking-wider text-violet-300">Join the challenge</p><h2 className="mt-2 text-2xl font-bold">Choose your board</h2><p className="mt-2 text-sm text-slate-400">You can join one board for this season and cannot switch after enrolling.</p><label className="mt-5 block text-sm font-semibold text-slate-300">Public nickname<input value={nickname} onChange={(event) => setNickname(event.target.value)} maxLength="24" required className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-white outline-none focus:border-violet-400" placeholder="How you appear publicly" /></label>{audience === "STUDENT" && <><label className="mt-4 block text-sm font-semibold text-slate-300">School name<input value={schoolName} onChange={(event) => setSchoolName(event.target.value)} required className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-white outline-none focus:border-violet-400" /></label><label className="mt-4 block text-sm font-semibold text-slate-300">School email<input type="email" value={schoolEmail} onChange={(event) => setSchoolEmail(event.target.value)} required className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-white outline-none focus:border-violet-400" /></label><p className="mt-3 text-xs leading-5 text-slate-500">Student points count right away; prize eligibility is manually reviewed to protect the $500 award.</p></>}<button disabled={submitting || !board?.season} className="mt-5 w-full rounded-xl bg-violet-600 px-4 py-3 font-bold text-white transition hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-50">{submitting ? "Joining…" : `Join ${audience === "STUDENT" ? "Student" : "Neighbor"} board`}</button></form>}
          {error && <p className="mt-4 text-sm text-red-300">{error}</p>}
        </aside>
      </div>
    </div>
  );
};

export default Leaderboard;

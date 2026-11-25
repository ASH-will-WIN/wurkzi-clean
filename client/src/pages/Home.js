import React, { useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Capacitor } from "@capacitor/core";
import { useAuth } from "../context/AuthContext";
import logo from "../assets/logo.png";

const NativeWelcome = () => (
  <div className="min-h-screen flex flex-col items-center justify-center bg-slate-950 px-6 text-center relative overflow-hidden">
    {/* Background Elements */}
    <div className="absolute top-[-20%] left-[-20%] w-[400px] h-[400px] bg-wurkzi-600/20 rounded-full blur-3xl opacity-30 animate-blob"></div>
    <div className="absolute bottom-[-20%] right-[-20%] w-[400px] h-[400px] bg-purple-600/20 rounded-full blur-3xl opacity-30 animate-blob animation-delay-2000"></div>

    <div className="relative z-10 w-full max-w-sm">
      <div className="mb-10 flex justify-center">
        <div className="relative">
          <div className="absolute inset-0 bg-wurkzi-500/30 blur-2xl rounded-full"></div>
          <img src={logo} alt="Wurkzi Logo" className="w-24 h-24 object-contain relative z-10 drop-shadow-2xl" />
        </div>
      </div>

      <h1 className="text-4xl font-black text-white mb-2 tracking-tight">
        Wurkzi
      </h1>
      <p className="text-lg text-slate-400 mb-12 font-medium">
        Local Gigs. Secure Payments.
      </p>

      <div className="space-y-4">
        <Link
          to="/login"
          className="block w-full py-4 px-6 bg-wurkzi-600 hover:bg-wurkzi-500 text-white rounded-xl font-bold text-lg shadow-lg shadow-wurkzi-500/25 transition-all active:scale-95"
        >
          Sign In
        </Link>
        <Link
          to="/register"
          className="block w-full py-4 px-6 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl font-bold text-lg border border-slate-700 transition-all active:scale-95"
        >
          Create Account
        </Link>
      </div>

      <p className="mt-8 text-xs text-slate-500">
        By continuing, you agree to our Terms & Privacy Policy.
      </p>
    </div>
  </div>
);

const Home = () => {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthenticated) navigate("/dashboard");
  }, [isAuthenticated, navigate]);

  if (Capacitor.isNativePlatform()) return <NativeWelcome />;

  return (
    <div className="bg-slate-950 text-slate-100">
      <main>
        <section className="mx-auto max-w-7xl px-5 pb-20 pt-16 sm:px-6 sm:pb-28 sm:pt-24 lg:px-8 lg:pt-32">
          <div className="grid items-end gap-12 lg:grid-cols-12 lg:gap-16">
            <div className="lg:col-span-8">
              <p className="mb-6 text-xs font-bold uppercase tracking-[0.2em] text-wurkzi-400">Good work starts close to home</p>
              <h1 className="max-w-4xl text-5xl font-bold leading-[1.05] tracking-tight text-white sm:text-6xl lg:text-7xl">A little help goes a long way.</h1>
              <p className="mt-7 max-w-xl text-lg leading-relaxed text-slate-300 sm:text-xl">Find someone nearby for the tasks on your list, or find local work that fits your schedule.</p>
              <div className="mt-9 flex flex-col gap-3 sm:flex-row">
                <Link to="/register" className="inline-flex items-center justify-center rounded-md bg-wurkzi-500 px-7 py-4 text-base font-bold text-slate-950 transition-colors hover:bg-wurkzi-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-wurkzi-400">Get started <span aria-hidden="true" className="ml-3">→</span></Link>
                <Link to="/how-it-works" className="inline-flex items-center justify-center rounded-md border border-slate-600 px-7 py-4 text-base font-semibold text-white transition-colors hover:border-slate-300 hover:bg-slate-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-wurkzi-400">See how it works</Link>
              </div>
            </div>
            <div className="border-l-2 border-wurkzi-500 pl-6 lg:col-span-4 lg:mb-2">
              <p className="text-sm font-semibold uppercase tracking-widest text-slate-400">For your neighborhood</p>
              <p className="mt-4 text-2xl font-medium leading-snug text-slate-100">Things need doing.<br />People want to work.<br />Wurkzi brings them together.</p>
            </div>
          </div>
        </section>
        <section className="border-y border-slate-800 bg-slate-900/60">
          <div className="mx-auto grid max-w-7xl gap-8 px-5 py-12 sm:px-6 md:grid-cols-3 md:gap-12 lg:px-8">
            {[
              ["01", "Find local work", "Browse opportunities in your community and find work that fits your schedule."],
              ["02", "Talk through the details", "Connect directly to discuss the job and agree on what needs to get done."],
              ["03", "Get the job done", "Work together and handle payment securely through Wurkzi."]
            ].map(([number, title, description]) => (
              <div key={number}>
                <span className="text-sm font-semibold text-wurkzi-400">{number}</span>
                <h2 className="mt-4 text-xl font-bold text-white">{title}</h2>
                <p className="mt-3 max-w-sm leading-relaxed text-slate-400">{description}</p>
              </div>
            ))}
          </div>
        </section>
        <section className="mx-auto max-w-7xl px-5 py-20 sm:px-6 sm:py-28 lg:px-8">
          <div className="grid gap-10 md:grid-cols-2 md:gap-20">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-wurkzi-400">Made for both sides</p>
              <h2 className="mt-5 max-w-md text-3xl font-bold leading-tight tracking-tight text-white sm:text-4xl">More getting things done. Less figuring out where to start.</h2>
            </div>
            <div className="divide-y divide-slate-800 border-y border-slate-800">
              <div className="py-6"><h3 className="text-lg font-bold text-white">Need a hand?</h3><p className="mt-2 leading-relaxed text-slate-400">Share what you need done and connect with people in your area.</p></div>
              <div className="py-6"><h3 className="text-lg font-bold text-white">Looking for work?</h3><p className="mt-2 leading-relaxed text-slate-400">Find local jobs, put your skills to use, and earn on your schedule.</p></div>
            </div>
          </div>
        </section>
        <section className="border-t border-slate-800 bg-slate-900/60">
          <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-8 px-5 py-16 sm:px-6 md:flex-row md:items-center lg:px-8">
            <div><h2 className="text-3xl font-bold tracking-tight text-white">Ready to get started?</h2><p className="mt-3 text-slate-400">Join Wurkzi and connect with your community.</p></div>
            <Link to="/register" className="inline-flex items-center rounded-md bg-white px-7 py-4 font-bold text-slate-950 transition-colors hover:bg-slate-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-wurkzi-400">Create an account <span aria-hidden="true" className="ml-3">→</span></Link>
          </div>
        </section>
      </main>
    </div>
  );
};

export default Home;

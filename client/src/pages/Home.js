import React, { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Capacitor } from "@capacitor/core";
import { useAuth } from "../context/AuthContext";
import logo from "../assets/logo.png";

const RevealOnScroll = ({ children, delay = 0 }) => {
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.unobserve(entry.target);
        }
      },
      {
        threshold: 0.1,
        rootMargin: "0px 0px -50px 0px"
      }
    );

    const currentRef = ref.current;
    if (currentRef) {
      observer.observe(currentRef);
    }

    return () => {
      if (currentRef) {
        observer.unobserve(currentRef);
      }
    };
  }, []);

  return (
    <div
      ref={ref}
      className={`transition-all duration-1000 transform ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-12"
        }`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
};

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
  const { isAuthenticated } = useAuth(); // Assuming useAuth is available
  const navigate = useNavigate();
  const isNative = Capacitor.isNativePlatform();

  useEffect(() => {
    if (isAuthenticated) {
      navigate("/dashboard");
    }
  }, [isAuthenticated, navigate]);

  // If on native platform, show simplified welcome screen
  if (isNative) {
    return <NativeWelcome />;
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 overflow-hidden relative">
      {/* Dynamic Background Effects */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-purple-600/20 rounded-full mix-blend-screen filter blur-3xl opacity-20 animate-blob" />
        <div className="absolute top-[20%] right-[-10%] w-[500px] h-[500px] bg-wurkzi-600/20 rounded-full mix-blend-screen filter blur-3xl opacity-20 animate-blob animation-delay-2000" />
        <div className="absolute bottom-[-10%] left-[20%] w-[600px] h-[600px] bg-blue-600/20 rounded-full mix-blend-screen filter blur-3xl opacity-20 animate-blob animation-delay-4000" />
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 brightness-100 contrast-150 mix-blend-overlay"></div>
      </div>

      <main className="flex-grow z-10 relative">
        {/* Hero Section */}
        <section className="relative pt-32 pb-40">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <RevealOnScroll>
              <div className="inline-flex items-center px-4 py-2 rounded-full bg-slate-900/50 border border-slate-700/50 text-wurkzi-400 text-sm font-medium mb-8 backdrop-blur-sm shadow-lg shadow-black/20 hover:scale-105 transition-transform duration-300 cursor-default">
                <span className="flex h-2 w-2 rounded-full bg-wurkzi-500 mr-2 animate-pulse"></span>
                Now accepting early access for local workers
              </div>
            </RevealOnScroll>

            <RevealOnScroll delay={200}>
              <h1 className="text-5xl sm:text-7xl font-extrabold tracking-tight mb-8 leading-tight">
                <span className="block text-slate-100 drop-shadow-lg">
                  Local Gigs.
                </span>
                <span className="bg-clip-text text-transparent bg-gradient-to-r from-wurkzi-400 via-purple-400 to-indigo-400 animate-gradient-x font-black drop-shadow-2xl">
                  Secure Payments.
                </span>
              </h1>
            </RevealOnScroll>

            <RevealOnScroll delay={400}>
              <p className="mt-4 max-w-2xl mx-auto text-xl text-slate-400 mb-12 leading-relaxed">
                Connect with reliable neighbors for local projects. The easiest way for simple tasks, flexible work, and community connection.
              </p>
            </RevealOnScroll>

            <RevealOnScroll delay={600}>
              <div className="flex justify-center gap-6 flex-col sm:flex-row">
                <Link
                  to="/register"
                  className="group relative px-8 py-4 bg-white text-slate-900 rounded-full font-bold text-lg shadow-[0_0_20px_rgba(255,255,255,0.3)] hover:shadow-[0_0_30px_rgba(255,255,255,0.5)] transition-all duration-300 hover:-translate-y-1 overflow-hidden"
                >
                  <span className="relative z-10">Start Earning Now</span>
                  <div className="absolute inset-0 bg-gradient-to-r from-wurkzi-50 to-purple-50 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                </Link>
                <Link
                  to="/how-it-works"
                  className="px-8 py-4 bg-slate-800/50 text-white rounded-full font-bold text-lg border border-slate-700 hover:bg-slate-800 transition-all duration-300 backdrop-blur-md hover:-translate-y-1 shadow-lg shadow-black/20"
                >
                  Find Services
                </Link>
              </div>
            </RevealOnScroll>
          </div>
        </section>

        {/* Features Section */}
        <section className="py-24 relative">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <RevealOnScroll>
              <div className="text-center mb-16">
                <h2 className="text-3xl font-bold text-white sm:text-4xl mb-4">
                  Why use Wurkzi?
                </h2>
                <div className="w-24 h-1.5 bg-gradient-to-r from-wurkzi-500 to-purple-600 mx-auto rounded-full"></div>
              </div>
            </RevealOnScroll>

            <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-3">
              <RevealOnScroll delay={100}>
                <div className="group relative bg-slate-900/40 backdrop-blur-md rounded-2xl p-8 border border-slate-800 hover:border-wurkzi-500/50 shadow-xl transition-all duration-500 hover:-translate-y-2 hover:shadow-wurkzi-500/10">
                  <div className="absolute inset-x-0 -top-px h-px bg-gradient-to-r from-transparent via-wurkzi-500/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                  <div className="flex items-center justify-center h-16 w-16 rounded-2xl bg-slate-800 text-wurkzi-400 mb-6 group-hover:scale-110 group-hover:rotate-3 transition-transform duration-500 shadow-inner border border-slate-700">
                    <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-bold text-white mb-3 group-hover:text-wurkzi-400 transition-colors">Local Opportunities</h3>
                  <p className="text-slate-400 leading-relaxed">
                    Find gigs right in your neighborhood. Help your community while earning extra cash on your schedule.
                  </p>
                </div>
              </RevealOnScroll>

              <RevealOnScroll delay={200}>
                <div className="group relative bg-slate-900/40 backdrop-blur-md rounded-2xl p-8 border border-slate-800 hover:border-purple-500/50 shadow-xl transition-all duration-500 hover:-translate-y-2 hover:shadow-purple-500/10">
                  <div className="absolute inset-x-0 -top-px h-px bg-gradient-to-r from-transparent via-purple-500/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                  <div className="flex items-center justify-center h-16 w-16 rounded-2xl bg-slate-800 text-purple-400 mb-6 group-hover:scale-110 group-hover:rotate-3 transition-transform duration-500 shadow-inner border border-slate-700">
                    <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-bold text-white mb-3 group-hover:text-purple-400 transition-colors">Secure & Reliable</h3>
                  <p className="text-slate-400 leading-relaxed">
                    Payments are held securely until the job is done. Verified reviews and profiles keep everyone safe.
                  </p>
                </div>
              </RevealOnScroll>

              <RevealOnScroll delay={300}>
                <div className="group relative bg-slate-900/40 backdrop-blur-md rounded-2xl p-8 border border-slate-800 hover:border-blue-500/50 shadow-xl transition-all duration-500 hover:-translate-y-2 hover:shadow-blue-500/10">
                  <div className="absolute inset-x-0 -top-px h-px bg-gradient-to-r from-transparent via-blue-500/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                  <div className="flex items-center justify-center h-16 w-16 rounded-2xl bg-slate-800 text-blue-400 mb-6 group-hover:scale-110 group-hover:rotate-3 transition-transform duration-500 shadow-inner border border-slate-700">
                    <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.418 8-9 8a9.013 9.013 0 01-5.314-1.757l-3.42 1.026a.756.756 0 01-.932-.932l1.026-3.42A9.013 9.013 0 013 12c0-4.962 4.037-9 9-9s9 4.037 9 9z" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-bold text-white mb-3 group-hover:text-blue-400 transition-colors">Chat & Plan</h3>
                  <p className="text-slate-400 leading-relaxed">
                    Chat directly with neighbors to agree on details. No middleman needed for simple communication.
                  </p>
                </div>
              </RevealOnScroll>
            </div>
          </div>
        </section>

        {/* How it Works */}
        <section className="py-24 bg-slate-900/30 backdrop-blur-sm relative">
          <div className="absolute inset-0 bg-gradient-to-b from-slate-950/0 via-slate-900/50 to-slate-950/0"></div>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
            <RevealOnScroll>
              <div className="text-center mb-16">
                <h2 className="text-3xl font-bold text-white sm:text-4xl mb-4">
                  Simple steps to success
                </h2>
                <div className="w-24 h-1.5 bg-gradient-to-r from-purple-600 to-blue-500 mx-auto rounded-full"></div>
              </div>
            </RevealOnScroll>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
              {[
                { title: "Create Profile", desc: "Sign up in seconds and showcase your skills or what you need done.", number: "1" },
                { title: "Connect", desc: "Browse local jobs or workers. Chat instantly to discuss the details.", number: "2" },
                { title: "Collaborate", desc: "Get the job done and get paid securely through Wurkzi.", number: "3" }
              ].map((step, index) => (
                <RevealOnScroll key={index} delay={index * 200}>
                  <div className="relative text-center group">
                    <div className="h-20 w-20 mx-auto bg-slate-800 rounded-full flex items-center justify-center border-4 border-slate-900 text-2xl font-bold text-slate-300 mb-6 z-10 relative group-hover:scale-110 group-hover:border-wurkzi-500 transition-all duration-300 shadow-xl">
                      {step.number}
                    </div>

                    {/* Connector Line (Desktop) */}
                    {index !== 2 && (
                      <div className="hidden md:block absolute top-10 left-1/2 w-full h-0.5 bg-slate-800 -z-0"></div>
                    )}

                    <h3 className="text-xl font-bold text-white mb-3 group-hover:text-wurkzi-400 transition-colors">{step.title}</h3>
                    <p className="text-slate-400 max-w-xs mx-auto">
                      {step.desc}
                    </p>
                  </div>
                </RevealOnScroll>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-24 relative overflow-hidden">
          <RevealOnScroll>
            <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
              <div className="bg-gradient-to-r from-wurkzi-900/50 to-purple-900/50 backdrop-blur-xl rounded-3xl p-12 border border-slate-700/50 shadow-2xl relative overflow-hidden group hover:border-wurkzi-500/30 transition-colors duration-500">
                <div className="absolute top-0 right-0 -mr-20 -mt-20 w-80 h-80 bg-wurkzi-600/30 rounded-full blur-3xl opacity-30 group-hover:opacity-50 transition-opacity duration-700"></div>
                <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-80 h-80 bg-purple-600/30 rounded-full blur-3xl opacity-30 group-hover:opacity-50 transition-opacity duration-700"></div>

                <h2 className="text-4xl font-extrabold text-white mb-6 relative z-10">
                  Ready to get started?
                </h2>
                <p className="text-xl text-slate-300 mb-10 max-w-2xl mx-auto relative z-10">
                  Join thousands of neighbors helping neighbors. Whether you need a hand or want to lend one.
                </p>
                <div className="flex flex-col sm:flex-row justify-center gap-4 relative z-10">
                  <Link
                    to="/register"
                    className="px-8 py-4 bg-white text-slate-900 rounded-full font-bold text-lg shadow-[0_0_20px_rgba(255,255,255,0.2)] hover:shadow-[0_0_30px_rgba(255,255,255,0.4)] transition-all duration-300 hover:-translate-y-1"
                  >
                    Create Free Account
                  </Link>
                  <Link
                    to="/about"
                    className="px-8 py-4 bg-transparent text-white border border-white/20 rounded-full font-bold text-lg hover:bg-white/10 transition-all duration-300 hover:-translate-y-1"
                  >
                    Learn More
                  </Link>
                </div>
              </div>
            </div>
          </RevealOnScroll>
        </section>
      </main>
    </div>
  );
};

export default Home;

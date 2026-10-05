import React, { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";

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

const About = () => {
  return (
    <div className="min-h-screen flex flex-col bg-slate-950 overflow-hidden relative">
      {/* Dynamic Background Effects */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] bg-purple-600/20 rounded-full mix-blend-screen filter blur-3xl opacity-20 animate-blob" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[600px] h-[600px] bg-wurkzi-600/20 rounded-full mix-blend-screen filter blur-3xl opacity-20 animate-blob animation-delay-2000" />
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 brightness-100 contrast-150 mix-blend-overlay"></div>
      </div>

      <main className="flex-grow z-10 relative">
        {/* Hero Section */}
        <section className="relative pt-32 pb-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center">
              <RevealOnScroll>
                <div className="inline-flex items-center px-4 py-2 rounded-full bg-slate-900/50 border border-slate-700/50 text-wurkzi-400 text-sm font-medium mb-8 backdrop-blur-sm shadow-lg shadow-black/20">
                  <span className="flex h-2 w-2 rounded-full bg-wurkzi-500 mr-2 animate-pulse"></span>
                  Our Mission
                </div>
                <h1 className="text-4xl font-extrabold text-white sm:text-5xl sm:tracking-tight lg:text-6xl mb-6">
                  <span className="block">About Wurkzi</span>
                </h1>
                <p className="mt-6 max-w-2xl mx-auto text-xl text-slate-400">
                  Connecting talent with opportunity in the modern workforce. We're building the future of local work.
                </p>
              </RevealOnScroll>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="py-20 relative">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <RevealOnScroll>
              <div className="text-center mb-16">
                <h2 className="text-3xl font-bold text-white sm:text-4xl mb-4">
                  Platform Features
                </h2>
                <div className="w-24 h-1.5 bg-gradient-to-r from-wurkzi-500 to-purple-600 mx-auto rounded-full mb-6"></div>
                <p className="max-w-2xl mx-auto text-xl text-slate-400">
                  Powerful tools designed to streamline your hiring process
                </p>
              </div>
            </RevealOnScroll>

            <div className="grid gap-8 grid-cols-1 md:grid-cols-3">
              <RevealOnScroll delay={100}>
                <div className="bg-slate-900/40 backdrop-blur-md p-8 rounded-2xl border border-slate-800 hover:border-wurkzi-500/30 transition-all duration-300 hover:-translate-y-1 shadow-lg group">
                  <div className="h-14 w-14 rounded-2xl bg-slate-800 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300 border border-slate-700">
                    <svg
                      className="h-7 w-7 text-wurkzi-400"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                      />
                    </svg>
                  </div>
                  <h3 className="text-xl font-bold text-white mt-4 mb-3">
                    Smart Matching
                  </h3>
                  <p className="text-slate-400 leading-relaxed">
                    Our algorithm connects you with the most suitable candidates
                    based on skills, experience, and preferences.
                  </p>
                </div>
              </RevealOnScroll>

              <RevealOnScroll delay={200}>
                <div className="bg-slate-900/40 backdrop-blur-md p-8 rounded-2xl border border-slate-800 hover:border-purple-500/30 transition-all duration-300 hover:-translate-y-1 shadow-lg group">
                  <div className="h-14 w-14 rounded-2xl bg-slate-800 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300 border border-slate-700">
                    <svg
                      className="h-7 w-7 text-purple-400"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                  </div>
                  <h3 className="text-xl font-bold text-white mt-4 mb-3">
                    Real-time Communication
                  </h3>
                  <p className="text-slate-400 leading-relaxed">
                    Instant messaging and video interview capabilities to
                    streamline your hiring process.
                  </p>
                </div>
              </RevealOnScroll>

              <RevealOnScroll delay={300}>
                <div className="bg-slate-900/40 backdrop-blur-md p-8 rounded-2xl border border-slate-800 hover:border-blue-500/30 transition-all duration-300 hover:-translate-y-1 shadow-lg group">
                  <div className="h-14 w-14 rounded-2xl bg-slate-800 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300 border border-slate-700">
                    <svg
                      className="h-7 w-7 text-blue-400"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                      />
                    </svg>
                  </div>
                  <h3 className="text-xl font-bold text-white mt-4 mb-3">
                    Secure Payments
                  </h3>
                  <p className="text-slate-400 leading-relaxed">
                    Integrated payment system with escrow protection for both
                    employers and professionals.
                  </p>
                </div>
              </RevealOnScroll>
            </div>
          </div>
        </section>

        {/* Benefits Section */}
        <section className="py-20 relative bg-slate-900/20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <RevealOnScroll>
              <div className="text-center mb-16">
                <h2 className="text-3xl font-bold text-white sm:text-4xl mb-4">
                  Platform Benefits
                </h2>
                <div className="w-24 h-1.5 bg-gradient-to-r from-purple-600 to-blue-500 mx-auto rounded-full mb-6"></div>
                <p className="max-w-2xl mx-auto text-xl text-slate-400">
                  Why thousands choose Wurkzi
                </p>
              </div>
            </RevealOnScroll>

            <div className="grid gap-8 grid-cols-1 md:grid-cols-2">
              <RevealOnScroll delay={100}>
                <div className="bg-slate-900/60 backdrop-blur-md p-8 rounded-2xl border border-slate-800 shadow-xl h-full">
                  <h3 className="text-2xl font-bold text-white mb-6 border-b border-slate-800 pb-4">
                    For Employers
                  </h3>
                  <ul className="space-y-4">
                    <li className="flex items-start">
                      <div className="flex-shrink-0 h-6 w-6 rounded-full bg-green-500/20 flex items-center justify-center mt-0.5">
                        <svg className="h-4 w-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                      <span className="ml-3 text-slate-300">Access to pre-vetted talent pool</span>
                    </li>
                    <li className="flex items-start">
                      <div className="flex-shrink-0 h-6 w-6 rounded-full bg-green-500/20 flex items-center justify-center mt-0.5">
                        <svg className="h-4 w-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                      <span className="ml-3 text-slate-300">Reduced hiring time and costs</span>
                    </li>
                    <li className="flex items-start">
                      <div className="flex-shrink-0 h-6 w-6 rounded-full bg-green-500/20 flex items-center justify-center mt-0.5">
                        <svg className="h-4 w-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                      <span className="ml-3 text-slate-300">Transparent rating and review system</span>
                    </li>
                  </ul>
                </div>
              </RevealOnScroll>

              <RevealOnScroll delay={200}>
                <div className="bg-slate-900/60 backdrop-blur-md p-8 rounded-2xl border border-slate-800 shadow-xl h-full">
                  <h3 className="text-2xl font-bold text-white mb-6 border-b border-slate-800 pb-4">
                    For Professionals
                  </h3>
                  <ul className="space-y-4">
                    <li className="flex items-start">
                      <div className="flex-shrink-0 h-6 w-6 rounded-full bg-wurkzi-500/20 flex items-center justify-center mt-0.5">
                        <svg className="h-4 w-4 text-wurkzi-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                      <span className="ml-3 text-slate-300">Flexible work opportunities</span>
                    </li>
                    <li className="flex items-start">
                      <div className="flex-shrink-0 h-6 w-6 rounded-full bg-wurkzi-500/20 flex items-center justify-center mt-0.5">
                        <svg className="h-4 w-4 text-wurkzi-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                      <span className="ml-3 text-slate-300">Secure payment protection</span>
                    </li>
                    <li className="flex items-start">
                      <div className="flex-shrink-0 h-6 w-6 rounded-full bg-wurkzi-500/20 flex items-center justify-center mt-0.5">
                        <svg className="h-4 w-4 text-wurkzi-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                      <span className="ml-3 text-slate-300">Career growth opportunities</span>
                    </li>
                  </ul>
                </div>
              </RevealOnScroll>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};

export default About;

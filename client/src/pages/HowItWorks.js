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

const HowItWorks = () => {
    return (
        <div className="min-h-screen flex flex-col bg-slate-950 overflow-hidden relative">
            {/* Background Effects */}
            <div className="fixed inset-0 z-0 pointer-events-none">
                <div className="absolute top-[30%] left-[-10%] w-[500px] h-[500px] bg-blue-600/20 rounded-full mix-blend-screen filter blur-3xl opacity-20 animate-blob" />
                <div className="absolute bottom-[20%] right-[-10%] w-[600px] h-[600px] bg-wurkzi-600/20 rounded-full mix-blend-screen filter blur-3xl opacity-20 animate-blob animation-delay-2000" />
                <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 brightness-100 contrast-150 mix-blend-overlay"></div>
            </div>

            <main className="flex-grow z-10 relative">
                <section className="relative pt-32 pb-20">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                        <div className="text-center">
                            <RevealOnScroll>
                                <div className="inline-flex items-center px-4 py-2 rounded-full bg-slate-900/50 border border-slate-700/50 text-blue-400 text-sm font-medium mb-8 backdrop-blur-sm shadow-lg shadow-black/20">
                                    <span className="flex h-2 w-2 rounded-full bg-blue-500 mr-2 animate-pulse"></span>
                                    Simple & Secure
                                </div>
                                <h1 className="text-4xl font-extrabold text-white sm:text-5xl sm:tracking-tight lg:text-6xl mb-6">
                                    <span className="block">How It Works</span>
                                </h1>
                                <p className="mt-6 max-w-2xl mx-auto text-xl text-slate-400">
                                    Getting things done shouldn't be complicated. Here's how Wurkzi makes it easy.
                                </p>
                            </RevealOnScroll>
                        </div>
                    </div>
                </section>

                <section className="py-20 relative">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                        <div className="grid gap-12 lg:grid-cols-3">
                            {/* Step 1 */}
                            <RevealOnScroll delay={100}>
                                <div className="relative group">
                                    <div className="absolute -inset-1 bg-gradient-to-r from-wurkzi-600 to-purple-600 rounded-2xl blur opacity-25 group-hover:opacity-75 transition duration-1000 group-hover:duration-200"></div>
                                    <div className="relative bg-slate-900 ring-1 ring-slate-900/5 rounded-2xl p-8 h-full">
                                        <div className="w-16 h-16 bg-slate-800 rounded-2xl flex items-center justify-center mb-6 border border-slate-700 shadow-inner group-hover:scale-110 transition-transform duration-300">
                                            <span className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-wurkzi-400 to-purple-500">
                                                1
                                            </span>
                                        </div>
                                        <h3 className="text-xl font-bold text-white mb-4">Post a Request</h3>
                                        <p className="text-slate-400 leading-relaxed">
                                            Describe what you need help with. It could be lawn mowing, car washing, garage organization, or anything else. Set your budget and timeline.
                                        </p>
                                    </div>
                                </div>
                            </RevealOnScroll>

                            {/* Step 2 */}
                            <RevealOnScroll delay={200}>
                                <div className="relative group">
                                    <div className="absolute -inset-1 bg-gradient-to-r from-purple-600 to-blue-600 rounded-2xl blur opacity-25 group-hover:opacity-75 transition duration-1000 group-hover:duration-200"></div>
                                    <div className="relative bg-slate-900 ring-1 ring-slate-900/5 rounded-2xl p-8 h-full">
                                        <div className="w-16 h-16 bg-slate-800 rounded-2xl flex items-center justify-center mb-6 border border-slate-700 shadow-inner group-hover:scale-110 transition-transform duration-300">
                                            <span className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-blue-500">
                                                2
                                            </span>
                                        </div>
                                        <h3 className="text-xl font-bold text-white mb-4">Connect with Locals</h3>
                                        <p className="text-slate-400 leading-relaxed">
                                            Neighbors will see your request and offer to help. Review their profiles and ratings to choose the best person for the job.
                                        </p>
                                    </div>
                                </div>
                            </RevealOnScroll>

                            {/* Step 3 */}
                            <RevealOnScroll delay={300}>
                                <div className="relative group">
                                    <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-wurkzi-600 rounded-2xl blur opacity-25 group-hover:opacity-75 transition duration-1000 group-hover:duration-200"></div>
                                    <div className="relative bg-slate-900 ring-1 ring-slate-900/5 rounded-2xl p-8 h-full">
                                        <div className="w-16 h-16 bg-slate-800 rounded-2xl flex items-center justify-center mb-6 border border-slate-700 shadow-inner group-hover:scale-110 transition-transform duration-300">
                                            <span className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-wurkzi-500">
                                                3
                                            </span>
                                        </div>
                                        <h3 className="text-xl font-bold text-white mb-4">Get it Done</h3>
                                        <p className="text-slate-400 leading-relaxed">
                                            Your helper completes the task. Payment is securely handled through the platform, so everything is safe and easy.
                                        </p>
                                    </div>
                                </div>
                            </RevealOnScroll>
                        </div>
                    </div>
                </section>

                <section className="py-20 relative bg-slate-900/30 border-t border-slate-800/50">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
                        <RevealOnScroll>
                            <h2 className="text-3xl font-bold text-white mb-8">Ready to get started?</h2>
                            <div className="flex flex-col sm:flex-row gap-4 justify-center">
                                <Link to="/register" className="px-8 py-4 bg-gradient-to-r from-wurkzi-600 to-purple-600 text-white rounded-xl font-bold text-lg hover:shadow-lg hover:shadow-purple-500/20 transition-all hover:-translate-y-1">
                                    Join as a Worker
                                </Link>
                                <Link to="/register" className="px-8 py-4 bg-slate-800 text-white rounded-xl font-bold text-lg border border-slate-700 hover:bg-slate-700 hover:border-slate-600 transition-all hover:-translate-y-1">
                                    Post a Job
                                </Link>
                            </div>
                        </RevealOnScroll>
                    </div>
                </section>
            </main>
        </div>
    );
};

export default HowItWorks;

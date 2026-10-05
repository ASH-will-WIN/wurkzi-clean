import React from "react";
import { Link } from "react-router-dom";
import logo from "../assets/logo.png";

const Footer = () => {
    return (
        <footer className="bg-slate-950 border-t border-slate-900 pt-16 pb-8 relative z-10 w-full mt-auto">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex flex-col md:flex-row justify-between items-center">
                    <div className="flex items-center mb-6 md:mb-0">
                        <img
                            src={logo}
                            alt="Wurkzi"
                            className="h-8 w-auto mr-3 opacity-90 grayscale hover:grayscale-0 transition-all duration-300"
                        />
                        <span className="text-slate-500 text-sm">
                            © {new Date().getFullYear()} Wurkzi. All rights reserved.
                        </span>
                    </div>
                    <div className="flex space-x-6">
                        <Link
                            to="/privacy"
                            className="text-slate-500 hover:text-white transition-colors text-sm"
                        >
                            Privacy
                        </Link>
                        <Link
                            to="/terms"
                            className="text-slate-500 hover:text-white transition-colors text-sm"
                        >
                            Terms
                        </Link>
                        <Link
                            to="/support"
                            className="text-slate-500 hover:text-white transition-colors text-sm"
                        >
                            Support
                        </Link>
                        <Link
                            to="/mission"
                            className="text-slate-500 hover:text-white transition-colors text-sm"
                        >
                            Mission
                        </Link>
                        <Link
                            to="/how-it-works"
                            className="text-slate-500 hover:text-white transition-colors text-sm"
                        >
                            How it Works
                        </Link>
                    </div>
                </div>
            </div>
        </footer>
    );
};

export default Footer;

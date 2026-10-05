import React, { useState } from "react";

const Support = () => {
    const [formData, setFormData] = useState({
        name: "",
        email: "",
        subject: "",
        message: "",
    });
    const [submitted, setSubmitted] = useState(false);

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value,
        });
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        // In a real implementation, this would send the form data to a backend
        setSubmitted(true);
    };

    const faqs = [
        {
            question: "How do I create an account?",
            answer:
                "Click the 'Get Started' button on the homepage and follow the registration process. You'll need to provide basic information and verify your email address.",
        },
        {
            question: "How does payment work?",
            answer:
                "Workers pay a $5 deposit when applying for a job, which is refunded after job completion. Clients pay the full job amount, which is released to workers after successful completion.",
        },
        {
            question: "What if there's a dispute about a job?",
            answer:
                "Contact our support team immediately. We'll review the situation and work with both parties to find a fair resolution.",
        },
        {
            question: "How do I verify my age?",
            answer:
                "During registration, you'll be asked to provide your date of birth. For teen workers, parental consent is required and will be verified.",
        },
        {
            question: "Can I cancel a job after accepting it?",
            answer:
                "Yes, but please communicate with the client as soon as possible. Repeated cancellations may affect your account standing.",
        },
        {
            question: "How do I update my profile information?",
            answer:
                "Go to your Dashboard and click on your profile settings to update your information, skills, and availability.",
        },
    ];

    return (
        <div className="min-h-screen bg-slate-950 text-slate-300 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-4xl mx-auto">
                {/* Header Section */}
                <div className="bg-slate-900/50 backdrop-blur-md rounded-2xl p-8 border border-slate-700 shadow-xl mb-8">
                    <h1 className="text-3xl font-bold mb-4 text-white border-b border-slate-700 pb-4">
                        Support Center
                    </h1>
                    <p className="text-slate-400">
                        We're here to help! Browse our FAQs or contact us directly.
                    </p>
                </div>

                {/* FAQs Section */}
                <div className="bg-slate-900/50 backdrop-blur-md rounded-2xl p-8 border border-slate-700 shadow-xl mb-8">
                    <h2 className="text-2xl font-semibold mb-6 text-white">
                        Frequently Asked Questions
                    </h2>
                    <div className="space-y-4">
                        {faqs.map((faq, index) => (
                            <details
                                key={index}
                                className="group bg-slate-800/50 rounded-lg border border-slate-700"
                            >
                                <summary className="flex justify-between items-center cursor-pointer p-4 text-white font-medium hover:bg-slate-700/50 transition-colors rounded-lg">
                                    {faq.question}
                                    <span className="ml-2 text-wurkzi-400 group-open:rotate-180 transition-transform">
                                        ▼
                                    </span>
                                </summary>
                                <p className="p-4 pt-0 text-slate-400">{faq.answer}</p>
                            </details>
                        ))}
                    </div>
                </div>

                {/* Contact Form Section */}
                <div className="bg-slate-900/50 backdrop-blur-md rounded-2xl p-8 border border-slate-700 shadow-xl">
                    <h2 className="text-2xl font-semibold mb-6 text-white">
                        Contact Us
                    </h2>

                    {submitted ? (
                        <div className="text-center py-8">
                            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-500/20 mb-4">
                                <svg
                                    className="w-8 h-8 text-green-500"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M5 13l4 4L19 7"
                                    />
                                </svg>
                            </div>
                            <h3 className="text-xl font-semibold text-white mb-2">
                                Message Sent!
                            </h3>
                            <p className="text-slate-400 mb-4">
                                Thank you for reaching out. We'll get back to you within 24-48
                                hours.
                            </p>
                            <button
                                onClick={() => {
                                    setSubmitted(false);
                                    setFormData({ name: "", email: "", subject: "", message: "" });
                                }}
                                className="text-wurkzi-400 hover:text-wurkzi-300 underline"
                            >
                                Send another message
                            </button>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label
                                        htmlFor="name"
                                        className="block text-sm font-medium text-slate-300 mb-2"
                                    >
                                        Your Name
                                    </label>
                                    <input
                                        type="text"
                                        id="name"
                                        name="name"
                                        value={formData.name}
                                        onChange={handleChange}
                                        required
                                        className="w-full px-4 py-3 bg-slate-800 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-wurkzi-400 focus:border-transparent transition-all"
                                        placeholder="John Doe"
                                    />
                                </div>
                                <div>
                                    <label
                                        htmlFor="email"
                                        className="block text-sm font-medium text-slate-300 mb-2"
                                    >
                                        Email Address
                                    </label>
                                    <input
                                        type="email"
                                        id="email"
                                        name="email"
                                        value={formData.email}
                                        onChange={handleChange}
                                        required
                                        className="w-full px-4 py-3 bg-slate-800 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-wurkzi-400 focus:border-transparent transition-all"
                                        placeholder="john@example.com"
                                    />
                                </div>
                            </div>

                            <div>
                                <label
                                    htmlFor="subject"
                                    className="block text-sm font-medium text-slate-300 mb-2"
                                >
                                    Subject
                                </label>
                                <select
                                    id="subject"
                                    name="subject"
                                    value={formData.subject}
                                    onChange={handleChange}
                                    required
                                    className="w-full px-4 py-3 bg-slate-800 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-wurkzi-400 focus:border-transparent transition-all"
                                >
                                    <option value="">Select a topic</option>
                                    <option value="report">Report Abuse / Objectionable Content</option>
                                    <option value="account">Account Issues</option>
                                    <option value="payment">Payment Questions</option>
                                    <option value="job">Job Related</option>
                                    <option value="technical">Technical Support</option>
                                    <option value="feedback">Feedback / Suggestions</option>
                                    <option value="other">Other</option>
                                </select>
                            </div>

                            <div>
                                <label
                                    htmlFor="message"
                                    className="block text-sm font-medium text-slate-300 mb-2"
                                >
                                    Message
                                </label>
                                <textarea
                                    id="message"
                                    name="message"
                                    value={formData.message}
                                    onChange={handleChange}
                                    required
                                    rows={5}
                                    className="w-full px-4 py-3 bg-slate-800 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-wurkzi-400 focus:border-transparent transition-all resize-none"
                                    placeholder="Please describe your issue or question in detail..."
                                />
                            </div>

                            <button
                                type="submit"
                                className="w-full py-3 px-6 bg-gradient-to-r from-wurkzi-500 to-wurkzi-600 hover:from-wurkzi-600 hover:to-wurkzi-700 text-white font-semibold rounded-lg shadow-lg shadow-wurkzi-500/25 transition-all duration-300 transform hover:scale-[1.02]"
                            >
                                Send Message
                            </button>
                        </form>
                    )}

                    <div className="mt-8 pt-6 border-t border-slate-700">
                        <p className="text-slate-400 text-sm text-center">
                            You can also reach us directly at{" "}
                            <a
                                href="mailto:support@wurkzi.com"
                                className="text-wurkzi-400 hover:text-wurkzi-300 underline"
                            >
                                support@wurkzi.com
                            </a>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Support;

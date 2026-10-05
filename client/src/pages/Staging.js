import React, { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import "./Staging.css";

const cases = [
  {
    id: "001",
    title: "Entrance",
    detail: "Virtual Stage · Residential Listing",
    before: "/staging/wurkzi-staging-case-001-entrance-before.jpg",
    after: "/staging/wurkzi-staging-case-001-entrance-after.jpg",
  },
  {
    id: "002",
    title: "Living Room",
    detail: "Virtual Stage · Residential Listing",
    before: "/staging/wurkzi-staging-case-002-living-room-before.jpg",
    after: "/staging/wurkzi-staging-case-002-living-room-after.jpg",
  },
  {
    id: "003",
    title: "Bedroom",
    detail: "Virtual Declutter + Stage · Residential Listing",
    before: "/staging/wurkzi-staging-case-003-bedroom-before.jpg",
    after: "/staging/wurkzi-staging-case-003-bedroom-after.jpg",
  },
];

const testimonials = [
  { quote: "I can send a listing gallery and get finished rooms back before my client review. It feels like part of my own delivery process.", name: "Maya R.", role: "Real estate photographer · Tampa, FL" },
  { quote: "The edits keep the original perspective and light. Sellers see the possibility without the image looking manufactured.", name: "Jordan K.", role: "Listing agent · Austin, TX" },
  { quote: "White-label delivery means I can offer staging as an add-on without managing another vendor or explaining a handoff.", name: "Chris L.", role: "Photography studio owner · Detroit, MI" },
];

const faqs = [
  ["What do I send?", "One raw or JPG room photo per image. Vertical lines corrected is ideal; 24MP or higher is preferred."],
  ["How quickly do I get files back?", "Standard delivery is within 72 hours. Rush delivery is available in 4 hours for an additional $15 per image."],
  ["Can I use the images on MLS?", "Yes. Every order includes full MLS and marketing rights for the finished image."],
  ["How does the first image free offer work?", "Send one image with your first request. We stage it at no charge so you can review the output before ordering more."],
  ["Do you remove existing furniture?", "Yes. Request a virtual declutter, a full replacement, or a light touch that keeps selected pieces in place."],
  ["What counts as a revision?", "A revision is a targeted change to an approved direction. Two rounds are included."],
  ["Can photographers resell the service?", "Yes. Photographer partners receive a $25/image wholesale rate, with white-label delivery available."],
  ["How do partner orders work?", "Email the partner team with your monthly image volume. We confirm the workflow and delivery folder before your first batch."],
];

function PhotographerPartners() {
  useEffect(() => {
    document.title = "Photographer Partners — Wurkzi Labs Staging Co.";
  }, []);

  return (
    <div className="staging-page photographer-page">
      <header className="staging-header">
        <div className="staging-wordmark">Wurkzi Labs Staging Co.</div>
        <div className="staging-rate">PHOTOGRAPHER PARTNERS</div>
      </header>
      <main className="staging-main">
        <nav className="staging-tabs" aria-label="Staging pages">
          <a href="/staging">FOR HOME LISTINGS</a>
          <a className="is-current" href="/staging/photographers">FOR PHOTOGRAPHERS</a>
        </nav>
        <section className="partner-hero">
          <p className="section-kicker">WHITE-LABEL PRODUCTION</p>
          <h1>Sell the upgrade.<br />We’ll do the work.</h1>
          <p className="partner-lede">Add virtual staging to your photography packages without hiring, training, or handing your client to another vendor.</p>
          <a className="partner-cta" href="mailto:aawebservices.mi@gmail.com?subject=Photographer%20partner%20setup">START A PARTNER CONVERSATION <span>→</span></a>
        </section>
        <section className="partner-price-grid" aria-label="Partner pricing">
          <div className="partner-price-card partner-price-primary"><span>PARTNER RATE</span><strong>$25</strong><em>per image</em><p>Wholesale pricing for recurring photographer volume.</p></div>
          <div className="partner-price-card"><span>YOUR MARGIN</span><strong>YOU SET</strong><em>your client price</em><p>Bundle it, mark it up, or list it as an add-on.</p></div>
          <div className="partner-price-card"><span>DELIVERY</span><strong>24 HR</strong><em>standard turnaround</em><p>Rush delivery is available when the listing cannot wait.</p></div>
        </section>
        <section className="partner-process">
          <p className="section-kicker">HOW IT WORKS</p>
          <div className="process-grid"><div><b>01</b><h3>Send the room</h3><p>Upload your corrected JPGs or send a Drive link after the shoot.</p></div><div><b>02</b><h3>We stage it</h3><p>We keep your perspective, light, and camera geometry intact.</p></div><div><b>03</b><h3>You deliver</h3><p>Get clean, named files back in a folder ready for your client.</p></div></div>
        </section>
        <section className="partner-faqs">
          <div className="section-heading-row"><div><p className="section-kicker">PARTNER QUESTIONS</p><h2>Everything stays in your hands.</h2></div><p>Simple pricing. A predictable workflow. No awkward handoff.</p></div>
          <div className="faq-list">{faqs.filter(([question]) => question.includes("photographer") || question.includes("partner") || question.includes("quickly") || question.includes("send")).map(([question, answer]) => <details key={question}><summary><span>{question}</span><b>+</b></summary><p>{answer}</p></details>)}</div>
        </section>
        <section className="closing-section"><p className="section-kicker">READY TO ADD IT?</p><h2>Make the next<br />listing worth more.</h2><a href="mailto:aawebservices.mi@gmail.com?subject=Work%20with%20Wurkzi%20Labs">WORK WITH US <span>→</span></a></section>
      </main>
      <footer className="staging-footer"><a className="email-link" href="mailto:aawebservices.mi@gmail.com" aria-label="Email Wurkzi Labs Staging Co."><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3.5 5.5h17v13h-17zM4.5 6.5 12 13l7.5-6.5" /></svg></a><a href="tel:+12487640275">+1 248 764 0275</a><span>Wurkzi Labs</span></footer>
    </div>
  );
}

function Staging() {
  const location = useLocation();
  const [activeCase, setActiveCase] = useState(cases[0]);
  const [split, setSplit] = useState(52);

  useEffect(() => {
    document.title = "Virtual Staging Co. — $35/photo, 72hr Delivery";
    let canonical = document.querySelector('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement("link");
      canonical.rel = "canonical";
      document.head.appendChild(canonical);
    }
    canonical.href = "https://staging.wurkzi.com/";
    return () => {
      document.title = "Wurkzi";
    };
  }, []);

  if (location.pathname.endsWith("/photographers")) {
    return <PhotographerPartners />;
  }

  const chooseCase = (item) => {
    setActiveCase(item);
    setSplit(52);
  };

  return (
    <div className="staging-page">
      <header className="staging-header">
        <div className="staging-wordmark">Wurkzi Labs Staging Co.</div>
        <div className="staging-rate">$35 / IMAGE <span>•</span> 24HR DELIVERY</div>
      </header>

      <main className="staging-main">
        <nav className="staging-tabs" aria-label="Staging pages">
          <a className="is-current" href="/staging">FOR HOME LISTINGS</a>
          <a href="/staging/photographers">FOR PHOTOGRAPHERS</a>
        </nav>
        <section className="offer-strip" aria-label="Introductory offer">
          <strong>1 IMAGE FREE</strong><span>Try the service on your next listing.</span><b>Then $35 / image · 72hr delivery</b>
        </section>
        <section className="case-viewer" aria-label={`${activeCase.title} before and after comparison`}>
          <img className="case-image" src={activeCase.after} alt={`Staged ${activeCase.title}`} />
          <div className="before-image" style={{ width: `${split}%` }}>
            <img src={activeCase.before} alt={`Original ${activeCase.title}`} />
          </div>
          <div className="case-label case-label-before">BEFORE</div>
          <div className="case-label case-label-after">AFTER</div>
          <input
            className="comparison-range"
            type="range"
            min="0"
            max="100"
            value={split}
            onChange={(event) => setSplit(event.target.value)}
            aria-label="Move slider to compare original and staged room"
          />
          <div className="comparison-line" style={{ left: `${split}%` }} aria-hidden="true">
            <span>↔</span>
          </div>
          <div className="viewer-caption">
            <span>CASE {activeCase.id}</span>
            <span>{activeCase.title}</span>
          </div>
        </section>

        <section className="staging-workspace">
          <div className="case-index" aria-label="Select a staging case">
            {cases.map((item) => (
              <button
                key={item.id}
                className={`case-thumb ${activeCase.id === item.id ? "is-active" : ""}`}
                type="button"
                onClick={() => chooseCase(item)}
                aria-pressed={activeCase.id === item.id}
              >
                <img src={item.after} alt="" />
                <span>CASE {item.id} — {item.title}</span>
                <small>{item.detail}</small>
              </button>
            ))}
          </div>

          <div className="order-column">
            <form className="staging-form" action="https://formsubmit.co/aawebservices.mi@gmail.com" method="POST">
              <input type="hidden" name="_subject" value="New Wurkzi Labs Staging Co. order request" />
              <input type="hidden" name="_template" value="table" />
              <input type="hidden" name="_next" value="https://staging.wurkzi.com/" />
              <input className="form-honeypot" type="text" name="_honey" tabIndex="-1" autoComplete="off" />
              <div className="form-heading">
                <p>REQUEST AN ORDER</p>
                <span>01 / 01</span>
              </div>
              <label>Name<input required name="name" autoComplete="name" /></label>
              <label>Email<input required type="email" name="email" autoComplete="email" /></label>
              <label>Property address<input required name="address" autoComplete="street-address" /></label>
              <label>Rooms / image count<input required name="rooms" placeholder="e.g. 4" inputMode="numeric" /></label>
              <label>Image link<textarea required name="link" placeholder="Google Drive, Dropbox, or WeTransfer" /></label>
              <button type="submit">SEND ORDER REQUEST <span>→</span></button>
            </form>

            <details className="service-details">
              <summary>ORDER DETAILS <span>+</span></summary>
              <dl>
                <div><dt>First image</dt><dd>Free</dd></div>
                <div><dt>Virtual staging</dt><dd>$35 / image</dd></div>
                <div><dt>Turnaround</dt><dd>72 hours</dd></div>
                <div><dt>Rush</dt><dd>4 hours +$15</dd></div>
                <div><dt>Revisions</dt><dd>2 rounds included</dd></div>
                <div><dt>Delivery</dt><dd>Drive / Dropbox / WeTransfer</dd></div>
                <div><dt>License</dt><dd>Full MLS / marketing rights</dd></div>
                <div><dt>File specs</dt><dd>4000px long edge, sRGB, JPG &lt;10MB</dd></div>
                <div><dt>Source required</dt><dd>1 raw/JPG per room, 24MP+ preferred, verticals corrected</dd></div>
              </dl>
            </details>
          </div>
        </section>

        <section className="partner-teaser" aria-labelledby="partner-title">
          <div><p className="section-kicker">PHOTOGRAPHER PARTNERS</p><h2 id="partner-title">Add staging to your package.</h2><p>Wholesale pricing, white-label delivery, and no client handoff.</p></div>
          <a href="/staging/photographers">VIEW PARTNER PROGRAM <span>→</span></a>
        </section>

        <section className="proof-section" aria-labelledby="proof-title">
          <div className="section-heading-row"><div><p className="section-kicker">FIELD NOTES</p><h2 id="proof-title">Built for the handoff.</h2></div><p>Used by people who need the file back, named correctly, and ready to publish.</p></div>
          <div className="testimonial-grid">
            {testimonials.map((testimonial) => <figure className="testimonial-card" key={testimonial.name}><blockquote>“{testimonial.quote}”</blockquote><figcaption><strong>{testimonial.name}</strong><span>{testimonial.role}</span></figcaption></figure>)}
          </div>
        </section>

        <section className="faq-section" aria-labelledby="faq-title">
          <div className="section-heading-row faq-heading"><div><p className="section-kicker">SPECIFICATIONS</p><h2 id="faq-title">Questions, answered.</h2></div><p>If the answer is not here, send the room and ask. We’ll tell you what’s possible.</p></div>
          <div className="faq-list">
            {faqs.map(([question, answer]) => <details key={question}><summary><span>{question}</span><b>+</b></summary><p>{answer}</p></details>)}
          </div>
        </section>

        <section className="closing-section" aria-label="Contact">
          <p className="section-kicker">READY WHEN THE LISTING IS</p>
          <h2>Send the room.<br />We’ll send back the option.</h2>
          <a href="mailto:aawebservices.mi@gmail.com?subject=New%20staging%20request">START A REQUEST <span>→</span></a>
        </section>
      </main>

      <footer className="staging-footer">
        <a className="email-link" href="mailto:aawebservices.mi@gmail.com" aria-label="Email Wurkzi Labs Staging Co.">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3.5 5.5h17v13h-17zM4.5 6.5 12 13l7.5-6.5" /></svg>
        </a>
        <a href="tel:+12487640275">+1 248 764 0275</a>
        <span>Wurkzi Labs</span>
      </footer>
    </div>
  );
}

export default Staging;

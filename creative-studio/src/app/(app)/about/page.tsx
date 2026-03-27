"use client";

import { useState, useEffect, useRef } from "react";

// Hook: trigger animation when element scrolls into view
function useInView(threshold = 0.15) {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setInView(true); obs.unobserve(el); } },
      { threshold }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return { ref, inView };
}

function FadeIn({ children, delay = 0, className = "" }: { children: React.ReactNode; delay?: number; className?: string }) {
  const { ref, inView } = useInView();
  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: inView ? 1 : 0,
        transform: inView ? "translateY(0)" : "translateY(24px)",
        transition: `opacity 0.6s ease ${delay}s, transform 0.6s ease ${delay}s`,
      }}
    >
      {children}
    </div>
  );
}

// Animated counter
function Counter({ target, suffix = "", prefix = "" }: { target: string; suffix?: string; prefix?: string }) {
  const { ref, inView } = useInView();
  const [display, setDisplay] = useState(prefix + "0" + suffix);
  useEffect(() => {
    if (!inView) return;
    // Parse numeric portion
    const num = parseFloat(target.replace(/[^0-9.]/g, ""));
    if (isNaN(num)) { setDisplay(prefix + target + suffix); return; }
    const isDecimal = target.includes(".");
    const duration = 1200;
    const start = performance.now();
    const animate = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
      const current = num * eased;
      setDisplay(prefix + (isDecimal ? current.toFixed(0) : Math.round(current).toString()) + suffix);
      if (progress < 1) requestAnimationFrame(animate);
      else setDisplay(prefix + target + suffix);
    };
    requestAnimationFrame(animate);
  }, [inView, target, suffix, prefix]);
  return <span ref={ref}>{display}</span>;
}

// FAQ accordion item
function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-gray-200">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between py-5 text-left group"
      >
        <span className="font-semibold text-gray-900 text-sm pr-4 group-hover:text-violet-600 transition-colors">{q}</span>
        <svg
          className={`w-5 h-5 text-gray-400 flex-shrink-0 transition-transform duration-300 ${open ? "rotate-180" : ""}`}
          fill="none" stroke="currentColor" viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      <div
        className="overflow-hidden transition-all duration-300"
        style={{ maxHeight: open ? "300px" : "0", opacity: open ? 1 : 0 }}
      >
        <p className="text-sm text-gray-500 leading-relaxed pb-5">{a}</p>
      </div>
    </div>
  );
}

export default function AboutPage() {
  // Scratch demo animation state
  const [scratchPhase, setScratchPhase] = useState<"idle" | "scratching" | "won">("idle");
  useEffect(() => {
    const cycle = () => {
      setScratchPhase("idle");
      const t1 = setTimeout(() => setScratchPhase("scratching"), 2500);
      const t2 = setTimeout(() => setScratchPhase("won"), 4500);
      const t3 = setTimeout(() => cycle(), 8000);
      return [t1, t2, t3];
    };
    const timers = cycle();
    return () => timers.forEach(clearTimeout);
  }, []);

  return (
    <div className="bg-slate-50 min-h-screen">
      {/* ───────── HERO ───────── */}
      <section className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-indigo-800 to-violet-600 text-white">
        {/* Animated background blobs */}
        <div className="absolute inset-0 opacity-20 pointer-events-none">
          <div className="absolute top-10 left-10 w-80 h-80 bg-violet-400 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-indigo-300 rounded-full blur-3xl" style={{ animation: "pulse 4s ease-in-out infinite alternate" }} />
          <div className="absolute top-1/2 left-1/3 w-60 h-60 bg-amber-300 rounded-full blur-3xl" style={{ animation: "pulse 5s ease-in-out 1s infinite alternate" }} />
        </div>
        <div className="max-w-[1200px] mx-auto px-6 py-24 lg:py-32 relative z-10">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <FadeIn>
                <div className="inline-flex items-center gap-2 bg-white/10 border border-white/20 rounded-full px-4 py-1.5 text-sm font-bold text-violet-200 mb-8 backdrop-blur-sm">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  The Ad People Actually Want to Play
                </div>
              </FadeIn>
              <FadeIn delay={0.1}>
                <h1 className="text-4xl lg:text-5xl xl:text-6xl font-extrabold leading-tight mb-8">
                  Mobile Ads That Feel Like{" "}
                  <span className="bg-gradient-to-r from-amber-300 to-amber-400 bg-clip-text text-transparent">Winning</span>
                </h1>
              </FadeIn>
              <FadeIn delay={0.2}>
                <p className="text-lg text-violet-100/90 leading-relaxed mb-10 max-w-lg">
                  SkratchAds&#8482; is the world's first voluntary scratch-off ad format. Users scratch for a chance to win real prizes. Publishers earn 10x more. Advertisers get qualified, opt-in leads. Privacy-compliant by design, zero user tracking required.
                </p>
              </FadeIn>
              <FadeIn delay={0.3}>
                <div className="flex flex-wrap gap-2 mb-10">
                  {["Cost-Per-Scratch", "$8-20 eCPM", "~20% Scratch Rate", "Real Prizes", "Privacy-First"].map((tag) => (
                    <span key={tag} className="bg-white/10 border border-white/15 rounded-full px-3.5 py-1.5 text-sm font-medium backdrop-blur-sm">{tag}</span>
                  ))}
                </div>
              </FadeIn>
              <FadeIn delay={0.4}>
                <div className="flex flex-wrap gap-4">
                  <a
                    href="mailto:hello@skratchads.com?subject=Get%20Started%20with%20SkratchAds"
                    className="inline-flex items-center gap-2 bg-white text-indigo-700 font-bold px-8 py-3.5 rounded-xl hover:bg-violet-50 transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5"
                  >
                    Get Started Free
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
                  </a>
                  <a
                    href="#how-it-works"
                    className="inline-flex items-center gap-2 border border-white/30 text-white font-semibold px-7 py-3.5 rounded-xl hover:bg-white/10 transition-all backdrop-blur-sm"
                  >
                    See How It Works
                  </a>
                </div>
              </FadeIn>
            </div>

            {/* Animated Phone Mockup */}
            <div className="hidden lg:flex justify-center items-center">
              <FadeIn delay={0.3}>
                <div className="relative">
                  {/* Glow ring */}
                  <div className="absolute -inset-4 rounded-[3.5rem] bg-gradient-to-br from-violet-400/30 to-amber-400/20 blur-xl" />
                  <div className="relative w-[300px] h-[650px] rounded-[3rem] border-[6px] border-slate-700/80 shadow-2xl overflow-hidden bg-white flex flex-col">
                    {/* Notch */}
                    <div className="relative bg-gradient-to-br from-violet-500 to-violet-400">
                      <div className="w-28 h-7 bg-black rounded-b-2xl mx-auto" />
                    </div>
                    {/* Header */}
                    <div className="bg-gradient-to-br from-violet-500 to-violet-400 px-6 pt-5 pb-10 text-center">
                      <p className="text-white font-bold text-xl italic tracking-wide">SkratchAds&#8482;</p>
                      <p className="text-violet-200 text-xs mt-1">Live Demo</p>
                    </div>
                    {/* Content area */}
                    <div className="bg-white px-6 pt-8 pb-6 flex-1 flex flex-col">
                      {/* Scratch card area */}
                      <div
                        className={`relative rounded-2xl overflow-hidden mb-6 transition-all duration-700 ${
                          scratchPhase === "won"
                            ? "bg-gradient-to-br from-emerald-400 to-emerald-500 shadow-lg shadow-emerald-200"
                            : "bg-gradient-to-r from-violet-400 via-amber-400 to-amber-500 shadow-md"
                        }`}
                        style={{ minHeight: "120px" }}
                      >
                        {scratchPhase === "idle" && (
                          <div className="flex flex-col items-center justify-center py-8 px-4">
                            <svg className="w-8 h-8 text-white mb-2 animate-bounce" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 11.5V14m0-2.5v-6a1.5 1.5 0 113 0m-3 6a1.5 1.5 0 00-3 0v2a7.5 7.5 0 0015 0v-5a1.5 1.5 0 00-3 0m-6-3V11m0-5.5v-1a1.5 1.5 0 013 0v1m0 0V11m0-5.5a1.5 1.5 0 013 0v3m0 0V11" /></svg>
                            <span className="text-white font-bold text-lg">Scratch to Win!</span>
                            <span className="text-white/70 text-xs mt-1">Tap to reveal your prize</span>
                          </div>
                        )}
                        {scratchPhase === "scratching" && (
                          <div className="flex flex-col items-center justify-center py-8 px-4">
                            <div className="w-10 h-10 border-4 border-white/30 border-t-white rounded-full animate-spin mb-3" />
                            <span className="text-white font-bold">Scratching...</span>
                          </div>
                        )}
                        {scratchPhase === "won" && (
                          <div className="flex flex-col items-center justify-center py-8 px-4">
                            <span className="text-3xl mb-1">&#127881;</span>
                            <span className="text-white font-extrabold text-lg">You Won!</span>
                            <span className="text-white/80 text-xs mt-1">Free $5 Gift Card</span>
                          </div>
                        )}
                      </div>

                      {/* Fake email capture (won state) */}
                      {scratchPhase === "won" && (
                        <div className="space-y-2 mb-4 animate-fadeIn">
                          <div className="bg-gray-100 rounded-lg py-2.5 px-3 text-xs text-gray-400">Enter your email to claim...</div>
                          <div className="bg-emerald-500 text-white text-center rounded-lg py-2.5 text-xs font-bold">Claim Prize</div>
                        </div>
                      )}

                      <p className="text-gray-400 text-xs leading-relaxed mt-auto">
                        {scratchPhase === "won"
                          ? "100% opt-in lead captured."
                          : "Tap the banner to scratch and reveal your prize."}
                      </p>
                    </div>
                    {/* Home indicator */}
                    <div className="bg-white pb-3 pt-1">
                      <div className="w-28 h-1.5 bg-gray-200 rounded-full mx-auto" />
                    </div>
                  </div>
                </div>
              </FadeIn>
            </div>
          </div>
        </div>
      </section>

      {/* ───────── THE PROBLEM ───────── */}
      <section className="max-w-[1200px] mx-auto px-6 py-20">
        <FadeIn>
          <span className="inline-block text-xs font-bold tracking-wider uppercase text-red-500 bg-red-50 px-3 py-1.5 rounded-full mb-4">The Problem</span>
          <h2 className="text-3xl font-bold text-gray-900 mb-4">Banner Ads Are Broken</h2>
          <p className="text-gray-500 max-w-xl leading-relaxed mb-12">Users ignore them. Publishers earn pennies. Advertisers waste budgets on impressions nobody sees.</p>
        </FadeIn>
        <div className="grid md:grid-cols-3 gap-6">
          {[
            { icon: "\uD83D\uDE36", title: "Banner Blindness", desc: "Over 86% of users never look at standard banner ads. They're trained to ignore them. It's unconscious.", stat: "86%", statLabel: "ignored" },
            { icon: "\uD83D\uDCB8", title: "Rock Bottom eCPMs", desc: "Standard banners pay $0.50-$2 eCPM. Publishers are leaving 10x money on the table every single day.", stat: "$0.50", statLabel: "avg eCPM" },
            { icon: "\uD83D\uDE24", title: "Intrusive Interstitials", desc: "Pop-ups and full-screens destroy user experience and tank app store ratings. Nobody wins.", stat: "1-star", statLabel: "reviews" },
          ].map((card, i) => (
            <FadeIn key={card.title} delay={i * 0.1}>
              <div className="bg-white rounded-2xl border border-gray-100 p-8 hover:shadow-lg transition-all hover:-translate-y-1 group h-full">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-3xl">{card.icon}</span>
                  <span className="text-xs font-bold text-red-400 bg-red-50 px-2.5 py-1 rounded-full">{card.stat} {card.statLabel}</span>
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-3 group-hover:text-red-600 transition-colors">{card.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{card.desc}</p>
              </div>
            </FadeIn>
          ))}
        </div>
      </section>

      {/* ───────── COMPARISON TABLE ───────── */}
      <section className="bg-white border-y border-gray-100">
        <div className="max-w-[1200px] mx-auto px-6 py-20">
          <FadeIn>
            <div className="text-center mb-14">
              <span className="inline-block text-xs font-bold tracking-wider uppercase text-violet-500 bg-violet-50 px-3 py-1.5 rounded-full mb-4">Side by Side</span>
              <h2 className="text-3xl font-bold text-gray-900 mb-4">Standard Banners vs. SkratchAds&#8482;</h2>
              <p className="text-gray-500 max-w-xl mx-auto leading-relaxed">Not a marginal improvement. A fundamentally different ad experience.</p>
            </div>
          </FadeIn>
          <FadeIn delay={0.1}>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b-2 border-gray-200">
                    <th className="text-left py-4 pr-6 font-semibold text-gray-500 w-1/3">Metric</th>
                    <th className="text-center py-4 px-6 font-semibold text-gray-400 w-1/3">Standard Banner</th>
                    <th className="text-center py-4 pl-6 font-semibold text-violet-600 w-1/3">SkratchAds&#8482;</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    ["Click-Through Rate", "0.05 - 0.56%", "5 - 10%"],
                    ["Publisher eCPM", "$0.50 - $2.00", "$8 - $20"],
                    ["Revenue Share", "30 - 50%", "70%"],
                    ["User Engagement", "Passive impression", "Active scratch (3-5 sec)"],
                    ["Lead Quality", "Cookie-based, decaying", "100% opt-in email"],
                    ["Privacy Compliance", "Requires tracking", "Zero tracking needed"],
                    ["Time to Launch", "Weeks", "24 hours"],
                    ["User Sentiment", "Annoyed", "Entertained"],
                  ].map(([metric, standard, skratch], i) => (
                    <tr key={metric} className={`border-b border-gray-100 ${i % 2 === 0 ? "bg-gray-50/50" : ""}`}>
                      <td className="py-4 pr-6 font-medium text-gray-900">{metric}</td>
                      <td className="py-4 px-6 text-center text-gray-400">{standard}</td>
                      <td className="py-4 pl-6 text-center font-semibold text-violet-600">{skratch}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ───────── HOW IT WORKS ───────── */}
      <section id="how-it-works" className="max-w-[1200px] mx-auto px-6 py-20">
        <FadeIn>
          <span className="inline-block text-xs font-bold tracking-wider uppercase text-violet-500 bg-violet-50 px-3 py-1.5 rounded-full mb-4">How It Works</span>
          <h2 className="text-3xl font-bold text-gray-900 mb-4">Scratch. Win. Repeat.</h2>
          <p className="text-gray-500 max-w-2xl leading-relaxed mb-14">The world's first gamified banner: banner-sized, non-intrusive, and built around a mechanic users actually want to play.</p>
        </FadeIn>

        {/* 5-Step Flow with connecting line */}
        <div className="relative">
          {/* Connecting line (hidden on mobile) */}
          <div className="hidden md:block absolute top-6 left-[10%] right-[10%] h-0.5 bg-gradient-to-r from-violet-200 via-amber-200 via-emerald-200 to-violet-200" />
          <div className="grid grid-cols-2 md:grid-cols-5 gap-8">
            {[
              { num: "1", title: "Ad Appears", desc: "A polite, banner-sized gamified ad invites the user to scratch for a chance to win.", color: "bg-violet-500", ring: "ring-violet-100" },
              { num: "2", title: "User Scratches", desc: "A 3-5 second voluntary gesture. Users choose to scratch because a real prize is possible.", color: "bg-amber-500", ring: "ring-amber-100" },
              { num: "3", title: "Win Path", desc: "A real prize is revealed: gift cards, discounts, exclusive offers. The advertiser earns a warm lead.", color: "bg-emerald-500", ring: "ring-emerald-100" },
              { num: "4", title: "Lose Path", desc: "Non-winners see a primed brand message. Near-miss effect delivers 5-10x CTR uplift.", color: "bg-slate-700", ring: "ring-slate-200" },
              { num: "5", title: "Redeem", desc: "The user enters their email to claim their prize. A fully opted-in, qualified lead.", color: "bg-violet-500", ring: "ring-violet-100" },
            ].map((step, i) => (
              <FadeIn key={step.num} delay={i * 0.08}>
                <div className="flex flex-col items-center text-center relative">
                  <div className={`w-12 h-12 ${step.color} text-white rounded-full flex items-center justify-center font-bold text-lg mb-4 shadow-md ring-4 ${step.ring} relative z-10 bg-opacity-100`}>
                    {step.num}
                  </div>
                  <h4 className="font-bold text-gray-900 text-sm mb-2">{step.title}</h4>
                  <p className="text-xs text-gray-500 leading-relaxed">{step.desc}</p>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ───────── DUAL CONVERSION ───────── */}
      <section className="bg-white border-y border-gray-100">
        <div className="max-w-[1200px] mx-auto px-6 py-20">
          <FadeIn>
            <span className="inline-block text-xs font-bold tracking-wider uppercase text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-full mb-4">Dual Conversion</span>
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Every Scratch Has Value</h2>
            <p className="text-gray-500 max-w-xl leading-relaxed mb-12">Users scratch for a real shot at winning. That genuine motivation makes every outcome valuable for advertisers.</p>
          </FadeIn>
          <div className="grid md:grid-cols-2 gap-8">
            <FadeIn delay={0.1}>
              <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-2xl p-10 text-white h-full hover:shadow-xl transition-shadow">
                <div className="flex items-center gap-3 mb-5">
                  <span className="text-4xl">&#x1F3C6;</span>
                  <div>
                    <h3 className="text-2xl font-bold">Win Path</h3>
                    <p className="text-emerald-200 text-sm">Prize revealed, lead captured</p>
                  </div>
                </div>
                <p className="text-emerald-100 leading-relaxed mb-6">The user scratches and reveals a real prize. To claim it, they share their email. The advertiser receives a 100% opt-in lead who is genuinely excited.</p>
                <ul className="space-y-3">
                  {["Real email capture", "Self-selected warm audience", "Primed for purchase intent"].map((item) => (
                    <li key={item} className="flex items-center gap-2 text-sm font-semibold text-emerald-50 border-t border-emerald-400/30 pt-3">
                      <svg className="w-4 h-4 text-emerald-300 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </FadeIn>
            <FadeIn delay={0.2}>
              <div className="bg-gradient-to-br from-slate-700 to-slate-800 rounded-2xl p-10 text-white h-full hover:shadow-xl transition-shadow">
                <div className="flex items-center gap-3 mb-5">
                  <span className="text-4xl">&#x2B50;</span>
                  <div>
                    <h3 className="text-2xl font-bold">Lose Path</h3>
                    <p className="text-slate-400 text-sm">Brand impression, primed click</p>
                  </div>
                </div>
                <p className="text-slate-300 leading-relaxed mb-6">The user already scratched, so they're engaged. The near-miss effect triggers focused attention and 5-10x higher click intent on the brand reveal.</p>
                <ul className="space-y-3">
                  {["Near-miss effect drives primed click intent", "Zero banner blindness", "Highest-attention ad moment"].map((item) => (
                    <li key={item} className="flex items-center gap-2 text-sm font-semibold text-slate-200 border-t border-slate-600/50 pt-3">
                      <svg className="w-4 h-4 text-amber-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </FadeIn>
          </div>
        </div>
      </section>

      {/* ───────── STATS ROW ───────── */}
      <section className="max-w-[1200px] mx-auto px-6 py-16">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {[
            { num: "10", suffix: "x", label: "Higher CTR vs standard banners", color: "text-violet-500" },
            { prefix: "$", num: "8-20", suffix: "", label: "eCPM earned by publishers", color: "text-emerald-500" },
            { num: "70", suffix: "%", label: "Revenue share to publishers", color: "text-amber-500" },
            { num: "24", suffix: " hrs", label: "Signup to first live campaign", color: "text-slate-600" },
          ].map((s) => (
            <FadeIn key={s.label}>
              <div className="text-center py-6 bg-white rounded-2xl border border-gray-100 hover:shadow-md transition-shadow">
                <div className={`text-4xl font-extrabold mb-2 ${s.color}`}>
                  <Counter target={s.num} suffix={s.suffix} prefix={s.prefix || ""} />
                </div>
                <p className="text-sm text-gray-500 font-medium px-4">{s.label}</p>
              </div>
            </FadeIn>
          ))}
        </div>
      </section>

      {/* ───────── ENGAGEMENT METRICS ───────── */}
      <section className="bg-white border-y border-gray-100">
        <div className="max-w-[1200px] mx-auto px-6 py-20">
          <FadeIn>
            <span className="inline-block text-xs font-bold tracking-wider uppercase text-violet-500 bg-violet-50 px-3 py-1.5 rounded-full mb-4">Engagement Metrics</span>
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Numbers Standard Banners Can't Touch</h2>
            <p className="text-gray-500 max-w-2xl leading-relaxed mb-12">Every metric SkratchAds&#8482; generates is a direct result of voluntary, active engagement. No passive impressions, no inflated counts.</p>
          </FadeIn>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { big: "~20%", name: "Scratch-Through Rate", desc: "1 in 5 users who see the banner choose to scratch, completely voluntarily.", vs: "vs. 0.56% standard banner CTR" },
              { big: "10x", name: "CTR Uplift", desc: "Post-scratch click-through rate is 10x higher than a cold banner impression.", vs: "vs. industry average 0.56%" },
              { big: "$8-20", name: "Publisher eCPM", desc: "Target eCPM for US Tier 1 traffic, up to 13x what standard banners earn.", vs: "vs. $0.50-$1.50 AdMob banner" },
              { big: "5-10x", name: "Lose Path CTR Uplift", desc: "The near-miss effect keeps attention primed. Even non-winners click at higher rates.", vs: "Zero wasted impressions" },
              { big: "100%", name: "Opt-In Lead Quality", desc: "Every email captured on the win path is fully consent-based.", vs: "vs. scraped or passive data" },
              { big: "24 hrs", name: "Time to Live", desc: "From signup to your first live campaign. Integration is a single JS tag.", vs: "vs. weeks for standard ad tech" },
            ].map((m, i) => (
              <FadeIn key={m.name} delay={i * 0.06}>
                <div className="bg-slate-50 rounded-2xl border border-gray-100 p-8 hover:shadow-lg transition-all hover:-translate-y-1 h-full">
                  <p className="text-3xl font-extrabold text-violet-500 mb-2">{m.big}</p>
                  <p className="font-bold text-gray-900 text-sm mb-3">{m.name}</p>
                  <p className="text-xs text-gray-500 leading-relaxed mb-4">{m.desc}</p>
                  <span className="inline-block bg-white border border-gray-200 rounded-full px-3 py-1 text-xs font-semibold text-gray-500">{m.vs}</span>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ───────── AVAILABLE FORMATS ───────── */}
      <section className="max-w-[1200px] mx-auto px-6 py-20">
        <FadeIn>
          <span className="inline-block text-xs font-bold tracking-wider uppercase text-amber-600 bg-amber-50 px-3 py-1.5 rounded-full mb-4">Available Formats</span>
          <h2 className="text-3xl font-bold text-gray-900 mb-4">One Mechanic. Multiple Placements.</h2>
          <p className="text-gray-500 max-w-2xl leading-relaxed mb-12">The SkratchAds&#8482; scratch mechanic fits any placement. Start with what's live today, scale into what's coming.</p>
        </FadeIn>
        <div className="grid md:grid-cols-3 gap-6">
          {[
            {
              status: "Live Now", statusColor: "text-emerald-600 bg-emerald-50", icon: "\uD83D\uDCF2",
              title: "Gamified Banner", desc: "A banner-sized scratch ad. Non-intrusive, edge-anchored, fully voluntary. Drop-in replacement for AdMob banners.",
              features: ["Standard banner placement (320x50, 300x250)", "JS tag integration, live in under 2 hours", "iOS & Android WebView compatible"],
              featureColor: "text-emerald-500"
            },
            {
              status: "Coming 2026", statusColor: "text-amber-600 bg-amber-50", icon: "\uD83D\uDCF1",
              title: "Native SDK", desc: "Full native iOS and Android SDKs for seamless integration into Swift and Kotlin apps. No WebView required.",
              features: ["Swift (iOS) + Kotlin (Android) native SDKs", "AdMob mediation adapter", "ironSource & MAX adapters (2027)"],
              featureColor: "text-amber-500"
            },
            {
              status: "Roadmap", statusColor: "text-gray-500 bg-gray-100", icon: "\uD83D\uDDA5\uFE0F",
              title: "Interstitial & RTB", desc: "Full-screen scratch interstitial, plus programmatic access via real-time bidding for advertisers who want scale.",
              features: ["Full-screen scratch interstitial format", "RTB auction access for advertisers (2027)", "Expanded geo targeting (US, UK, CA, AU)"],
              featureColor: "text-gray-400"
            },
          ].map((fmt, i) => (
            <FadeIn key={fmt.title} delay={i * 0.1}>
              <div className="bg-white rounded-2xl border border-gray-100 p-8 hover:shadow-lg transition-all hover:-translate-y-1 h-full">
                <span className={`inline-block text-xs font-bold tracking-wider uppercase ${fmt.statusColor} px-3 py-1.5 rounded-full mb-5`}>{fmt.status}</span>
                <div className="text-3xl mb-4">{fmt.icon}</div>
                <h3 className="text-lg font-bold text-gray-900 mb-3">{fmt.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed mb-5">{fmt.desc}</p>
                <ul className="space-y-2.5 text-sm text-gray-700 font-medium">
                  {fmt.features.map((f) => (
                    <li key={f} className="flex items-center gap-2">
                      <span className={fmt.featureColor}>&rarr;</span> {f}
                    </li>
                  ))}
                </ul>
              </div>
            </FadeIn>
          ))}
        </div>
      </section>

      {/* ───────── PUBLISHERS & ADVERTISERS ───────── */}
      <section className="bg-white border-y border-gray-100">
        <div className="max-w-[1200px] mx-auto px-6 py-20">
          <FadeIn>
            <span className="inline-block text-xs font-bold tracking-wider uppercase text-violet-500 bg-violet-50 px-3 py-1.5 rounded-full mb-4">Built For Both Sides</span>
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Publishers Love It. Advertisers Need It.</h2>
            <p className="text-gray-500 max-w-xl leading-relaxed mb-12">The only format where both parties genuinely benefit, and users actually enjoy it.</p>
          </FadeIn>
          <div className="grid md:grid-cols-2 gap-8">
            <FadeIn delay={0.1}>
              <div className="bg-gradient-to-br from-violet-50 to-white rounded-2xl border border-violet-100 p-10 h-full">
                <div className="text-3xl mb-4">&#x1F4F1;</div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">For App Publishers</h3>
                <p className="text-sm text-gray-500 mb-5">Mobile app developers & game studios</p>
                <p className="text-4xl font-extrabold text-violet-500 mb-1">$8-20</p>
                <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-6">eCPM, up to 10x standard banners</p>
                <ul className="space-y-4">
                  {[
                    { icon: "\uD83D\uDCE6", bg: "bg-violet-50", text: "Drop-in JavaScript tag, live in under 2 hours" },
                    { icon: "\uD83E\uDD1D", bg: "bg-emerald-50", text: "70% revenue share, highest in ad tech" },
                    { icon: "\uD83D\uDE0A", bg: "bg-amber-50", text: "Zero UX damage, users engage willingly" },
                    { icon: "\uD83D\uDD12", bg: "bg-gray-100", text: "Privacy-compliant by design, zero tracking" },
                  ].map((item) => (
                    <li key={item.text} className="flex items-start gap-3 text-sm text-gray-700 font-medium border-b border-gray-100 pb-4 last:border-0">
                      <span className={`w-7 h-7 rounded-lg ${item.bg} flex items-center justify-center text-xs flex-shrink-0`}>{item.icon}</span>
                      {item.text}
                    </li>
                  ))}
                </ul>
              </div>
            </FadeIn>
            <FadeIn delay={0.2}>
              <div className="bg-gradient-to-br from-emerald-50 to-white rounded-2xl border border-emerald-100 p-10 h-full">
                <div className="text-3xl mb-4">&#x1F3AF;</div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">For Advertisers</h3>
                <p className="text-sm text-gray-500 mb-5">Brands running mobile campaigns</p>
                <p className="text-4xl font-extrabold text-emerald-500 mb-1">CPS</p>
                <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-6">Cost-Per-Scratch, pay only for engagement</p>
                <ul className="space-y-4">
                  {[
                    { icon: "\uD83D\uDCE7", bg: "bg-emerald-50", text: "100% opt-in email capture on the win path" },
                    { icon: "\uD83E\uDDE0", bg: "bg-violet-50", text: "Brand impression on Lose Path, 5-10x CTR uplift" },
                    { icon: "\uD83C\uDF81", bg: "bg-amber-50", text: "Real prizes: gift cards, discounts, exclusive offers" },
                    { icon: "\uD83D\uDE80", bg: "bg-gray-100", text: "Launch a campaign in 24 hours" },
                  ].map((item) => (
                    <li key={item.text} className="flex items-start gap-3 text-sm text-gray-700 font-medium border-b border-gray-100 pb-4 last:border-0">
                      <span className={`w-7 h-7 rounded-lg ${item.bg} flex items-center justify-center text-xs flex-shrink-0`}>{item.icon}</span>
                      {item.text}
                    </li>
                  ))}
                </ul>
              </div>
            </FadeIn>
          </div>
        </div>
      </section>

      {/* ───────── CAMPAIGN EXAMPLES ───────── */}
      <section className="max-w-[1200px] mx-auto px-6 py-20">
        <FadeIn>
          <span className="inline-block text-xs font-bold tracking-wider uppercase text-amber-600 bg-amber-50 px-3 py-1.5 rounded-full mb-4">Campaign Examples</span>
          <h2 className="text-3xl font-bold text-gray-900 mb-4">A Format Built for Any Brand</h2>
          <p className="text-gray-500 max-w-xl leading-relaxed mb-12">The scratch mechanic fits any category. Here's what campaigns look like across verticals.</p>
        </FadeIn>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            { icon: "\u2615", brand: "Food & Beverage", desc: "Scratch to win a free drink or meal discount. Natural fit for F&B brands driving trial and capturing warm leads.", tag: "Lead Capture", tagColor: "text-emerald-600 bg-emerald-50", gradient: "from-amber-700 to-amber-500" },
            { icon: "\uD83C\uDFAE", brand: "Gaming", desc: "Scratch to win exclusive in-game rewards or merch. Ideal for game launches and player re-engagement.", tag: "Prize Campaign", tagColor: "text-violet-600 bg-violet-50", gradient: "from-violet-700 to-violet-400" },
            { icon: "\uD83D\uDED2", brand: "E-Commerce", desc: "Scratch to reveal discount codes or free shipping. Drives first purchase and increases AOV for online retailers.", tag: "Conversion", tagColor: "text-blue-600 bg-blue-50", gradient: "from-blue-700 to-blue-400" },
            { icon: "\uD83C\uDFB5", brand: "Entertainment", desc: "Scratch to win concert tickets, streaming credits, or early access. Perfect for launches and event promotion.", tag: "Awareness", tagColor: "text-pink-600 bg-pink-50", gradient: "from-pink-700 to-pink-400" },
          ].map((c, i) => (
            <FadeIn key={c.brand} delay={i * 0.08}>
              <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden hover:shadow-lg transition-all hover:-translate-y-1 h-full">
                <div className={`bg-gradient-to-br ${c.gradient} h-36 flex items-center justify-center`}>
                  <span className="text-5xl drop-shadow-lg">{c.icon}</span>
                </div>
                <div className="p-6">
                  <h3 className="font-bold text-gray-900 mb-2">{c.brand}</h3>
                  <p className="text-sm text-gray-500 leading-relaxed mb-4">{c.desc}</p>
                  <span className={`inline-block text-xs font-bold px-3 py-1 rounded-full ${c.tagColor}`}>{c.tag}</span>
                </div>
              </div>
            </FadeIn>
          ))}
        </div>
      </section>

      {/* ───────── BANNER BUDDY (PRODUCT TIE-IN) ───────── */}
      <section className="bg-gradient-to-br from-violet-50 to-indigo-50 border-y border-violet-100">
        <div className="max-w-[1200px] mx-auto px-6 py-20">
          <FadeIn>
            <div className="text-center mb-12">
              <span className="inline-block text-xs font-bold tracking-wider uppercase text-indigo-600 bg-indigo-100 px-3 py-1.5 rounded-full mb-4">Your Creative Tool</span>
              <h2 className="text-3xl font-bold text-gray-900 mb-4">Meet Banner Buddy</h2>
              <p className="text-gray-500 max-w-xl mx-auto leading-relaxed">The AI-powered tool you're using right now. Design, generate, and export scratch-off ad creatives in minutes, not days.</p>
            </div>
          </FadeIn>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { icon: "\uD83E\uDDE0", title: "AI-Generated Backgrounds", desc: "Describe your brand and audience. AI generates cohesive, on-brand backgrounds for all 5 banner states in one click." },
              { icon: "\uD83C\uDFA8", title: "Full Canvas Editor", desc: "Fabric.js-powered editor with drag-and-drop, text, logos, opacity controls, and per-state customization." },
              { icon: "\uD83D\uDCE6", title: "One-Click Export", desc: "Export all creative variations as a bundled ZIP with config.json, ready for SDK integration." },
            ].map((f, i) => (
              <FadeIn key={f.title} delay={i * 0.1}>
                <div className="bg-white rounded-2xl border border-violet-100 p-8 hover:shadow-lg transition-all hover:-translate-y-1 h-full">
                  <span className="text-3xl mb-4 block">{f.icon}</span>
                  <h3 className="text-lg font-bold text-gray-900 mb-3">{f.title}</h3>
                  <p className="text-sm text-gray-500 leading-relaxed">{f.desc}</p>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ───────── FAQ ───────── */}
      <section className="max-w-[800px] mx-auto px-6 py-20">
        <FadeIn>
          <div className="text-center mb-12">
            <span className="inline-block text-xs font-bold tracking-wider uppercase text-gray-500 bg-gray-100 px-3 py-1.5 rounded-full mb-4">FAQ</span>
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Common Questions</h2>
          </div>
        </FadeIn>
        <FadeIn delay={0.1}>
          <div className="bg-white rounded-2xl border border-gray-100 px-8 py-2">
            <FaqItem
              q="How does SkratchAds differ from a rewarded ad?"
              a="Rewarded ads require users to watch 15-30 seconds of video to earn in-app currency. SkratchAds is a 3-5 second voluntary scratch with a chance to win a real-world prize (gift cards, discounts, etc.). The engagement is shorter, the reward is tangible, and the ad unit lives inside a standard banner slot, not a full-screen takeover."
            />
            <FaqItem
              q="What does integration look like?"
              a="For the current JS-based format, it's a single script tag added to your app's WebView or mobile web page. Most publishers go live in under 2 hours. Native SDKs (Swift, Kotlin) with AdMob mediation adapters are on the 2026 roadmap."
            />
            <FaqItem
              q="What kind of prizes can advertisers offer?"
              a="Anything digital: gift cards, discount codes, free shipping, exclusive content, loyalty points, free trials. Advertisers set the prize, win rate, and budget. SkratchAds handles the mechanics."
            />
            <FaqItem
              q="How is user privacy handled?"
              a="SkratchAds requires zero user tracking. No cookies, no device fingerprinting, no personal data collection beyond the voluntary email on the win path. All engagement data is first-party and consent-based."
            />
            <FaqItem
              q="What is Cost-Per-Scratch (CPS)?"
              a="CPS is our pricing model. Advertisers pay only when a user actively scratches the ad, not for passive impressions. Early access pricing is $1-3 CPS, scaling to $3-8+ at volume. This means every dollar spent goes toward verified engagement."
            />
            <FaqItem
              q="What revenue share do publishers get?"
              a="70% of ad revenue goes to the publisher. This is the highest rev-share in mobile ad tech. We keep 30% for platform infrastructure, fraud prevention, and advertiser services."
            />
          </div>
        </FadeIn>
      </section>

      {/* ───────── BOTTOM CTA ───────── */}
      <section className="max-w-[1200px] mx-auto px-6 pb-20">
        <FadeIn>
          <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-14 text-center relative overflow-hidden">
            <div className="absolute top-[-80px] right-[-80px] w-72 h-72 bg-violet-500/15 rounded-full blur-2xl" />
            <div className="absolute bottom-[-60px] left-[-60px] w-56 h-56 bg-emerald-500/10 rounded-full blur-2xl" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-indigo-500/5 rounded-full blur-3xl" />
            <div className="relative z-10">
              <h2 className="text-3xl lg:text-4xl font-extrabold text-white mb-5">Ready to 10x Your Ad Revenue?</h2>
              <p className="text-slate-300 max-w-lg mx-auto mb-10 leading-relaxed">
                Join the publishers and brands already running SkratchAds&#8482;. Early access pricing: $1-3 CPS. No contracts. No commitments.
              </p>
              <div className="flex flex-wrap justify-center gap-4 mb-8">
                <a
                  href="mailto:hello@skratchads.com?subject=Get%20Started%20with%20SkratchAds"
                  className="inline-flex items-center gap-2 bg-white text-slate-800 font-bold px-8 py-3.5 rounded-xl hover:bg-violet-50 transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5"
                >
                  Get Started Free
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
                </a>
                <a
                  href="/campaign/new"
                  className="inline-flex items-center gap-2 border border-white/30 text-white font-semibold px-7 py-3.5 rounded-xl hover:bg-white/10 transition-all"
                >
                  Create Your First Banner
                </a>
              </div>
              <p className="text-slate-400 text-sm">
                Questions?{" "}
                <a href="mailto:hello@skratchads.com" className="text-slate-300 hover:text-white transition-colors">hello@skratchads.com</a>
                {" "}&middot;{" "}
                <a href="https://www.skratchads.com" className="text-slate-300 hover:text-white transition-colors" target="_blank" rel="noopener noreferrer">www.skratchads.com</a>
              </p>
            </div>
          </div>
        </FadeIn>
      </section>

      {/* Near-Miss Footnote */}
      <section className="max-w-[1200px] mx-auto px-6 pb-12">
        <p className="text-xs text-gray-400 leading-relaxed border-t border-gray-200 pt-5">
          <strong className="text-gray-500">Near-Miss Effect:</strong> A psychological phenomenon in which an outcome that falls just short of a win produces heightened arousal and sustained attention comparable to a win itself. Because the user invested effort in the scratch, their focus and emotional engagement remain fully primed, making the subsequent brand impression significantly more impactful than a passive banner view.
        </p>
      </section>

      {/* Inject fadeIn keyframe for the email capture animation */}
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeIn {
          animation: fadeIn 0.5s ease forwards;
        }
      `}</style>
    </div>
  );
}

// Shared data for every mockup — pulled from github.com/zodetron (Nov 2026).
window.HZ = {
  name: "Hardik Zode",
  handle: "zodetron",
  bio: "Turning caffeine into ML models, APIs, and questionable financial predictions.",
  github: "https://github.com/zodetron",
  since: "2023-10-28",
  stats: {
    repos: 36,
    publicRepos: 29,
    contributions: 281,
    commits: 230,
    langs: [
      ["Python", 1624], ["JavaScript", 1489], ["TypeScript", 1068], ["CSS", 196],
      ["Java", 161], ["HTML", 147], ["Kotlin", 81], ["C++", 45], ["C#", 35]
    ]
  },
  paths: [
    { id: "markets", name: "Markets & Quant",  short: "MKT", color: "#00d68f" },
    { id: "ml",      name: "Machine Learning", short: "ML",  color: "#a78bfa" },
    { id: "iot",     name: "Hardware & IoT",   short: "IOT", color: "#facc15" },
    { id: "cloud",   name: "Cloud & Backend",  short: "CLD", color: "#38bdf8" },
    { id: "ai",      name: "AI & LLMs",        short: "AI",  color: "#f472b6" },
    { id: "mobile",  name: "Mobile",           short: "MOB", color: "#2dd4bf" },
    { id: "web",     name: "Full-stack Web",   short: "WEB", color: "#fb923c" },
    { id: "quests",  name: "Side Quests",      short: "SQ",  color: "#cbd5e1" }
  ],
  projects: [
    { id: "neuralbroker", name: "NeuralBroker", ticker: "NBRK", paths: ["markets", "ml"], date: "2025-08-06", commits: 54, size: 61342, lang: "Python",
      stat: "1.5×", statLabel: "volume-spike confirmation", featured: true,
      blurb: "Auto-trading bots for BTC/USD and Indian derivatives. EMA 12/20 crossovers only fire when volume beats 1.5× its 20-period average, with stop-loss, trailing exits and a backtester.",
      stack: ["Python", "pandas", "Backtesting"], repo: "NeuralBroker" },
    { id: "fundify", name: "Fundify", ticker: "FNDY", paths: ["markets", "ml"], date: "2025-12-24", commits: 3, size: 3341, lang: "TypeScript",
      stat: "0.964", statLabel: "R² on the 3-year return model", featured: true,
      blurb: "Mutual-fund recommender for everyday investors: 789 funds across 39 AMCs, Gradient Boosting for 1- and 3-year horizons and Extra Trees for 5 years (R² 0.964 on the 3-year model), a live Nifty 50 EMA 12/21 market check, and a “what if I wait 1, 3 or 6 months?” simulator.",
      stack: ["FastAPI", "Next.js", "scikit-learn"], repo: "Fundify_MF" },
    { id: "journalx", name: "JournalX", ticker: "JRNL", paths: ["markets", "web"], date: "2026-02-11", commits: 1, size: 57, lang: "JavaScript",
      stat: "P&L", statLabel: "trade journal",
      blurb: "Full-stack trading journal inspired by Tradezella: log trades, tag setups, review P&L.",
      stack: ["MongoDB", "Express", "React", "Node"], repo: "JournalX" },
    { id: "moodsense", name: "MoodSense", ticker: "MOOD", paths: ["ml", "iot"], date: "2026-04-04", commits: 5, size: 117, lang: "JavaScript",
      stat: "5.3M", statLabel: "rows of building-energy data", featured: true,
      blurb: "Your webcam becomes a lux sensor every 200 ms. A Random Forest picks the energy-optimal brightness and drives the screen like a smart light panel.",
      stack: ["FastAPI", "React", "Random Forest", "Node worker"], repo: "MoodSense" },
    { id: "xgbright", name: "XGBright", ticker: "XGBR", paths: ["iot", "ml", "ai"], date: "2026-05-01", commits: 11, size: 2999, lang: "Python",
      stat: "~62%", statLabel: "less energy than always-on lighting", featured: true,
      blurb: "End-to-end ML pipeline on 5.3M+ IoT records. XGBoost reached R² = 0.92, chosen over Random Forest for near-equal accuracy at 21× smaller size (8.5 vs 181.7 MB). ESP32 nodes dim LEDs to supply only the light a room lacks, with voice control in English, Hindi, Marathi and Hinglish. Research paper in preparation.",
      stack: ["ESP32", "XGBoost", "Whisper", "WebSocket", "SQLite"], repo: "XGBright-Node" },
    { id: "zcs", name: "ZCS Cloud", ticker: "ZCS", paths: ["cloud", "web"], date: "2026-06-01", commits: 16, size: 963, lang: "JavaScript",
      stat: "S3", statLabel: "compatible object storage", featured: true,
      blurb: "Multi-tenant cloud storage with an AWS S3-compatible API: bucket CRUD, presigned URLs, API-key auth and usage-based billing, deployed to production for Zoho SETU. Docker Compose behind Nginx, live infra health and abuse-spike detection, plus a client-side TF.js model that predicts usage across 4 metrics in under 50 ms.",
      stack: ["Next.js", "Fastify", "PostgreSQL", "MinIO", "Redis", "Docker", "Nginx", "TF.js"], repo: "ZCS-cloud_services" },
    { id: "bharatgeo", name: "Bharat Geo API", ticker: "BGEO", paths: ["cloud"], date: "2026-05-03", commits: 12, size: 220, lang: "JavaScript",
      stat: "619,500", statLabel: "villages served", featured: true,
      blurb: "The All India Villages API, built from scratch during my Bluestock Fintech internship: 600K+ village records cleaned into PostgreSQL, a Node.js backend with JWT auth and Redis rate limiting, and a React frontend with village autocomplete.",
      stack: ["Express", "Redis", "Docker", "nginx"], repo: "bharat-geo-api" },
    { id: "vecquery", name: "VecQuery", ticker: "VECQ", paths: ["ai", "ml"], date: "2026-04-20", commits: 5, size: 119, lang: "Python",
      stat: "k=60", statLabel: "reciprocal rank fusion", featured: true,
      blurb: "Ask plain-English questions across PDFs, CSVs and DOCX. A planner routes to BM25, pgvector or hybrid search, joins entities across files, and a local Llama 3.1 streams cited answers.",
      stack: ["FastAPI", "pgvector", "Ollama", "Llama 3.1"], repo: "VecQuery-Intelligence" },
    { id: "talentlens", name: "Talent Lens", ticker: "TLNS", paths: ["ai", "ml", "web"], date: "2026-11-11", commits: 3, size: 148, lang: "TypeScript",
      stat: "47", statLabel: "resumes ranked & explained", featured: true,
      blurb: "Resume screening for a non-technical HR team: extracts facts, sorts by role, ranks against two job descriptions and explains every ranking in plain language.",
      stack: ["Next.js 16", "Postgres", "Groq", "Vercel"], repo: "growth-for-impact-task" },
    { id: "sanctuary", name: "Sanctuary OS", ticker: "SNCT", paths: ["ai", "web"], date: "2025-12-21", commits: 7, size: 88, lang: "TypeScript",
      stat: "5", statLabel: "breathing protocols",
      blurb: "Stress & anxiety toolkit: Gemini-powered stress analysis, guided 4-7-8 and box breathing, grounding exercises.",
      stack: ["Gemini", "Node", "bcrypt"], repo: "sanctuary-mindkit" },
    { id: "pingify", name: "Pingify", ticker: "PING", paths: ["web", "cloud"], date: "2025-12-24", commits: 39, size: 6418, lang: "JavaScript",
      stat: "1,000+", statLabel: "simulated users, real-time chat & calls", featured: true,
      blurb: "Developer-matching platform supporting 1,000+ simulated users, with real-time chat and calling over WebSockets that cut latency by 35%. APIs secured with JWT and role-based access; backend 28% faster through query indexing and async processing.",
      stack: ["React", "Node.js", "WebSockets", "JWT", "MongoDB"], repo: "pingify" },
    { id: "bolbiz", name: "BolBiz", ticker: "BOLB", paths: ["ai", "web"], date: "2026-08-08", commits: 1, size: 132, lang: "TypeScript",
      stat: "STT", statLabel: "own speech service",
      blurb: "Voice-first app with its own speech-to-text service.",
      stack: ["TypeScript", "Tailwind", "STT service"], repo: "BolBiz" },
    { id: "earthtwin", name: "Earth Digital Twin", ticker: "ERTH", paths: ["web", "quests"], date: "2026-06-14", commits: 5, size: 3925, lang: "TypeScript",
      stat: "3D", statLabel: "planet in the browser",
      blurb: "A digital twin of Earth rendered in the browser.",
      stack: ["TypeScript", "WebGL"], repo: "Earth-DigitalTwin" },
    { id: "buzzpos", name: "BuzzPOS", ticker: "BUZZ", paths: ["web"], date: "2026-04-17", commits: 6, size: 93, lang: "JavaScript",
      stat: "live", statLabel: "stock & billing",
      blurb: "Lightweight point-of-sale for Mehfil bar with real-time stock and billing.",
      stack: ["JavaScript"], repo: "BuzzPOS" },
    { id: "posandroid", name: "POS Android", ticker: "POSA", paths: ["mobile"], date: "2026-04-19", commits: 3, size: 93, lang: "Kotlin",
      stat: "APK", statLabel: "Kotlin point-of-sale",
      blurb: "BuzzPOS as a structured native Kotlin app.",
      stack: ["Kotlin", "Android"], repo: "POS-android" },
    { id: "pingifykt", name: "Pingify Android", ticker: "PGKT", paths: ["mobile"], date: "2026-05-04", commits: 2, size: 114, lang: "Kotlin",
      stat: "WIP", statLabel: "native port",
      blurb: "Porting Pingify into a native Android app.",
      stack: ["Kotlin", "Android"], repo: "pingify-kotlin" },
    { id: "weather", name: "Weather Android", ticker: "WTHR", paths: ["mobile"], date: "2026-02-05", commits: 2, size: 399, lang: "Java",
      stat: "01", statLabel: "first Android app",
      blurb: "Where the Android path started.",
      stack: ["Java", "Android"], repo: "weather_android" },
    { id: "thinkboard", name: "ThinkBoard", ticker: "THNK", paths: ["web"], date: "2025-12-22", commits: 3, size: 90, lang: "JavaScript",
      stat: "429", statLabel: "rate-limited, deployed",
      blurb: "Production MERN notes app with rate limiting, persistence and a live deploy.",
      stack: ["MERN", "Upstash"], repo: "mern-thinkboard" },
    { id: "votevault", name: "VoteVault", ticker: "VOTE", paths: ["web"], date: "2025-11-08", commits: 3, size: 8, lang: "Python",
      stat: "1", statLabel: "vote per voter",
      blurb: "Secure online voting system with Flask and SQLite.",
      stack: ["Flask", "SQLite"], repo: "votevault" },
    { id: "foodapp", name: "Food App", ticker: "FOOD", paths: ["web"], date: "2026-04-08", commits: 2, size: 185, lang: "C#",
      stat: ".NET", statLabel: "ASP.NET MVC",
      blurb: "A fast, simple ASP.NET MVC food-ordering app.",
      stack: ["ASP.NET MVC", "C#"], repo: "foodapp-aspnet-mvc" },
    { id: "commoncrawl", name: "Common Crawl", ticker: "CCRL", paths: ["ml", "quests"], date: "2026-10-08", commits: 45, size: 611, lang: "Python",
      stat: "PR #26", statLabel: "open-source contribution",
      blurb: "Open-source pull request to Common Crawl’s whirlwind-python: a WARC/WET/WAT → CSV/JSON record-metadata exporter with text and link modes, plus a unit-test suite.",
      stack: ["Python", "WARC"], repo: "whirlwind-python", link: "https://github.com/commoncrawl/whirlwind-python/pull/26" },
    { id: "godot", name: "Godot Games", ticker: "GDOT", paths: ["quests"], date: "2026-10-21", commits: 0, size: 300, lang: "GDScript",
      stat: "▶", statLabel: "game-dev experiments",
      blurb: "Building small games in Godot, just because.",
      stack: ["Godot", "GDScript"], repo: null },
    { id: "dsa", name: "DSA Practice", ticker: "DSA", paths: ["quests"], date: "2025-07-09", commits: 253, size: 1415, lang: "Java",
      stat: "253", statLabel: "commits of solved problems",
      blurb: "Problems, and my way around solving them, one commit at a time.",
      stack: ["Java"], repo: "dsa-prac" },
    { id: "vibecoders", name: "VibeCoders T38", ticker: "HACK", paths: ["quests", "web"], date: "2025-08-22", commits: 8, size: 445, lang: "HTML",
      stat: "01", statLabel: "first hackathon",
      blurb: "My first hackathon. Where shipping under a deadline started.",
      stack: ["HTML", "CSS", "JS"], repo: "vibecoders_t38" }
  ]
};

(function () {
  const H = window.HZ;
  H.path = id => H.paths.find(p => p.id === id);
  H.color = id => H.path(id).color;
  H.byPath = id => H.projects.filter(p => p.paths.includes(id));
  H.sorted = () => [...H.projects].sort((a, b) => a.date.localeCompare(b.date));
  H.url = p => p.link || (p.repo ? `${H.github}/${p.repo}` : H.github);
  H.hash = p => { let h = 2166136261; for (const c of p.id) h = Math.imul(h ^ c.charCodeAt(0), 16777619); return (h >>> 0).toString(16).padStart(8, "0").slice(0, 7); };
  H.rand = seed => () => ((seed = Math.imul(seed ^ (seed >>> 15), 2246822507) + 0x9e3779b9 >>> 0) / 4294967296);
  H.countUp = (el, to, ms = 1200, fmt = n => Math.round(n).toLocaleString()) => {
    const t0 = performance.now();
    const step = t => { const k = Math.min(1, (t - t0) / ms); el.textContent = fmt(to * (1 - Math.pow(1 - k, 3))); if (k < 1) requestAnimationFrame(step); };
    requestAnimationFrame(step);
  };
  // Forward number keys and [ ] to the gallery shell so switching works while a mockup has focus.
  addEventListener("keydown", e => {
    if (/input|textarea/i.test(e.target.tagName) || e.metaKey || e.ctrlKey) return;
    if (/^[0-9rR]$/.test(e.key) || e.key === "[" || e.key === "]") if (parent !== window) parent.postMessage({ hzKey: e.key }, "*");
  });
})();

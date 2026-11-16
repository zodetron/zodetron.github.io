// Long-form project write-ups + architecture specs.
// Every fact here comes from the project's own README / docs on github.com/zodetron (read Nov 2026).
// arch: layers top→bottom, each { name, nodes:[{id,t,s,k}] }; k = client|edge|service|ml|data|ext|device
// edges: [from, to, label?, "dash"?]
window.HZ_DETAILS = {

xgbright: {
  tagline: "An LED panel that dims itself to exactly the light a room lacks, and takes orders in four languages.",
  overview: [
    "An ESP32 reads two light sensors and streams them to a laptop. An XGBoost model on the laptop sets the room’s LED panel, replacing a panel pinned at 100% all day regardless of the sun.",
    "Spoken commands in English, Hindi, Marathi or Hinglish are transcribed, parsed without an LLM, applied, and confirmed aloud with the energy saved. Every real session is recorded to a local SQLite database.",
    "The ESP32 makes no decisions. It reads, streams, and obeys."
  ],
  numbers: [["0.643 → 0.133", "MAE vs the always-100% panel"], ["~0.38", "mean output instead of 1.0"], ["8.5 MB", "XGBoost vs 181.7 MB Random Forest"], ["0.46 ms", "per prediction, 1 s control loop"]],
  flow: [
    "Sense: two BH1750 sensors report indoor and outdoor lux once a second over I2C.",
    "Stream: the ESP32 dials out as a WebSocket client to the laptop. JSON frames carry control, binary frames carry raw PCM audio.",
    "Decide: a single FastAPI process runs the XGBoost model (10 features) and an AUTO/MANUAL state machine.",
    "Act: the ESP32 sets PWM duty on GPIO 23 and acknowledges. Confirmations are only spoken after that ack.",
    "Talk: speech → MLX Whisper large-v3-turbo → rule parser (4 languages, no LLM) → state machine → edge-tts reply played through the board’s own speaker.",
    "Record: real-device sessions are written to SQLite in 5-second windows and shown in the dashboard’s History tab."
  ],
  sections: [
    ["Why XGBoost over Random Forest", "Random Forest had the lowest raw MAE by 1.8% relative, about a third of a percentage point of brightness, invisible in a room. It serialises to 181.7 MB; XGBoost reaches statistically indistinguishable accuracy in 8.5 MB. The server also holds a ~1.5 GB Whisper model in memory, so train.py selects with an explicit tie-break: within 2% MAE counts as tied, then the smaller model wins."],
    ["Honest evaluation", "The split is chronological, not random: consecutive 5-minute samples are near-duplicates, so a random split would leak answers. Train covers Jul 2018 → Oct 2019 (480,000 rows), test Oct → Dec 2019 (120,000 rows). Outdoor lux, which nothing measured, is reconstructed from the real indoor sensor through NOAA solar geometry rather than invented."],
    ["Hardware lessons", "ESP32-WROOM-32 with no PSRAM and ~150 KB free heap, so audio recording must stream (32 KB/s) instead of buffering. No analogRead() anywhere (it clashes with the legacy I2S driver), MCLK must be unset on both I2S peripherals, and loop() must never block: audio lives on core 0 tasks."],
    ["No fake numbers", "A failed sensor reports why and shows “—”, never 0. Readings disappear the moment the device disconnects. A mock device speaks the real protocol for demos, is labelled SIMULATED DEVICE, and is never written to history."]
  ],
  stack: [["Device", "ESP32-WROOM-32, BH1750 ×2, INMP441 mic, MAX98357A amp, Arduino core"], ["Server", "Python, FastAPI, uvicorn, WebSocket"], ["ML", "XGBoost, pandas, NOAA solar model"], ["Voice", "MLX Whisper large-v3-turbo, rule NLU, edge-tts"], ["UI & data", "React + Vite dashboard, SQLite"]],
  docs: ["README.md", "PROGRESS.md", "docs/HARDWARE.md", "data-pipeline/README.md"],
  arch: {
    layers: [
      { name: "Peripherals", nodes: [
        { id: "sens", t: "BH1750 ×2", s: "indoor + outdoor lux", k: "device" },
        { id: "mic", t: "Mic + button", s: "INMP441 · GPIO 19", k: "device" },
        { id: "out", t: "LED panel + speaker", s: "PWM GPIO 23 · MAX98357A", k: "device" } ] },
      { name: "ESP32 · pure I/O", nodes: [
        { id: "esp", t: "ESP32-WROOM-32", s: "reads, streams, obeys · loop() never blocks", k: "device" } ] },
      { name: "Laptop · one Python process", nodes: [
        { id: "ws", t: "FastAPI :8000", s: "DeviceSession · ack futures", k: "service" },
        { id: "ctl", t: "Controller", s: "AUTO / MANUAL state machine", k: "service" } ] },
      { name: "Decisions", nodes: [
        { id: "xgb", t: "XGBoost", s: "8.5 MB · 0.46 ms", k: "ml" },
        { id: "stt", t: "Whisper", s: "speech → text", k: "ml" },
        { id: "nlu", t: "Rule NLU", s: "4 languages, no LLM", k: "ml" },
        { id: "tts", t: "edge-tts", s: "spoken confirmation", k: "ml" } ] },
      { name: "Outputs", nodes: [
        { id: "dash", t: "React dashboard", s: "Live · History · Setup", k: "client" },
        { id: "db", t: "SQLite", s: "real sessions only", k: "data" },
        { id: "pipe", t: "Offline pipeline", s: "combine → features → train", k: "ext" } ] }
    ],
    edges: [["sens", "esp", "I2C"], ["mic", "esp", "I2S"], ["esp", "out", "PWM · I2S", "dash"], ["esp", "ws", "WebSocket (client)"], ["ws", "ctl"], ["ctl", "xgb"], ["ctl", "stt"], ["stt", "nlu"], ["nlu", "tts"], ["ctl", "dash", "ws/dashboard"], ["ctl", "db", "5 s windows"], ["pipe", "xgb", "model.joblib", "dash"]]
  }
},

zcs: {
  tagline: "A self-hosted AWS S3: tenants, buckets, API keys, metered usage and a bill at the end of it.",
  overview: [
    "ZCS (Zodetron Cloud Services) is a full-stack, multi-tenant object-storage platform built as a submission for Zoho SETU and deployed to production on Render. Tenants sign up, create buckets, upload and download files, manage API keys, and see real-time usage and cost.",
    "Admins get the other side: every tenant’s usage and plan, suspend/activate, global or per-tenant pricing and rate limits, live infrastructure health, abuse-spike detection and a full audit log."
  ],
  numbers: [["3", "processes in one container"], ["1,000 / 60 s", "default rate limit per tenant"], ["GB-months", "time-weighted storage billing"], ["<50 ms", "in-browser TF.js training"]],
  flow: [
    "Browser sends POST /api/storage/buckets/:name/upload-file with a Bearer JWT (or an X-Api-Key).",
    "Nginx on port 10000 matches /api/ and proxies to Fastify on :4000; everything else goes to Next.js on :3000.",
    "preHandler 1 authenticates: API keys are SHA-256 hashed and looked up, otherwise the JWT is verified.",
    "preHandler 2 rate-limits: Redis MULTI INCR + EXPIRE on rl:tenant:<id>; over the limit returns 429.",
    "The handler checks bucket ownership in Postgres, streams the body, PUTs it into MinIO under <tenantId>/<bucketId>/<key>, upserts the Object row and writes a UsageEvent.",
    "If the connection drops mid-upload, none of those writes happen: no file, no row, no charge."
  ],
  sections: [
    ["Billing that doesn’t forget", "Storage is billed on GB-months accrued: the month’s storage timeline is rebuilt from storageDelta events and integrated over time, so uploading 10 GB for 10 days then deleting it still costs 10 GB × 10/30 of a month. Upload, egress and request counts come from usage_events. Estimates are cached in Redis for 2 minutes."],
    ["One image, three processes", "A multi-stage Dockerfile builds the Next.js standalone bundle, then assembles Fastify + Prisma + Nginx into one image. On boot, entrypoint.sh waits for Postgres, pushes the Prisma schema, seeds, renders the Nginx template with $PORT and starts supervisord, which keeps backend, frontend and Nginx alive."],
    ["Forecasting in the browser", "The Analytics page fetches 6 months of usage, then TensorFlow.js trains a Dense(1) regression per metric (300 epochs, Adam) and blends it with the current pace to predict end-of-month usage and cost. No data leaves the browser; tensors are disposed afterwards."],
    ["Fail-open where it’s safe", "Redis holds rate-limit counters and short-lived caches only. If Redis is down, caches miss to Postgres and rate limiting fails open instead of blocking every tenant."]
  ],
  stack: [["Frontend", "Next.js 15 App Router, TensorFlow.js"], ["Backend", "Fastify, Prisma, JWT, SHA-256 API keys"], ["Data", "PostgreSQL (Neon), MinIO (S3-compatible), Redis (Upstash)"], ["Infra", "Docker multi-stage, Nginx, supervisord, Render"]],
  docs: ["README.md", "PRICING.md", "ML_IMPLEMENTATION.md", "VERSION_1.md"],
  arch: {
    layers: [
      { name: "Clients", nodes: [
        { id: "br", t: "Browser dashboard", s: "tenant + admin · TF.js forecast", k: "client" },
        { id: "cli", t: "API client", s: "X-Api-Key", k: "client" } ] },
      { name: "Edge", nodes: [{ id: "ngx", t: "Nginx :10000", s: "path routing · 5 GB body", k: "edge" }] },
      { name: "App container · supervisord", nodes: [
        { id: "next", t: "Next.js 15", s: ":3000 · /*", k: "service" },
        { id: "fy", t: "Fastify API", s: ":4000 · auth → rate limit → route", k: "service" } ] },
      { name: "Data", nodes: [
        { id: "pg", t: "PostgreSQL", s: "tenants · objects · usage_events", k: "data" },
        { id: "rd", t: "Redis", s: "rate limits · 1–5 min caches", k: "data" },
        { id: "mn", t: "MinIO", s: "file bytes per tenant prefix", k: "data" } ] }
    ],
    edges: [["br", "ngx", "HTTPS"], ["cli", "ngx"], ["ngx", "next", "/*"], ["ngx", "fy", "/api/*"], ["fy", "pg", "Prisma"], ["fy", "rd", "INCR / cache"], ["fy", "mn", "PUT / GET"]]
  }
},

talentlens: {
  tagline: "Resume screening for a non-technical HR team that explains every single ranking.",
  overview: [
    "Built for Growth For Impact: one mixed pile of 47 anonymised resumes against two very different roles, an LCA Consultant and a UI/UX Design Intern. HR needed a hosted tool that sorts the pile by role, explains each ranking in plain language, surfaces broken files instead of hiding them, and ranks a newly uploaded resume against the pile.",
    "Scores come from a deterministic rubric so they are reproducible and auditable; the LLM only explains. Rules parse the resumes first, and an LLM structures only the layouts the rules don’t recognise."
  ],
  numbers: [["47", "resumes ingested"], ["10 / 23", "LCA / UI-UX matches"], ["2 × 100", "point rubrics"], ["1", "codebase, one Vercel deploy"]],
  flow: [
    "Read: detect file type from leading bytes; .docx (mammoth), .pdf (unpdf) and .txt become normalised text.",
    "Parse: find sections from heading synonyms; turn role headers into role · org · date range.",
    "Quality checks: missing or future dates, very short resumes, anonymiser damage (“ISO /s”).",
    "LLM fallback: only when the rules find almost no structure, returning the same schema.",
    "Score: two independent 100-point rubrics with quoted evidence per criterion, then classify as LCA, UI/UX, Both, Uncertain or Neither.",
    "Explain + persist: the LLM writes a reviewer note from extracted data only; resume and scores are written in one transaction, keyed by SHA-256 of the file."
  ],
  sections: [
    ["Key decisions", "Overlap-aware experience in months so concurrent roles aren’t double counted; core LCA roles count 100%, adjacent sustainability roles 25%. Uploads start unsaved so testing never pollutes the pile, and are purged after 24 h. Original files live in Postgres as bytea since resumes are ~10 KB."],
    ["Errors are first-class", "Every problem becomes an issue with a stage, severity and plain-English message, shown on the candidate’s Issues tab and grouped on a Needs-review page. An unreadable file isn’t an HTTP error: it returns 200 with status “failed” and the reason."],
    ["One pipeline everywhere", "src/lib/pipeline.ts is used by both the seed script for the bulk pile and /api/upload for single uploads, so an uploaded resume is scored exactly like the rest."]
  ],
  stack: [["App", "Next.js 16 App Router, TypeScript, React 19, Tailwind v4"], ["Data", "PostgreSQL (local) / Neon (prod), pg driver, jsonb"], ["LLM", "Groq gpt-oss-120b in prod, Ollama llama3.1:8b locally"], ["Parsing", "mammoth, unpdf"], ["Hosting", "Vercel"]],
  docs: ["README.md", "AGENTS.md"],
  live: "https://talent-lens-omega.vercel.app/",
  arch: {
    layers: [
      { name: "Browser", nodes: [{ id: "ui", t: "React UI", s: "Overview · Roles · Review · Upload", k: "client" }] },
      { name: "Vercel · Next.js route handlers", nodes: [
        { id: "api", t: "/api/*", s: "candidates · upload · health", k: "service" },
        { id: "pipe", t: "Pipeline", s: "read → parse → score → classify → explain", k: "service" },
        { id: "seed", t: "seed / migrate", s: "CLI scripts", k: "edge" } ] },
      { name: "Data & AI", nodes: [
        { id: "db", t: "PostgreSQL · Neon", s: "resumes · scores · files (bytea)", k: "data" },
        { id: "llm", t: "LLM", s: "Groq gpt-oss-120b", k: "ext" } ] }
    ],
    edges: [["ui", "api", "JSON"], ["api", "pipe"], ["seed", "pipe"], ["api", "db"], ["seed", "db"], ["pipe", "llm", "narrative + layout fallback"]]
  }
},

pingify: {
  tagline: "Find developers who share your stack, add them, then chat or call in real time.",
  overview: [
    "Pingify is a full-stack social platform for developers and learners: sign up, onboard with your languages and location, get recommendations, send friend requests and talk to your friends over real-time chat and video.",
    "The Express backend owns auth, profiles and the friend graph in MongoDB, and mints tokens for Stream, which carries the chat (WebSocket) and video (WebRTC) traffic. A native Kotlin client talks to the same API."
  ],
  numbers: [["3", "route groups: auth · users · chat"], ["2", "Mongo models: User · FriendRequest"], ["JWT", "in an HTTP-only cookie"], ["2", "clients: web + Android"]],
  flow: [
    "Sign up or log in: passwords hashed with bcrypt, a JWT is set as an HTTP-only cookie.",
    "Onboarding: a multi-step wizard stores avatar, native and learning language, bio and location on the User document.",
    "Home: recommendations and friends are fetched with TanStack Query; state lives in Zustand.",
    "Friend requests: bidirectional FriendRequest documents with status tracking and notifications.",
    "Chat & call: the backend issues a Stream token (lib/stream.js); the browser connects straight to Stream Chat and Stream Video SDKs."
  ],
  sections: [
    ["Frontend", "React 19 + Vite, React Router, TanStack Query for server state, Zustand for client state, Tailwind + DaisyUI with runtime theme switching, Stream Chat React and Stream Video React SDKs."],
    ["Backend", "Node.js (ES modules) + Express with controllers for auth, users and chat, an auth middleware that verifies the cookie JWT, Mongoose schemas on MongoDB Atlas and the Stream server SDK for user upserts and tokens."],
    ["Goes native", "The same API powers Pingify Android, a Kotlin + Jetpack Compose client with Retrofit and the Stream Chat Android SDK."]
  ],
  stack: [["Frontend", "React 19, Vite, TanStack Query, Zustand, Tailwind, DaisyUI"], ["Backend", "Node.js, Express, Mongoose, JWT, bcryptjs"], ["Real-time", "Stream Chat SDK (WebSocket), Stream Video SDK (WebRTC)"], ["Data", "MongoDB Atlas"]],
  docs: ["README.md", "frontend/README.md"],
  live: "https://pingify-h8jn.onrender.com/",
  arch: {
    layers: [
      { name: "Clients", nodes: [
        { id: "web", t: "React SPA", s: "Vite · TanStack Query · Zustand", k: "client" },
        { id: "and", t: "Android app", s: "Kotlin · Compose", k: "client" } ] },
      { name: "API", nodes: [{ id: "api", t: "Express API", s: "auth · users · chat · JWT cookie", k: "service" }] },
      { name: "Data & real-time", nodes: [
        { id: "db", t: "MongoDB Atlas", s: "User · FriendRequest", k: "data" },
        { id: "st", t: "Stream", s: "Chat (WebSocket) · Video (WebRTC)", k: "ext" } ] }
    ],
    edges: [["web", "api", "REST + cookie"], ["and", "api", "Retrofit"], ["api", "db", "Mongoose"], ["api", "st", "upsert user · token"], ["web", "st", "chat · calls", "dash"], ["and", "st", "chat", "dash"]]
  }
},

vecquery: {
  tagline: "Ask plain-English questions across PDFs, CSVs and DOCX, and get an answer that cites its sources.",
  overview: [
    "A cross-document natural-language query engine. Upload files, ask a question, and receive a cited answer grounded in your documents. Every component runs locally: no API keys, no cloud LLM.",
    "Before any search runs, a planner decides whether the question needs keyword, semantic or hybrid search, and whether it spans more than one document."
  ],
  numbers: [["768", "dim nomic-embed-text vectors"], ["300 / 50", "word chunks / overlap"], ["k = 60", "reciprocal rank fusion"], ["4", "tables incl. query audit log"]],
  flow: [
    "Ingest: PyMuPDF, python-docx or csv parse the file; text is split into 300-word chunks with 50-word overlap.",
    "Embed: each chunk becomes a 768-dimensional vector via nomic-embed-text on Ollama, stored in pgvector.",
    "Plan: the query is classified as keyword (BM25), semantic (pgvector cosine) or hybrid; cross-document intent (“compare”, “both”, “across”) is detected.",
    "Search: vector and BM25 run in parallel and merge with Reciprocal Rank Fusion (k = 60); entity joining pulls matching chunks from every file.",
    "Answer: Llama 3.1 8B streams a grounded answer over SSE, citing every claim as [Source N].",
    "Log: the query, planner decision and returned chunk IDs land in query_logs."
  ],
  sections: [
    ["Schema", "documents → chunks (page, index, jsonb metadata) → embeddings (vector(768), ivfflat cosine index) plus query_logs for a full audit trail of every search."],
    ["Why RRF", "Reciprocal Rank Fusion merges ranked lists from BM25 and vector search without normalising their incomparable scores."]
  ],
  stack: [["Backend", "Python, FastAPI, SQLAlchemy 2, psycopg 3"], ["Search", "PostgreSQL + pgvector, BM25, RRF"], ["AI", "Ollama: nomic-embed-text, llama3.1:8b"], ["Frontend", "React 19, Vite, react-dropzone"]],
  docs: ["README.md"],
  arch: {
    layers: [
      { name: "Frontend", nodes: [{ id: "ui", t: "React UI", s: "upload · ask · streamed answer", k: "client" }] },
      { name: "FastAPI", nodes: [
        { id: "ing", t: "Ingestion", s: "parse → chunk → embed", k: "service" },
        { id: "plan", t: "Query planner", s: "keyword · semantic · hybrid", k: "service" },
        { id: "srch", t: "Search", s: "BM25 + pgvector → RRF · entity join", k: "service" } ] },
      { name: "Local models & storage", nodes: [
        { id: "emb", t: "nomic-embed-text", s: "Ollama · 768-d", k: "ml" },
        { id: "pg", t: "Postgres + pgvector", s: "documents · chunks · embeddings · logs", k: "data" },
        { id: "llm", t: "Llama 3.1 8B", s: "Ollama · cited, streaming", k: "ml" } ] }
    ],
    edges: [["ui", "ing", "POST /upload"], ["ui", "plan", "POST /answer"], ["plan", "srch"], ["ing", "emb"], ["ing", "pg", "store"], ["srch", "pg", "cosine + BM25"], ["srch", "llm", "top chunks"], ["llm", "ui", "SSE tokens", "dash"]]
  }
},

fundify: {
  tagline: "Mutual-fund picks for everyday investors, with a live market check and a “should I wait?” simulator.",
  overview: [
    "An AI-powered mutual-fund recommendation platform built for middle-class investors: 789 funds across 39 AMCs, recommendations based on AMC, category, amount, tenure and risk tolerance, plus fund comparison, market dashboards and portfolio insights.",
    "Predictions aren’t purely historical: the backend pulls live Nifty 50 data and reads the market regime before recommending."
  ],
  numbers: [["789", "funds"], ["39", "AMCs"], ["0.964", "R² on the 3-year model"], ["EMA 12/21", "on 4-hour Nifty 50"]],
  flow: [
    "The Next.js dashboard sends the investor’s AMC, category, amount and tenure to POST /api/recommend.",
    "FastAPI loads the serialized models: Gradient Boosting for 1- and 3-year horizons, Extra Trees for 5+ years.",
    "Features come from the cleaned 789-fund dataset: historical returns, volatility, expense ratio, fund size, AMC strength and risk metrics.",
    "A live market check downloads Nifty 50 (^NSEI) via yfinance, resamples to 4-hour candles and compares EMA 12 vs EMA 21.",
    "The “What if I wait?” simulator compares investing now vs waiting, using historical rolling windows and current conditions."
  ],
  sections: [
    ["Honest metric", "The saved model metrics are R² 0.516 (1-year), 0.964 (3-year) and 0.788 (5-year). The README’s 96.7% headline applies to the 3-year model only."]
  ],
  stack: [["Frontend", "Next.js, TypeScript"], ["Backend", "FastAPI, pandas, scikit-learn"], ["Models", "Gradient Boosting, Extra Trees"], ["Market data", "yfinance (^NSEI)"]],
  docs: ["README.md", "backend/README.md", "REQUIREMENTS.md"],
  arch: {
    layers: [
      { name: "Frontend", nodes: [{ id: "ui", t: "Next.js dashboard", s: "recommend · compare · what-if", k: "client" }] },
      { name: "FastAPI", nodes: [
        { id: "rec", t: "/api/recommend", s: "+ funds · top-performers", k: "service" },
        { id: "mkt", t: "Market engine", s: "regime + what-if simulator", k: "service" } ] },
      { name: "Models & data", nodes: [
        { id: "gb", t: "Gradient Boosting", s: "1 & 3-year horizons", k: "ml" },
        { id: "et", t: "Extra Trees", s: "5+ year horizon", k: "ml" },
        { id: "csv", t: "Fund dataset", s: "789 funds · 39 AMCs", k: "data" },
        { id: "yf", t: "yfinance", s: "Nifty 50 · ^NSEI", k: "ext" } ] }
    ],
    edges: [["ui", "rec", "REST"], ["ui", "mkt"], ["rec", "gb"], ["rec", "et"], ["rec", "csv"], ["mkt", "yf", "4H EMA 12/21"]]
  }
},

moodsense: {
  tagline: "A webcam becomes a light sensor and the screen becomes a smart light panel.",
  overview: [
    "MoodSense simulates an IoT smart-lighting environment entirely in software. The webcam measures room lux every 200 ms, a trained model picks the energy-optimal brightness, and the laptop screen plays the part of the lighting panel.",
    "Three independent services talk over localhost HTTP, and only the brightness worker ever touches the OS."
  ],
  numbers: [["200 ms", "webcam sampling"], ["5.3M+", "rows of building-energy data"], ["4", "models benchmarked"], ["30 / 70", "ML vs direct-lux blend"]],
  flow: [
    "Every 200 ms a video frame is drawn to a hidden canvas; BT.709 luminance → gamma correction → lux, smoothed with an EMA.",
    "The React client posts the reading to FastAPI (/camera-lux, /predict).",
    "FastAPI refreshes weather from wttr.in (cached 10 min), applies hard lux rules, then runs the Random Forest on lux, temperature, humidity, hour and time of day.",
    "The ML output is blended with the direct lux mapping, and in auto mode a non-blocking POST goes to the brightness worker.",
    "The Node.js worker sets the OS screen brightness; the dashboard charts energy saved and its CO₂, car and tree equivalents."
  ],
  sections: [
    ["Data", "13 CSVs of 2018–2019 building submetering merged into 5.3M+ rows. Lighting kW becomes a lux feature; weather features are synthetic during training and replaced by real wttr.in data at inference."],
    ["Flicker control", "Brightness only changes when lux shifts by more than 30, with a 6-second debounce. A direct rule fires within 5 ms, and the ML-blended correction follows."]
  ],
  stack: [["ML", "Python, scikit-learn, XGBoost, pandas"], ["Inference", "FastAPI, Uvicorn"], ["Worker", "Node.js, Express, brightness"], ["Frontend", "React 18, Vite, Tailwind v4, Recharts, Framer Motion"]],
  docs: ["README.md", "ml-brightness/README.md"],
  arch: {
    layers: [
      { name: "Browser :5174", nodes: [
        { id: "cam", t: "Webcam → lux", s: "Canvas · every 200 ms", k: "device" },
        { id: "ui", t: "React dashboard", s: "KPIs · charts · PDF export", k: "client" } ] },
      { name: "FastAPI :8000", nodes: [{ id: "api", t: "Inference server", s: "/predict · /camera-lux · /mode", k: "service" }] },
      { name: "Model & services", nodes: [
        { id: "rf", t: "Random Forest", s: "+ MinMax scaler", k: "ml" },
        { id: "wx", t: "wttr.in", s: "temp + humidity", k: "ext" },
        { id: "wk", t: "Brightness worker", s: "Node.js :7777 → OS", k: "service" } ] }
    ],
    edges: [["cam", "ui"], ["ui", "api", "POST lux"], ["api", "rf"], ["api", "wx", "cached 10 min"], ["api", "wk", "POST /brightness"]]
  }
},

bharatgeo: {
  tagline: "India’s complete village-level geography behind an authenticated, rate-limited API.",
  overview: [
    "A SaaS platform serving the Census 2011 village hierarchy (619,500+ villages, 30 states, 640+ districts) through a REST API, built from scratch during my Bluestock Fintech internship.",
    "Developers sign up, create API keys and call the geo endpoints; admins manage users and plans; a demo app shows the village autocomplete. Everything ships behind one nginx gateway."
  ],
  numbers: [["619,500+", "villages"], ["640+", "districts"], ["4", "plans: FREE → UNLIMITED"], ["1", "nginx gateway on :80"]],
  flow: [
    "nginx serves the admin dashboard, client portal and autocomplete demo as static apps and proxies /api/ to Express.",
    "Every geo request runs requestLogger → apiKeyAuth → rateLimiter → controller.",
    "API keys are validated against Postgres and cached in Upstash Redis for a minute.",
    "Redis holds daily per-key counters for the FREE, PREMIUM, PRO and UNLIMITED plans, plus search (5 min) and autocomplete (2 min) caches.",
    "Prisma reads the state → district → sub-district → village hierarchy from NeonDB; request logs are batched asynchronously."
  ],
  sections: [
    ["Data import", "A one-time Python script (pandas + psycopg2) bulk-loads the Census 2011 dataset after Prisma migrations seed the root Country = India record."],
    ["Two kinds of auth", "JWT for dashboard users (with an ADMIN role for admin routes) and X-API-Key for the geo endpoints."]
  ],
  stack: [["API", "Node.js, Express, Prisma 6, JWT, bcryptjs"], ["Data", "NeonDB (Postgres), Upstash Redis"], ["Apps", "React + Vite + Tailwind + Recharts ×3"], ["Infra", "Docker Compose, nginx gateway"], ["Import", "Python, pandas, psycopg2"]],
  docs: ["README.md", "DOCKER.md", "CREATE_ADMIN.md"],
  arch: {
    layers: [
      { name: "Browser", nodes: [
        { id: "adm", t: "Admin dashboard", s: "/admin", k: "client" },
        { id: "cp", t: "Client portal", s: "/client · keys + usage", k: "client" },
        { id: "demo", t: "Autocomplete demo", s: "/demo", k: "client" } ] },
      { name: "Gateway", nodes: [{ id: "gw", t: "nginx :80", s: "static apps + /api proxy", k: "edge" }] },
      { name: "API & import", nodes: [
        { id: "api", t: "Express + Prisma", s: "logger → apiKeyAuth → rateLimiter", k: "service" },
        { id: "imp", t: "import_data.py", s: "Census 2011 · one-time", k: "ext" } ] },
      { name: "Data", nodes: [
        { id: "pg", t: "PostgreSQL · NeonDB", s: "geo hierarchy · users · keys · logs", k: "data" },
        { id: "rd", t: "Redis · Upstash", s: "daily counters · caches", k: "data" } ] }
    ],
    edges: [["adm", "gw"], ["cp", "gw"], ["demo", "gw"], ["gw", "api", "/api/v1/*"], ["api", "pg", "Prisma"], ["api", "rd", "REST"], ["imp", "pg", "bulk load", "dash"]]
  }
},

neuralbroker: {
  tagline: "My sandbox of auto-trading bots, where a crossover only counts if the volume agrees.",
  overview: [
    "NeuralBroker holds my auto-trading bots for BTC/USD and sometimes Indian derivatives. The core strategy enters and exits on EMA crossovers, but only when a volume spike confirms the move, with stop-loss, take-profit and trailing exits.",
    "The repo is also a lab: folders of strategy experiments and backtests, including XAUUSD hyper-testing, BTC scalping and a multi-timeframe live dashboard."
  ],
  numbers: [["12 / 20", "EMA crossover"], ["1.5×", "volume vs 20-period average"], ["54", "commits"], ["BTC · XAU", "markets tested"]],
  flow: [
    "Load OHLCV candles for the instrument.",
    "Compute EMA 12 and EMA 20; EMA 12 crossing above is a potential buy, below a potential sell.",
    "Confirm only if current volume is more than 1.5× its rolling 20-period average, which filters out low-volatility fake-outs.",
    "Enter with stop-loss and take-profit; exit on the opposite crossover or when the trailing stop is hit.",
    "Log every trade, PnL and strategy metric, or replay the same logic over history in the backtester."
  ],
  sections: [],
  stack: [["Core", "Python, pandas"], ["Strategy", "EMA crossover, volume filter, trailing stops"], ["Research", "Backtests, hyper-parameter tests"]],
  docs: ["README.md"],
  arch: {
    layers: [
      { name: "Market data", nodes: [{ id: "md", t: "OHLCV candles", s: "BTC/USD · Indian derivatives", k: "ext" }] },
      { name: "Signal", nodes: [
        { id: "ema", t: "EMA 12 / 20", s: "crossover detector", k: "ml" },
        { id: "vol", t: "Volume filter", s: "> 1.5× 20-period avg", k: "ml" } ] },
      { name: "Execution", nodes: [{ id: "ex", t: "Entry / exit", s: "SL · TP · trailing stop", k: "service" }] },
      { name: "Output", nodes: [
        { id: "log", t: "Trade log", s: "PnL + metrics", k: "data" },
        { id: "bt", t: "Backtester", s: "same logic on history", k: "service" } ] }
    ],
    edges: [["md", "ema"], ["md", "vol"], ["ema", "ex", "signal"], ["vol", "ex", "confirm"], ["ex", "log"], ["md", "bt", "historical", "dash"]]
  }
},

journalx: {
  tagline: "A TradeZella-style journal: log every trade, then see what your mistakes actually cost.",
  overview: [
    "A full-stack trading journal and analytics app. Log trades with entries, stops, targets, session, setup, emotions before and after, rule adherence, mistake tags and an execution score, then review them from every angle.",
    "Deliberately simple storage: local JSON files, no database and no authentication."
  ],
  numbers: [["6", "pages of analysis"], ["3", "sessions: Asia · London · NY"], ["4", "JSON stores"], ["1–5", "execution score"]],
  flow: [
    "The React + Vite client posts trades to the Express server.",
    "The server persists them to trades.json, daily.json, stats.json and reviews.json.",
    "The dashboard computes net P&L, win rate, profit factor, expectancy and average win/loss, with an equity curve and session breakdown.",
    "A calendar heatmap colours each day by P&L; mistake analysis shows the cost of each tag; weekly and monthly reviews roll it up."
  ],
  sections: [],
  stack: [["Frontend", "React 18, Vite, Tailwind, React Router, Recharts"], ["Backend", "Node.js, Express"], ["Storage", "JSON files"], ["Deploy", "Render (render.yaml)"]],
  docs: ["README.md", "DEPLOYMENT.md"],
  arch: {
    layers: [
      { name: "Client", nodes: [{ id: "ui", t: "React app", s: "Dashboard · Trades · Calendar · Mistakes · Reviews", k: "client" }] },
      { name: "Server", nodes: [{ id: "api", t: "Express API", s: "/api/trades · stats · reviews", k: "service" }] },
      { name: "Storage", nodes: [
        { id: "t", t: "trades.json", s: "every trade", k: "data" },
        { id: "d", t: "daily + stats", s: "rollups", k: "data" },
        { id: "r", t: "reviews.json", s: "weekly reviews", k: "data" } ] }
    ],
    edges: [["ui", "api", "REST"], ["api", "t"], ["api", "d"], ["api", "r"]]
  }
},

sanctuary: {
  tagline: "A calm dashboard for stressful moments: AI guidance, guided breathing and grounding.",
  overview: [
    "Sanctuary OS is a full-stack mental-wellness toolkit. Google Gemini, wrapped in a counselling persona, turns what you describe into personalised recovery strategies. Guided breathing protocols, 5-4-3-2-1 grounding exercises and a protocol index sit alongside it.",
    "Accounts use bcrypt-hashed passwords and server-side sessions; an analytics view charts stress and anxiety statistics."
  ],
  numbers: [["5", "breathing protocols"], ["5-4-3-2-1", "grounding method"], ["bcrypt", "work factor 10"], ["4", "Mongo models"]],
  flow: [
    "Auth: Next.js client → Express → MongoDB, with a session cookie on success.",
    "Breathing: exercises are fetched from MongoDB and each completed session is logged to the user’s activity history.",
    "Analytics: pre-seeded statistics are served from MongoDB and charted with Recharts.",
    "AI chat: the client calls the Express /chatbot route, which proxies to the Gemini API so the key never reaches the browser."
  ],
  sections: [],
  stack: [["Frontend", "Next.js 14, React, Tailwind, Framer Motion, Recharts"], ["Backend", "Node.js, Express, express-session, bcrypt.js"], ["Data", "MongoDB"], ["AI", "Google Gemini"]],
  docs: ["README.md", "SETUP.md", "QUICK_START.md"],
  arch: {
    layers: [
      { name: "Frontend", nodes: [{ id: "ui", t: "Next.js 14", s: "dashboard · breathing · chatbot · analytics", k: "client" }] },
      { name: "Backend", nodes: [{ id: "api", t: "Express", s: "auth · exercises · analytics · chatbot", k: "service" }] },
      { name: "Data & AI", nodes: [
        { id: "db", t: "MongoDB", s: "User · Exercise · Activity · Stats", k: "data" },
        { id: "gm", t: "Gemini API", s: "counselling persona", k: "ext" } ] }
    ],
    edges: [["ui", "api", "session cookie"], ["api", "db", "Mongoose"], ["api", "gm", "proxy"]]
  }
},

foodapp: {
  tagline: "Online food ordering with a full admin panel, on ASP.NET Core 8 and React.",
  overview: [
    "“Zodetron Dining” is an online food-ordering system: browse and search the menu, manage a live cart, check out with an address and payment method, and track your orders.",
    "Admins get a dashboard with stats and recent orders, CRUD for products and categories, and order-status updates. Data is stored as JSON files instead of SQL."
  ],
  numbers: [["5", "API controllers"], ["4", "JSON stores"], ["JWT", "+ BCrypt"], ["9", "pages incl. admin"]],
  flow: [
    "The React 18 client calls the Web API through an Axios instance with a JWT interceptor.",
    "Controllers (Auth, Products, Categories, Orders, Admin) delegate to services that hold the business logic.",
    "UserService hashes passwords with BCrypt and issues JWTs; OrderService places orders and updates status.",
    "A generic JsonDataStore reads and writes users, products, categories and orders JSON; DataSeeder fills defaults on first run."
  ],
  sections: [],
  stack: [["Backend", "ASP.NET Core 8 Web API, C#, JWT Bearer, BCrypt.Net, System.Text.Json"], ["Frontend", "React 18, React Router 6, Tailwind 3, Axios, Vite"]],
  docs: ["README.md"],
  arch: {
    layers: [
      { name: "Client", nodes: [{ id: "ui", t: "React 18", s: "menu · cart · checkout · admin", k: "client" }] },
      { name: "ASP.NET Core 8", nodes: [
        { id: "ctl", t: "Controllers", s: "Auth · Products · Categories · Orders · Admin", k: "service" },
        { id: "svc", t: "Services", s: "JWT · BCrypt · order logic", k: "service" } ] },
      { name: "Storage", nodes: [{ id: "js", t: "JsonDataStore", s: "users · products · categories · orders", k: "data" }] }
    ],
    edges: [["ui", "ctl", "Axios + JWT"], ["ctl", "svc"], ["svc", "js", "read / write"]]
  }
},

buzzpos: {
  tagline: "A bar point-of-sale where every order deducts stock in real time.",
  overview: [
    "A full-stack bar POS: staff log in to a fast billing screen, admins manage inventory and see analytics. Placing an order deducts stock immediately.",
    "Runs on React with Vercel serverless functions and MongoDB Atlas; staff never see cost data."
  ],
  numbers: [["2", "roles: admin · staff"], ["4", "serverless routes"], ["live", "stock deduction"]],
  flow: [
    "Staff and admins log in with role credentials set as Vercel environment variables.",
    "The /pos screen loads items from GET /api/items (cost fields hidden for staff).",
    "POST /api/order records the order and deducts stock in MongoDB.",
    "The /admin dashboard manages items (create, update, delete) and reads analytics from /api/dashboard."
  ],
  sections: [],
  stack: [["Frontend", "React"], ["API", "Vercel serverless functions"], ["Data", "MongoDB Atlas"]],
  docs: ["README.md"],
  arch: {
    layers: [
      { name: "Client", nodes: [
        { id: "pos", t: "Staff POS", s: "/pos · billing", k: "client" },
        { id: "adm", t: "Admin", s: "/admin · inventory + charts", k: "client" } ] },
      { name: "Vercel serverless", nodes: [
        { id: "items", t: "/api/items", s: "CRUD (admin) · read (staff)", k: "service" },
        { id: "ord", t: "/api/order", s: "place order · deduct stock", k: "service" },
        { id: "dsh", t: "/api/dashboard", s: "analytics", k: "service" } ] },
      { name: "Data", nodes: [{ id: "db", t: "MongoDB Atlas", s: "items · orders", k: "data" }] }
    ],
    edges: [["pos", "items"], ["pos", "ord"], ["adm", "items"], ["adm", "dsh"], ["items", "db"], ["ord", "db"], ["dsh", "db"]]
  }
},

posandroid: {
  tagline: "The bar’s billing app on Android: thermal-format bills, opened as PDFs on the device.",
  overview: [
    "Mehfil POS for Android wraps the web billing interface in a Kotlin WebView and bridges it to native Android, so bills are generated in 58 mm thermal format and opened as PDFs directly on the phone.",
    "Auto-generated bill numbers and timestamps, totals with rounding, and a layout tuned for thermal printers."
  ],
  numbers: [["58 mm", "thermal bill format"], ["1", "JS ↔ Kotlin bridge"], ["APK", "built in Android Studio"]],
  flow: [
    "The WebView loads the billing web app (hosted on Vercel).",
    "The user builds a bill; jsPDF + AutoTable render it as a thermal-format PDF.",
    "The PDF is converted to Base64 and handed to Android via window.Android.openPdf(base64).",
    "Kotlin saves it locally and shares it through a FileProvider to an external PDF viewer."
  ],
  sections: [],
  stack: [["Android", "Kotlin, WebView, FileProvider"], ["Web", "HTML, CSS, JavaScript, jsPDF + AutoTable"], ["Hosting", "Vercel"]],
  docs: ["README.md"],
  arch: {
    layers: [
      { name: "Android app (Kotlin)", nodes: [{ id: "wv", t: "WebView", s: "MainActivity.kt", k: "client" }] },
      { name: "Web billing UI", nodes: [
        { id: "web", t: "Billing page", s: "hosted on Vercel", k: "service" },
        { id: "pdf", t: "jsPDF + AutoTable", s: "58 mm bill → Base64", k: "service" } ] },
      { name: "Native side", nodes: [
        { id: "br", t: "JS bridge", s: "window.Android.openPdf()", k: "edge" },
        { id: "fp", t: "FileProvider", s: "save + open in viewer", k: "data" } ] }
    ],
    edges: [["wv", "web", "loads"], ["web", "pdf"], ["pdf", "br", "Base64"], ["br", "fp"]]
  }
},

pingifykt: {
  tagline: "Pingify as a native Android app, built with Kotlin and Jetpack Compose.",
  overview: [
    "A native Android client for Pingify: sign up, onboard, see friends and stack-matched recommendations, send and accept friend requests, and chat 1-on-1 with full history over Stream.",
    "It reuses the Pingify Node.js/Express + MongoDB backend. Voice and video calls are in progress: the UI exists and the Stream Video SDK still needs wiring up."
  ],
  numbers: [["MVVM", "ViewModel + StateFlow"], ["JWT", "httpOnly cookie via CookieJar"], ["SDK 26+", "minimum Android"]],
  flow: [
    "Compose screens (Login, Onboarding, Home, Friends, Chat…) observe ViewModels exposing StateFlow.",
    "Repositories call the API through Retrofit 2 + OkHttp, with a custom CookieJar that keeps the JWT cookie across restarts.",
    "The Express backend reads and writes MongoDB and issues the Stream token.",
    "Chat runs through the Stream Chat Android Compose SDK, initialised in the Application class."
  ],
  sections: [],
  stack: [["App", "Kotlin, Jetpack Compose, Material 3, Navigation Compose, Coil"], ["Networking", "Retrofit 2, OkHttp 3"], ["Real-time", "Stream Chat Android SDK"], ["Backend", "Node.js, Express, MongoDB"]],
  docs: ["README.md"],
  arch: {
    layers: [
      { name: "UI", nodes: [{ id: "ui", t: "Compose screens", s: "Login · Home · Friends · Chat", k: "client" }] },
      { name: "App logic", nodes: [
        { id: "vm", t: "ViewModels", s: "StateFlow", k: "service" },
        { id: "repo", t: "Repositories", s: "Retrofit + CookieJar", k: "service" } ] },
      { name: "Backend & real-time", nodes: [
        { id: "api", t: "Pingify API", s: "Express + MongoDB", k: "service" },
        { id: "st", t: "Stream Chat", s: "Android Compose SDK", k: "ext" } ] }
    ],
    edges: [["ui", "vm"], ["vm", "repo"], ["repo", "api", "REST + JWT cookie"], ["ui", "st", "messages", "dash"], ["api", "st", "token"]]
  }
}
};

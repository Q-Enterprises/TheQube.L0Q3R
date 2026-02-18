const { useState, useEffect, useRef } = React;

const Icon = ({ name, size = 24, className = "" }) => {
  const icons = {
    Leaf: (
      <>
        <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 3.5 1 9.8a7 7 0 0 1-9 8.2Z" />
        <path d="M11 20v-5a4 4 0 0 1 4-4h5" />
      </>
    ),
    Shield: <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />,
    Heart: (
      <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
    ),
    Zap: <path d="M13 2 L3 14 L12 14 L11 22 L21 10 L12 10 L13 2 Z" />,
    Play: <polygon points="5 3 19 12 5 21 5 3" />,
    Pause: (
      <>
        <rect x="6" y="4" width="4" height="16" />
        <rect x="14" y="4" width="4" height="16" />
      </>
    ),
    RotateCcw: (
      <>
        <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
        <path d="M3 3v5h5" />
      </>
    ),
    ShieldAlert: (
      <>
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        <line x1="12" y1="8" x2="12" y2="12" />
        <line x1="12" y1="16" x2="12.01" y2="16" />
      </>
    ),
    Sparkles: (
      <>
        <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
        <path d="M5 3v4" />
        <path d="M19 17v4" />
        <path d="M3 5h4" />
        <path d="M17 19h4" />
      </>
    ),
    MessageSquare: (
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    ),
    Database: (
      <>
        <ellipse cx="12" cy="5" rx="9" ry="3" />
        <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
        <path d="M3 12c0 1.66 4 3 9 3s9-1.34 9-3" />
      </>
    ),
  };
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      {icons[name] || null}
    </svg>
  );
};

const {
  FIXED_DT,
  MAX_ACCUMULATOR,
  INITIAL_SEED,
  createRng,
} = window.Loop0Invariants;
const { fossilize } = window.Loop0Fossil;

const ENTITY_CAPACITY = 32;
const STRIDE = 8;

const TYPE_SPROUTLING = 1;
const TYPE_TRAP = 2;
const TYPE_THREAT = 3;

const TILES = {
  0: { name: "VOID", color: "#020617" },
  1: { name: "MOSS_DIRT", color: "#14532d" },
  2: { name: "CYAN_RAMP", color: "#0e7490" },
  3: { name: "OBSIDIAN", color: "#0f172a" },
};

const INCIDENT_TABLE = {
  RAPTOR_SURGE: { safety: -0.15, happiness: -0.1, color: "#ef4444" },
  FROST_WILT: { happiness: -0.2, finances: -0.05, color: "#60a5fa" },
  SPORE_BLOOM: { finances: 0.1, safety: -0.05, color: "#f59e0b" },
};

const apiKey = "";

const callGemini = async (metrics, incident) => {
  const systemPrompt = `You are the MoE Strategic Coach for Jurassic Pixels. Analyze the current 2.5D simulation state. 
            Metrics: Finances: ${metrics.finances}, Safety: ${metrics.safety}, Happiness: ${metrics.happiness}. 
            Active Incident: ${incident || "NONE"}. 
            Provide a 1-sentence chunky strategy tip in a Bubble-Bobble aesthetic tone.`;

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`;
  const payload = {
    contents: [{ parts: [{ text: "Provide strategic audit." }] }],
    systemInstruction: { parts: [{ text: systemPrompt }] },
  };

  const backoff = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  let delay = 1000;
  for (let i = 0; i < 5; i += 1) {
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!response.ok) throw new Error("API_ERROR");
      const data = await response.json();
      return data.candidates?.[0]?.content?.parts?.[0]?.text;
    } catch (error) {
      if (i === 4) return "NEURAL_LINK_ERR: Check connectivity.";
      await backoff(delay);
      delay *= 2;
    }
  }
  return "NEURAL_LINK_ERR: Check connectivity.";
};

const App = () => {
  const [buffer] = useState(new Float32Array(10 + ENTITY_CAPACITY * STRIDE));
  const [tick, setTick] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [activeIncident, setActiveIncident] = useState(null);
  const [aiTip, setAiTip] = useState("Initializing MoE Council...");
  const [capsule, setCapsule] = useState([]);
  const [fossilHash, setFossilHash] = useState("--------");

  const canvasRef = useRef(null);
  const rngRef = useRef(createRng(INITIAL_SEED));
  const inputQueueRef = useRef([]);

  const StableStringify = {
    fossilize: (snapshot) => fossilize(snapshot),
  };

  const PhysicsManifold = {
    spawnEntity: (type, x, y, rng) => {
      for (let i = 0; i < ENTITY_CAPACITY; i += 1) {
        const ptr = 10 + i * STRIDE;
        if (buffer[ptr + 2] === 0) {
          buffer[ptr] = x ?? rng() * 400;
          buffer[ptr + 1] = y ?? rng() * 300 + 50;
          buffer[ptr + 2] = type;
          buffer[ptr + 3] = 1;
          buffer[ptr + 4] = 1.0;
          buffer[ptr + 5] = (rng() - 0.5) * 2;
          buffer[ptr + 6] = (rng() - 0.5) * 2;
          break;
        }
      }
    },
    step: (intent, rng) => {
      buffer[0] += 1;

      if (intent?.type === "EMIT_BUBBLE") {
        PhysicsManifold.spawnEntity(intent.payload.type, intent.payload.x, intent.payload.y, rng);
      }

      for (let i = 0; i < ENTITY_CAPACITY; i += 1) {
        const p = 10 + i * STRIDE;
        if (buffer[p + 2] === 0) continue;

        buffer[p] += buffer[p + 5];
        buffer[p + 1] += buffer[p + 6];

        if (buffer[p] < 20 || buffer[p] > 580) buffer[p + 5] *= -1;
        if (buffer[p + 1] < 20 || buffer[p + 1] > 380) buffer[p + 6] *= -1;

        if (buffer[p + 2] === TYPE_TRAP) {
          buffer[p + 7] += 1;
          if (buffer[p + 7] > 180) buffer[p + 2] = 0;

          for (let j = 0; j < ENTITY_CAPACITY; j += 1) {
            const target = 10 + j * STRIDE;
            if (buffer[target + 2] === TYPE_THREAT) {
              const dx = buffer[p] - buffer[target];
              const dy = buffer[p + 1] - buffer[target + 1];
              const dist = Math.sqrt(dx * dx + dy * dy);
              if (dist < 30) {
                buffer[target + 2] = 0;
                buffer[p + 2] = 0;
                buffer[1] += 50;
              }
            }
          }
        }
      }

      if (buffer[0] % 600 === 0) {
        const keys = Object.keys(INCIDENT_TABLE);
        const choice = keys[Math.floor(rng() * keys.length)];
        setActiveIncident(choice);
        PhysicsManifold.spawnEntity(TYPE_THREAT, undefined, undefined, rng);
      }
    },
  };

  const SovereignKernel = {
    executeSovereignTick: (proposal) => {
      if (!proposal || proposal.type === "IDLE") return null;
      if (proposal.type === "EMIT_BUBBLE") {
        const { x, y } = proposal.payload;
        if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
      }
      return proposal;
    },
  };

  const AgentRuntime = {
    requestInference: () => inputQueueRef.current.shift() || { type: "IDLE" },
  };

  const EngineCore = {
    tick: () => {
      const proposal = AgentRuntime.requestInference();
      const vetted = SovereignKernel.executeSovereignTick(proposal);
      PhysicsManifold.step(vetted, rngRef.current);

      const snapshot = {
        tick: buffer[0],
        score: buffer[1],
        safety: buffer[2],
        happiness: buffer[3],
        finances: buffer[4],
      };
      setFossilHash(StableStringify.fossilize(snapshot));

      if (buffer[0] % 3000 === 0) {
        updateAiCoaching();
      }

      setTick(buffer[0]);
    },
  };

  useEffect(() => {
    buffer[2] = 0.85;
    buffer[3] = 0.9;
    buffer[4] = 1000;

    for (let i = 0; i < 6; i += 1) {
      PhysicsManifold.spawnEntity(TYPE_SPROUTLING, undefined, undefined, rngRef.current);
    }
  }, []);

  const logInteraction = (type, data) => {
    setCapsule((prev) => [...prev, { tick: buffer[0], type, data }].slice(-20));
  };

  const emitBubble = (event) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    inputQueueRef.current.push({
      type: "EMIT_BUBBLE",
      payload: { type: TYPE_TRAP, x, y },
    });
    logInteraction("EMIT_BUBBLE", { x, y });
  };

  useEffect(() => {
    let frame;
    let accumulator = 0;
    let lastTime = performance.now();

    const loop = (time) => {
      if (isPlaying) {
        const deltaSeconds = Math.min((time - lastTime) / 1000, MAX_ACCUMULATOR);
        accumulator = Math.min(accumulator + deltaSeconds, MAX_ACCUMULATOR);

        while (accumulator >= FIXED_DT) {
          EngineCore.tick();
          accumulator -= FIXED_DT;
        }

        render();
      }
      lastTime = time;
      frame = requestAnimationFrame(loop);
    };

    frame = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frame);
  }, [isPlaying, activeIncident]);

  const updateAiCoaching = async () => {
    const metrics = {
      finances: buffer[4].toFixed(0),
      safety: buffer[2].toFixed(2),
      happiness: buffer[3].toFixed(2),
    };
    const response = await callGemini(metrics, activeIncident);
    setAiTip(response);
  };

  const render = () => {
    const ctx = canvasRef.current.getContext("2d");
    ctx.clearRect(0, 0, 600, 400);

    ctx.strokeStyle = "#1e293b";
    ctx.lineWidth = 1;
    for (let i = 0; i < 600; i += 40) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i, 400);
      ctx.stroke();
    }

    for (let i = 0; i < ENTITY_CAPACITY; i += 1) {
      const p = 10 + i * STRIDE;
      const type = buffer[p + 2];
      if (type === 0) continue;

      const x = buffer[p];
      const y = buffer[p + 1];

      if (type === TYPE_SPROUTLING) {
        ctx.fillStyle = "#22c55e";
        ctx.fillRect(x - 10, y - 10, 20, 20);
        ctx.strokeStyle = "#fff";
        ctx.strokeRect(x - 10, y - 10, 20, 20);
      } else if (type === TYPE_TRAP) {
        ctx.beginPath();
        ctx.arc(x, y, 20, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(6, 182, 212, 0.3)";
        ctx.fill();
        ctx.strokeStyle = "#06b6d4";
        ctx.lineWidth = 2;
        ctx.stroke();
      } else if (type === TYPE_THREAT) {
        ctx.fillStyle = "#ef4444";
        ctx.beginPath();
        ctx.moveTo(x, y - 15);
        ctx.lineTo(x + 15, y + 15);
        ctx.lineTo(x - 15, y + 15);
        ctx.fill();
      }
    }
  };

  return (
    <div className="min-h-screen p-4 md:p-8 flex flex-col gap-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-slate-900/50 p-6 rounded-[2rem] border border-slate-800 shadow-2xl">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-green-600 rounded-2xl pixel-border">
            <Icon name="Leaf" className="text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-black italic uppercase tracking-tighter">
              Jurassic Pixels <span className="text-green-500">v0.6</span>
            </h1>
            <p className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">
              Axiomatic Deterministic Runtime
            </p>
          </div>
        </div>

        <div className="flex gap-6">
          <div className="text-center">
            <span className="text-[10px] uppercase font-black text-slate-500 block mb-1">
              Safety
            </span>
            <div className="flex items-center gap-2">
              <Icon name="Shield" size={14} className="text-blue-500" />
              <span className="text-lg font-black mono text-blue-400">
                {(buffer[2] * 100).toFixed(0)}%
              </span>
            </div>
          </div>
          <div className="text-center border-l border-slate-800 pl-6">
            <span className="text-[10px] uppercase font-black text-slate-500 block mb-1">
              Happiness
            </span>
            <div className="flex items-center gap-2">
              <Icon name="Heart" size={14} className="text-red-500" />
              <span className="text-lg font-black mono text-red-400">
                {(buffer[3] * 100).toFixed(0)}%
              </span>
            </div>
          </div>
          <div className="text-center border-l border-slate-800 pl-6">
            <span className="text-[10px] uppercase font-black text-slate-500 block mb-1">
              Finances
            </span>
            <div className="flex items-center gap-2">
              <Icon name="Zap" size={14} className="text-yellow-500" />
              <span className="text-lg font-black mono text-yellow-400">
                ${buffer[4]}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-grow overflow-hidden">
        <div className="lg:col-span-3 space-y-6 flex flex-col">
          <section className="bg-slate-900 border border-slate-800 rounded-[2rem] p-6 shadow-xl relative overflow-hidden group">
            <div className="absolute -right-4 -top-4 opacity-5 group-hover:rotate-12 transition-transform duration-1000">
              <Icon name="Sparkles" size={120} />
            </div>
            <h3 className="text-[10px] font-black uppercase text-purple-400 tracking-widest mb-4 flex items-center gap-2">
              <Icon name="MessageSquare" size={14} /> Neural MoE Coaching
            </h3>
            <div className="bg-slate-950 p-4 rounded-2xl border border-purple-500/20 min-h-[100px] flex items-center">
              <p className="text-xs font-medium italic text-slate-300 leading-relaxed">
                "{aiTip}"
              </p>
            </div>
            <button
              onClick={updateAiCoaching}
              className="mt-4 w-full py-2 bg-purple-600/10 border border-purple-500/30 text-purple-400 rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-purple-600 hover:text-white transition-all"
            >
              Force Logic Refresh
            </button>
          </section>

          <section className="bg-slate-900/50 border border-slate-800 rounded-[2rem] p-6 flex-grow overflow-hidden flex flex-col">
            <h3 className="text-[10px] font-black uppercase text-slate-500 tracking-widest mb-4 flex items-center gap-2">
              <Icon name="Database" size={14} /> Capsule Event Log
            </h3>
            <div className="space-y-2 overflow-y-auto custom-scrollbar flex-grow pr-2">
              {capsule.map((c, i) => (
                <div
                  key={`${c.type}-${c.tick}-${i}`}
                  className="bg-black/40 p-2 rounded-lg border border-white/5 font-mono text-[9px] flex justify-between"
                >
                  <span className="text-slate-600">T-{c.tick}</span>
                  <span className="text-green-500">{c.type}</span>
                </div>
              ))}
            </div>
          </section>
        </div>

        <div className="lg:col-span-6 flex flex-col gap-4">
          <div className="relative border-4 border-slate-800 rounded-[3rem] overflow-hidden shadow-2xl bg-black group">
            <canvas
              ref={canvasRef}
              width={600}
              height={400}
              onClick={emitBubble}
              className="w-full h-full"
            />
            <div className="absolute top-6 left-6 flex flex-col gap-2 pointer-events-none">
              <div className="bg-black/60 backdrop-blur border border-white/10 px-3 py-1.5 rounded-full flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />
                <span className="text-[9px] font-black uppercase tracking-widest text-white">
                  Live: {activeIncident || "IDLE"}
                </span>
              </div>
            </div>
            <div className="absolute bottom-8 right-8 pointer-events-none">
              <div className="text-right">
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                  Score
                </p>
                <p className="text-4xl font-black italic text-white leading-none">
                  {(buffer[1] || 0).toLocaleString()}
                </p>
              </div>
            </div>
          </div>

          <div className="flex justify-between items-center bg-slate-900/50 p-4 rounded-3xl border border-slate-800">
            <div className="flex gap-2">
              <button
                onClick={() => setIsPlaying(!isPlaying)}
                className="p-3 bg-slate-800 rounded-xl hover:bg-slate-700 transition-colors"
              >
                {isPlaying ? <Icon name="Pause" size={18} /> : <Icon name="Play" size={18} />}
              </button>
              <button
                className="p-3 bg-slate-800 rounded-xl hover:bg-slate-700 transition-colors"
                onClick={() => location.reload()}
              >
                <Icon name="RotateCcw" size={18} />
              </button>
            </div>
            <div className="text-right font-mono text-[10px] text-slate-500">
              VECTOR_TICK: {tick.toString().padStart(8, "0")}
              <div className="text-[9px] text-slate-600">FOSSIL_HASH: {fossilHash}</div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-3 space-y-6">
          <section className="bg-slate-900 border border-slate-800 rounded-[2rem] p-6 shadow-xl">
            <h3 className="text-[10px] font-black uppercase text-slate-500 tracking-widest mb-4">
              Active Tileset Spec
            </h3>
            <div className="space-y-3">
              {Object.entries(TILES).map(([id, t]) => (
                <div
                  key={id}
                  className="flex items-center justify-between p-2 bg-black/20 rounded-xl border border-white/5"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-6 h-6 rounded-md shadow-inner"
                      style={{ backgroundColor: t.color }}
                    />
                    <span className="text-[10px] font-bold text-slate-300">
                      {t.name}
                    </span>
                  </div>
                  <span className="text-[9px] font-mono text-slate-600">v1.0</span>
                </div>
              ))}
            </div>
          </section>

          <section className="bg-slate-900 border border-slate-800 rounded-[2rem] p-6 shadow-xl">
            <h3 className="text-[10px] font-black uppercase text-slate-500 tracking-widest mb-4">
              Threat Table
            </h3>
            <div className="space-y-4">
              {Object.entries(INCIDENT_TABLE).map(([key, data]) => (
                <div
                  key={key}
                  className="relative overflow-hidden p-3 rounded-2xl border border-white/5 group bg-black/40"
                >
                  <div className="flex justify-between items-center relative z-10">
                    <span className="text-[10px] font-black text-white uppercase">
                      {key.replace("_", " ")}
                    </span>
                    <Icon name="ShieldAlert" size={14} style={{ color: data.color }} />
                  </div>
                  <div className="mt-2 flex gap-2">
                    {Object.entries(data).map(([metric, value]) =>
                      metric !== "color" ? (
                        <span
                          key={metric}
                          className="text-[8px] font-bold uppercase text-slate-600"
                        >
                          {metric}: {value}
                        </span>
                      ) : null
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>

      <footer className="text-center text-[10px] text-slate-700 uppercase font-black tracking-[0.5em] mt-auto">
        Caretaker Protocol // 211,734 Vector Space // Bath House Simulations
      </footer>
    </div>
  );
};

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<App />);

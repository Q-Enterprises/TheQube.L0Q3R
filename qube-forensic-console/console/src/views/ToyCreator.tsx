import React, { useState } from "react";

interface ToyCreatorProps {
  onBack?: () => void;
}

export default function ToyCreator({ onBack }: ToyCreatorProps) {
  const [activeTab, setActiveTab] = useState("Structure");

  return (
    <div className="relative flex h-full min-h-screen w-full flex-col max-w-md mx-auto shadow-2xl overflow-hidden bg-background-dark text-slate-900 dark:text-white font-display">
      {/* Background Effects */}
      <div className="absolute inset-0 pointer-events-none z-0">
        {/* Grid Floor */}
        <div className="absolute bottom-0 w-full h-1/2 bg-grid-pattern hologram-grid opacity-20 transform perspective-[500px] rotate-x-12"></div>
        {/* Glow Orbs (Castle Lighting) */}
        <div className="absolute top-20 -left-20 w-64 h-64 bg-primary/20 rounded-full blur-[80px]"></div>
        <div className="absolute bottom-40 -right-20 w-64 h-64 bg-accent-lego-red/10 rounded-full blur-[80px]"></div>
      </div>

      {/* Top Navigation (Castle HUD) */}
      <div className="relative z-10 flex items-center p-4 pt-6 pb-2 justify-between border-b border-white/5 bg-gradient-to-b from-background-dark to-transparent">
        <button
          onClick={onBack}
          className="text-white hover:text-primary transition-colors flex size-10 shrink-0 items-center justify-center rounded-full bg-white/5 backdrop-blur-sm border border-white/10 cursor-pointer"
        >
          <span className="material-symbols-outlined" style={{ fontSize: "24px" }}>arrow_back</span>
        </button>
        <div className="flex flex-col items-center">
          <h2 className="text-white text-sm font-bold tracking-[0.1em] uppercase text-shadow-sm">The Qube</h2>
          <span className="text-primary text-xs font-medium tracking-widest opacity-80">WORKSHOP</span>
        </div>
        <div className="flex items-center gap-2 bg-white/5 backdrop-blur-md px-3 py-1.5 rounded-full border border-accent-lego-yellow/20">
          <span className="text-accent-lego-yellow">🪙</span>
          <p className="text-white text-sm font-bold leading-normal tracking-wide">1,250</p>
        </div>
      </div>

      {/* Main Content Area */}
      <main className="relative z-10 flex-1 flex flex-col px-4 pt-2 pb-24 gap-4 overflow-y-auto hide-scrollbar">
        {/* Holographic Stage / Viewer */}
        <div className="relative w-full aspect-[4/3] rounded-xl overflow-hidden shadow-neon border border-primary/30 group">
          {/* Holographic Background */}
          <div className="absolute inset-0 bg-[#0f111a] bg-opacity-80"></div>
          {/* 3D Model Placeholder */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div
              className="w-full h-full bg-center bg-contain bg-no-repeat transform hover:scale-105 transition-transform duration-500"
              data-alt="3D wireframe render of a blocky toy robot floating in a holographic space"
              style={{
                backgroundImage: 'url("https://lh3.googleusercontent.com/aida-public/AB6AXuAuFqM_EaZYYGMd7Gdd80czY_5GB7hEgXh8BC2TjfszFuh_ah1ldAEMWWnS6m-OYnkblcZaJGV-vYTym8xiLF7m8d7NNBasPOp-nAGbo8DXRa83wavys1YptoY9A9JKSad3MskpVjB7CO_SVQ3bTajkh7WcJWcndeEALTlH9zIC6weI9nzDjjXRVXKdFwXVo2K6p4tp_TG7ilk3C_cfFk_mMaDvvSESqyFDbpqd2p0op_5RSBDEjsmyFp2nDKNITbYhojYSdf0vterC")',
                opacity: 0.9,
                mixBlendMode: 'screen'
              }}
            ></div>
            {/* Rotating Ring Effect */}
            <div className="absolute w-48 h-48 border-[1px] border-primary/30 rounded-full animate-[spin_10s_linear_infinite]"></div>
            <div className="absolute w-56 h-56 border-[1px] border-dashed border-primary/20 rounded-full animate-[spin_15s_linear_infinite_reverse]"></div>
          </div>
          {/* HUD Overlays on Viewport */}
          <div className="absolute top-3 left-3 flex flex-col gap-1">
            <span className="text-[10px] text-primary font-mono uppercase tracking-widest bg-primary/10 px-2 py-0.5 rounded border border-primary/20">Agentic Model v1.0</span>
            <span className="text-[10px] text-white/50 font-mono">POLY: 12.4K</span>
          </div>
          <div className="absolute bottom-3 right-3">
            <button className="bg-black/40 hover:bg-primary/20 text-white p-2 rounded-lg backdrop-blur-sm border border-white/10 transition-colors">
              <span className="material-symbols-outlined" style={{ fontSize: "20px" }}>3d_rotation</span>
            </button>
          </div>
        </div>

        {/* Progress Indicator (Generation Status) */}
        <div className="glass-panel rounded-lg p-3 flex flex-col gap-2">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-primary animate-pulse" style={{ fontSize: "18px" }}>auto_awesome</span>
              <p className="text-white text-xs font-medium uppercase tracking-wide">Processing LORA...</p>
            </div>
            <p className="text-primary text-xs font-bold">42%</p>
          </div>
          <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
            <div className="h-full bg-primary shadow-[0_0_10px_#1337ec] rounded-full" style={{ width: "42%" }}></div>
          </div>
        </div>

        {/* AI Composer / Command Terminal */}
        <div className="glass-panel rounded-xl p-1 relative overflow-hidden group focus-within:ring-1 focus-within:ring-primary/50 transition-all">
          <div className="flex items-center gap-2">
            <div className="pl-3 text-primary/70">
              <span className="material-symbols-outlined" style={{ fontSize: "20px" }}>terminal</span>
            </div>
            <input className="w-full bg-transparent border-none text-white placeholder-white/30 text-sm py-3 px-1 focus:ring-0 font-mono focus:outline-none" placeholder="Type command (e.g. 'Add dragon wings')..." />
            <button className="bg-primary hover:bg-primary-glow text-white rounded-lg px-4 py-2 text-xs font-bold uppercase tracking-wider transition-all shadow-lg shadow-primary/20 mr-1 cursor-pointer">
              Generate
            </button>
          </div>
        </div>

        {/* Customization Tabs & Panels */}
        <div className="flex flex-col gap-4 mt-2">
          {/* Tabs */}
          <div className="flex border-b border-white/10 px-2 space-x-6">
            <button
              className={`pb-3 border-b-2 text-sm font-bold tracking-wide transition-colors ${activeTab === 'Structure' ? 'border-primary text-white' : 'border-transparent text-white/40 hover:text-white/70 font-medium'}`}
              onClick={() => setActiveTab('Structure')}
            >
              Structure
            </button>
            <button
              className={`pb-3 border-b-2 text-sm font-bold tracking-wide transition-colors ${activeTab === 'Texture' ? 'border-primary text-white' : 'border-transparent text-white/40 hover:text-white/70 font-medium'}`}
              onClick={() => setActiveTab('Texture')}
            >
              Texture
            </button>
            <button
              className={`pb-3 border-b-2 text-sm font-bold tracking-wide transition-colors ${activeTab === 'Personality' ? 'border-primary text-white' : 'border-transparent text-white/40 hover:text-white/70 font-medium'}`}
              onClick={() => setActiveTab('Personality')}
            >
              Personality
            </button>
          </div>

          {/* Component Carousel (Horizontal Scroll) */}
          <div>
            <div className="flex justify-between items-center mb-3 px-1">
              <h3 className="text-xs text-white/60 font-bold uppercase tracking-widest">Available Parts</h3>
              <span className="text-[10px] text-primary cursor-pointer hover:underline">View All</span>
            </div>
            <div className="flex gap-3 overflow-x-auto pb-4 hide-scrollbar snap-x">
              {/* Card 1 (Active) */}
              <div className="snap-center min-w-[100px] bg-surface-dark border border-primary/50 rounded-xl p-2 flex flex-col items-center gap-2 relative shadow-neon cursor-pointer">
                <div className="absolute top-2 right-2 w-2 h-2 bg-primary rounded-full animate-pulse"></div>
                <div
                  className="w-16 h-16 rounded-lg bg-black/50 flex items-center justify-center border border-white/5 mt-1"
                  data-alt="Icon of a blocky robot head"
                  style={{ backgroundImage: "radial-gradient(circle at center, #1337ec20 0%, transparent 70%)" }}
                >
                  <span className="material-symbols-outlined text-white" style={{ fontSize: "32px" }}>smart_toy</span>
                </div>
                <span className="text-[10px] text-white font-bold text-center">Mecha Head</span>
                <span className="text-[9px] text-primary font-mono">Lvl 3</span>
              </div>
              {/* Card 2 */}
              <div className="snap-center min-w-[100px] bg-white/5 border border-white/5 rounded-xl p-2 flex flex-col items-center gap-2 hover:bg-white/10 transition-colors cursor-pointer">
                <div className="w-16 h-16 rounded-lg bg-black/50 flex items-center justify-center border border-white/5 mt-1">
                  <span className="material-symbols-outlined text-white/60" style={{ fontSize: "32px" }}>pest_control</span>
                </div>
                <span className="text-[10px] text-white/70 font-medium text-center">Bug Legs</span>
                <span className="text-[9px] text-white/30 font-mono">Lvl 1</span>
              </div>
              {/* Card 3 */}
              <div className="snap-center min-w-[100px] bg-white/5 border border-white/5 rounded-xl p-2 flex flex-col items-center gap-2 hover:bg-white/10 transition-colors cursor-pointer">
                <div className="w-16 h-16 rounded-lg bg-black/50 flex items-center justify-center border border-white/5 mt-1">
                  <span className="material-symbols-outlined text-white/60" style={{ fontSize: "32px" }}>rocket_launch</span>
                </div>
                <span className="text-[10px] text-white/70 font-medium text-center">Jet Pack</span>
                <span className="text-[9px] text-white/30 font-mono">Lvl 5</span>
              </div>
              {/* Card 4 */}
              <div className="snap-center min-w-[100px] bg-white/5 border border-white/5 rounded-xl p-2 flex flex-col items-center gap-2 hover:bg-white/10 transition-colors cursor-pointer">
                <div className="w-16 h-16 rounded-lg bg-black/50 flex items-center justify-center border border-white/5 mt-1">
                  <span className="material-symbols-outlined text-white/60" style={{ fontSize: "32px" }}>shield</span>
                </div>
                <span className="text-[10px] text-white/70 font-medium text-center">Deflector</span>
                <span className="text-[9px] text-white/30 font-mono">Lvl 2</span>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Bottom Actions (Mint/Save) */}
      <div className="absolute bottom-0 w-full p-4 bg-background-dark/90 backdrop-blur-lg border-t border-white/10 z-20">
        <div className="flex gap-3">
          <button className="flex-1 bg-surface-dark hover:bg-white/10 text-white border border-white/10 font-bold py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer">
            <span className="material-symbols-outlined" style={{ fontSize: "20px" }}>save</span>
            <span>Save Draft</span>
          </button>
          <button className="flex-[2] bg-gradient-to-r from-primary to-blue-600 hover:to-blue-500 text-white font-bold py-3 px-4 rounded-xl shadow-neon flex items-center justify-center gap-2 transition-all transform active:scale-95 cursor-pointer">
            <span className="material-symbols-outlined" style={{ fontSize: "20px" }}>diamond</span>
            <span>Mint Artifact</span>
          </button>
        </div>
      </div>
    </div>
  );
}

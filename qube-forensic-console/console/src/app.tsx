import React, { useEffect, useMemo, useState } from "react";
import { Routes, Route, useNavigate, Navigate, useLocation } from "react-router-dom";
import { loadTelemetryNDJSON } from "./api";
import { TelemetryEventV1 } from "./types";
import EventList from "./views/EventList";
import EventDetail from "./views/EventDetail";
import ToyCreator from "./views/ToyCreator";
import Auth from "./components/Auth";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { useAuth } from "./hooks/useAuth";
import StatsCards from "./components/StatsCards";
import AuditLog from "./components/AuditLog";
import TokenCapsules from "./components/TokenCapsules";

function Dashboard() {
  const [events, setEvents] = useState<TelemetryEventV1[]>([]);
  const [selected, setSelected] = useState<TelemetryEventV1 | null>(null);
  const navigate = useNavigate();
  const { user, session } = useAuth();

  useEffect(() => {
    loadTelemetryNDJSON("/ssot_telemetry_audit.ndjson").then((e) => {
      const filtered = e.filter((x) => x.payloadType === "qube_forensic_report.v1");
      setEvents(filtered);
      setSelected(filtered[0] ?? null);
    });
  }, []);

  const byCase = useMemo(() => {
    const m = new Map<string, TelemetryEventV1[]>();
    for (const ev of events) {
      const cid = ev.lineage?.caseId ?? ev.payload?.caseId ?? "unknown";
      m.set(cid, [...(m.get(cid) ?? []), ev]);
    }
    return m;
  }, [events]);

  return (
    <div className="flex h-screen bg-background-dark text-white overflow-hidden">
      {/* Sidebar / Navigation */}
      <aside className="w-64 border-r border-white/10 flex flex-col bg-surface-dark">
        <div className="p-4 border-b border-white/10">
          <h1 className="text-xl font-bold tracking-tight text-primary-glow">Qube Console</h1>
          <p className="text-xs text-white/40 mt-1 uppercase tracking-widest">Forensic Unit</p>
        </div>

        <nav className="flex-1 p-4 space-y-2">
          <div className="text-xs font-bold text-white/30 uppercase tracking-wider mb-2">Modules</div>
          <button className="w-full text-left px-3 py-2 rounded-lg bg-primary/10 text-primary font-medium flex items-center gap-2 border border-primary/20">
            <span className="material-symbols-outlined text-sm">dashboard</span>
            Dashboard
          </button>
          <button
            onClick={() => navigate('/toy-creator')}
            className="w-full text-left px-3 py-2 rounded-lg hover:bg-white/5 text-white/70 hover:text-white transition-colors flex items-center gap-2"
          >
            <span className="material-symbols-outlined text-sm">smart_toy</span>
            Toy Creator
          </button>

          <div className="text-xs font-bold text-white/30 uppercase tracking-wider mb-2 mt-6">System</div>
          <button className="w-full text-left px-3 py-2 rounded-lg hover:bg-white/5 text-white/70 hover:text-white transition-colors flex items-center gap-2">
            <span className="material-symbols-outlined text-sm">settings</span>
            Configuration
          </button>
        </nav>

        <div className="p-4 border-t border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center text-xs font-bold">
              {user?.email?.charAt(0).toUpperCase() || 'A'}
            </div>
            <div className="flex-1 overflow-hidden">
              <p className="text-sm font-medium truncate">{user?.email || 'Authenticated User'}</p>
              <p className="text-xs text-green-400 flex items-center gap-1">
                <span className="w-1.5 h-1.5 bg-green-500 rounded-full"></span>
                Online
              </p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="h-16 border-b border-white/10 flex items-center justify-between px-6 bg-surface-dark/50 backdrop-blur-md">
          <h2 className="text-lg font-bold">Mission Control</h2>
          <div className="flex items-center gap-4">
             <span className="text-xs text-white/40 font-mono">{new Date().toISOString()}</span>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <StatsCards />

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
               <TokenCapsules />

               <div className="glass-panel rounded-xl border border-white/10 overflow-hidden">
                 <div className="p-4 border-b border-white/10 bg-white/5 flex justify-between items-center">
                   <h3 className="font-bold text-sm uppercase tracking-wide">Recent Telemetry</h3>
                   <span className="text-xs text-white/40">{events.length} events loaded</span>
                 </div>
                 <div className="h-[300px] overflow-y-auto">
                    <EventList events={events} selected={selected} onSelect={setSelected} />
                 </div>
               </div>
            </div>

            <div className="space-y-6">
              <div className="glass-panel rounded-xl p-4 border border-white/10 h-full">
                 <AuditLog />
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/auth" element={<Auth />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/toy-creator"
        element={
          <ProtectedRoute>
            <div className="h-screen bg-background-dark flex items-center justify-center">
              <ToyCreator onBack={() => window.history.back()} />
            </div>
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

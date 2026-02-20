import React, { useEffect, useMemo, useState } from "react";
import { loadTelemetryNDJSON } from "./api";
import { TelemetryEventV1 } from "./types";
import EventList from "./views/EventList";
import EventDetail from "./views/EventDetail";
import ToyCreator from "./views/ToyCreator";

export default function App() {
  const [events, setEvents] = useState<TelemetryEventV1[]>([]);
  const [selected, setSelected] = useState<TelemetryEventV1 | null>(null);
  const [view, setView] = useState<"console" | "toy-creator">("toy-creator");

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

  if (view === "toy-creator") {
    return (
      <div className="flex justify-center min-h-screen bg-background-dark">
        <ToyCreator onBack={() => setView("console")} />
      </div>
    );
  }

  return (
    <div style={{ display: "grid", gridTemplateColumns: "360px 1fr", height: "100vh" }}>
      <div style={{ borderRight: "1px solid #ddd", overflow: "auto", position: "relative" }}>
        <button
          onClick={() => setView("toy-creator")}
          style={{
            position: "sticky",
            top: 0,
            width: "100%",
            padding: "8px",
            backgroundColor: "#eee",
            borderBottom: "1px solid #ddd",
            marginBottom: "8px",
            cursor: "pointer",
            fontWeight: "bold"
          }}
        >
          Open Toy Creator
        </button>
        <EventList events={events} selected={selected} onSelect={setSelected} />
      </div>
      <div style={{ overflow: "auto" }}>
        {selected ? <EventDetail event={selected} /> : <div style={{ padding: 16 }}>No event selected</div>}
        {/* byCase available for future grouping view */}
        <div style={{ display: "none" }}>{byCase.size}</div>
      </div>
    </div>
  );
}

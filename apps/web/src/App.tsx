import { useState } from "react";

type SearchMode = "survey" | "owner" | "village";

export default function App() {
  const [mode, setMode] = useState<SearchMode>("survey");
  const [query, setQuery] = useState("");

  return <div className="app-shell">
    <header className="topbar">
      <div><div className="eyebrow">MAHARASHTRA LAND INTELLIGENCE</div><h1>Understand the land before you build on it.</h1></div>
      <div className="status-pill"><span /> Survey-level MVP</div>
    </header>
    <main className="workspace">
      <section className="search-panel">
        <div className="panel-title">Find a property</div>
        <div className="search-tabs">{(["survey","owner","village"] as SearchMode[]).map(item =>
          <button key={item} className={mode===item?"active":""} onClick={()=>setMode(item)}>
            {item==="survey"?"Survey No.":item[0].toUpperCase()+item.slice(1)}
          </button>)}</div>
        <div className="search-box"><span>⌕</span><input value={query} onChange={e=>setQuery(e.target.value)} placeholder={mode==="survey"?"Search survey number, e.g. 10":`Search ${mode}...`} /><kbd>⌘ K</kbd></div>
        <div className="hint">Search will resolve village, survey geometry and land records through the government-data adapter.</div>
        <div className="section-heading"><span>Selected survey</span><span className="muted">Data adapter pending</span></div>
        <div className="survey-card"><div className="label">SURVEY / PLOT</div><div className="survey-number">{query||"10"}</div>
          <div className="survey-meta"><div><span>Village</span><strong>Akoli</strong></div><div><span>Taluka</span><strong>—</strong></div><div><span>District</span><strong>Amravati</strong></div></div>
        </div>
        <div className="metrics"><Metric label="Survey area" value="52,841.23" suffix="sq m" /><Metric label="Sub-survey geometry" value="N/A" suffix="not supplied" /><Metric label="Source" value="GIS" suffix="government" /></div>
      </section>
      <section className="map-panel"><div className="map-toolbar"><button className="tool active">Survey boundary</button><button className="tool">DP / zoning</button><button className="tool">Roads</button></div>
        <div className="map-canvas"><div className="map-grid"/><div className="survey-shape"><div className="shape-label">Survey {query||"10"}</div></div>
          <div className="map-note"><strong>Map adapter ready</strong><span>Authoritative survey geometry will render here after the government GIS endpoint is connected.</span></div>
        </div>
      </section>
      <aside className="details-panel"><div className="panel-title">Land records</div>
        <div className="detail-summary"><div><span>Geometry</span><strong>Available</strong></div><div><span>Sub-survey geometry</span><strong>Not available</strong></div><div><span>Source</span><strong>Government GIS</strong></div></div>
        <div className="record-row"><div><strong>Sub-survey attributes</strong><span>Will be populated from API response</span></div><div className="record-side"><span>Pending</span></div></div>
        <div className="source-box"><div className="label">PROVENANCE</div><p>Government-derived facts will retain source, request parameters and retrieval timestamp.</p></div>
      </aside>
    </main>
  </div>;
}
function Metric({label,value,suffix}:{label:string;value:string;suffix:string}) {
  return <div className="metric"><span>{label}</span><strong>{value}</strong><small>{suffix}</small></div>;
}

import { useCallback, useEffect, useRef, useState } from "react";
import maplibregl, { type Map as MapLibreMap } from "maplibre-gl";
import { ApiError, getDistricts, getSurveyData, getSurveyNumbers, getTalukas, getVillages, type LocationOption, type SurveyData, type SurveyRecord } from "./api";

type SearchMode = "survey" | "owner" | "village";

const DEMO_VILLAGE_ID = "270700090077070000";

function formatNumber(value: number | string | null | undefined, fractionDigits = 2) {
  if (value === null || value === undefined || value === "") return "—";
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return String(value);
  return new Intl.NumberFormat("en-IN", {
    maximumFractionDigits: fractionDigits,
    minimumFractionDigits: fractionDigits === 0 ? 0 : 0,
  }).format(numeric);
}

function formatDate(value?: string) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function geometryToFeature(geometry: GeoJSON.Geometry | null | undefined): GeoJSON.Feature<GeoJSON.Geometry> | null {
  if (!geometry) return null;
  return {
    type: "Feature",
    properties: {},
    geometry,
  };
}

function MapView({ survey }: { survey: SurveyData | null }) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapLibreMap | null>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      center: [77.75, 20.93],
      zoom: 13,
      attributionControl: false,
      style: {
        version: 8,
        sources: {
          osm: {
            type: "raster",
            tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
            tileSize: 256,
            attribution: "© OpenStreetMap contributors",
          },
        },
        layers: [
          {
            id: "osm",
            type: "raster",
            source: "osm",
          },
        ],
      },
    });

    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "bottom-right");
    map.addControl(new maplibregl.AttributionControl({ compact: true }), "bottom-left");
    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !survey) return;

    const renderSurvey = () => {
      const sourceId = "survey-boundary";
      const fillId = "survey-fill";
      const lineId = "survey-line";
      const labelId = "survey-label";
      const extentSourceId = "survey-extent";
      const extentLineId = "survey-extent-line";
      const extentLabelId = "survey-extent-label";

      const removeLayerAndSource = (layerIds: string[], sourceIdToRemove: string) => {
        layerIds.forEach((id) => {
          if (map.getLayer(id)) map.removeLayer(id);
        });
        if (map.getSource(sourceIdToRemove)) map.removeSource(sourceIdToRemove);
      };

      const hasGeometry = Boolean(survey.geometry);
      const feature = hasGeometry ? geometryToFeature(survey.geometry) : null;

      if (feature) {
        const existing = map.getSource(sourceId);
        if (existing) {
          (existing as maplibregl.GeoJSONSource).setData(feature);
        } else {
          map.addSource(sourceId, { type: "geojson", data: feature });
          map.addLayer({
            id: fillId,
            type: "fill",
            source: sourceId,
            paint: {
              "fill-color": "#c8b84d",
              "fill-opacity": 0.22,
            },
          });
          map.addLayer({
            id: lineId,
            type: "line",
            source: sourceId,
            paint: {
              "line-color": "#f3df65",
              "line-width": 3,
              "line-opacity": 0.95,
            },
          });
          map.addLayer({
            id: labelId,
            type: "symbol",
            source: sourceId,
            layout: {
              "text-field": `Survey ${survey.survey.number}`,
              "text-size": 13,
              "text-font": ["Open Sans Regular"],
              "text-allow-overlap": true,
            },
            paint: {
              "text-color": "#fff8b4",
              "text-halo-color": "#151a1f",
              "text-halo-width": 2,
            },
          });
        }

        removeLayerAndSource([extentLineId, extentLabelId], extentSourceId);
      } else {
        removeLayerAndSource([fillId, lineId, labelId], sourceId);

        const bbox = survey.bbox;
        const bboxValid =
          bbox &&
          [bbox.xmin, bbox.ymin, bbox.xmax, bbox.ymax].every(
            (value) => value !== null && Number.isFinite(Number(value)),
          ) &&
          Number(bbox.xmin) < Number(bbox.xmax) &&
          Number(bbox.ymin) < Number(bbox.ymax);

        if (bboxValid) {
          const extentFeature: GeoJSON.Feature<GeoJSON.Polygon> = {
            type: "Feature",
            properties: {},
            geometry: {
              type: "Polygon",
              coordinates: [[
                [Number(bbox!.xmin), Number(bbox!.ymin)],
                [Number(bbox!.xmax), Number(bbox!.ymin)],
                [Number(bbox!.xmax), Number(bbox!.ymax)],
                [Number(bbox!.xmin), Number(bbox!.ymax)],
                [Number(bbox!.xmin), Number(bbox!.ymin)],
              ]],
            },
          };

          const existingExtent = map.getSource(extentSourceId);
          if (existingExtent) {
            (existingExtent as maplibregl.GeoJSONSource).setData(extentFeature);
          } else {
            map.addSource(extentSourceId, { type: "geojson", data: extentFeature });
            map.addLayer({
              id: extentLineId,
              type: "line",
              source: extentSourceId,
              paint: {
                "line-color": "#f3df65",
                "line-width": 3,
                "line-opacity": 0.95,
                "line-dasharray": [2, 2],
              },
            });
            map.addLayer({
              id: extentLabelId,
              type: "symbol",
              source: extentSourceId,
              layout: {
                "text-field": `Approximate extent · Survey ${survey.survey.number}`,
                "text-size": 11,
                "text-allow-overlap": true,
              },
              paint: {
                "text-color": "#f3df65",
                "text-halo-color": "#151a1f",
                "text-halo-width": 2,
              },
            });
          }
        } else {
          removeLayerAndSource([extentLineId, extentLabelId], extentSourceId);
        }
      }

      const bbox = survey.bbox;
      const bboxValid =
        bbox &&
        [bbox.xmin, bbox.ymin, bbox.xmax, bbox.ymax].every(
          (value) => value !== null && Number.isFinite(Number(value)),
        ) &&
        Number(bbox.xmin) < Number(bbox.xmax) &&
        Number(bbox.ymin) < Number(bbox.ymax);

      if (bboxValid) {
        map.fitBounds(
          [
            [Number(bbox.xmin), Number(bbox.ymin)],
            [Number(bbox.xmax), Number(bbox.ymax)],
          ],
          { padding: 110, duration: 800, maxZoom: 18 },
        );
      } else if (feature) {
        const bounds = new maplibregl.LngLatBounds();
        const coordinates = feature.geometry.type === "Polygon"
          ? feature.geometry.coordinates.flat(1)
          : feature.geometry.type === "MultiPolygon"
            ? feature.geometry.coordinates.flat(2)
            : [];

        coordinates.forEach(([lng, lat]) => bounds.extend([lng, lat]));
        if (!bounds.isEmpty()) {
          map.fitBounds(bounds, { padding: 110, duration: 800, maxZoom: 18 });
        }
      }
    };

    if (map.isStyleLoaded()) {
      renderSurvey();
    } else {
      map.once("load", renderSurvey);
    }

    return () => {
      map.off("load", renderSurvey);
    };
  }, [survey]);


  return <div ref={containerRef} className="map-canvas" />;
}

export default function App() {
  const [mode, setMode] = useState<SearchMode>("survey");
  const [query, setQuery] = useState("10");
  const [districtId, setDistrictId] = useState("7");
  const [talukaId, setTalukaId] = useState("9");
  const [villageId, setVillageId] = useState(DEMO_VILLAGE_ID);
  const [districts, setDistricts] = useState<LocationOption[]>([]);
  const [talukas, setTalukas] = useState<LocationOption[]>([]);
  const [villages, setVillages] = useState<LocationOption[]>([]);
  const [surveyNumbers, setSurveyNumbers] = useState<LocationOption[]>([]);
  const [locationsLoading, setLocationsLoading] = useState(true);
  const [survey, setSurvey] = useState<SurveyData | null>(null);
  const [selectedRecord, setSelectedRecord] = useState<SurveyRecord | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    getDistricts(controller.signal).then(setDistricts).catch((err) => {
      if (!(err instanceof DOMException && err.name === "AbortError")) setError(err instanceof ApiError ? err.message : "Unable to load districts.");
    }).finally(() => {
      if (!controller.signal.aborted) setLocationsLoading(false);
    });
    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (!districtId) { setTalukas([]); return; }
    const controller = new AbortController();
    getTalukas(districtId, controller.signal).then((items) => {
      setTalukas(items);
      if (!items.some((item) => String(item.id) === talukaId)) setTalukaId(String(items[0]?.id ?? ""));
    }).catch((err) => {
      if (!(err instanceof DOMException && err.name === "AbortError")) setError(err instanceof ApiError ? err.message : "Unable to load talukas.");
    });
    return () => controller.abort();
  }, [districtId]);

  useEffect(() => {
    if (!talukaId) { setVillages([]); return; }
    const controller = new AbortController();
    getVillages(talukaId, controller.signal).then((items) => {
      setVillages(items);
      if (!items.some((item) => String(item.id) === villageId)) {
        const preferred = items.find((item) => String(item.id) === DEMO_VILLAGE_ID);
        setVillageId(String(preferred?.id ?? items[0]?.id ?? ""));
      }
    }).catch((err) => {
      if (!(err instanceof DOMException && err.name === "AbortError")) setError(err instanceof ApiError ? err.message : "Unable to load villages.");
    });
    return () => controller.abort();
  }, [talukaId]);

  useEffect(() => {
    if (!villageId) { setSurveyNumbers([]); return; }
    const controller = new AbortController();
    getSurveyNumbers(villageId, controller.signal).then(setSurveyNumbers).catch((err) => {
      if (!(err instanceof DOMException && err.name === "AbortError")) setError(err instanceof ApiError ? err.message : "Unable to load survey numbers.");
    });
    return () => controller.abort();
  }, [villageId]);

  const loadSurvey = useCallback(async () => {
    if (mode !== "survey") {
      setError(`${mode[0].toUpperCase() + mode.slice(1)} search is the next data-source step. Survey search is live now.`);
      return;
    }

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    setError("");

    try {
      const data = await getSurveyData(query, villageId, controller.signal);
      setSurvey(data);
      setSelectedRecord(null);
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      setSurvey(null);
      setSelectedRecord(null);
      setError(err instanceof ApiError ? err.message : "Unable to load survey data.");
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }, [mode, query, villageId]);

  useEffect(() => {
    void loadSurvey();
    return () => abortRef.current?.abort();
  }, []); // initial demo survey load only

  const records = survey?.records ?? [];
  const area = survey?.survey.area_sq_m ?? null;
  const owners = survey?.summary.owners ?? [];

  return (
    <div className="app-shell">
      <header className="topbar">
        <div>
          <div className="eyebrow">MAHARASHTRA LAND INTELLIGENCE</div>
          <h1>Understand the land before you build on it.</h1>
        </div>
        <div className="status-pill"><span /> Survey-level MVP · Live API</div>
      </header>

      <main className="workspace">
        <section className="search-panel">
          <div className="panel-title">Find a property</div>

          <div className="search-tabs">
            {(["survey", "owner", "village"] as SearchMode[]).map((item) => (
              <button
                key={item}
                className={mode === item ? "active" : ""}
                onClick={() => setMode(item)}
              >
                {item === "survey" ? "Survey No." : item[0].toUpperCase() + item.slice(1)}
              </button>
            ))}
          </div>

          <form
            className="search-form"
            onSubmit={(event) => {
              event.preventDefault();
              void loadSurvey();
            }}
          >
            {mode === "survey" ? (
              <>
                <LocationSelect label="District" value={districtId} options={districts} disabled={locationsLoading} onChange={setDistrictId} />
                <LocationSelect label="Taluka" value={talukaId} options={talukas} disabled={!districtId || locationsLoading} onChange={setTalukaId} />
                <LocationSelect label="Village" value={villageId} options={villages} disabled={!talukaId || locationsLoading} onChange={setVillageId} />
                <div className="village-field">
                  <label htmlFor="survey-number">Survey number</label>
                  <input id="survey-number" list="survey-number-options" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="e.g. 10" autoComplete="off" />
                  <datalist id="survey-number-options">
                    {surveyNumbers.map((item) => <option key={String(item.id)} value={String(item.number ?? item.name ?? "")} />)}
                  </datalist>
                </div>
              </>
            ) : (
              <div className="search-box">
                <span>⌕</span>
                <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={"Search " + mode + "..."} aria-label="Search" />
              </div>
            )}
            <button className="search-button" type="submit" disabled={loading || mode !== "survey" || !districtId || !talukaId || !villageId || !query.trim()}>
              {loading ? "Loading survey…" : "Open survey"}
            </button>
          </form>

          <div className="hint">
            Select a Maharashtra location, then open a survey number. Internal government identifiers stay behind the Land Intelligence API.
          </div>

          {error && <div className="error-box">{error}</div>}

          <div className="section-heading">
            <span>Selected survey</span>
            <span className="muted">{survey ? "Live data" : "No survey loaded"}</span>
          </div>

          <div className="survey-card">
            <div className="label">SURVEY / PLOT</div>
            <div className="survey-number">{(survey?.survey.number ?? query) || "—"}</div>
            <div className="survey-meta">
              <div><span>Village</span><strong>{displayName(villages, survey?.survey.village_id ?? villageId)}</strong></div>
              <div><span>GIS code</span><strong>{survey?.survey.gis_code ?? "—"}</strong></div>
              <div><span>Plot ID</span><strong title={survey?.survey.plot_id ?? ""}>{survey?.survey.plot_id ? `${survey.survey.plot_id.slice(0, 10)}…` : "—"}</strong></div>
            </div>
          </div>

          <div className="metrics">
            <Metric label="Survey area" value={formatNumber(area)} suffix="sq m" />
            <Metric label="Land records" value={formatNumber(survey?.summary.record_count, 0)} suffix="records" />
            <Metric label="Owners" value={formatNumber(survey?.summary.owner_count, 0)} suffix="distinct" />
            <Metric label="Sub-survey geometry" value="N/A" suffix="not supplied" />
          </div>
        </section>

        <section className="map-panel">
          <div className="map-toolbar">
            <button className="tool active">Survey boundary</button>
            <button className="tool" disabled>DP / zoning</button>
            <button className="tool" disabled>Roads</button>
          </div>

          <MapView survey={survey} />

          {!survey && !loading && !error && (
            <div className="map-empty">
              <strong>Search for a survey</strong>
              <span>The authoritative survey boundary will appear here.</span>
            </div>
          )}

          {loading && (
            <div className="map-status">
              <span className="spinner" /> Loading authoritative survey geometry…
            </div>
          )}

          {error && !loading && (
            <div className="map-status error">
              <strong>Survey unavailable</strong>
              <span>Check the survey number, village ID, or API deployment.</span>
            </div>
          )}
        </section>

        <aside className="details-panel">
          <div className="panel-title">Land records</div>

          <div className="detail-summary">
            <div><span>Geometry</span><strong>{survey?.geometry_available ? "Available" : "—"}</strong></div>
            <div><span>Sub-survey geometry</span><strong>Not available</strong></div>
            <div><span>Source</span><strong>{survey?.source.provider ?? "—"}</strong></div>
          </div>

          {owners.length > 0 && (
            <div className="owner-section">
              <div className="subheading">Owners</div>
              <div className="owner-list">
                {owners.slice(0, 8).map((owner) => (
                  <div className="owner-row" key={owner.name}>
                    <div>
                      <strong>{owner.name || "Unknown owner"}</strong>
                      <span>{owner.record_count} record{owner.record_count === 1 ? "" : "s"}</span>
                    </div>
                    <span>{formatNumber(owner.area_sq_m)} m²</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="records-heading">
            <div>
              <div className="subheading">Sub-survey attributes</div>
              <span>{records.length} records returned · geometry not supplied by source</span>
            </div>
          </div>

          <div className="record-list">
            {records.length === 0 && survey && (
              <div className="empty-records">No land-record rows were returned for this survey.</div>
            )}

            {records.map((record, index) => (
              <button
                className={selectedRecord === record ? "record-row selected" : "record-row"}
                key={`${record.survey_number}-${record.khata_number}-${index}`}
                onClick={() => setSelectedRecord(record)}
              >
                <div>
                  <strong>{record.survey_number || "—"}</strong>
                  <span>{record.owner_name || "Owner not supplied"}</span>
                </div>
                <div className="record-side">
                  <strong>{formatNumber(record.area)} m²</strong>
                  <span>Khata {record.khata_number ?? "—"}</span>
                </div>
              </button>
            ))}
          </div>

          {selectedRecord && (
            <div className="record-detail">
              <div className="label">RECORD DETAIL</div>
              <div className="detail-grid">
                <div><span>Survey no.</span><strong>{selectedRecord.survey_number}</strong></div>
                <div><span>Area</span><strong>{formatNumber(selectedRecord.area)} m²</strong></div>
                <div><span>Pot kharaba</span><strong>{formatNumber(selectedRecord.pot_kharab)} m²</strong></div>
                <div><span>Khata</span><strong>{selectedRecord.khata_number ?? "—"}</strong></div>
                <div><span>Record type</span><strong>{selectedRecord.record_type ?? "—"}</strong></div>
                <div className="wide"><span>Owner</span><strong>{selectedRecord.owner_name || "—"}</strong></div>
              </div>
            </div>
          )}

          <div className="source-box">
            <div className="label">PROVENANCE</div>
            <p>{survey?.source.provider ?? "Government-derived facts"} are retained with source metadata and retrieval time.</p>
            <div className="provenance-lines">
              <span>Adapter: {survey?.meta?.adapter ?? "—"}</span>
              <span>Retrieved: {formatDate(survey?.meta?.retrieved_at)}</span>
              <span>Geometry: {survey?.source.survey_geometry ?? "—"}</span>
              <span>Records: {survey?.source.land_records ?? "—"}</span>
            </div>
          </div>
        </aside>
      </main>
    </div>
  );
}

function displayName(options: LocationOption[], id: string | number | null | undefined) {
  const item = options.find((option) => String(option.id) === String(id));
  return item?.englishName || item?.name || String(id ?? "—");
}

function LocationSelect({ label, value, options, disabled, onChange }: {
  label: string;
  value: string;
  options: LocationOption[];
  disabled?: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <div className="village-field">
      <label>{label}</label>
      <select value={value} disabled={disabled} onChange={(event) => onChange(event.target.value)}>
        <option value="">Select {label.toLowerCase()}…</option>
        {options.map((option) => (
          <option key={String(option.id)} value={String(option.id)}>
            {option.englishName || option.name || option.id}
          </option>
        ))}
      </select>
    </div>
  );
}

function Metric({ label, value, suffix }: { label: string; value: string; suffix: string }) {
  return (
    <div className="metric">
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{suffix}</small>
    </div>
  );
}

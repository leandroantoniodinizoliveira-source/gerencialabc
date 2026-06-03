import React, { useState, useEffect, useRef, useMemo } from "react";
import { MapContainer, TileLayer, GeoJSON, useMap, CircleMarker, Tooltip, Polyline, Marker } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Upload, Save, Columns } from "lucide-react";
import { cn } from "../lib/utils";

interface MapTabProps {
  systemSaldoData: {
    systemName: string;
    systemId: number | string;
    saldo: number;
    oferta?: number;
    demanda?: number;
    demandaHabitantes?: number;
    saldoHabitantes?: number;
    iad?: number;
  }[];
  systemSaldoDataAllYears?: Record<number, any[]>;
  availableYears: ReadonlyArray<number>;
  currentYear: number | null;
  onYearChange: (y: number) => void;
  balanceName?: string;
  waterBalanceId: number | string;
}

const getColorForSysName = (name: string) => {
  if (name.toLowerCase() === 'paranoá norte' || name.toLowerCase() === 'paranoa norte') {
    return "#1A3E8A";
  }
  const colors = [
    "#3b82f6", "#8b5cf6", "#ec4899", "#f59e0b", "#14b8a6", 
    "#6366f1", "#f43f5e", "#10b981", "#84cc16", "#06b6d4",
    "#f97316", "#d946ef", "#0ea5e9", "#0091DA", "#94a3b8",
    "#ef4444", "#34d399", "#a855f7", "#fbbf24"
  ];
  let hash = 17; // Changed from 0 to avoid collision between specific names
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
};

export function MapTab({ systemSaldoData, systemSaldoDataAllYears, availableYears, currentYear, onYearChange, balanceName, waterBalanceId }: MapTabProps) {
  const [geoData, setGeoData] = useState<any>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isComparisonMode, setIsComparisonMode] = useState(false);
  const [compareYear, setCompareYear] = useState<number | null>(null);
  
  useEffect(() => {
    if (isComparisonMode && compareYear === null && availableYears.length > 1) {
      // Set to last year, or if current year is last year, set to first year
      const lastYear = availableYears[availableYears.length - 1];
      if (currentYear === lastYear) {
        setCompareYear(availableYears[0]);
      } else {
        setCompareYear(lastYear);
      }
    }
  }, [isComparisonMode, compareYear, availableYears, currentYear]);

  // Handle file upload
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const json = JSON.parse(e.target?.result as string);
          setGeoData(json);
          // Store in localStorage for rapid access
          localStorage.setItem(`adasa-geojson-${waterBalanceId}`, JSON.stringify(json));
        } catch (error) {
          alert('Erro ao processar o arquivo GeoJSON.');
        }
      };
      reader.readAsText(file);
    }
  };

  const handleSaveToProject = async () => {
    if (!geoData) {
      alert("Nenhum mapa carregado para salvar.");
      return;
    }
    setIsSaving(true);
    try {
      const res = await fetch(`/api/save-geojson?waterBalanceId=${waterBalanceId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(geoData)
      });
      if (res.ok) {
        alert("Mapa Temático salvo no banco com sucesso independentemente dos dados do Balanço.");
      } else {
        alert("Erro ao salvar o mapa temático.");
      }
    } catch (e) {
      console.error(e);
      alert("Erro na conexão ao salvar o mapa.");
    } finally {
      setIsSaving(false);
    }
  };

  useEffect(() => {
    const initializeMap = async () => {
      let projectData = null;
      try {
        const res = await fetch(`/api/load-geojson?waterBalanceId=${waterBalanceId}`);
        const contentType = res.headers.get("content-type");
        if (res.ok && contentType && contentType.includes("application/json")) {
          projectData = await res.json();
        }
      } catch (e) {
        console.error("No default map found", e);
      }

      if (projectData) {
        setGeoData(projectData);
        localStorage.setItem(`adasa-geojson-${waterBalanceId}`, JSON.stringify(projectData));
      } else {
        const savedGeojson = localStorage.getItem(`adasa-geojson-${waterBalanceId}`);
        if (savedGeojson) {
          try {
            setGeoData(JSON.parse(savedGeojson));
          } catch(e) {}
        }
      }
    };
    initializeMap();
  }, [waterBalanceId]);

  const getStyle = (feature: any) => {
    const properties = feature.properties || {};
    
    // Find the best string property to use as name
    let foundName = "";
    const lowerProps: Record<string, any> = {};
    for (const key in properties) {
      if (Object.prototype.hasOwnProperty.call(properties, key)) {
        lowerProps[key.toLowerCase()] = properties[key];
      }
    }
    
    if (lowerProps.name) foundName = String(lowerProps.name);
    else if (lowerProps.nome) foundName = String(lowerProps.nome);
    else if (lowerProps.sistema) foundName = String(lowerProps.sistema);
    else if (lowerProps.subsistema) foundName = String(lowerProps.subsistema);
    else if (Object.keys(properties).length > 0) {
      // Just pick the first string value we find
      for (const val of Object.values(properties)) {
        if (typeof val === 'string') {
          foundName = val;
          break;
        }
      }
      if (!foundName) foundName = String(Object.values(properties)[0] || "");
    }

    const sysName = foundName.toLowerCase().trim();
    
    let matchedSaldo: number | null = null;
    let finalSysName = sysName;
    
    // Try to match with our systemName or systemId
    const sys = systemSaldoData.find(s => {
      if (!sysName) return false;
      const sName = s.systemName.toLowerCase().trim();
      const sId = String(s.systemId).toLowerCase().trim();
      
      if (sName === sysName || sId === sysName) return true;
      
      // Handle slash vs hyphen differences (e.g. Sobradinho/Planaltina vs Sobradinho-Planaltina)
      const normalizedSName = sName.replace(/[-/]/g, ' ');
      const normalizedSysName = sysName.replace(/[-/]/g, ' ');
      if (normalizedSName === normalizedSysName) return true;

      // Handle Paranoá Norte / Sul specifically if the geojson only has Paranoá
      if (sysName === 'paranoá' || sysName === 'paranoa') {
         // If they didn't specify Norte/Sul, don't just pick the first one blindly if they are separate!
         // Wait, we need to match it to something. Let's return the one that it most likely is, or avoid includes.
      }
      
      // Safest include: check if all words in sysName exist in sName
      const sysWords = normalizedSysName.split(/\s+/).filter(w => w.length > 2);
      const sWords = normalizedSName.split(/\s+/);
      
      // If sysName has "sul" but sName has "norte", do not match
      if (normalizedSysName.includes('sul') && normalizedSName.includes('norte')) return false;
      if (normalizedSysName.includes('norte') && normalizedSName.includes('sul')) return false;

      // Fallback: word token matching
      if (sysWords.length > 0 && sysWords.every(w => sName.includes(w))) {
          return true;
      }
      
      return false;
    });

    let matchedIad: number | null = null;
    if (sys) {
      matchedSaldo = sys.saldo;
      matchedIad = sys.iad !== undefined ? sys.iad : null;
      finalSysName = sys.systemName;
    }

    const fillColor = getColorForSysName(finalSysName);

    if (matchedSaldo === null) {
      return {
        fillColor: fillColor,
        weight: 3,
        opacity: 0.9,
        color: "#94a3b8", // slate-400 for unmatched
        fillOpacity: 0.5
      };
    }

    let borderColor = "#10b981"; // green (Risco Baixo > 130)
    const iadValue = (matchedIad || 0) + 100;
    if (iadValue < 120) {
      borderColor = "#ef4444"; // red (Risco Alto < 120)
    } else if (iadValue >= 120 && iadValue <= 130) {
      borderColor = "#eab308"; // yellow/amber (Risco Médio 120-130)
    }

    return {
      fillColor: fillColor,
      weight: 3,
      opacity: 1,
      color: borderColor,
      fillOpacity: 0.55
    };
  };

  const systemLabels = useMemo(() => {
    if (!geoData || !geoData.features) return [];
    const bestPolygons: Record<string, { area: number, center: [number, number] }> = {};
    
    geoData.features.forEach((feature: any) => {
      const properties = feature.properties || {};
      let foundName = "Desconhecido";
      const lowerProps: Record<string, any> = {};
      for (const key in properties) {
        if (Object.prototype.hasOwnProperty.call(properties, key)) {
          lowerProps[key.toLowerCase()] = properties[key];
        }
      }
      
      if (lowerProps.name) foundName = String(lowerProps.name);
      else if (lowerProps.nome) foundName = String(lowerProps.nome);
      else if (lowerProps.sistema) foundName = String(lowerProps.sistema);
      else if (lowerProps.subsistema) foundName = String(lowerProps.subsistema);
      else if (Object.keys(properties).length > 0) {
        for (const val of Object.values(properties)) {
          if (typeof val === 'string') {
            foundName = val;
            break;
          }
        }
        if (foundName === "Desconhecido") foundName = String(Object.values(properties)[0] || "");
      }
      const sysName = foundName.trim();

      const geomType = feature.geometry?.type;
      const coords = feature.geometry?.coordinates;
      if (!coords || !geomType) return;

      const ringArea = (ring: any[]) => {
        let a = 0;
        for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
          a += (ring[j][0] * ring[i][1]) - (ring[i][0] * ring[j][1]);
        }
        return Math.abs(a / 2);
      };

      const ringBBoxCenter = (ring: any[]): [number, number] => {
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        for (const pt of ring) {
          minX = Math.min(minX, pt[0]);
          maxX = Math.max(maxX, pt[0]);
          minY = Math.min(minY, pt[1]);
          maxY = Math.max(maxY, pt[1]);
        }
        return [(minX + maxX) / 2, (minY + maxY) / 2];
      };

      let largestAreaInFeature = -1;
      let centerOfLargestInFeature: [number, number] | null = null;

      if (geomType === 'Polygon') {
        const ring = coords[0] || [];
        const area = ringArea(ring);
        largestAreaInFeature = area;
        centerOfLargestInFeature = ringBBoxCenter(ring);
      } else if (geomType === 'MultiPolygon') {
        coords.forEach((poly: any) => {
          const ring = poly[0] || [];
          const area = ringArea(ring);
          if (area > largestAreaInFeature) {
            largestAreaInFeature = area;
            centerOfLargestInFeature = ringBBoxCenter(ring);
          }
        });
      }

      if (centerOfLargestInFeature) {
        if (!bestPolygons[sysName] || largestAreaInFeature > bestPolygons[sysName].area) {
          bestPolygons[sysName] = {
            area: largestAreaInFeature,
            center: centerOfLargestInFeature
          };
        }
      }
    });

    return Object.entries(bestPolygons).map(([name, data]) => {
      let lat = data.center[1];
      const lng = data.center[0];
      
      // Move system Brazlândia label slightly up 
      if (name.toLowerCase().includes("brazlândia") || name.toLowerCase().includes("brazlandia")) {
        lat += 0.06;
      }
      
      return {
        name,
        lat, // Leaflet uses [lat, lng]
        lng,
      };
    });
  }, [geoData]);

  const onEachFeature = (feature: any, layer: any) => {
    const properties = feature.properties || {};
    let foundName = "Desconhecido";
    
    const lowerProps: Record<string, any> = {};
    for (const key in properties) {
      if (Object.prototype.hasOwnProperty.call(properties, key)) {
        lowerProps[key.toLowerCase()] = properties[key];
      }
    }
    
    if (lowerProps.name) foundName = String(lowerProps.name);
    else if (lowerProps.nome) foundName = String(lowerProps.nome);
    else if (lowerProps.sistema) foundName = String(lowerProps.sistema);
    else if (lowerProps.subsistema) foundName = String(lowerProps.subsistema);
    else if (Object.keys(properties).length > 0) {
      for (const val of Object.values(properties)) {
        if (typeof val === 'string') {
          foundName = val;
          break;
        }
      }
      if (foundName === "Desconhecido") foundName = String(Object.values(properties)[0] || "");
    }

    const sysName = foundName.trim();
    let popupContent = ``;
    
    // Check if we matched a system to show the exact saldo
    const sys = systemSaldoData.find(s => {
        if (!sysName) return false;
        const sName = s.systemName.toLowerCase().trim();
        const sId = String(s.systemId).toLowerCase().trim();
        const searchName = sysName.toLowerCase();
        
        if (sName === searchName || sId === searchName) return true;
        
        const normalizedSName = sName.replace(/[-/]/g, ' ');
        const normalizedSysName = searchName.replace(/[-/]/g, ' ');
        if (normalizedSName === normalizedSysName) return true;

        const sysWords = normalizedSysName.split(/\s+/).filter(w => w.length > 2);
        
        if (normalizedSysName.includes('sul') && normalizedSName.includes('norte')) return false;
        if (normalizedSysName.includes('norte') && normalizedSName.includes('sul')) return false;

        if (sysWords.length > 0 && sysWords.every(w => sName.includes(w))) {
            return true;
        }
        
        return false;
    });
    
    if (sys) {
        const formatNumber = (n: number) => Math.round(n).toLocaleString('pt-BR');
        
        const iadVal = sys.iad !== undefined ? sys.iad : 0;
        const iadValue = iadVal + 100;
        let riskColor = "#10b981"; // green (Risco Baixo > 130)
        if (iadValue < 120) {
          riskColor = "#ef4444"; // red (Risco Alto < 120)
        } else if (iadValue >= 120 && iadValue <= 130) {
          riskColor = "#eab308"; // yellow/amber (Risco Médio 120-130)
        }

        popupContent += `
        <div style="font-family: inherit; font-size: 12px; display: flex; flex-direction: column; gap: 4px; min-width: 220px;">
          <div style="margin-bottom: 4px; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px;">
            <div style="color: #64748b; font-weight: bold; margin-bottom: 2px;">ANO ${currentYear}</div>
            <strong style="font-size: 14px; color: #1e293b;">${sys.systemName}</strong>
          </div>
          
          <div style="display: flex; justify-content: space-between; gap: 16px;">
            <span style="color: #64748b; font-weight: 600;">Oferta:</span>
            <strong style="color: #334155">${formatNumber(sys.oferta || 0)} L/s</strong>
          </div>
          <div style="display: flex; justify-content: space-between; gap: 16px;">
            <span style="color: #64748b; font-weight: 600;">Demanda:</span>
            <strong style="color: #334155">${formatNumber(sys.demanda || 0)} L/s</strong>
          </div>
          <div style="display: flex; justify-content: space-between; gap: 16px;">
            <span style="color: #64748b; font-weight: 600;">Demanda (hab):</span>
            <strong style="color: #334155">${formatNumber(sys.demandaHabitantes || 0)} hab.</strong>
          </div>
          <div style="display: flex; justify-content: space-between; gap: 16px; margin-top: 4px; padding-top: 4px; border-top: 1px dashed #cbd5e1;">
            <span style="color: #64748b; font-weight: 600;">Saldo (L/s):</span>
            <strong style="color: ${riskColor}">${sys.saldo > 0 ? '+' : ''}${formatNumber(sys.saldo || 0)} L/s</strong>
          </div>
          <div style="display: flex; justify-content: space-between; gap: 16px;">
            <span style="color: #64748b; font-weight: 600;">Saldo (hab):</span>
            <strong style="color: ${riskColor}">${sys.saldo > 0 ? '+' : ''}${formatNumber(sys.saldoHabitantes || 0)} hab.</strong>
          </div>
          <div style="display: flex; justify-content: space-between; gap: 16px;">
            <span style="color: #64748b; font-weight: 600;">Saldo (%):</span>
            <strong style="color: ${riskColor}">${sys.saldo > 0 ? '+' : ''}${Number(sys.iad || 0).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%</strong>
          </div>
        </div>`;
    } else {
        popupContent += `<strong>${sysName}</strong><br/>Não vinculado a um subsistema.`;
    }

    layer.bindPopup(popupContent);
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="bg-white rounded-[2rem] border border-slate-200 p-8 shadow-sm flex flex-col gap-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-100 pb-4">
          <div>
            <h3 className="font-black text-slate-800 text-lg uppercase tracking-tighter">
              Mapa Temático de Saldo
            </h3>
            <p className="text-sm font-medium text-slate-500 mt-1">
              Importe um arquivo GeoJSON contendo os polígonos dos subsistemas. A cor da borda (verde, amarela ou vermelha) indicará a classificação de risco baseada no Saldo (%).
            </p>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="file"
              accept=".geojson,.json"
              onChange={handleFileUpload}
              className="hidden"
              id="geojson-upload"
            />
            {geoData && availableYears.length > 1 && (
              <button
                onClick={() => setIsComparisonMode(!isComparisonMode)}
                className={cn(
                  "px-4 py-2 border rounded-xl text-xs font-black uppercase tracking-widest transition-colors cursor-pointer inline-flex items-center gap-2 whitespace-nowrap",
                  isComparisonMode 
                    ? "bg-adasa-mid border-adasa-mid text-white" 
                    : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                )}
                title="Comparar anos lado a lado"
              >
                <Columns size={14} /> Modo Comparação
              </button>
            )}
            <label
              htmlFor="geojson-upload"
              className="px-4 py-2 bg-slate-50 border border-slate-200 text-slate-600 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-slate-100 transition-colors cursor-pointer inline-flex items-center gap-2 whitespace-nowrap"
            >
              <Upload size={14} /> Importar GeoJSON
            </label>
            {geoData && (
              <button
                onClick={handleSaveToProject}
                disabled={isSaving}
                className={cn(
                  "px-4 py-2 bg-emerald-50 border border-emerald-200 text-emerald-600 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-emerald-100 transition-colors cursor-pointer inline-flex items-center gap-2 whitespace-nowrap",
                  isSaving && "opacity-50 cursor-not-allowed"
                )}
                title="Salvar apenas o mapa temático de saldo"
              >
                <Save size={14} /> {isSaving ? "Salvando Mapa..." : "Salvar Mapa Temático"}
              </button>
            )}
          </div>
        </div>

        {availableYears.length > 0 && currentYear !== null && (
          <div className={cn("grid gap-6", isComparisonMode ? "grid-cols-2" : "grid-cols-1")}>
            {/* Main Year Selector */}
            <div className="flex flex-col gap-4">
              {isComparisonMode && (
                <div className="text-xs font-black text-slate-500 uppercase tracking-widest mb-1">
                  Ano Principal
                </div>
              )}
              <div className="flex flex-wrap gap-2">
                {availableYears.map(year => (
                  <button
                    key={`main-${year}`}
                    onClick={() => onYearChange(year)}
                    className={cn(
                      "px-3 py-1 text-xs font-bold rounded-lg transition-all border",
                      currentYear === year 
                        ? "bg-adasa-mid text-white border-adasa-mid" 
                        : "bg-white text-slate-500 border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                    )}
                  >
                    {year}
                  </button>
                ))}
              </div>
              
              <div className="flex items-center gap-4 px-2">
                <span className="text-xs font-bold text-slate-500">{availableYears[0]}</span>
                <input
                  type="range"
                  min={availableYears[0]}
                  max={availableYears[availableYears.length - 1]}
                  value={currentYear}
                  onChange={(e) => {
                    const val = parseInt(e.target.value);
                    const nearest = availableYears.reduce((prev, curr) => 
                      Math.abs(curr - val) < Math.abs(prev - val) ? curr : prev
                    );
                    onYearChange(nearest);
                  }}
                  className="flex-1 accent-adasa-mid"
                />
                <span className="text-xs font-bold text-slate-500">{availableYears[availableYears.length - 1]}</span>
              </div>
            </div>

            {/* Comparison Year Selector */}
            {isComparisonMode && compareYear !== null && (
              <div className="flex flex-col gap-4 border-l border-slate-200 pl-6">
                <div className="text-xs font-black text-slate-500 uppercase tracking-widest mb-1">
                  Ano de Comparação
                </div>
                <div className="flex flex-wrap gap-2">
                  {availableYears.map(year => (
                    <button
                      key={`compare-${year}`}
                      onClick={() => setCompareYear(year)}
                      className={cn(
                        "px-3 py-1 text-xs font-bold rounded-lg transition-all border",
                        compareYear === year 
                          ? "bg-adasa-mid text-white border-adasa-mid" 
                          : "bg-white text-slate-500 border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                      )}
                    >
                      {year}
                    </button>
                  ))}
                </div>
                
                <div className="flex items-center gap-4 px-2">
                  <span className="text-xs font-bold text-slate-500">{availableYears[0]}</span>
                  <input
                    type="range"
                    min={availableYears[0]}
                    max={availableYears[availableYears.length - 1]}
                    value={compareYear}
                    onChange={(e) => {
                      const val = parseInt(e.target.value);
                      const nearest = availableYears.reduce((prev, curr) => 
                        Math.abs(curr - val) < Math.abs(prev - val) ? curr : prev
                      );
                      setCompareYear(nearest);
                    }}
                    className="flex-1 accent-adasa-mid"
                  />
                  <span className="text-xs font-bold text-slate-500">{availableYears[availableYears.length - 1]}</span>
                </div>
              </div>
            )}
          </div>
        )}

        {geoData && systemLabels.length > 0 && (
          <div className="flex flex-wrap gap-3 mt-4 mb-2 p-3 bg-white rounded-xl border border-slate-200 shadow-sm">
            <div className="w-full text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1 shadow-none bg-transparent">Legenda de Sistemas Adicionados</div>
            {systemLabels.map((lbl, idx) => (
              <div key={`legend-${idx}`} className="flex items-center gap-2">
                <div 
                  className="w-3 h-3 rounded-[3px] border border-slate-300"
                  style={{ backgroundColor: getColorForSysName(lbl.name) }}
                ></div>
                <span className="text-xs font-semibold text-slate-700">{lbl.name}</span>
              </div>
            ))}
          </div>
        )}

        <div className={cn("mt-4 grid gap-4", isComparisonMode ? "grid-cols-2" : "grid-cols-1")}>
          {!geoData ? (
            <div className="h-[500px] w-full rounded-2xl overflow-hidden border border-slate-200 flex items-center justify-center bg-slate-50 text-slate-400 font-medium text-sm flex-col gap-2">
              <Upload size={32} className="opacity-50" />
              Nenhum GeoJSON importado. Importe um arquivo para visualizar o mapa.
            </div>
          ) : (
            <>
              <div className="h-[500px] w-full rounded-2xl overflow-hidden border border-slate-200 relative z-0">
                <SubMap 
                  geoData={geoData} 
                  systemSaldoData={systemSaldoData} 
                  year={currentYear!} 
                  balanceName={balanceName} 
                />
              </div>
              {isComparisonMode && compareYear && systemSaldoDataAllYears && systemSaldoDataAllYears[compareYear] && (
                <div className="h-[500px] w-full rounded-2xl overflow-hidden border border-slate-200 relative z-0">
                  <SubMap 
                    geoData={geoData} 
                    systemSaldoData={systemSaldoDataAllYears[compareYear]} 
                    year={compareYear} 
                    balanceName={balanceName} 
                  />
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function AnimatedDropMarker({ curvePoints, count = 1 }: { curvePoints: L.LatLng[], count?: number }) {
  const [positions, setPositions] = useState<L.LatLng[]>(Array(count).fill(curvePoints[0] || new L.LatLng(0,0)));

  useEffect(() => {
    if (!curvePoints || curvePoints.length === 0) return;
    let animationFrameId: number;
    let startTime = performance.now();
    const duration = 2500; // 2.5 seconds to travel

    const animate = (time: number) => {
      const newPositions = [];
      for (let i = 0; i < count; i++) {
        const timeOffset = (duration / count) * i;
        let t = ((time - startTime + timeOffset) % duration) / duration;
        
        const totalSegments = curvePoints.length - 1;
        const exactIndex = t * totalSegments;
        const index = Math.floor(exactIndex);
        const fraction = exactIndex - index;

        if (index >= totalSegments) {
           newPositions.push(curvePoints[totalSegments]);
        } else {
           const p1 = curvePoints[index];
           const p2 = curvePoints[index + 1];
           const lat = p1.lat + (p2.lat - p1.lat) * fraction;
           const lng = p1.lng + (p2.lng - p1.lng) * fraction;
           newPositions.push(new L.LatLng(lat, lng));
        }
      }
      setPositions(newPositions);
      
      animationFrameId = requestAnimationFrame(animate);
    };

    animationFrameId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrameId);
  }, [curvePoints, count]);

  if (!curvePoints || curvePoints.length === 0) return null;

  return (
    <>
      {positions.map((pos, i) => (
        <Marker 
          key={i}
          position={pos} 
          icon={new L.DivIcon({
            className: 'bg-transparent border-none',
            html: `<div style="font-size: 16px; display: flex; align-items: center; justify-content: center; width: 16px; height: 16px; filter: drop-shadow(0 1px 2px rgba(0,0,0,0.3));">💧</div>`,
            iconSize: [16, 16],
            iconAnchor: [8, 8]
          })}
        />
      ))}
    </>
  );
}

function TransfersOverlay({ geoData, systemSaldoData }: { geoData: any, systemSaldoData: any[] }) {
  const [centers, setCenters] = useState<Record<string, L.LatLng>>({});

  useEffect(() => {
    if (!geoData) return;
    import('leaflet').then((L) => {
      const systemBounds: Record<string, L.LatLngBounds> = {};
      const layer = L.geoJSON(geoData, {
        onEachFeature: (feature, layer: any) => {
          const properties = feature.properties || {};
          let foundName = "";
          const lowerProps: Record<string, any> = {};
          for (const key in properties) {
            if (Object.prototype.hasOwnProperty.call(properties, key)) {
              lowerProps[key.toLowerCase()] = properties[key];
            }
          }
          if (lowerProps.name) foundName = String(lowerProps.name);
          else if (lowerProps.nome) foundName = String(lowerProps.nome);
          else if (lowerProps.sistema) foundName = String(lowerProps.sistema);
          else if (lowerProps.subsistema) foundName = String(lowerProps.subsistema);
          else if (Object.keys(properties).length > 0) {
            for (const val of Object.values(properties)) {
              if (typeof val === 'string') {
                foundName = val;
                break;
              }
            }
            if (!foundName) foundName = String(Object.values(properties)[0] || "");
          }

          const sysName = foundName.trim();
          
          if (typeof layer.getBounds === 'function') {
            const bounds = layer.getBounds();
            
            // Try to match system
            const sys = systemSaldoData.find(s => {
                if (!sysName) return false;
                const sName = s.systemName.toLowerCase().trim();
                const sId = String(s.systemId).toLowerCase().trim();
                const searchName = sysName.toLowerCase();
                
                if (sName === searchName || sId === searchName) return true;
                
                const normalizedSName = sName.replace(/[-/]/g, ' ');
                const normalizedSysName = searchName.replace(/[-/]/g, ' ');
                if (normalizedSName === normalizedSysName) return true;

                const sysWords = normalizedSysName.split(/\s+/).filter(w => w.length > 2);
                if (normalizedSysName.includes('sul') && normalizedSName.includes('norte')) return false;
                if (normalizedSysName.includes('norte') && normalizedSName.includes('sul')) return false;

                if (sysWords.length > 0 && sysWords.every(w => sName.includes(w))) {
                    return true;
                }
                return false;
            });

            if (sys) {
              if (!systemBounds[sys.systemId]) {
                systemBounds[sys.systemId] = L.latLngBounds(bounds.getSouthWest(), bounds.getNorthEast());
              } else {
                systemBounds[sys.systemId].extend(bounds);
              }
            }
          }
        }
      });
      
      const newCenters: Record<string, L.LatLng> = {};
      for (const sysId in systemBounds) {
        newCenters[sysId] = systemBounds[sysId].getCenter();
      }
      setCenters(newCenters);
    });
  }, [geoData, systemSaldoData]);

  if (!systemSaldoData || Object.keys(centers).length === 0) return null;

  const transferGroups = new Map<string, any>();
  systemSaldoData.forEach(sys => {
    if (sys.adjustments) {
      sys.adjustments.forEach((adj: any) => {
        if (adj.type === "Transferência" && adj.flowValue < 0 && adj.destSystemId) {
          const start = centers[sys.systemId];
          const end = centers[adj.destSystemId];
          if (start && end) {
            const key = `${sys.systemId}-${adj.destSystemId}`;
            if (!transferGroups.has(key)) {
              transferGroups.set(key, {
                sourceSysInfo: sys,
                destSysInfo: systemSaldoData.find(s => s.systemId === adj.destSystemId),
                start,
                end,
                totalFlow: 0,
                count: 0,
                id: key
              });
            }
            const group = transferGroups.get(key);
            group.totalFlow += Math.abs(adj.flowValue);
            group.count += 1;
          }
        }
      });
    }
  });

  const transfers = Array.from(transferGroups.values());

  return (
    <>
      {transfers.map((t, idx) => {
        // Build a curve so it doesn't overlap straight between centroids (which are inside polygons)
        // We calculate intermediate points using a quadratic bezier curve.
        const start = t.start;
        const end = t.end;
        
        // Find midpoint
        const midLat = (start.lat + end.lat) / 2;
        const midLng = (start.lng + end.lng) / 2;
        
        // Calculate offset (perpendicular to the vector between start and end)
        // Flip offset sign based on idx to separate lines if there are multiple
        const offset = 0.3 * (idx % 2 === 0 ? 1 : -1); 
        
        const dx = end.lat - start.lat;
        const dy = end.lng - start.lng;
        // Perpendicular
        const nx = -dy;
        const ny = dx;
        
        const cpLat = midLat + nx * offset;
        const cpLng = midLng + ny * offset;
        
        const curvePoints: L.LatLng[] = [];
        for (let i = 0; i <= 20; i++) {
            const step = i / 20;
            const lat = (1-step)*(1-step)*start.lat + 2*(1-step)*step*cpLat + step*step*end.lat;
            const lng = (1-step)*(1-step)*start.lng + 2*(1-step)*step*cpLng + step*step*end.lng;
            curvePoints.push(new L.LatLng(lat, lng));
        }

        const midPointOnCurve = curvePoints[10];

        const formatNumber = (n: number) => Math.round(n).toLocaleString('pt-BR');

        // Latitude increases upwards, but screen Y increases downwards.
        // Longitude increases rightwards, screen X increases rightwards.
        const screenDx = end.lng - start.lng;
        const screenDy = start.lat - end.lat;
        const angleDeg = Math.atan2(screenDy, screenDx) * 180 / Math.PI;

        return (
          <React.Fragment key={t.id}>
            <Polyline 
              positions={curvePoints}
              pathOptions={{ color: '#000000', weight: 3, opacity: 0.6, dashArray: '6, 6' }}
            >
              <Tooltip>
                <div className="text-xs font-bold font-sans">
                  Transferência: <span className="text-slate-800">{formatNumber(t.totalFlow)} L/s</span>
                  {t.count > 1 && <span className="text-slate-500 font-normal ml-1">({t.count} fluxos)</span>}
                  <br />
                  <span className="text-[10px] text-slate-500 font-medium">De {t.sourceSysInfo.systemName} para {t.destSysInfo?.systemName}</span>
                </div>
              </Tooltip>
            </Polyline>

            <AnimatedDropMarker curvePoints={curvePoints} count={t.count} />

            {/* Label highlighting total transfer flow at the end of the dashed line */}
            <Marker 
              position={curvePoints[18]} 
              icon={new L.DivIcon({
                className: 'bg-transparent border-none',
                html: `<div style="background-color: #f0fdf4; color: #15803d; font-size: 10px; font-weight: 800; padding: 2px 6px; border-radius: 12px; border: 1px solid #16a34a; white-space: nowrap; box-shadow: 0 2px 4px rgba(0,0,0,0.2); font-family: sans-serif; display: flex; align-items: center; justify-content: center; line-height: 1;">+${formatNumber(t.totalFlow)} L/s</div>`,
                iconSize: [60, 20],
                iconAnchor: [30, 10]
              })}
            />

            <Marker 
              position={midPointOnCurve} 
              icon={new L.DivIcon({
                className: 'bg-transparent border-none',
                html: `<div style="transform: rotate(${angleDeg}deg); color: #000000; font-size: 20px; line-height: 1; text-shadow: 0 1px 3px rgba(0,0,0,0.2); display: flex; align-items: center; justify-content: center; width: 20px; height: 20px;">➔</div>`,
                iconSize: [20, 20],
                iconAnchor: [10, 10]
              })}
            />
          </React.Fragment>
        );
      })}
    </>
  );
}

function SubMap({ geoData, systemSaldoData, year, balanceName }: { geoData: any, systemSaldoData: any[], year: number, balanceName?: string }) {
  const getStyle = (feature: any) => {
    const properties = feature.properties || {};
    
    let foundName = "";
    const lowerProps: Record<string, any> = {};
    for (const key in properties) {
      if (Object.prototype.hasOwnProperty.call(properties, key)) {
        lowerProps[key.toLowerCase()] = properties[key];
      }
    }
    
    if (lowerProps.name) foundName = String(lowerProps.name);
    else if (lowerProps.nome) foundName = String(lowerProps.nome);
    else if (lowerProps.sistema) foundName = String(lowerProps.sistema);
    else if (lowerProps.subsistema) foundName = String(lowerProps.subsistema);
    else if (Object.keys(properties).length > 0) {
      for (const val of Object.values(properties)) {
        if (typeof val === 'string') {
          foundName = val;
          break;
        }
      }
      if (!foundName) foundName = String(Object.values(properties)[0] || "");
    }

    const sysName = foundName.toLowerCase().trim();
    
    let matchedSaldo: number | null = null;
    let finalSysName = sysName;
    
    const sys = systemSaldoData.find(s => {
      if (!sysName) return false;
      const sName = s.systemName.toLowerCase().trim();
      const sId = String(s.systemId).toLowerCase().trim();
      
      if (sName === sysName || sId === sysName) return true;
      
      const normalizedSName = sName.replace(/[-/]/g, ' ');
      const normalizedSysName = sysName.replace(/[-/]/g, ' ');
      if (normalizedSName === normalizedSysName) return true;

      const sysWords = normalizedSysName.split(/\s+/).filter(w => w.length > 2);
      const sWords = normalizedSName.split(/\s+/);
      
      if (normalizedSysName.includes('sul') && normalizedSName.includes('norte')) return false;
      if (normalizedSysName.includes('norte') && normalizedSName.includes('sul')) return false;

      if (sysWords.length > 0 && sysWords.every(w => sName.includes(w))) {
          return true;
      }
      
      return false;
    });

    let matchedIad: number | null = null;
    if (sys) {
      matchedSaldo = sys.saldo;
      matchedIad = sys.iad !== undefined ? sys.iad : null;
      finalSysName = sys.systemName;
    }

    const fillColor = getColorForSysName(finalSysName);

    if (matchedSaldo === null) {
      return {
        fillColor: fillColor,
        weight: 3,
        opacity: 0.9,
        color: "#94a3b8",
        fillOpacity: 0.5
      };
    }

    let borderColor = "#10b981"; // green (Risco Baixo > 130)
    const iadValue = (matchedIad || 0) + 100;
    if (iadValue < 120) {
      borderColor = "#ef4444"; // red (Risco Alto < 120)
    } else if (iadValue >= 120 && iadValue <= 130) {
      borderColor = "#eab308"; // yellow/amber (Risco Médio 120-130)
    }

    return {
      fillColor: fillColor,
      weight: 3,
      opacity: 1,
      color: borderColor,
      fillOpacity: 0.55
    };
  };

  const onEachFeature = (feature: any, layer: any) => {
    const properties = feature.properties || {};
    let foundName = "Desconhecido";
    
    const lowerProps: Record<string, any> = {};
    for (const key in properties) {
      if (Object.prototype.hasOwnProperty.call(properties, key)) {
        lowerProps[key.toLowerCase()] = properties[key];
      }
    }
    
    if (lowerProps.name) foundName = String(lowerProps.name);
    else if (lowerProps.nome) foundName = String(lowerProps.nome);
    else if (lowerProps.sistema) foundName = String(lowerProps.sistema);
    else if (lowerProps.subsistema) foundName = String(lowerProps.subsistema);
    else if (Object.keys(properties).length > 0) {
      for (const val of Object.values(properties)) {
        if (typeof val === 'string') {
          foundName = val;
          break;
        }
      }
      if (foundName === "Desconhecido") foundName = String(Object.values(properties)[0] || "");
    }

    const sysName = foundName.trim();
    let popupContent = ``;
    
    const sys = systemSaldoData.find(s => {
        if (!sysName) return false;
        const sName = s.systemName.toLowerCase().trim();
        const sId = String(s.systemId).toLowerCase().trim();
        const searchName = sysName.toLowerCase();
        
        if (sName === searchName || sId === searchName) return true;
        
        const normalizedSName = sName.replace(/[-/]/g, ' ');
        const normalizedSysName = searchName.replace(/[-/]/g, ' ');
        if (normalizedSName === normalizedSysName) return true;

        const sysWords = normalizedSysName.split(/\s+/).filter(w => w.length > 2);
        
        if (normalizedSysName.includes('sul') && normalizedSName.includes('norte')) return false;
        if (normalizedSysName.includes('norte') && normalizedSName.includes('sul')) return false;

        if (sysWords.length > 0 && sysWords.every(w => sName.includes(w))) {
            return true;
        }
        
        return false;
    });
    
    if (sys) {
        const formatNumber = (n: number) => Math.round(n).toLocaleString('pt-BR');
        
        const iadVal = sys.iad !== undefined ? sys.iad : 0;
        const iadValue = iadVal + 100;
        let riskColor = "#10b981"; // green (Risco Baixo > 130)
        if (iadValue < 120) {
          riskColor = "#ef4444"; // red (Risco Alto < 120)
        } else if (iadValue >= 120 && iadValue <= 130) {
          riskColor = "#eab308"; // yellow/amber (Risco Médio 120-130)
        }

        popupContent += `
        <div style="font-family: inherit; font-size: 12px; display: flex; flex-direction: column; gap: 4px; min-width: 220px;">
          <div style="margin-bottom: 4px; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px;">
            <div style="color: #64748b; font-weight: bold; margin-bottom: 2px;">ANO ${year}</div>
            <strong style="font-size: 14px; color: #1e293b;">${sys.systemName}</strong>
          </div>
          
          <div style="display: flex; justify-content: space-between; gap: 16px;">
            <span style="color: #64748b; font-weight: 600;">Oferta:</span>
            <strong style="color: #334155">${formatNumber(sys.oferta || 0)} L/s</strong>
          </div>
          <div style="display: flex; justify-content: space-between; gap: 16px;">
            <span style="color: #64748b; font-weight: 600;">Demanda:</span>
            <strong style="color: #334155">${formatNumber(sys.demanda || 0)} L/s</strong>
          </div>
          <div style="display: flex; justify-content: space-between; gap: 16px;">
            <span style="color: #64748b; font-weight: 600;">Demanda (hab):</span>
            <strong style="color: #334155">${formatNumber(sys.demandaHabitantes || 0)} hab.</strong>
          </div>
          <div style="display: flex; justify-content: space-between; gap: 16px; margin-top: 4px; padding-top: 4px; border-top: 1px dashed #cbd5e1;">
            <span style="color: #64748b; font-weight: 600;">Saldo (L/s):</span>
            <strong style="color: ${riskColor}">${sys.saldo > 0 ? '+' : ''}${formatNumber(sys.saldo || 0)} L/s</strong>
          </div>
          <div style="display: flex; justify-content: space-between; gap: 16px;">
            <span style="color: #64748b; font-weight: 600;">Saldo (hab):</span>
            <strong style="color: ${riskColor}">${sys.saldo > 0 ? '+' : ''}${formatNumber(sys.saldoHabitantes || 0)} hab.</strong>
          </div>
          <div style="display: flex; justify-content: space-between; gap: 16px;">
            <span style="color: #64748b; font-weight: 600;">Saldo (%):</span>
            <strong style="color: ${riskColor}">${sys.saldo > 0 ? '+' : ''}${Number(sys.iad || 0).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%</strong>
          </div>
        `;
        
        if (sys.adjustments && sys.adjustments.length > 0) {
            popupContent += `
              <div style="margin-top: 8px; padding-top: 8px; border-top: 1px solid #e2e8f0;">
                <div style="font-weight: 700; color: #475569; margin-bottom: 4px; font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em;">Ajustes Operacionais</div>
                <div style="display: flex; flex-direction: column; gap: 4px;">
                  ${sys.adjustments.map((a: any) => `
                    <div style="background-color: ${a.flowValue >= 0 ? '#ecfdf5' : '#fef2f2'}; border: 1px solid ${a.flowValue >= 0 ? '#10b981' : '#f87171'}; border-radius: 4px; padding: 4px 6px; display: flex; justify-content: space-between; align-items: center; gap: 8px;">
                        <span style="font-size: 10px; color: #64748b; font-weight: 600; text-align: left;">${a.description || a.type}</span>
                        <strong style="font-size: 11px; color: ${a.flowValue >= 0 ? '#059669' : '#dc2626'}; white-space: nowrap;">${a.flowValue > 0 ? '+' : ''}${formatNumber(a.flowValue)} L/s</strong>
                    </div>
                  `).join('')}
                </div>
              </div>
            `;
        }

        popupContent += `</div>`;
    } else {
        popupContent += `<strong>${sysName}</strong><br/>Não vinculado a um subsistema.`;
    }

    layer.bindPopup(popupContent);
  };

  return (
    <div className="w-full h-full relative">
      <div className="absolute top-4 right-4 z-[400] bg-white/90 backdrop-blur-sm rounded-xl shadow-lg border border-slate-200 p-4 min-w-[200px]">
        <div className="text-xs font-black text-slate-800 mb-1">
          ANO {year}
        </div>
        {balanceName && (
          <div className="text-[10px] font-bold text-slate-500 mb-2 uppercase tracking-wide">
            {balanceName}
          </div>
        )}
        <div className="text-xs font-black text-slate-700 mb-2 border-t border-slate-200/60 pt-2">
          Saldo (L/s)
        </div>
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-[4px] bg-[#94a3b8]/30 border-2 border-[#10b981] shadow-sm"></div>
            <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">Risco Baixo (&gt; 130%)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-[4px] bg-[#94a3b8]/30 border-2 border-[#eab308] shadow-sm"></div>
            <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">Risco Médio (120% a 130%)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-[4px] bg-[#94a3b8]/30 border-2 border-[#ef4444] shadow-sm"></div>
            <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">Risco Alto (&lt; 120%)</span>
          </div>
          <div className="flex items-center gap-2 mt-1">
            <div className="w-4 h-4 rounded-[4px] bg-[#94a3b8]/30 border-2 border-[#94a3b8] shadow-sm"></div>
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Sem Dados</span>
          </div>
        </div>
      </div>
      <MapContainer center={[-15.793889, -47.882778]} zoom={10} zoomSnap={0.1} zoomControl={false} scrollWheelZoom={false} doubleClickZoom={false} touchZoom={false} boxZoom={false} dragging={false} style={{ height: "100%", width: "100%" }}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
        />
        <GeoJSON data={geoData} style={getStyle} onEachFeature={onEachFeature} key={JSON.stringify(systemSaldoData) + JSON.stringify(geoData) + year} />
        <TransfersOverlay geoData={geoData} systemSaldoData={systemSaldoData} />
        <GeoJsonBounds data={geoData} />
        <MapRestoreView geoData={geoData} />
      </MapContainer>
    </div>
  );
}

function MapRestoreView({ geoData }: { geoData: any }) {
  const map = useMap();
  useEffect(() => {
    const handlePopupClose = () => {
      if (geoData) {
        import("leaflet").then((L) => {
          try {
            const layer = L.geoJSON(geoData);
            const bounds = layer.getBounds();
            if (bounds.isValid()) {
              setTimeout(() => {
                try {
                  map.fitBounds(bounds, { padding: [10, 10] });
                } catch(err) {}
              }, 50);
            }
          } catch (e) {
            console.error("Erro ao resetar view do GeoJSON:", e);
          }
        });
      } else {
        setTimeout(() => {
          try {
            map.setView([-15.793889, -47.882778], 10);
          } catch (err) {}
        }, 50);
      }
    };
    map.on('popupclose', handlePopupClose);
    return () => {
      map.off('popupclose', handlePopupClose);
    };
  }, [map, geoData]);
  return null;
}


// Component to adjust bounds when GeoJSON changes
function GeoJsonBounds({ data }: { data: any }) {
  const map = useMap();
  useEffect(() => {
    if (data) {
      import("leaflet").then((L) => {
        try {
          const layer = L.geoJSON(data);
          const bounds = layer.getBounds();
          if (bounds.isValid()) {
            // Check if coordinates seem to be out of standard WGS84 bounds (-180 to 180, -90 to 90)
            const isProbablyNotWgs84 = 
              bounds.getNorth() > 90 || bounds.getSouth() < -90 ||
              bounds.getEast() > 180 || bounds.getWest() < -180;
            
            if (isProbablyNotWgs84) {
              alert("Atenção: As coordenadas do GeoJSON parecem não estar no formato padrão WGS84 (EPSG:4326). O mapa pode não renderizar corretamente. Por favor, converta seu GeoJSON para coordenadas geográficas (Lat/Lon).");
            }

            const fitIt = () => {
                setTimeout(() => {
                  try {
                    map.invalidateSize();
                    map.fitBounds(bounds, { padding: [10, 10] });
                  } catch(e) {}
                }, 50);
            };

            fitIt();

            // Refit on container resize
            const resizeObserver = new ResizeObserver(() => {
                requestAnimationFrame(() => {
                    fitIt();
                });
            });

            if (map.getContainer()) {
                resizeObserver.observe(map.getContainer());
            }

            return () => {
                resizeObserver.disconnect();
            };
          }
        } catch (e) {
          console.error("Erro ao desenhar GeoJSON:", e);
        }
      });
    }
  }, [data, map]);
  return null;
}

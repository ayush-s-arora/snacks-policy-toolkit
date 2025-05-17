import { MapContainer, TileLayer, GeoJSON, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import './App.css';
import { useEffect, useState, useRef } from 'react';
import Select from 'react-select';
import * as turf from '@turf/turf';

function App() {
  const [geoData, setGeoData] = useState(null);
  const [inequityData, setInequityData] = useState({});
  const [selectedMetric, setSelectedMetric] = useState("poverty_rate");
  const [selectedState, setSelectedState] = useState(null);
  const [selectedCounty, setSelectedCounty] = useState(null);
  const [minValue, setMinValue] = useState(null);
  const [maxValue, setMaxValue] = useState(null);
  const mapRef = useRef();

  useEffect(() => {
    fetch('/county.json')
      .then((res) => res.json())
      .then((data) => {
        console.log("Loaded counties:", data.features?.length);
        setGeoData(data);
      })
      .catch((err) => console.error("Error loading GeoJSON:", err));
  }, []);

  useEffect(() => {
    fetch("/county_inequity.json")
      .then((res) => res.json())
      .then((data) => setInequityData(data));
  }, []);

  useEffect(() => {
    if (!geoData || !mapRef.current) return;
    const map = mapRef.current;
    const features = geoData.features;

    const matchFeature = features.find((f) => {
      const geoid = f.properties.GEOID;
      const county = inequityData[geoid];
      if (!county) return false;
      if (selectedCounty && county.County === selectedCounty.value && county.State === selectedState?.value) return true;
      if (!selectedCounty && selectedState && county.State === selectedState.value) return true;
      return false;
    });

    if (matchFeature) {
      const bbox = turf.bbox(matchFeature);
      const bounds = [
        [bbox[1], bbox[0]],
        [bbox[3], bbox[2]]
      ];
      map.fitBounds(bounds, { padding: [20, 20] });
    }
  }, [selectedCounty, selectedState, geoData, inequityData]);

  const getColor = (value) => {
    if (value === undefined) return '#ccc';
    if (value > 30) return '#800026';
    if (value > 20) return '#BD0026';
    if (value > 15) return '#E31A1C';
    if (value > 10) return '#FC4E2A';
    if (value > 5) return '#FD8D3C';
    return '#FFEDA0';
  };

  const style = (feature) => {
    const geoid = feature.properties.GEOID;
    const county = inequityData[geoid];
    const value = county?.[selectedMetric];

    if (selectedState && county?.State !== selectedState.value) return { fillOpacity: 0 };
    if (selectedCounty && county?.County !== selectedCounty.value) return { fillOpacity: 0 };
    if (minValue !== null && value < minValue) return { fillOpacity: 0 };
    if (maxValue !== null && value > maxValue) return { fillOpacity: 0 };

    return {
      fillColor: getColor(value),
      weight: 0.5,
      color: 'white',
      fillOpacity: 0.7,
    };
  };

  const onEachFeature = (feature, layer) => {
    const geoid = feature.properties.GEOID;
    const county = inequityData[geoid];
    const value = county?.[selectedMetric] ?? 'N/A';

    if (!county) return;

    layer.bindPopup(
      `<strong>${feature.properties.NAME}, ${county?.State || ""}</strong><br>` +
      `${selectedMetric.replace(/_/g, " ")}: ${value}`
    );
  };

  const stateOptions = Array.from(
    new Set(Object.values(inequityData).map((c) => c.State))
  ).sort().map((s) => ({ value: s, label: s }));

  const countyOptions = selectedState
    ? Object.values(inequityData)
        .filter((c) => c.State === selectedState.value)
        .map((c) => ({ value: c.County, label: c.County }))
        .sort((a, b) => a.label.localeCompare(b.label))
    : [];

  return (
    <div className="app-container">
      <header className="app-header">
        <h1>Snacks</h1>
      </header>
      <div className="app-body">
        <aside className="sidebar">
          <h3>Filters</h3>
          <label>Metric</label>
          <select
            value={selectedMetric}
            onChange={(e) => setSelectedMetric(e.target.value)}
          >
            <option value="poverty_rate">Poverty Rate</option>
            <option value="no_diploma_pct">No HS Diploma %</option>
            <option value="unemployment_rate">Unemployment Rate</option>
          </select>

          <label>State</label>
          <Select
            options={stateOptions}
            value={selectedState}
            onChange={(selected) => {
              setSelectedState(selected);
              setSelectedCounty(null);
            }}
            isClearable
            placeholder="Select a state"
          />

          <label>County</label>
          <Select
            options={countyOptions}
            value={selectedCounty}
            onChange={(selected) => setSelectedCounty(selected)}
            isClearable
            placeholder="Select a county"
          />

          <label>Min {selectedMetric.replace(/_/g, ' ')}</label>
          <input
            type="number"
            value={minValue ?? ''}
            onChange={(e) => setMinValue(e.target.value === '' ? null : parseFloat(e.target.value))}
          />

          <label>Max {selectedMetric.replace(/_/g, ' ')}</label>
          <input
            type="number"
            value={maxValue ?? ''}
            onChange={(e) => setMaxValue(e.target.value === '' ? null : parseFloat(e.target.value))}
          />
        </aside>
        <main className="map-container">
          <MapContainer center={[37.8, -96]} zoom={4} style={{ height: '100%', width: '100%' }} whenCreated={(map) => (mapRef.current = map)}>
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
            {geoData && <GeoJSON data={geoData} style={style} onEachFeature={onEachFeature} />}
          </MapContainer>
        </main>
      </div>
    </div>
  );
}

export default App;
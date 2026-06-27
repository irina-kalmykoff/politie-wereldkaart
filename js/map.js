/* =========================================================
   map.js — Stap 2 + 5: de kaart en de beloning
   - reliëf-ondergrond (fysieke kaart, geen politieke kleuren)
   - landgrenzen uit data/countries.geojson
   - hover-highlight + Nederlandse landnaam als tooltip
   - klik opent de opdracht (tasks.js)
   - opgeloste landen krijgen een vlag + groene kleur (blijft na herladen)
   ========================================================= */

// --- 1. De kaart aanmaken -------------------------------------------------
const map = L.map('map', {
  minZoom: 2,
  maxZoom: 6,
  worldCopyJump: true,            // soepel pannen over de datumgrens
  maxBounds: [[-85, -200], [85, 200]],
  maxBoundsViscosity: 0.7
}).setView([30, 10], 2);

// --- 2. Reliëf-ondergrond (Esri World Physical) ---------------------------
// Fysieke kaart met bergen/woestijnen/zeeën, zonder politieke vlakken.
L.tileLayer(
  'https://server.arcgisonline.com/ArcGIS/rest/services/World_Physical_Map/MapServer/tile/{z}/{y}/{x}',
  {
    attribution: 'Ondergrond © Esri — U.S. National Park Service',
    maxZoom: 8,
    maxNativeZoom: 8
  }
).addTo(map);

// --- 3. Landgrenzen als klikbare overlay ----------------------------------
let geojsonLayer;
const countryLayers = {};   // landnaam (NAME) -> Leaflet-laag
const flagMarkers = {};     // landnaam (NAME) -> vlag-marker

// Stijl hangt af van of het land al is opgelost (dan groen).
// resetStyle() roept deze functie opnieuw aan, dus solved-landen blijven groen.
function countryStyle(feature) {
  const opgelost = (typeof isCountryComplete === 'function') && isCountryComplete(feature.properties.NAME);
  return {
    color: '#2b2b2b',
    weight: 1,
    fillColor: opgelost ? '#69d18b' : '#ffffff',
    fillOpacity: opgelost ? 0.45 : 0.04
  };
}

function highlightCountry(e) {
  const layer = e.target;
  layer.setStyle({
    weight: 2.5,
    color: '#1f3a5f',
    fillColor: '#2e6db4',
    fillOpacity: 0.30
  });
  layer.bringToFront();
}

function resetCountry(e) {
  geojsonLayer.resetStyle(e.target);   // → countryStyle(feature): groen als opgelost
}

function onEachCountry(feature, layer) {
  const naamNL = feature.properties.NAME_NL || feature.properties.NAME;
  countryLayers[feature.properties.NAME] = layer;
  layer.bindTooltip(naamNL, { sticky: true, direction: 'top', className: 'land-tooltip' });

  layer.on({
    mouseover: highlightCountry,
    mouseout: resetCountry,
    click: () => openCountry(feature)
  });
}

fetch('data/countries.geojson')
  .then(r => r.json())
  .then(geo => {
    geojsonLayer = L.geoJSON(geo, {
      style: countryStyle,
      onEachFeature: onEachCountry
    }).addTo(map);
    console.log('Landgrenzen geladen:', geo.features.length, 'landen');
    applyAllSolvedFlags();   // eerder behaalde vlaggen terugzetten
  })
  .catch(err => console.error('Kon landgrenzen niet laden:', err));

// --- 4. Klik op een land --------------------------------------------------
function openCountry(feature) {
  openCountryTask({
    key: feature.properties.NAME,                 // Engelse sleutel → tasks.json
    naamNL: feature.properties.NAME_NL || feature.properties.NAME,
    iso: feature.properties.ISO_A2
  });
}

// --- 5. Beloning: vlag plaatsen + land groen kleuren ----------------------
// Wordt aangeroepen door tasks.js zodra een opdracht goed is opgelost,
// en bij het laden voor alle eerder behaalde vlaggen.
// Middelpunt van de GROOTSTE landmassa (negeert overzeese gebieden zoals
// de Cariben bij Nederland, zodat de vlag op het vasteland landt).
function landMiddelpunt(layer) {
  let beste = null, besteLengte = -1;
  (function bekijk(arr) {
    if (!arr || !arr.length) return;
    if (arr[0] instanceof L.LatLng) {
      if (arr.length > besteLengte) { besteLengte = arr.length; beste = arr; }
    } else {
      arr.forEach(bekijk);
    }
  })(layer.getLatLngs());
  if (!beste) return layer.getBounds().getCenter();
  let lat = 0, lng = 0;
  beste.forEach(function (p) { lat += p.lat; lng += p.lng; });
  return L.latLng(lat / beste.length, lng / beste.length);
}

function plaatsVlag(landKey) {
  const layer = countryLayers[landKey];
  if (layer) {
    layer.setStyle(countryStyle(layer.feature));   // wordt groen (land is nu opgelost)
    if (!flagMarkers[landKey]) {
      const data = (typeof TASKS !== 'undefined' && TASKS) ? TASKS[landKey] : null;
      let iso = (data && data.iso) ? data.iso : (layer.feature.properties.ISO_A2 || '');
      iso = iso.toLowerCase();
      // echte vlagafbeelding (werkt op elk systeem, ook Windows); 🚩 als terugval
      const html = iso
        ? '<img src="https://flagcdn.com/32x24/' + iso + '.png" ' +
          'srcset="https://flagcdn.com/64x48/' + iso + '.png 2x" ' +
          'width="32" height="24" alt="vlag">'
        : '🚩';
      const c = landMiddelpunt(layer);
      flagMarkers[landKey] = L.marker(c, {
        icon: L.divIcon({ className: 'vlag-marker', html: html, iconSize: [32, 24], iconAnchor: [16, 12] }),
        interactive: false,
        keyboard: false
      }).addTo(map);
    }
  }
  updateVlagTeller();
}

function applyAllSolvedFlags() {
  const p = loadProgress();
  Object.keys(p).forEach(function (landKey) {
    if (typeof isCountryComplete === 'function' && isCountryComplete(landKey)) plaatsVlag(landKey);
  });
  updateVlagTeller();
}

function updateVlagTeller() {
  const el = document.getElementById('vlag-teller');
  if (!el) return;
  const n = (typeof countSolved === 'function') ? countSolved() : 0;
  el.textContent = n === 0 ? 'Nog geen vlaggen — klik op een land! 🗺️'
                           : ('🏁 Behaalde vlaggen: ' + n);
}

// --- 6. "Opnieuw"-knop: alle voortgang wissen -----------------------------
(function () {
  const knop = document.getElementById('reset-knop');
  if (!knop) return;
  knop.addEventListener('click', function () {
    if (confirm('Weet je het zeker? Alle vlaggen en voortgang worden gewist.')) {
      resetProgress();
      location.reload();
    }
  });
})();

console.log('Politie Wereldkaart — kaart geïnitialiseerd (stap 5).');

# Stappenplan — "Politie Wereldkaart" (educatieve taal-website)

Een interactieve wereldkaart waarop je inzoomt op landen. Per land los je een
taalopdracht op over een *leuk weetje over de politie*. Goed opgelost → het land
krijgt zijn vlag. De opdrachten zijn in het Nederlands en bedoeld voor mensen met
taalmoeilijkheden, in drie moeilijkheidsniveaus.

> Dit document is het **bouwplan**. Het beschrijft *wat* je bouwt, *in welke
> volgorde*, en *waarom*. Codefragmenten zijn voorbeelden om mee te starten, geen
> volledige applicatie.

---

## 0. Kernkeuzes (en alternatieven)

| Onderwerp | Keuze | Waarom | Alternatief |
|---|---|---|---|
| Opzet | Pure HTML/CSS/JS, geen build-tools | Eenvoudig draaien, hosten, overdragen | React/Vue (alleen bij groei) |
| Kaart | **Leaflet.js** | Lichtgewicht, zoom/pan ingebouwd, grote community | D3 + TopoJSON (meer maatwerk, meer werk) |
| Geografische look | Reliëf-tegellaag + dunne landgrenzen-overlay | "Geografisch i.p.v. politiek", grenzen blijven zichtbaar | Eén gekleurde politieke kaart |
| Landgrenzen + klikbaar | **GeoJSON** (Natural Earth) als overlay | Klikbaar per land, vlag te plaatsen | SVG-wereldkaart |
| Voortgang & vlaggen | `localStorage` in de browser | Geen server nodig | Backend + login (later) |
| Vlaggen | Emoji-vlaggen of `flagcdn.com` PNG's | Geen eigen beeldmateriaal nodig | Eigen SVG-set |
| Opdrachten-data | Los `tasks.json`-bestand | Inhoud los van code → makkelijk uit te breiden | Vast in de JS-code |

**Doelgroep-aanname:** jongeren/volwassenen met taalmoeilijkheden (bv. dyslexie,
NT2-leerders, taalontwikkelingsstoornis). Pas toon en woordniveau hierop aan.
Wijzig dit waar nodig.

---

## 1. Projectstructuur opzetten

```
politie-wereldkaart/
├── index.html              # hoofdpagina
├── css/
│   └── style.css           # styling + toegankelijkheid (lettertype, contrast)
├── js/
│   ├── map.js              # kaart, tegels, landgrenzen, klik-afhandeling
│   ├── tasks.js           # opdracht-logica (3 niveaus, nakijken, feedback)
│   ├── progress.js        # localStorage: opgeloste landen, vlaggen
│   └── speech.js          # voorlezen (Web Speech API) — taalondersteuning
├── data/
│   ├── countries.geojson   # landgrenzen (Natural Earth, vereenvoudigd)
│   └── tasks.json          # opdrachten per land, per niveau
├── assets/
│   └── fonts/              # bv. Lexend / OpenDyslexic
└── README.md
```

**Stap 1.1** — Maak de mappen en lege bestanden aan.
**Stap 1.2** — Zet een minimale `index.html` neer met Leaflet via CDN:

```html
<!DOCTYPE html>
<html lang="nl">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Politie Wereldkaart</title>
  <link rel="stylesheet" href="https://unpkg.com/leaflet/dist/leaflet.css" />
  <link rel="stylesheet" href="css/style.css" />
</head>
<body>
  <header><h1>Ontdek de politie van de wereld 🌍👮</h1></header>
  <div id="map"></div>
  <div id="task-popup" class="hidden" role="dialog" aria-modal="true"></div>

  <script src="https://unpkg.com/leaflet/dist/leaflet.js"></script>
  <script src="js/progress.js"></script>
  <script src="js/speech.js"></script>
  <script src="js/tasks.js"></script>
  <script src="js/map.js"></script>
</body>
</html>
```

**Stap 1.3** — Draai lokaal met een eenvoudige server (nodig om JSON te kunnen
`fetch`en): `python -m http.server 8000` → open `http://localhost:8000`.

---

## 2. De kaart bouwen (geografische look + grenzen)

**Doel:** een wereldkaart met een natuurlijk/reliëf-uiterlijk, waarop landgrenzen
dun zichtbaar zijn en elk land klikbaar is.

**Stap 2.1 — Basiskaart + reliëf-tegels.**

```js
// js/map.js
const map = L.map('map', { minZoom: 2, maxZoom: 6, worldCopyJump: true })
             .setView([20, 0], 2);

// Geografische (reliëf) tegellaag i.p.v. politieke kleuren:
L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', {
  attribution: '© OpenTopoMap, © OpenStreetMap-bijdragers',
  maxZoom: 6
}).addTo(map);
```

> Tegel-alternatieven met een "fysieke" look: Esri **World_Physical_Map**,
> Stamen **Terrain**, of CARTO light voor een rustige ondergrond. Kies er één en
> controleer de gebruiksvoorwaarden/attributie.

**Stap 2.2 — Landgrenzen als klikbare overlay (GeoJSON).**

Download een vereenvoudigde wereld-GeoJSON (Natural Earth `admin_0_countries`,
bv. via geojson-maps.kyd.au). Vereenvoudig naar ~50m-resolutie zodat het bestand
klein blijft.

```js
let geojsonLayer;
fetch('data/countries.geojson')
  .then(r => r.json())
  .then(geo => {
    geojsonLayer = L.geoJSON(geo, {
      style: countryStyle,           // dunne grens, transparante vulling
      onEachFeature: onEachCountry   // klik → opdracht
    }).addTo(map);
    applyAllSolvedFlags();           // vlaggen terugzetten bij herladen (zie §5)
  });

function countryStyle(feature) {
  return {
    color: '#3a3a3a',     // grenslijn
    weight: 1,
    fillColor: '#ffffff',
    fillOpacity: 0.05     // bijna doorzichtig → reliëf blijft zichtbaar
  };
}
```

**Stap 2.3 — Hover- en klik-gedrag.**

```js
function onEachCountry(feature, layer) {
  const naamNL = feature.properties.name_nl || feature.properties.name;
  layer.bindTooltip(naamNL, { sticky: true });

  layer.on({
    mouseover: e => e.target.setStyle({ fillOpacity: 0.25, weight: 2 }),
    mouseout:  e => geojsonLayer.resetStyle(e.target),
    click:     e => openCountryTask(feature, layer)
  });
}
```

**Resultaat na hoofdstuk 2:** je kunt rondzoomen, landen oplichten bij hover, en
een klik opent (straks) een opdracht.

---

## 3. Het opdracht-venster (popup)

**Doel:** bij klik op een land verschijnt een venster met de opdracht. Eén land
kan meerdere opdrachten hebben (één per niveau); toon eerst een niveaukeuze of
het volgende onopgeloste niveau.

**Stap 3.1 — Datamodel voor opdrachten (`data/tasks.json`).**

Eén schema voor drie opdrachttypes. `id` koppelt aan de GeoJSON-landnaam.

```json
{
  "Netherlands": {
    "flag": "🇳🇱",
    "facts": [
      "De Nederlandse politie gebruikt soms paarden in de stad."
    ],
    "tasks": [
      {
        "level": 1,
        "type": "fill_choice",
        "fact": "Leuk weetje: de politie in Nederland fietst vaak op een ____.",
        "sentence": "De agent rijdt op een ____ door het park.",
        "answer": "fiets",
        "options": ["fiets", "boot", "trein"]
      },
      {
        "level": 2,
        "type": "drag_order",
        "fact": "In Nederland mag je 112 bellen bij nood.",
        "instruction": "Sleep de woorden in de juiste volgorde.",
        "words": ["De", "politie", "helpt", "mensen"],
        "answer": ["De", "politie", "helpt", "mensen"]
      },
      {
        "level": 3,
        "type": "fill_type",
        "fact": "Politiehonden helpen agenten bij het zoeken.",
        "sentence": "De hond ____ de agent bij het ____.",
        "answers": ["helpt", "zoeken"],
        "hints": ["begint met h", "wat doe je als je iets kwijt bent?"]
      }
    ]
  }
}
```

**Drie opdrachttypes = drie niveaus:**

| Niveau | `type` | Wat de leerling doet | Vaardigheid |
|---|---|---|---|
| 1 (makkelijk) | `fill_choice` | Klik het juiste woord uit 3 opties | Woordherkenning |
| 2 (gemiddeld) | `drag_order` | Sleep bestaande woorden in goede volgorde | Zinsbouw |
| 3 (moeilijk) | `fill_type` | Typ zelf het/de ontbrekende woord(en) | Spelling + productie |

**Stap 3.2 — Popup openen.**

```js
function openCountryTask(feature, layer) {
  const land = feature.properties.name;          // sleutel in tasks.json
  const data = TASKS[land];
  if (!data) { showNoTask(land); return; }

  const niveau = nextUnsolvedLevel(land, data);  // uit progress.js
  renderTask(land, data, niveau, layer);
}
```

**Stap 3.3 — Popup-UI.** Een gecentreerd venster (`#task-popup`) met: landnaam,
het *leuke weetje*, de opdracht, een 🔊-voorleesknop (zie §7), een
**Controleer**-knop, en feedbackruimte. Sluiten met een duidelijke ✕ en met Esc.

---

## 4. De drie opdrachttypes implementeren

Elk type heeft een `render…`- en een `check…`-functie. Houd ze klein en los.

**Stap 4.1 — Niveau 1: `fill_choice` (woord kiezen).**

```js
function renderFillChoice(t) {
  const zin = t.sentence.replace('____', '<span class="gap">_____</span>');
  const knoppen = t.options
    .map(o => `<button class="optie" data-w="${o}">${o}</button>`).join('');
  return `<p class="fact">💡 ${t.fact}</p>
          <p class="zin">${zin}</p>
          <div class="opties">${knoppen}</div>`;
}
// check: vergelijk geklikte data-w met t.answer (kleine letters, trim)
```

**Stap 4.2 — Niveau 2: `drag_order` (slepen).**

Toon de woorden geschud in een "woordbak" en een lege "zinbalk". Gebruik de
HTML Drag-and-Drop API of een lichte helper. **Belangrijk voor de doelgroep:**
sta ook *klikken* toe (klik woord → springt naar de zin), want slepen is lastig
op touch en bij motorische problemen.

```js
function checkDragOrder(t, gekozenWoorden) {
  return JSON.stringify(gekozenWoorden) === JSON.stringify(t.answer);
}
```

**Stap 4.3 — Niveau 3: `fill_type` (zelf typen).**

Eén of meer tekstvelden in de zin. Nakijken **tolerant**: negeer hoofdletters,
spaties en eenvoudige typefouten (bv. Levenshtein-afstand ≤ 1) zodat één
verkeerde letter niet meteen "fout" is — cruciaal bij dyslexie.

```js
function isCloseEnough(invoer, goed) {
  const a = invoer.trim().toLowerCase(), b = goed.trim().toLowerCase();
  return a === b || levenshtein(a, b) <= 1;
}
```

**Stap 4.4 — Feedback (alle types).**
- **Goed:** groen vinkje, korte felicitatie, geluidje/animatie, dan vlag plaatsen.
- **Fout:** vriendelijk, geen straf. Toon een **hint** en laat opnieuw proberen.
  Nooit alleen "Fout!" — geef richting ("Bijna! Het woord begint met een f.").

---

## 5. Beloning: het land krijgt een vlag + voortgang bewaren

**Stap 5.1 — Opslaan in `localStorage` (`js/progress.js`).**

```js
const KEY = 'politie_voortgang';
function loadProgress()      { return JSON.parse(localStorage.getItem(KEY) || '{}'); }
function saveProgress(p)     { localStorage.setItem(KEY, JSON.stringify(p)); }

function markSolved(land, level) {
  const p = loadProgress();
  p[land] = p[land] || { levels: [] };
  if (!p[land].levels.includes(level)) p[land].levels.push(level);
  saveProgress(p);
}
function isSolved(land) { return !!loadProgress()[land]; }
```

**Stap 5.2 — Vlag op de kaart plaatsen.**

```js
function placeFlag(land, layer) {
  const c = layer.getBounds().getCenter();
  const vlag = TASKS[land].flag;                 // bv. "🇳🇱"
  L.marker(c, {
    icon: L.divIcon({ className: 'vlag', html: vlag, iconSize: [28, 28] })
  }).addTo(map);
  layer.setStyle({ fillColor: '#7CFC8C', fillOpacity: 0.35 }); // licht ingekleurd
}
```

> Alternatief voor echte vlagafbeeldingen: `https://flagcdn.com/w40/nl.png`
> (ISO-landcode). Bewaar de code dan in `tasks.json`.

**Stap 5.3 — Bij herladen alle behaalde vlaggen terugzetten** (`applyAllSolvedFlags`,
aangeroepen na het laden van de GeoJSON in §2.2).

**Stap 5.4 — Voortgangsbalk** (optioneel maar motiverend): "Je hebt 7 van de 30
landen bevrijd! 🏅". Telt eenvoudig de sleutels in `loadProgress()`.

---

## 6. Inhoud maken — leuke politie-weetjes in het Nederlands

Dit is het hart van het project. Plan **taalkwaliteit** net zo serieus als de code.

**Stap 6.1 — Kies een startset landen** (bv. 15–30). Begin met bekende landen
(Nederland, België, Duitsland, Frankrijk, VK, VS, Japan, Brazilië, Australië…).

**Stap 6.2 — Verzamel per land 1 leuk, waar weetje over de politie.** Voorbeelden
van het *soort* weetje (controleer de feiten zelf voor je ze gebruikt):
- 🇬🇧 In Londen dragen sommige politieagenten een hoge helm ("custodian helmet").
- 🇳🇱 In Nederland heeft de politie speciale agenten die op de fiets werken.
- 🇮🇹 Italië heeft een politieafdeling met snelle sportauto's.
- 🇯🇵 Japanse agenten werken vaak vanuit een klein wijkbureau, de "koban".

**Stap 6.3 — Schrijf per weetje drie opdrachten** (niveau 1/2/3) volgens het
schema in §3.1. Richtlijnen voor de doelgroep met taalmoeilijkheden:
- **Korte zinnen**: maximaal **6–7 woorden** per oefenzin (fill/sleep), één idee
  per zin. Houd ook de weetjes-zin kort.
- **Frequente, concrete woorden**; vermijd vaktaal en lange samenstellingen.
- **Eén gat** op niveau 1, **maximaal twee gaten** op niveau 3.
- Bij niveau 2 (slepen): **4–6 woorden** per zin, niet meer.
- Voeg waar mogelijk een **ondersteunend plaatje of emoji** toe.
- Zorg dat het juiste antwoord **ondubbelzinnig** is (geen twee even goede opties).
- **Let op interpunctie en hoofdletters**: elke zin begint met een hoofdletter en
  eindigt met de juiste leestekens (`.`, `?`, `!`). Bij niveau 2 (slepen) zit de
  beginhoofdletter in het eerste woord en wordt het eindteken automatisch getoond
  via het veld `"einde"` (standaard `"."`). Voor een vraag zet je `"einde": "?"`.
  Interpunctie hoort bij taalontwikkeling — sla het niet over.

**Stap 6.4 — Laat de teksten nakijken** door iemand met ervaring in taal/NT2 of
logopedie/taalonderwijs voordat je veel content maakt. Beter 15 goede landen dan
30 wankele.

---

## 7. Toegankelijkheid & taalondersteuning (essentieel, niet optioneel)

Voor de doelgroep is dit even belangrijk als de opdrachten zelf.

**Stap 7.1 — Voorlezen (Web Speech API), `js/speech.js`.**

```js
function spreekUit(tekst) {
  const u = new SpeechSynthesisUtterance(tekst);
  u.lang = 'nl-NL';
  u.rate = 0.9;               // iets langzamer
  speechSynthesis.cancel();
  speechSynthesis.speak(u);
}
```
Zet een 🔊-knop bij elk weetje, elke opdracht én elke feedbacktekst.

**Stap 7.2 — Leesbare typografie.**
- Lettertype **Lexend** of **OpenDyslexic**; grootte ≥ 18px, regelafstand ≥ 1.5.
- Hoog contrast; vermijd puur grijs op wit.
- Linksuitgelijnd, niet uitgevuld; ruime witruimte.

**Stap 7.3 — Rustige, voorspelbare UI.**
- Geen tijdsdruk, geen wegtikkende klok.
- Eén opdracht tegelijk; duidelijke, grote knoppen.
- Consistente plek voor "Controleer", "Hint", "Sluiten".

**Stap 7.4 — Foutvriendelijkheid.** Tolerant nakijken (§4.3), altijd een hint,
onbeperkt opnieuw proberen, nooit negatieve taal.

**Stap 7.5 — Toetsenbord & screenreader.** Popup met `role="dialog"`, focus vasthouden
in de popup, Esc sluit, alle knoppen bereikbaar met Tab, `aria-label`s op iconen.

---

## 8. Styling & sfeer (`css/style.css`)

- **`#map`**: volledige hoogte (`height: 100vh`).
- **Popup**: gecentreerd, afgeronde hoeken, zachte schaduw, max-breedte ~480px,
  donkere semi-transparante achtergrond erachter.
- **Vlag-markers**: emoji ~24–28px; lichte "pop"-animatie bij plaatsen.
- **Thema**: vriendelijk, speels maar rustig (de kaart is al druk).
- **Responsief**: werkt op tablet/telefoon; knoppen groot genoeg voor vingers.

---

## 9. Testen

**Stap 9.1 — Functioneel.** Per opdrachttype: goed antwoord → vlag + opslag;
fout antwoord → hint, geen vlag; herladen → vlaggen blijven staan.
**Stap 9.2 — Inhoud.** Lees elke zin hardop; klopt het weetje? Is er één juist
antwoord? Werkt het voorlezen (Nederlandse uitspraak)?
**Stap 9.3 — Toegankelijkheid.** Alleen-toetsenbord doorlopen; check contrast
(bv. WebAIM); test met echte gebruikers uit de doelgroep indien mogelijk.
**Stap 9.4 — Apparaten.** Desktop + tablet + telefoon; slepen én klikken op touch.

---

## 10. Publiceren

- **Statische hosting**: GitHub Pages, Netlify of Cloudflare Pages (sleep de map
  erin; geen server nodig).
- Controleer dat `fetch` van `data/*.json` werkt op de hostingomgeving (relatieve
  paden).
- Vermeld de **attributie** van je tegellaag en GeoJSON-bron in een hoekje/README.

---

## 11. Voorgestelde volgorde (samengevat)

1. **Skelet** — mappen + `index.html` + lokale server draaien (§1).
2. **Kaart** — reliëf-tegels + GeoJSON-grenzen + hover/klik (§2).
3. **Popup** — venster opent bij klik, toont één testopdracht (§3).
4. **Niveau 1** volledig werkend (kiezen + nakijken + feedback) (§4.1).
5. **Vlag + opslag** — eerste land "bevrijden", blijft na herladen (§5).
6. **Niveau 2 en 3** toevoegen (§4.2–4.3).
7. **Voorlezen + toegankelijkheid** (§7).
8. **Inhoud** uitbreiden naar 15–30 landen (§6).
9. **Styling, testen, publiceren** (§8–10).

> **Tip:** bouw het hele systeem eerst af met **één** land (Nederland) en alle drie
> de niveaus. Pas als dat soepel werkt, schaal je de inhoud op. Zo zit de techniek
> vast voordat je veel tekst schrijft.

---

## 12. Latere uitbreidingen (optioneel)

- **Werelddelen/regio's** als deelkaarten of thema's.
- **Geluidseffecten** en badges per continent.
- **Meer opdrachttypes**: woord-plaatje matchen, zin inspreken (Speech-to-Text).
- **Leerkrachtmodus**: eigen weetjes/opdrachten toevoegen via een formulier.
- **Backend + login** zodra je voortgang over apparaten wilt delen.
- **Meertalig**: dezelfde structuur, andere taalbestanden.

---

### Bronnen om mee te starten
- Leaflet: https://leafletjs.com/
- Landgrenzen-GeoJSON (Natural Earth, instelbaar): https://geojson-maps.kyd.au/
- Reliëftegels: OpenTopoMap, Esri World_Physical_Map, Stamen Terrain
- Vlaggen via code: https://flagcdn.com/
- Leesbaar lettertype: Lexend (Google Fonts), OpenDyslexic

# Politie Wereldkaart 🌍👮

Een educatieve webpagina: een **interactieve, fysieke wereldkaart** waarop je op
een land klikt en een korte **taalopdracht over een leuk politie-weetje** oplost.
Goed opgelost → het land krijgt zijn **vlag** en kleurt groen. Bedoeld voor
mensen met **taalmoeilijkheden** (bv. dyslexie, NT2), in **vier
moeilijkheidsniveaus**, met **voorlezen** en **geluid**.

> Gemaakt met pure HTML/CSS/JavaScript — geen build-tools, geen server-code,
> geen account nodig. Je kunt het bestand zo openen of online zetten.

---

## 📊 Stand van het project

Klaar en speelbaar. **95 landen** wereldwijd, elk met **4 niveaus** — samen **380
opdrachten**. De vlag van een land verschijnt pas als alle vier de niveaus zijn opgelost.

- **Niveau 1** — kies het juiste woord (uit 3 opties)
- **Niveau 2** — sleep of klik woorden in de juiste volgorde
- **Niveau 3** — typ het ontbrekende woord (tolerante controle + oplopende tips/synoniemen);
  bij enkele landen een **luister-dictee** (woorden uit een voorgelezen tekstje)
- **Niveau 4** — **hoofdletters & interpunctie**: maak een politie-zin met een stad
  erin goed en kies het juiste leesteken (`.` `?` `!`)

Verder: voortgang in de browser, voorlezen (NL/EN) met stemkiezer, geluidseffecten,
en een toegankelijk ontwerp (Lexend, hoog contrast, geen tijdsdruk).

**Online status:** de code staat op GitHub. **GitHub Pages is nog niet ingeschakeld**,
dus de live-URL is nog niet actief — zie [Online publiceren](#-online-publiceren) om
hem aan te zetten.

---

## ✨ Wat kan het?

- **Wereldkaart** met reliëf-ondergrond (geografisch, niet politiek) en klikbare landgrenzen.
- **95 landen** met elk 4 opdrachten over politie (Nederlands; het VK in het Engels).
- **Vier niveaus** per land:
  1. **Makkelijk** — kies het juiste woord uit drie opties.
  2. **Gemiddeld** — sleep (of klik) woorden in de juiste volgorde.
  3. **Moeilijk** — typ zelf het ontbrekende woord (hint/synoniem + tolerante spellingcontrole), of een **luister-dictee**.
  4. **Uitdaging** — zet hoofdletters goed en kies het juiste leesteken in een politie-zin.
- **Beloning**: pas als álle vier de niveaus af zijn, krijgt het land een echte vlag + groene inkleuring (met teller bovenaan).
- **Voortgang** wordt in de browser bewaard (`localStorage`) — blijft staan na herladen.
- **Geluid**: 🔊 voorlezen (Nederlandse/Engelse stem) en vrolijke geluidjes bij goed/fout/vlag.
- **Toegankelijk**: leesbaar lettertype (Lexend), groot, hoog contrast, geen tijdsdruk, vriendelijke feedback.

---

## 🚀 Snel starten (lokaal)

De pagina laadt databestanden via `fetch`, dus open `index.html` **niet** direct
als bestand — start de meegeleverde mini-server (geen Python of Node nodig):

```powershell
cd politie-wereldkaart
powershell -ExecutionPolicy Bypass -File serve.ps1
```

Open daarna **http://localhost:8000** in je browser. Stoppen: `Ctrl+C`.
Andere poort nodig? `... -File serve.ps1 -Port 8080`.

> Werkt het voorlezen met een Engels accent? Kies dan een Nederlandse stem in het
> **🔊**-lijstje bovenaan, of installeer er een in Windows (*Instellingen →
> Tijd en taal → Spraak*).

---

## 🧩 Hoe het werkt

### Bestanden

```
politie-wereldkaart/
├── index.html              # de pagina (kop, kaart-container, popup)
├── serve.ps1               # mini-webserver voor lokaal draaien
├── css/
│   └── style.css           # alle styling + toegankelijkheid
├── js/
│   ├── map.js              # kaart, landgrenzen, klik, vlaggen plaatsen
│   ├── tasks.js            # opdracht-venster + de drie niveaus + nakijken
│   ├── progress.js         # voortgang & vlaggen in localStorage
│   └── speech.js           # voorlezen + geluidseffecten + stemkiezer
├── data/
│   ├── countries.geojson   # landgrenzen (Natural Earth, 50m)
│   └── tasks.json          # ALLE opdrachten — dit pas je aan voor nieuwe content
└── STAPPENPLAN.md          # het oorspronkelijke bouwplan
```

De vier scripts laden in volgorde (`progress → speech → tasks → map`); `map.js`
roept bij een klik `openCountryTask(...)` uit `tasks.js` aan, dat op zijn beurt
`progress.js` (opslaan) en de geluidsfuncties uit `speech.js` gebruikt.

### Koppeling kaart ↔ opdracht

Elk land in `data/countries.geojson` heeft een **Engelse naam** (`NAME`, bv.
`"Netherlands"`). Diezelfde naam is de **sleutel** in `data/tasks.json`. De speler
ziet de **Nederlandse** naam (`NAME_NL`, bv. "Nederland") als tooltip.

### `tasks.json` — het schema

Per land: een vlag-emoji (niet gebruikt voor weergave, alleen documentatie), een
**ISO-landcode** (`iso`, voor de echte vlagafbeelding van flagcdn.com), optioneel
`"lang": "en"` voor een Engelstalig land, en een lijst `tasks` (één per niveau):

```json
"Netherlands": {
  "flag": "🇳🇱", "iso": "nl", "thema": "Flikken Maastricht",
  "tasks": [
    { "level": 1, "type": "fill_choice",
      "fact": "Flikken Maastricht is een politieserie op tv. 📺",
      "sentence": "Flikken Maastricht gaat over de ___.",
      "answer": "politie", "options": ["politie", "bakker", "dokter"] },

    { "level": 2, "type": "drag_order",
      "fact": "De serie speelt in de stad Maastricht. 🏙️",
      "instruction": "Sleep de woorden in de juiste volgorde. ...",
      "answer": ["De", "agenten", "lopen", "door", "Maastricht"], "einde": "." },

    { "level": 3, "type": "fill_type",
      "fact": "De politie lost elke aflevering een zaak op. 🔍",
      "sentence": "De politie ___ de zaak op.",
      "answers": ["lost"],
      "hints": ["Het woord begint met de letter l.", "..."] }
  ]
}
```

| Veld | Betekenis |
|---|---|
| `type` | `fill_choice` (niv. 1), `drag_order` (niv. 2), `fill_type` of `luister_tekst` (niv. 3), `interpunctie` (niv. 4) |
| `fact` | het politie-weetje (wordt getoond én voorgelezen) |
| `sentence` | de zin; `___` (drie underscores) markeert het gat |
| `answer` / `options` | juiste woord + 3 keuzeknoppen (niveau 1) |
| `answer` (array) | de woorden in de juiste volgorde (niveau 2) |
| `einde` | leesteken dat automatisch achter de gesleepte zin komt (`.` of `?`) |
| `answers` (array) | het/de juiste woord(en) om te typen (niveau 3) |
| `hints` | hints die één voor één verschijnen (niveau 3) |

### Nakijken & beloning

- **Niveau 3** kijkt **tolerant** na: hoofdletters/spaties tellen niet, en één
  typefout (Levenshtein-afstand ≤ 1) wordt nog goed gerekend — belangrijk bij dyslexie.
- Bij een juist antwoord: opslaan (`progress.js`), vlag op de kaart (`map.js`,
  geplaatst op de **grootste landmassa** zodat overzeese gebieden het niet verstoren),
  en een geluidje (`speech.js`).

---

## ➕ Een land toevoegen of een opdracht aanpassen

Je hoeft **alleen `data/tasks.json`** te bewijzen — geen code.

1. Zoek de **Engelse landnaam** zoals die in `countries.geojson` staat
   (bv. `Sweden`, `United States of America`). Twijfel je? Open de kaart, ga met de
   muis over het land — of zoek in `countries.geojson` op `NAME_NL`.
2. Voeg een blok toe met `iso` (de tweeletterige landcode, bv. `se`) en drie `tasks`.
3. Houd je aan de **inhoudsregels** (zie `STAPPENPLAN.md` §6.3):
   - **maximaal 6–7 woorden** per zin, één idee per zin;
   - **hoofdletter** aan het begin, **leesteken** aan het eind;
   - eenvoudige, concrete woorden; **ondubbelzinnig** juiste antwoorden;
   - vermijd dezelfde zin/woorden te vaak (houd het divers).

Geen herstart nodig — ververs de pagina (bij CSS/JS soms een **harde** verversing, `Ctrl+F5`).

---

## 🌐 Online publiceren

Het is een **statische site**, dus hosten is gratis en simpel. Twee opties:

**GitHub Pages**
1. Zet de map `politie-wereldkaart/` in een GitHub-repository.
2. Repo → *Settings* → *Pages* → *Branch*: kies je branch en map (root of `/docs`).
3. Na een minuut staat de site op `https://<gebruiker>.github.io/<repo>/`.

**Netlify / Cloudflare Pages**
1. Sleep de map naar netlify.com (drop), of koppel de repo.
2. Geen build-commando nodig (publish-map = de projectmap).

Let op: de kaarttegels (Esri), landgrenzen en vlaggen (flagcdn.com) worden
**online** geladen, dus de gepubliceerde site heeft internet nodig. `serve.ps1` is
alleen voor lokaal gebruik en hoeft niet mee online.

---

## ♿ Toegankelijkheid

- Lettertype **Lexend**, ≥18px, ruime regelafstand, hoog contrast.
- **Voorlezen** van weetje + zin (🔊), met een **stemkiezer** in de kop.
- Tolerante spellingcontrole, hints, onbeperkt opnieuw proberen, **geen tijdsdruk**.
- Slepen **én** klikken (touch-vriendelijk), grote knoppen, sluiten met `Esc`.

---

## 🙏 Bronnen & dank

- Kaart: **[Leaflet](https://leafletjs.com/)**
- Reliëf-ondergrond: **Esri World Physical Map** (© Esri — U.S. National Park Service)
- Landgrenzen: **[Natural Earth](https://www.naturalearthdata.com/)** (50m, via geojson-maps.kyd.au)
- Vlaggen: **[flagcdn.com](https://flagcdn.com/)**
- Lettertype: **[Lexend](https://fonts.google.com/specimen/Lexend)** (Google Fonts)
- Voorlezen & geluid: Web Speech API + Web Audio API (in de browser)

De politie-weetjes zijn eenvoudig en educatief bedoeld; controleer feiten zelf
voordat je ze ergens officieel gebruikt.

---

## 📋 Status

- [x] Stap 1 — Skelet
- [x] Stap 2 — Kaart (reliëf + landgrenzen + hover/klik)
- [x] Stap 3 — Opdracht-venster + niveaukeuze
- [x] Stap 4 — Drie opdrachttypes werkend
- [x] Stap 5 — Vlag + voortgang opslaan
- [x] Stap 6 — Inhoud: **95 landen**, wereldwijd, divers, elk 4 niveaus
- [x] Stap 7 — Geluid: voorlezen + geluidjes + stemkiezer
- [x] Stap 8–10 — Afronding: README, attributie, code op GitHub
- [ ] **Publiceren: GitHub Pages nog inschakelen** (Settings → Pages → branch `main`, map `/root`)
      → daarna live op `https://irina-kalmykoff.github.io/politie-wereldkaart/`

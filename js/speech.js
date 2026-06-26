/* =========================================================
   speech.js — Stap 7: geluid
   1) Voorlezen (Web Speech API) — ondersteunt taalleerders
   2) Geluidseffecten (Web Audio API) — goed / fout / vlag
      (synthese, dus geen geluidsbestanden nodig)
   ========================================================= */

/* ---------- 1. Voorlezen ---------- */

// Haal emoji en gat-streepjes weg, anders leest de stem die letterlijk voor.
function schoonVoorSpraak(tekst) {
  return (tekst || '')
    .replace(/_{2,}/g, ' ... ')                                   // gat → pauze
    .replace(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2190}-\u{21FF}\u{2B00}-\u{2BFF}\u{1F1E6}-\u{1F1FF}️]/gu, '')
    .replace(/\s+/g, ' ')
    .trim();
}

// Beschikbare stemmen worden (soms pas later) door de browser geladen.
let _stemmen = [];
function _laadStemmen() {
  if ('speechSynthesis' in window) _stemmen = window.speechSynthesis.getVoices() || [];
}
_laadStemmen();
if ('speechSynthesis' in window && window.speechSynthesis.addEventListener) {
  window.speechSynthesis.addEventListener('voiceschanged', _laadStemmen);
}

// Kies de beste stem voor een taal (bv. 'nl-NL' → een Nederlandse stem).
// Zonder dit klinkt Nederlandse tekst alsof het Engels is.
function kiesStem(lang) {
  if (!_stemmen.length) _laadStemmen();
  const doel = (lang || 'nl-NL').toLowerCase();
  const pre = doel.slice(0, 2);
  return _stemmen.find(s => s.lang && s.lang.toLowerCase() === doel)
      || _stemmen.find(s => s.lang && s.lang.toLowerCase().replace('_', '-').slice(0, 2) === pre)
      || null;
}

function heeftStemVoor(lang) { return !!kiesStem(lang); }

function spreekUit(tekst, lang) {
  if (!('speechSynthesis' in window)) return;
  const schoon = schoonVoorSpraak(tekst);
  if (!schoon) return;
  const taal = lang || 'nl-NL';
  const u = new SpeechSynthesisUtterance(schoon);
  u.lang = taal;
  // 1) door de gebruiker gekozen stem (alleen als de taal matcht),
  // 2) anders automatisch de beste stem voor de taal.
  let stem = null;
  const gekozen = gekozenStemNaam();
  if (gekozen) {
    const g = _stemmen.find(s => s.name === gekozen);
    if (g && (g.lang || '').toLowerCase().slice(0, 2) === taal.slice(0, 2).toLowerCase()) stem = g;
  }
  if (!stem) stem = kiesStem(taal);
  if (stem) {
    u.voice = stem;          // cruciaal: bind een echte stem in de juiste taal
  } else {
    console.warn('Geen stem gevonden voor', taal, '- de uitspraak kan afwijken. Beschikbaar:',
      _stemmen.map(s => s.name + ' (' + s.lang + ')').join(', '));
  }
  u.rate = 0.9;     // iets langzamer, prettig voor de doelgroep
  u.pitch = 1.0;
  window.speechSynthesis.cancel();   // stop wat er nog liep
  window.speechSynthesis.speak(u);
}

function stopSpreken() {
  if ('speechSynthesis' in window) window.speechSynthesis.cancel();
}

/* ---------- 2. Geluidseffecten (Web Audio API) ---------- */

let _audioCtx = null;
function audioCtx() {
  if (!_audioCtx) {
    try { _audioCtx = new (window.AudioContext || window.webkitAudioContext)(); }
    catch (e) { return null; }
  }
  if (_audioCtx && _audioCtx.state === 'suspended') _audioCtx.resume();
  return _audioCtx;
}

// Speel één toon: frequentie (Hz), start (s), duur (s), golfvorm, volume
function _toon(freq, start, duur, type, volume) {
  const ctx = audioCtx();
  if (!ctx) return;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type || 'sine';
  osc.frequency.value = freq;
  osc.connect(gain);
  gain.connect(ctx.destination);
  const t = ctx.currentTime + start;
  gain.gain.setValueAtTime(0.0001, t);
  gain.gain.linearRampToValueAtTime(volume || 0.18, t + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + duur);
  osc.start(t);
  osc.stop(t + duur + 0.02);
}

// Vrolijk belletje: twee stijgende tonen
function geluidGoed() {
  _toon(660, 0,    0.15, 'sine', 0.18);
  _toon(880, 0.12, 0.25, 'sine', 0.18);
}

// Zacht, vriendelijk "probeer nog eens"-toontje (geen straffend geluid)
function geluidFout() {
  _toon(300, 0,    0.18, 'sine', 0.14);
  _toon(240, 0.15, 0.22, 'sine', 0.14);
}

// Kleine fanfare wanneer een land zijn vlag verdient (do–mi–sol)
function geluidVlag() {
  _toon(523, 0,    0.15, 'triangle', 0.18);
  _toon(659, 0.13, 0.15, 'triangle', 0.18);
  _toon(784, 0.26, 0.35, 'triangle', 0.20);
}

/* ---------- 3. Stemkiezer (zichtbaar in de kop) ---------- */

const STEM_KEY = 'politie_wereldkaart_stem';
function gekozenStemNaam() { try { return localStorage.getItem(STEM_KEY) || ''; } catch (e) { return ''; } }
function setGekozenStem(naam) { try { localStorage.setItem(STEM_KEY, naam || ''); } catch (e) {} }

// Vul de keuzelijst met alle beschikbare stemmen (Nederlands eerst, dan Engels).
function vulStemKiezer() {
  const sel = document.getElementById('stem-select');
  if (!sel) return;
  _laadStemmen();
  const huidige = gekozenStemNaam();
  const score = s => { const l = (s.lang || '').toLowerCase(); return l.indexOf('nl') === 0 ? 0 : (l.indexOf('en') === 0 ? 1 : 2); };
  const lijst = _stemmen.slice().sort((a, b) => score(a) - score(b) || (a.lang || '').localeCompare(b.lang || ''));
  sel.innerHTML = '<option value="">Automatisch</option>' + lijst.map(function (s) {
    const gekozenAttr = (s.name === huidige) ? ' selected' : '';
    return '<option value="' + s.name.replace(/"/g, '') + '"' + gekozenAttr + '>' + s.name + ' — ' + s.lang + '</option>';
  }).join('');
}

function _initStemKiezer() {
  vulStemKiezer();
  const sel = document.getElementById('stem-select');
  if (sel && !sel._wired) {
    sel._wired = true;
    sel.addEventListener('change', function () {
      setGekozenStem(sel.value);
      spreekUit('De politie helpt de mensen.', 'nl-NL');   // korte testzin
    });
  }
}
_initStemKiezer();
if ('speechSynthesis' in window && window.speechSynthesis.addEventListener) {
  window.speechSynthesis.addEventListener('voiceschanged', vulStemKiezer);
}

/* =========================================================
   progress.js — Stap 5: voortgang & vlaggen in localStorage
   Bewaart per land welke niveaus zijn opgelost. Blijft staan
   na het herladen van de pagina.
   Opslagvorm:  { "Netherlands": { "levels": [1, 2] }, ... }
   ========================================================= */

const VOORTGANG_KEY = 'politie_wereldkaart_voortgang';

function loadProgress() {
  try {
    return JSON.parse(localStorage.getItem(VOORTGANG_KEY)) || {};
  } catch (e) {
    return {};
  }
}

function saveProgress(p) {
  localStorage.setItem(VOORTGANG_KEY, JSON.stringify(p));
}

// Markeer één niveau van een land als opgelost
function markSolved(landKey, level) {
  const p = loadProgress();
  if (!p[landKey]) p[landKey] = { levels: [] };
  if (p[landKey].levels.indexOf(level) === -1) {
    p[landKey].levels.push(level);
    p[landKey].levels.sort();
  }
  saveProgress(p);
}

// Heeft dit land minstens één opgelost niveau? (→ verdient een vlag)
function isSolved(landKey) {
  const p = loadProgress();
  return !!(p[landKey] && p[landKey].levels && p[landKey].levels.length > 0);
}

// Welke niveaus zijn al opgelost voor dit land?
function getSolvedLevels(landKey) {
  const p = loadProgress();
  return (p[landKey] && p[landKey].levels) ? p[landKey].levels.slice() : [];
}

// Hoeveel landen hebben een vlag?
function countSolved() {
  return Object.keys(loadProgress()).length;
}

// Alles wissen (de "Opnieuw"-knop)
function resetProgress() {
  localStorage.removeItem(VOORTGANG_KEY);
}

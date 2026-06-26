/* =========================================================
   tasks.js — Stap 3 + 4: het opdracht-venster + drie niveaus
   - laadt de opdrachten uit data/tasks.json
   - bouwt de popup: vlag + landnaam, niveaukeuze, weetje, opdracht, feedback
   - niveau 1: woord kiezen (fill_choice)
   - niveau 2: woorden slepen OF klikken in volgorde (drag_order)
   - niveau 3: zelf typen met hint + tolerant nakijken (fill_type)
   ========================================================= */

let TASKS = null;

fetch('data/tasks.json')
  .then(r => r.json())
  .then(d => { TASKS = d; console.log('Opdrachten geladen voor', Object.keys(d).length, 'land(en).'); })
  .catch(e => console.error('Kon opdrachten niet laden:', e));

const NIVEAU_NAAM  = { 1: 'Makkelijk', 2: 'Gemiddeld', 3: 'Moeilijk' };
const NIVEAU_KLEUR = { 1: '#2e8b57', 2: '#c08a2b', 3: '#b5562b' };

function popup() { return document.getElementById('task-popup'); }
function sluitPopup() {
  if (typeof stopSpreken === 'function') stopSpreken();
  popup().classList.add('hidden');
}

// ---------- Openen ----------
function openCountryTask(land) {
  if (!TASKS) {
    toonKaart(land.naamNL, '', '<p>Even geduld, de opdrachten laden…</p>');
    return;
  }
  const data = TASKS[land.key];
  if (!data) {
    toonKaart(land.naamNL, '',
      '<p>Voor dit land is er nog geen opdracht. 🙂</p>' +
      '<p class="popup-hint">Tip: klik op <b>Nederland</b> 🇳🇱 om te oefenen.</p>');
    return;
  }
  toonNiveaukeuze(land, data);
}

// Bouw de kaart-omhulling (sluitknop, titel, subtitel, body) en geef de body terug
function toonKaart(titel, subtitel, bodyHTML) {
  const p = popup();
  p.innerHTML =
    '<div class="popup-card">' +
      '<button class="popup-sluit" aria-label="Sluiten" title="Sluiten">✕</button>' +
      '<h2 id="popup-titel">' + titel + '</h2>' +
      (subtitel ? '<p class="popup-sub">' + subtitel + '</p>' : '') +
      '<div class="popup-body">' + bodyHTML + '</div>' +
    '</div>';
  p.classList.remove('hidden');
  p.querySelector('.popup-sluit').addEventListener('click', sluitPopup);
  return p.querySelector('.popup-body');
}

// ---------- Niveaukeuze ----------
function toonNiveaukeuze(land, data) {
  const titel = vlagImg(land) + land.naamNL;
  const opgelost = (typeof getSolvedLevels === 'function') ? getSolvedLevels(land.key) : [];

  const knoppen = [1, 2, 3].map(function (lvl) {
    const heeft = data.tasks.some(function (t) { return t.level === lvl; });
    if (!heeft) return '';
    const klaar = opgelost.indexOf(lvl) !== -1;
    return '<button class="niveau-knop' + (klaar ? ' niveau-klaar' : '') + '" data-lvl="' + lvl + '" ' +
           'style="--lvl-kleur:' + NIVEAU_KLEUR[lvl] + '">' +
             '<span class="niveau-nr">Niveau ' + lvl + (klaar ? ' ✓' : '') + '</span>' +
             '<span class="niveau-label">' + NIVEAU_NAAM[lvl] + '</span>' +
           '</button>';
  }).join('');

  const sub = opgelost.length
    ? '🏁 Je hebt al ' + opgelost.length + ' niveau(s) opgelost! Speel verder.'
    : 'Kies een niveau om te beginnen';

  const body = toonKaart(titel, sub,
    '<div class="niveau-keuze">' + knoppen + '</div>');

  body.querySelectorAll('.niveau-knop').forEach(function (btn) {
    btn.addEventListener('click', function () {
      const lvl = parseInt(btn.getAttribute('data-lvl'), 10);
      const taak = data.tasks.find(function (t) { return t.level === lvl; });
      toonTaak(land, data, taak);
    });
  });
}

// ---------- Eén opdracht tonen ----------
function toonTaak(land, data, taak) {
  const titel = vlagImg(land) + land.naamNL;
  const sub = 'Niveau ' + taak.level + ' · ' + NIVEAU_NAAM[taak.level];

  let opdrachtHTML, actiesHTML;
  if (taak.type === 'fill_choice') {
    opdrachtHTML = renderFillChoice(taak);
    actiesHTML = '<button class="terug-knop">← Kies ander niveau</button>';
  } else if (taak.type === 'drag_order') {
    opdrachtHTML = renderDragOrder(taak);
    actiesHTML = '<button class="controleer-knop">Controleer</button>' +
                 '<button class="terug-knop">← Ander niveau</button>';
  } else if (taak.type === 'fill_type') {
    opdrachtHTML = renderFillType(taak);
    actiesHTML = '<button class="hint-knop">💡 Hint</button>' +
                 '<button class="controleer-knop">Controleer</button>' +
                 '<button class="terug-knop">← Ander niveau</button>';
  } else {
    opdrachtHTML = '<p>Onbekend opdrachttype.</p>';
    actiesHTML = '<button class="terug-knop">← Kies ander niveau</button>';
  }

  const body = toonKaart(titel, sub,
    '<p class="fact">💡 ' + taak.fact + '</p>' +
    '<button class="lees-knop" type="button" aria-label="Lees de opdracht voor">🔊 Lees voor</button>' +
    (taak.instruction ? '<p class="instructie">' + taak.instruction + '</p>' : '') +
    opdrachtHTML +
    '<div class="feedback" aria-live="polite"></div>' +
    '<div class="taak-acties">' + actiesHTML + '</div>');

  body.querySelector('.terug-knop').addEventListener('click', function () {
    toonNiveaukeuze(land, data);
  });

  const leesKnop = body.querySelector('.lees-knop');
  if (leesKnop) leesKnop.addEventListener('click', function () { leesTaakVoor(land, taak); });

  if (taak.type === 'fill_choice') bindFillChoice(body, taak, land);
  else if (taak.type === 'drag_order') bindDragOrder(body, taak, land);
  else if (taak.type === 'fill_type') bindFillType(body, taak, land);
}

// Lees het weetje + de zin (of instructie) hardop voor, in de juiste taal.
function leesTaakVoor(land, taak) {
  const lang = (TASKS[land.key] && TASKS[land.key].lang === 'en') ? 'en-GB' : 'nl-NL';
  if (typeof heeftStemVoor === 'function' && !heeftStemVoor(lang)) toonStemWaarschuwing(lang);
  const stukken = [taak.fact];
  if (taak.sentence) stukken.push(taak.sentence);
  else if (taak.instruction) stukken.push(taak.instruction);
  if (typeof spreekUit === 'function') spreekUit(stukken.join('. '), lang);
}

// Toon een vriendelijke tip als er geen passende stem is geïnstalleerd.
function toonStemWaarschuwing(lang) {
  const knop = document.querySelector('.lees-knop');
  if (!knop || document.querySelector('.stem-waarschuwing')) return;
  const n = document.createElement('p');
  n.className = 'stem-waarschuwing popup-hint';
  n.textContent = (lang.slice(0, 2) === 'nl')
    ? '🔈 Geen Nederlandse stem gevonden. Kies er een bij 🔊 bovenaan, of installeer er een in Windows.'
    : '🔈 No matching voice installed for this language.';
  knop.parentNode.insertBefore(n, knop.nextSibling);
}

// Beloning bij een juist antwoord: opslaan + vlag op de kaart + geluid
function belonen(land, level) {
  const wasSolved = (typeof isSolved === 'function') ? isSolved(land.key) : false;
  if (typeof markSolved === 'function') markSolved(land.key, level);
  if (typeof plaatsVlag === 'function') plaatsVlag(land.key);
  if (!wasSolved && typeof geluidVlag === 'function') geluidVlag();   // nieuw land → fanfare
  else if (typeof geluidGoed === 'function') geluidGoed();            // ander niveau → belletje
}

function succesHTML(land) {
  return '✅ Goed gedaan! 🎉<br>' +
         '<span class="vlag-behaald">' + vlagImg(land) + land.naamNL + ' heeft een vlag!</span>';
}

// Echte vlagafbeelding (flagcdn.com) op basis van de ISO-landcode.
// Werkt op elk systeem — anders dan emoji-vlaggen (die op Windows "NL" tonen).
function vlagImg(land) {
  let iso = '';
  if (TASKS && TASKS[land.key] && TASKS[land.key].iso) iso = TASKS[land.key].iso;
  else if (land.iso) iso = land.iso;
  iso = (iso || '').toLowerCase();
  if (!iso) return '';
  return '<img class="vlag-img" src="https://flagcdn.com/24x18/' + iso + '.png" ' +
         'srcset="https://flagcdn.com/48x36/' + iso + '.png 2x" ' +
         'width="24" height="18" alt="vlag van ' + land.naamNL + '"> ';
}

/* =========================================================
   Niveau 1 — woord kiezen
   ========================================================= */
function renderFillChoice(t) {
  const zin = t.sentence.replace('___', '<span class="gap">_____</span>');
  const opties = t.options.map(function (o) {
    return '<button class="optie" data-w="' + o + '">' + o + '</button>';
  }).join('');
  return '<p class="zin">' + zin + '</p>' +
         '<div class="opties">' + opties + '</div>';
}

function bindFillChoice(body, t, land) {
  const fb = body.querySelector('.feedback');
  body.querySelectorAll('.optie').forEach(function (btn) {
    btn.addEventListener('click', function () {
      const gekozen = btn.getAttribute('data-w').toLowerCase().trim();
      const goed = gekozen === t.answer.toLowerCase().trim();
      if (goed) {
        btn.classList.add('optie-goed');
        body.querySelectorAll('.optie').forEach(function (b) { b.disabled = true; });
        const gap = body.querySelector('.gap');
        if (gap) { gap.textContent = t.answer; gap.classList.add('gap-vol'); }
        fb.className = 'feedback feedback-goed';
        fb.innerHTML = succesHTML(land);
        belonen(land, t.level);
      } else {
        btn.classList.add('optie-fout');
        btn.disabled = true;
        fb.className = 'feedback feedback-fout';
        fb.innerHTML = '❌ Bijna! Probeer een ander woord.';
        if (typeof geluidFout === 'function') geluidFout();
      }
    });
  });
}

/* =========================================================
   Niveau 2 — woorden in volgorde slepen OF klikken
   ========================================================= */
function renderDragOrder() {
  return '<div class="zinbalk" aria-label="Jouw zin"></div>' +
         '<p class="woordbak-label">Woorden:</p>' +
         '<div class="woordbak" aria-label="Woorden om te kiezen"></div>';
}

function bindDragOrder(body, t, land) {
  const correct = t.answer.slice();
  let bak = shuffle(correct.slice());
  // voorkom dat de geschudde volgorde meteen het goede antwoord is
  if (bak.length > 1 && bak.join('|') === correct.join('|')) bak = shuffle(bak);
  let zin = [];

  const zinEl = body.querySelector('.zinbalk');
  const bakEl = body.querySelector('.woordbak');
  const fb = body.querySelector('.feedback');
  const controleer = body.querySelector('.controleer-knop');

  function wisFeedback() { fb.className = 'feedback'; fb.innerHTML = ''; }

  const eindteken = t.einde || '.';   // interpunctie aan het eind van de zin

  function teken() {
    zinEl.innerHTML = zin.length
      ? zin.map(function (w, i) {
          return '<button class="woord-chip kiesbaar in-zin" data-i="' + i + '">' + w + '</button>';
        }).join('') + '<span class="zin-punt" aria-hidden="true">' + eindteken + '</span>'
      : '<span class="zin-leeg">Klik of sleep hier de woorden…</span>';

    bakEl.innerHTML = bak.length
      ? bak.map(function (w, i) {
          return '<button class="woord-chip kiesbaar in-bak" draggable="true" data-i="' + i + '">' + w + '</button>';
        }).join('')
      : '<span class="zin-leeg">(alle woorden gebruikt)</span>';

    // klik in de zin → woord terug naar de bak
    zinEl.querySelectorAll('.in-zin').forEach(function (el) {
      el.addEventListener('click', function () {
        const i = +el.dataset.i;
        bak.push(zin[i]); zin.splice(i, 1); wisFeedback(); teken();
      });
    });
    // klik in de bak → woord naar de zin; en maak sleepbaar
    bakEl.querySelectorAll('.in-bak').forEach(function (el) {
      el.addEventListener('click', function () {
        const i = +el.dataset.i;
        zin.push(bak[i]); bak.splice(i, 1); wisFeedback(); teken();
      });
      el.addEventListener('dragstart', function (e) {
        e.dataTransfer.setData('text/plain', el.dataset.i);
      });
    });
  }

  // slepen vanuit de bak en loslaten op de zinbalk = woord toevoegen
  zinEl.addEventListener('dragover', function (e) { e.preventDefault(); zinEl.classList.add('sleep-over'); });
  zinEl.addEventListener('dragleave', function () { zinEl.classList.remove('sleep-over'); });
  zinEl.addEventListener('drop', function (e) {
    e.preventDefault(); zinEl.classList.remove('sleep-over');
    const i = +e.dataTransfer.getData('text/plain');
    if (!isNaN(i) && bak[i] !== undefined) { zin.push(bak[i]); bak.splice(i, 1); wisFeedback(); teken(); }
  });

  controleer.addEventListener('click', function () {
    if (zin.length === 0) {
      fb.className = 'feedback feedback-fout';
      fb.innerHTML = 'Sleep of klik eerst woorden in de zin.';
      return;
    }
    if (zin.join('|') === correct.join('|')) {
      fb.className = 'feedback feedback-goed';
      fb.innerHTML = succesHTML(land);
      zinEl.querySelectorAll('.woord-chip').forEach(function (el) { el.classList.add('chip-goed'); el.disabled = true; });
      controleer.disabled = true;
      belonen(land, t.level);
    } else {
      fb.className = 'feedback feedback-fout';
      fb.innerHTML = '❌ Nog niet helemaal. Pas de volgorde aan en probeer opnieuw.';
      if (typeof geluidFout === 'function') geluidFout();
    }
  });

  teken();
}

/* =========================================================
   Niveau 3 — zelf typen (hint + tolerant nakijken)
   ========================================================= */
function renderFillType(t) {
  const delen = t.sentence.split('___');
  let html = '<p class="zin">';
  for (let i = 0; i < delen.length; i++) {
    html += delen[i];
    if (i < delen.length - 1) {
      html += '<input type="text" class="invul" data-i="' + i + '" ' +
              'autocomplete="off" autocapitalize="off" spellcheck="false" ' +
              'aria-label="Vul het ontbrekende woord in">';
    }
  }
  html += '</p>';
  return html;
}

function bindFillType(body, t, land) {
  const inputs = Array.prototype.slice.call(body.querySelectorAll('.invul'));
  const fb = body.querySelector('.feedback');
  const controleer = body.querySelector('.controleer-knop');
  const hintKnop = body.querySelector('.hint-knop');
  let hintIndex = 0;

  inputs.forEach(function (inp) {
    inp.addEventListener('keydown', function (e) { if (e.key === 'Enter') controleer.click(); });
    inp.addEventListener('input', function () { fb.className = 'feedback'; fb.innerHTML = ''; });
  });

  hintKnop.addEventListener('click', function () {
    const hints = t.hints || [];
    if (hints.length === 0) { fb.className = 'feedback'; fb.innerHTML = 'Er is geen hint voor deze opdracht.'; return; }
    const h = hints[Math.min(hintIndex, hints.length - 1)];
    hintIndex++;
    fb.className = 'feedback feedback-hint';
    fb.innerHTML = '💡 ' + h;
  });

  controleer.addEventListener('click', function () {
    let allesGoed = true;
    inputs.forEach(function (inp, i) {
      const verwacht = (t.answers[i] || '').toString();
      inp.classList.remove('invul-goed', 'invul-fout');
      if (isCloseEnough(inp.value, verwacht)) {
        inp.classList.add('invul-goed');
        inp.value = verwacht;     // toon de nette spelling
        inp.disabled = true;
      } else {
        inp.classList.add('invul-fout');
        allesGoed = false;
      }
    });
    if (allesGoed) {
      fb.className = 'feedback feedback-goed';
      fb.innerHTML = succesHTML(land);
      controleer.disabled = true;
      hintKnop.disabled = true;
      belonen(land, t.level);
    } else {
      fb.className = 'feedback feedback-fout';
      fb.innerHTML = '❌ Bijna! Kijk naar het rode vakje. Klik op 💡 Hint voor hulp.';
      if (typeof geluidFout === 'function') geluidFout();
    }
  });
}

/* =========================================================
   Hulpfuncties
   ========================================================= */
// Tolerant nakijken: negeer hoofdletters/spaties en één typefout (Levenshtein ≤ 1)
function isCloseEnough(invoer, goed) {
  const a = (invoer || '').trim().toLowerCase();
  const b = (goed || '').trim().toLowerCase();
  if (a === '') return false;
  if (a === b) return true;
  return levenshtein(a, b) <= 1;
}

function levenshtein(a, b) {
  const m = a.length, n = b.length;
  const d = [];
  for (let i = 0; i <= m; i++) d[i] = [i];
  for (let j = 0; j <= n; j++) d[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const kost = a[i - 1] === b[j - 1] ? 0 : 1;
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + kost);
    }
  }
  return d[m][n];
}

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = arr[i]; arr[i] = arr[j]; arr[j] = tmp;
  }
  return arr;
}

/* ---------- Sluiten met Esc of klik op de donkere achtergrond ---------- */
document.addEventListener('keydown', function (e) {
  if (e.key === 'Escape') sluitPopup();
});
document.addEventListener('click', function (e) {
  if (e.target && e.target.id === 'task-popup') sluitPopup();
});

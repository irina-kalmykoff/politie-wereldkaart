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

const NIVEAU_NAAM  = { 1: 'Makkelijk', 2: 'Gemiddeld', 3: 'Moeilijk', 4: 'Uitdaging' };
const NIVEAU_KLEUR = { 1: '#2e8b57', 2: '#c08a2b', 3: '#b5562b', 4: '#6b4ea6' };

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

  const knoppen = [1, 2, 3, 4].map(function (lvl) {
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
  } else if (taak.type === 'write_sentence') {
    opdrachtHTML = renderWriteSentence(taak);
    actiesHTML = '<button class="voorbeeld-knop">💡 Voorbeeld</button>' +
                 '<button class="controleer-knop">Controleer</button>' +
                 '<button class="terug-knop">← Ander niveau</button>';
  } else if (taak.type === 'luister_tekst') {
    opdrachtHTML = renderLuisterTekst(taak);
    actiesHTML = '<button class="hint-knop">💡 Hint</button>' +
                 '<button class="controleer-knop">Controleer</button>' +
                 '<button class="terug-knop">← Ander niveau</button>';
  } else if (taak.type === 'interpunctie') {
    opdrachtHTML = renderInterpunctie(taak);
    actiesHTML = '<button class="controleer-knop">Controleer</button>' +
                 '<button class="terug-knop">← Ander niveau</button>';
  } else {
    opdrachtHTML = '<p>Onbekend opdrachttype.</p>';
    actiesHTML = '<button class="terug-knop">← Kies ander niveau</button>';
  }

  const body = toonKaart(titel, sub,
    (taak.fact ? '<p class="fact">💡 ' + taak.fact + '</p>' : '') +
    ((taak.fact || taak.zin) ? '<button class="lees-knop" type="button" aria-label="Lees de opdracht voor">🔊 Lees voor</button>' : '') +
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
  else if (taak.type === 'write_sentence') bindWriteSentence(body, taak, land);
  else if (taak.type === 'luister_tekst') bindLuisterTekst(body, taak, land);
  else if (taak.type === 'interpunctie') bindInterpunctie(body, taak, land);
}

// Lees het weetje + de zin (of instructie) hardop voor, in de juiste taal.
function leesTaakVoor(land, taak) {
  const lang = (TASKS[land.key] && TASKS[land.key].lang === 'en') ? 'en-GB' : 'nl-NL';
  if (typeof heeftStemVoor === 'function' && !heeftStemVoor(lang)) toonStemWaarschuwing(lang);
  const stukken = [];
  if (taak.fact) stukken.push(taak.fact);
  if (taak.sentence) stukken.push(taak.sentence);
  else if (taak.instruction) stukken.push(taak.instruction);
  else if (taak.prompt) stukken.push(taak.prompt);
  else if (taak.zin) stukken.push(taak.zin);
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

  const alleHints = bouwFillHints(t);
  hintKnop.addEventListener('click', function () {
    if (alleHints.length === 0) { fb.className = 'feedback'; fb.innerHTML = 'Er is geen hint voor deze opdracht.'; return; }
    const idx = Math.min(hintIndex, alleHints.length - 1);
    fb.className = 'feedback feedback-hint';
    fb.innerHTML = '💡 ' + alleHints[idx] +
      ' <span class="hint-teller">(tip ' + (idx + 1) + ' van ' + alleHints.length + ')</span>';
    if (hintIndex < alleHints.length - 1) hintIndex++;
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
   Niveau 4 — schrijf zelf een korte zin (write_sentence)
   ========================================================= */
function renderWriteSentence(t) {
  let html = '<p class="schrijf-vraag">' + t.prompt + '</p>';
  if (t.words && t.words.length) {
    html += '<p class="woordsuggestie">Je mag deze woorden gebruiken: ' +
      t.words.map(function (w) { return '<span class="woord-chip">' + w + '</span>'; }).join(' ') + '</p>';
  }
  html += '<textarea class="schrijfveld" rows="2" autocomplete="off" ' +
          'placeholder="Typ hier je eigen zin…" aria-label="Schrijf hier je eigen zin"></textarea>';
  return html;
}

function bindWriteSentence(body, t, land) {
  const veld = body.querySelector('.schrijfveld');
  const fb = body.querySelector('.feedback');
  const controleer = body.querySelector('.controleer-knop');
  const voorbeeldKnop = body.querySelector('.voorbeeld-knop');

  veld.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); controleer.click(); }
  });
  veld.addEventListener('input', function () { fb.className = 'feedback'; fb.innerHTML = ''; });

  if (voorbeeldKnop) voorbeeldKnop.addEventListener('click', function () {
    if (!t.example) return;
    fb.className = 'feedback feedback-hint';
    fb.innerHTML = '💡 Een voorbeeld: "' + t.example + '"';
  });

  controleer.addEventListener('click', function () {
    const res = checkWriteSentence(t, veld.value);
    if (res.ok) {
      veld.disabled = true;
      controleer.disabled = true;
      fb.className = 'feedback feedback-goed';
      fb.innerHTML = succesHTML(land) +
        (t.example ? '<br><span class="vlag-behaald">Bijvoorbeeld: "' + t.example + '"</span>' : '');
      belonen(land, t.level);
    } else {
      fb.className = 'feedback feedback-fout';
      fb.innerHTML = '✏️ ' + res.reden;
      if (typeof geluidFout === 'function') geluidFout();
    }
  });
}

// Controleer een zelfgeschreven zin: lengte, hoofdletter, leesteken, sleutelwoord.
function checkWriteSentence(t, tekst) {
  const zin = (tekst || '').trim();
  if (!zin) return { ok: false, reden: 'Schrijf eerst je eigen zin.' };
  const woorden = zin.split(/\s+/).filter(Boolean);
  const minW = t.min || 3, maxW = t.max || 5;
  if (woorden.length < minW) return { ok: false, reden: 'Maak je zin iets langer — minstens ' + minW + ' woorden.' };
  if (woorden.length > maxW) return { ok: false, reden: 'Houd je zin kort — ongeveer 3 of 4 woorden.' };
  if (!/^[A-ZÀ-ÖØ-Þ]/.test(zin)) return { ok: false, reden: 'Begin je zin met een hoofdletter.' };
  if (!/[.!?]$/.test(zin)) return { ok: false, reden: 'Zet een punt (.) aan het eind van je zin.' };
  if (t.keyword && zin.toLowerCase().indexOf(t.keyword.toLowerCase()) === -1) {
    return { ok: false, reden: 'Gebruik het woord "' + t.keyword + '" in je zin.' };
  }
  return { ok: true };
}

/* =========================================================
   Niveau 4 (variant) — luister-dictee (luister_tekst)
   Een kort tekstje wordt voorgelezen; de speler vult ±3
   ontbrekende woorden in. Gaten staan in de tekst als [woord].
   ========================================================= */
function parseGapTekst(text) {
  const answers = [];
  let i = 0;
  const html = (text || '').replace(/\[([^\]]+)\]/g, function (m, w) {
    const idx = i++;
    answers.push(w);
    return '<input type="text" class="invul invul-luister" data-i="' + idx + '" ' +
           'autocomplete="off" autocapitalize="off" spellcheck="false" ' +
           'aria-label="Schrijf het woord dat je hoort">';
  });
  const plain = (text || '').replace(/\[([^\]]+)\]/g, '$1');
  return { plain: plain, html: html, answers: answers };
}

function renderLuisterTekst(t) {
  const parsed = parseGapTekst(t.text);
  return '<p class="luister-intro">' + (t.intro || 'Luister goed en schrijf de woorden die je hoort.') + '</p>' +
         '<button class="luister-knop" type="button">🔊 Luister</button>' +
         '<p class="luister-tekst">' + parsed.html + '</p>';
}

function bindLuisterTekst(body, t, land) {
  const parsed = parseGapTekst(t.text);
  const inputs = Array.prototype.slice.call(body.querySelectorAll('.invul-luister'));
  const fb = body.querySelector('.feedback');
  const controleer = body.querySelector('.controleer-knop');
  const luisterKnop = body.querySelector('.luister-knop');
  const lang = (TASKS[land.key] && TASKS[land.key].lang === 'en') ? 'en-GB' : 'nl-NL';

  function luister() { if (typeof spreekUit === 'function') spreekUit(parsed.plain, lang); }
  if (luisterKnop) luisterKnop.addEventListener('click', luister);
  luister();   // speel de tekst één keer automatisch af bij het openen

  inputs.forEach(function (inp) {
    inp.addEventListener('keydown', function (e) { if (e.key === 'Enter') controleer.click(); });
    inp.addEventListener('input', function () { fb.className = 'feedback'; fb.innerHTML = ''; });
  });

  // Hint-knop: oplopende tips (eerste letters → meer letters).
  const hintKnop = body.querySelector('.hint-knop');
  let hintIndex = 0;
  const alleHints = bouwLuisterHints(parsed.answers);
  if (hintKnop) hintKnop.addEventListener('click', function () {
    if (!alleHints.length) return;
    const idx = Math.min(hintIndex, alleHints.length - 1);
    fb.className = 'feedback feedback-hint';
    fb.innerHTML = '💡 ' + alleHints[idx] +
      ' <span class="hint-teller">(tip ' + (idx + 1) + ' van ' + alleHints.length + ')</span>';
    if (hintIndex < alleHints.length - 1) hintIndex++;
  });

  controleer.addEventListener('click', function () {
    let allesGoed = true;
    inputs.forEach(function (inp, i) {
      const verwacht = parsed.answers[i] || '';
      inp.classList.remove('invul-goed', 'invul-fout');
      if (isCloseEnough(inp.value, verwacht)) {
        inp.classList.add('invul-goed');
        inp.value = verwacht;
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
      belonen(land, t.level);
    } else {
      fb.className = 'feedback feedback-fout';
      fb.innerHTML = '❌ Bijna! Luister nog een keer en kijk naar de rode vakjes.';
      if (typeof geluidFout === 'function') geluidFout();
    }
  });
}

/* =========================================================
   Niveau 4 — hoofdletters & interpunctie (interpunctie)
   De speler maakt een zin goed: klik woorden aan voor een
   hoofdletter, en kies het juiste leesteken aan het eind.
   Elke zin noemt de hoofdstad van het land.
   ========================================================= */
function parseZin(zin) {
  let s = (zin || '').trim();
  let eind = '';
  const laatste = s.charAt(s.length - 1);
  if (laatste === '.' || laatste === '?' || laatste === '!') { eind = laatste; s = s.slice(0, -1).trim(); }
  return { woorden: s.split(/\s+/), eind: eind };
}

function _moetHoofd(woord) {
  const eerste = woord.charAt(0);
  return eerste === eerste.toUpperCase() && eerste !== eerste.toLowerCase();
}
function _lowerEerste(w) { return w.charAt(0).toLowerCase() + w.slice(1); }
function _upperEerste(w) { return w.charAt(0).toUpperCase() + w.slice(1); }

function renderInterpunctie(t) {
  const intro = t.intro ||
    'Maak de zin goed. Tik woorden aan voor een hoofdletter en kies het juiste leesteken.';
  return '<p class="interp-intro">' + intro + '</p>' +
         '<div class="interp-zin"></div>' +
         '<p class="interp-label">Kies het leesteken:</p>' +
         '<div class="interp-leestekens">' +
           ['.', '?', '!'].map(function (p) {
             return '<button class="leesteken-knop" type="button" data-p="' + p + '">' + p + '</button>';
           }).join('') +
         '</div>';
}

function bindInterpunctie(body, t, land) {
  const parsed = parseZin(t.zin);
  const zinEl = body.querySelector('.interp-zin');
  const fb = body.querySelector('.feedback');
  const controleer = body.querySelector('.controleer-knop');
  const hoofd = parsed.woorden.map(function () { return false; });   // begint allemaal klein
  let gekozen = null;

  function wisFb() { fb.className = 'feedback'; fb.innerHTML = ''; }

  function teken() {
    zinEl.innerHTML = parsed.woorden.map(function (w, i) {
      const tekst = hoofd[i] ? _upperEerste(w) : _lowerEerste(w);
      return '<button class="interp-woord' + (hoofd[i] ? ' is-hoofd' : '') + '" data-i="' + i + '">' + tekst + '</button>';
    }).join(' ') + '<span class="interp-punt">' + (gekozen || '▢') + '</span>';
    zinEl.querySelectorAll('.interp-woord').forEach(function (el) {
      el.addEventListener('click', function () {
        const i = +el.dataset.i;
        hoofd[i] = !hoofd[i];
        wisFb();
        teken();
      });
    });
  }

  body.querySelectorAll('.leesteken-knop').forEach(function (btn) {
    btn.addEventListener('click', function () {
      gekozen = btn.getAttribute('data-p');
      body.querySelectorAll('.leesteken-knop').forEach(function (b) { b.classList.remove('gekozen'); });
      btn.classList.add('gekozen');
      wisFb();
      teken();
    });
  });

  controleer.addEventListener('click', function () {
    let goed = (gekozen === parsed.eind);
    parsed.woorden.forEach(function (w, i) { if (hoofd[i] !== _moetHoofd(w)) goed = false; });

    if (goed) {
      fb.className = 'feedback feedback-goed';
      fb.innerHTML = succesHTML(land);
      controleer.disabled = true;
      zinEl.querySelectorAll('.interp-woord').forEach(function (el) { el.disabled = true; el.classList.add('interp-goed'); });
      const punt = zinEl.querySelector('.interp-punt'); if (punt) punt.classList.add('interp-goed');
      body.querySelectorAll('.leesteken-knop').forEach(function (b) { b.disabled = true; });
      belonen(land, t.level);
    } else {
      fb.className = 'feedback feedback-fout';
      fb.innerHTML = '❌ Bijna! Welke woorden krijgen een hoofdletter? En klopt het leesteken?';
      if (typeof geluidFout === 'function') geluidFout();
      parsed.woorden.forEach(function (w, i) {
        const el = zinEl.querySelector('.interp-woord[data-i="' + i + '"]');
        if (el && hoofd[i] !== _moetHoofd(w)) el.classList.add('interp-fout');
      });
      if (gekozen !== parsed.eind) { const p = zinEl.querySelector('.interp-punt'); if (p) p.classList.add('interp-fout'); }
    }
  });

  teken();
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

// Synoniemen voor de niveau-3 antwoorden: als de eerste tip niet hielp,
// geeft de hint-knop "een ander woord hiervoor".
const SYNONIEMEN = {
  'boeien': 'handboeien', 'gevangenis': 'de cel', 'getuige': 'een ooggetuige',
  'bureau': 'het politiebureau', 'dief': 'een boef', 'snelheid': 'de vaart',
  'boete': 'een bekeuring', 'cel': 'de gevangenis', 'achtervolging': 'de jacht',
  'bewijs': 'een aanwijzing', 'dader': 'de boef', 'zaklamp': 'een zaklantaarn',
  'melding': 'een bericht', 'penning': 'een badge', 'patrouille': 'een ronde',
  'bekeuring': 'een boete', 'spoor': 'een afdruk', 'vingerafdruk': 'een afdruk',
  'vulkaan': 'een vuurberg', 'verhoor': 'een ondervraging', 'strand': 'de kust',
  'oerwoud': 'de jungle', 'camera': 'een filmcamera', 'menigte': 'een massa',
  'zakkenroller': 'een dief', 'supporter': 'een fan', 'stroper': 'een wilddief',
  'boswachter': 'een parkwachter', 'waarschuwing': 'een alarm', 'alarm': 'een waarschuwing',
  'tractor': 'een trekker', 'storm': 'een onweer', 'bus': 'een autobus',
  'dieren': 'beesten', 'kano': 'een kajak', 'lawaai': 'herrie', 'ruimte': 'het heelal',
  'touw': 'een koord', 'karavaan': 'een kamelenstoet', 'mijn': 'een groeve',
  'helikopter': 'een heli', 'robot': 'een machine', 'berg': 'een top'
};

// Bouw de oplopende lijst tips voor een typ-opdracht (niveau 3):
// 1) eerste letter  2) synoniem  3) omschrijving  4) aantal letters
// 5+) steeds meer beginletters tonen.
function bouwFillHints(t) {
  const lijst = [];
  const gegeven = t.hints || [];
  const antwoord = (t.answers && t.answers[0]) ? String(t.answers[0]) : '';

  if (gegeven[0]) lijst.push(gegeven[0]);                    // 1) begint met letter ...
  const syn = antwoord ? SYNONIEMEN[antwoord.toLowerCase()] : null;
  if (syn) lijst.push('Een ander woord hiervoor is: ' + syn + '.');   // 2) synoniem
  for (let i = 1; i < gegeven.length; i++) lijst.push(gegeven[i]);     // 3) omschrijving(en)

  if (antwoord.length > 1) {
    lijst.push('Het woord heeft ' + antwoord.length + ' letters.');    // 4) lengte
    lijst.push('Zo begint het: ' + onthulWoord(antwoord, Math.min(2, antwoord.length - 1)));
    const half = Math.ceil(antwoord.length / 2);
    if (half > 2 && half < antwoord.length) {
      lijst.push('Bijna goed: ' + onthulWoord(antwoord, half));
    }
  }
  return lijst;
}

// Toon de eerste n letters van een woord, de rest als streepjes: "g e _ _ _".
function onthulWoord(woord, n) {
  const zichtbaar = woord.slice(0, n);
  const rest = woord.slice(n).replace(/\S/g, '_');
  return (zichtbaar + rest).split('').join(' ');
}

// Oplopende tips voor het luister-dictee: eerste letters → meer letters van elk woord.
function bouwLuisterHints(answers) {
  if (!answers || !answers.length) return [];
  const eerste = answers.map(function (w) { return w.charAt(0); }).join(', ');
  const begin2 = answers.map(function (w) { return onthulWoord(w, Math.min(2, w.length - 1)); }).join('   ·   ');
  const half = answers.map(function (w) { return onthulWoord(w, Math.max(2, Math.ceil(w.length / 2))); }).join('   ·   ');
  return [
    'De woorden beginnen met:  ' + eerste,
    'Zo beginnen ze:  ' + begin2,
    'Bijna goed:  ' + half
  ];
}

/* ---------- Sluiten met Esc of klik op de donkere achtergrond ---------- */
document.addEventListener('keydown', function (e) {
  if (e.key === 'Escape') sluitPopup();
});
document.addEventListener('click', function (e) {
  if (e.target && e.target.id === 'task-popup') sluitPopup();
});

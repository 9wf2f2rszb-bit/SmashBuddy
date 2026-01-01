// =====================
// SmashBuddy – app.js
// =====================

const TYPES = [
  "Normal","Fire","Water","Electric","Grass","Ice","Fighting","Poison",
  "Ground","Flying","Psychic","Bug","Rock","Ghost","Dragon","Dark","Steel","Fairy"
];

// ===== i18n (NO/EN) =====
const LANG_KEY = "smashbuddy_lang_v1";
let currentLang = localStorage.getItem(LANG_KEY) || "no";

const I18N = {
  no: {
    intro: "Skriv inn pokémonnavnet eller angrepstypen du skal kjempe mot så får du forslag til supereffektive angrepstyper.",
    pokemonNameLabel: "Pokémon-navn:",
    findBtn: "Finn",
    type2Hint: "Type 2 er valgfri (dual-type).",
    or: "ELLER",
    fightLabel: "Jeg skal kjempe mot:",
    pickTypeHint: "Velg en type for å se resultat.",
    loadingAll: "Laster alle Pokémon…",
    emptySuggestions: "Ingen forslag",
    type1Placeholder: "Type 1",
    type2Placeholder: "Type 2",
    

    // bucket titles
    x4: "Ekstremt effektivt (4×)",
    x2: "Supereffektivt (2×)",
    x0: "Ingen effekt (0×)",
    half: "Lite effektivt (½×)",
    quarter: "Veldig lite effektivt (¼×)",

    // status / dynamic
    enterPokemon: "Skriv inn et Pokémon-navn.",
    fetching: "Henter fra PokéAPI…",
    foundFor: (types, name) => `${types} funnet for “${name}”.`,
    notFound: (name) => `Fant ikke “${name}”. Prøv f.eks. "Pikachu","mr-mime" eller "farfetchd".`,
    resultVsOne: (d1) => `Mot ${d1}: hvilke angrepstyper er best?`,
    resultVsTwo: (d1, d2) => `Mot ${d1}/${d2}: hvilke angrepstyper er best?`,
  },

  en: {
    intro: "Type a Pokémon name or the type you’re fighting against to get suggested super-effective attack types.",
    pokemonNameLabel: "Pokémon name:",
    findBtn: "Find",
    type2Hint: "Type 2 is optional (dual-type).",
    or: "OR",
    fightLabel: "I am fighting against:",
    pickTypeHint: "Pick a type to see results.",
    loadingAll: "Loading all Pokémon…",
    emptySuggestions: "No suggestions",
    type1Placeholder: "Type 1",
    type2Placeholder: "Type 2",

    // bucket titles
    x4: "Extremely effective (4×)",
    x2: "Super effective (2×)",
    half: "Not very effective (½×)",
    quarter: "Very not effective (¼×)",
    x0: "No effect (0×)",
  },

    // status / dynamic
    enterPokemon: "Enter a Pokémon name.",
    fetching: "Fetching from PokéAPI…",
    foundFor: (types, name) => `${types} found for “${name}”.`,
    notFound: (name) => `Couldn’t find “${name}”. Try e.g. "Pikachu", "mr-mime" or "farfetchd".`,
    resultVsOne: (d1) => `Vs ${d1}: which attack types are best?`,
    resultVsTwo: (d1, d2) => `Vs ${d1}/${d2}: which attack types are best?`,


};

function t(key, ...args) {
  const val = I18N[currentLang][key];
  return typeof val === "function" ? val(...args) : val;
}

function setLang(lang) {
  currentLang = lang;
  localStorage.setItem(LANG_KEY, lang);
  applyI18n();
  repopulateTypeSelectsForLang(); // ✅ NY
  render();
}


// ===== Cache keys / versioning =====
const CACHE_VERSION = 1;
const ALL_POKEMON_CACHE_KEY = `smashbuddy_all_pokemon_v${CACHE_VERSION}`;
const CACHE_KEY = `smashbuddy_pokemon_cache_v${CACHE_VERSION}`;
const ALL_POKEMON_API = "https://pokeapi.co/api/v2/pokemon?limit=2000";

function cleanupOldCaches() {
  try {
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith("smashbuddy_") && !key.endsWith(`_v${CACHE_VERSION}`)) {
        localStorage.removeItem(key);
      }
    });
  } catch (err) {
    console.warn("Cache cleanup feilet:", err);
  }
}

// ===== Type chart (Gen 6+) =====
const CHART = {
  Normal:   { Rock: 0.5, Ghost: 0, Steel: 0.5 },
  Fire:     { Fire: 0.5, Water: 0.5, Grass: 2, Ice: 2, Bug: 2, Rock: 0.5, Dragon: 0.5, Steel: 2 },
  Water:    { Fire: 2, Water: 0.5, Grass: 0.5, Ground: 2, Rock: 2, Dragon: 0.5 },
  Electric: { Water: 2, Electric: 0.5, Grass: 0.5, Ground: 0, Flying: 2, Dragon: 0.5 },
  Grass:    { Fire: 0.5, Water: 2, Grass: 0.5, Poison: 0.5, Ground: 2, Flying: 0.5, Bug: 0.5, Rock: 2, Dragon: 0.5, Steel: 0.5 },
  Ice:      { Fire: 0.5, Water: 0.5, Grass: 2, Ice: 0.5, Ground: 2, Flying: 2, Dragon: 2, Steel: 0.5 },
  Fighting: { Normal: 2, Ice: 2, Rock: 2, Dark: 2, Steel: 2, Poison: 0.5, Flying: 0.5, Psychic: 0.5, Bug: 0.5, Ghost: 0, Fairy: 0.5 },
  Poison:   { Grass: 2, Fairy: 2, Poison: 0.5, Ground: 0.5, Rock: 0.5, Ghost: 0.5, Steel: 0 },
  Ground:   { Fire: 2, Electric: 2, Grass: 0.5, Poison: 2, Flying: 0, Bug: 0.5, Rock: 2, Steel: 2 },
  Flying:   { Grass: 2, Fighting: 2, Bug: 2, Electric: 0.5, Rock: 0.5, Steel: 0.5 },
  Psychic:  { Fighting: 2, Poison: 2, Psychic: 0.5, Steel: 0.5, Dark: 0 },
  Bug:      { Grass: 2, Psychic: 2, Dark: 2, Fire: 0.5, Fighting: 0.5, Poison: 0.5, Flying: 0.5, Ghost: 0.5, Steel: 0.5, Fairy: 0.5 },
  Rock:     { Fire: 2, Ice: 2, Flying: 2, Bug: 2, Fighting: 0.5, Ground: 0.5, Steel: 0.5 },
  Ghost:    { Psychic: 2, Ghost: 2, Dark: 0.5, Normal: 0 },
  Dragon:   { Dragon: 2, Steel: 0.5, Fairy: 0 },
  Dark:     { Psychic: 2, Ghost: 2, Fighting: 0.5, Dark: 0.5, Fairy: 0.5 },
  Steel:    { Ice: 2, Rock: 2, Fairy: 2, Fire: 0.5, Water: 0.5, Electric: 0.5, Steel: 0.5 },
  Fairy:    { Fighting: 2, Dragon: 2, Dark: 2, Fire: 0.5, Poison: 0.5, Steel: 0.5 }
};

// ===== DOM =====
const defender1 = document.getElementById("defender1");
const defender2 = document.getElementById("defender2");
const fightLabel = document.getElementById("fightLabel");
const orDivider = document.getElementById("orDivider");
const suggestionsEl = document.getElementById("suggestions");
const pokemonLoadStatus = document.getElementById("pokemonLoadStatus");

const pokemonNameInput = document.getElementById("pokemonName");
const pokemonBtn = document.getElementById("pokemonBtn");
const pokemonStatus = document.getElementById("pokemonStatus");
const langToggle = document.getElementById("langToggle");
const resultTitle = document.getElementById("resultTitle");
const type2HintEl = document.getElementById("type2Hint");

const lists = {
  x4: document.getElementById("list4x"),
  x2: document.getElementById("list2x"),
  x0: document.getElementById("list0x"),
  half: document.getElementById("listHalf"),
  quarter: document.getElementById("listQuarter"),
};

const buckets = {
  x4: document.getElementById("bucket4x"),
  x2: document.getElementById("bucket2x"),
  x0: document.getElementById("bucket0x"),
  half: document.getElementById("bucketHalf"),
  quarter: document.getElementById("bucketQuarter"),
};

// ===== UI helpers =====
function showOrDivider() { if (orDivider) orDivider.style.display = "block"; }
function hideOrDivider() { if (orDivider) orDivider.style.display = "none"; }
function showFightLabel() { if (fightLabel) fightLabel.style.display = "block"; }
function hideFightLabel() { if (fightLabel) fightLabel.style.display = "none"; }

function populateSelect(selectEl, placeholderText) {
  selectEl.innerHTML = "";

  const placeholder = document.createElement("option");
  placeholder.value = "";
  placeholder.textContent = placeholderText;
  placeholder.disabled = true;
  placeholder.selected = true;
  selectEl.appendChild(placeholder);

  for (const t of TYPES) {
    const opt = document.createElement("option");
    opt.value = t;
    opt.textContent = t;
    selectEl.appendChild(opt);
  }
}
function repopulateTypeSelectsForLang() {
  const prev1 = defender1.value;
  const prev2 = defender2.value;

  populateSelect(defender1, t("type1Placeholder"));
  populateSelect(defender2, t("type2Placeholder"));

  // sett tilbake valg hvis de finnes
  if (prev1 && TYPES.includes(prev1)) defender1.value = prev1;
  if (prev2 && TYPES.includes(prev2)) defender2.value = prev2;
}


function typeMultiplier(attackType, defendType) {
  const overrides = CHART[attackType] || {};
  return overrides[defendType] ?? 1;
}

function combinedMultiplier(attackType, d1, d2) {
  const m1 = typeMultiplier(attackType, d1);
  if (!d2) return m1;
  const m2 = typeMultiplier(attackType, d2);
  return m1 * m2;
}

function clearAll() {
  for (const key of Object.keys(lists)) {
    lists[key].innerHTML = "";
    buckets[key].style.display = "none";
  }
}

function pill(text, typeClass) {
  const li = document.createElement("li");
  li.textContent = text;
  li.classList.add("type-pill", `type-${typeClass.toLowerCase()}`);
  return li;
}

function setSelectTypeClass(selectEl, type) {
  for (const t of TYPES) selectEl.classList.remove(`type-${t.toLowerCase()}`);
  if (type) selectEl.classList.add(`type-${type.toLowerCase()}`);
}

function setBodyTypeClass(type) {
  for (const t of TYPES) document.body.classList.remove(`type-${t.toLowerCase()}`);
  if (type) document.body.classList.add(`type-${type.toLowerCase()}`);
}

function normalizePokemonName(name) {
  return name.trim().toLowerCase().replace(/\s+/g, "-");
}

async function fetchPokemonTypes(name) {
  const url = `https://pokeapi.co/api/v2/pokemon/${encodeURIComponent(name)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("Not found");
  const data = await res.json();

  return data.types
    .sort((a, b) => a.slot - b.slot)
    .map(t => t.type.name);
}

function toTitleCaseType(typeName) {
  return typeName.charAt(0).toUpperCase() + typeName.slice(1);
}

// ===== Pokémon list + caching =====
let POKEMON_NAME_LIST = [
  "pikachu","charizard","bulbasaur","squirtle","charmander",
  "gengar","dragonite","mewtwo","snorlax","eevee",
  "lapras","gyarados","alakazam","machamp","arcanine"
];

function loadCachedNames() {
  try {
    const arr = JSON.parse(localStorage.getItem(CACHE_KEY) || "[]");
    if (Array.isArray(arr)) {
      const set = new Set([...POKEMON_NAME_LIST, ...arr]);
      POKEMON_NAME_LIST = Array.from(set);
    }
  } catch {}
}

function saveNameToCache(nameLower) {
  try {
    const existing = new Set(JSON.parse(localStorage.getItem(CACHE_KEY) || "[]"));
    existing.add(nameLower);
    localStorage.setItem(CACHE_KEY, JSON.stringify(Array.from(existing).slice(0, 300)));
  } catch {}
}

async function loadAllPokemonNames() {
  if (pokemonLoadStatus) pokemonLoadStatus.textContent = t("loadingAll");

  // Cache først
  try {
    const cached = localStorage.getItem(ALL_POKEMON_CACHE_KEY);
    if (cached) {
      const parsed = JSON.parse(cached);
      if (Array.isArray(parsed) && parsed.length > 1000) {
        POKEMON_NAME_LIST = parsed;
        if (pokemonLoadStatus) pokemonLoadStatus.textContent = "";
        return;
      }
    }
  } catch {}

  // Hent fra API
  try {
    const res = await fetch(ALL_POKEMON_API);
    if (!res.ok) throw new Error("API error");

    const data = await res.json();
    const names = (data.results || [])
      .map(p => p.name?.toLowerCase())
      .filter(Boolean)
      .sort();

    localStorage.setItem(ALL_POKEMON_CACHE_KEY, JSON.stringify(names));
    POKEMON_NAME_LIST = names;
  } catch (err) {
    console.warn("Kunne ikke hente alle Pokémon – bruker fallback-liste.");
  } finally {
    if (pokemonLoadStatus) pokemonLoadStatus.textContent = "";
  }
}

// ===== Search =====
async function handlePokemonSearch() {
  const raw = pokemonNameInput.value;
  const name = normalizePokemonName(raw);

  if (!name) {
    pokemonStatus.textContent = t("enterPokemon");
    return;
  }

  pokemonStatus.textContent = t("fetching");

  try {
    const apiTypes = await fetchPokemonTypes(name);
    saveNameToCache(name);

    const t1 = toTitleCaseType(apiTypes[0]);
    const t2 = apiTypes[1] ? toTitleCaseType(apiTypes[1]) : "";

    defender1.value = t1;
    defender2.selectedIndex = 0;
    if (t2) defender2.value = t2;

    const typesText = `${t1}${t2 ? " / " + t2 : ""}`;
    pokemonStatus.textContent = t("foundFor", typesText, name);

    hideFightLabel();
    hideOrDivider();

    closeSuggestions();
    render();
  } catch {
    pokemonStatus.textContent = t("notFound", name);
  }
}

function resetPokemonSearch() {
  pokemonNameInput.value = "";
  pokemonStatus.textContent = "";
}

// ===== Render =====
function setBucketHeading(bucketEl, text) {
  if (!bucketEl) return;
  const h = bucketEl.querySelector("h3, h4, h2, .bucketTitle");
  if (h) h.textContent = text;
}

function render() {
  const d1 = defender1.value;
  const d2 = defender2.value;

  if (!d1) {
    resultTitle.textContent = t("pickTypeHint");
    clearAll();
    setSelectTypeClass(defender1, "");
    setSelectTypeClass(defender2, "");
    setBodyTypeClass("");
    return;
  }

  const d2Clean = d2 && d2 !== d1 ? d2 : "";

  setSelectTypeClass(defender1, d1);
  setSelectTypeClass(defender2, d2Clean);
  setBodyTypeClass(d1);

  resultTitle.textContent = d2Clean
    ? t("resultVsTwo", d1, d2Clean)
    : t("resultVsOne", d1);

  // bucket headings i riktig språk
  setBucketHeading(buckets.x4, t("x4"));
  setBucketHeading(buckets.x2, t("x2"));
  setBucketHeading(buckets.half, t("half"));
  setBucketHeading(buckets.quarter, t("quarter"));
  setBucketHeading(buckets.x0, t("x0"));

  clearAll();

  const byMult = { x4: [], x2: [], half: [], quarter: [], x0: [] };

  for (const atk of TYPES) {
    const m = combinedMultiplier(atk, d1, d2Clean);
    if (m === 4) byMult.x4.push(atk);
    else if (m === 2) byMult.x2.push(atk);
    else if (m === 0.5) byMult.half.push(atk);
    else if (m === 0.25) byMult.quarter.push(atk);
    else if (m === 0) byMult.x0.push(atk);
  }

  const renderBucket = (key, arr) => {
    if (!arr.length) return;
    buckets[key].style.display = "block";
    for (const type of arr) lists[key].appendChild(pill(type, type));
  };

  renderBucket("x4", byMult.x4);
  renderBucket("x2", byMult.x2);
  renderBucket("half", byMult.half);
  renderBucket("quarter", byMult.quarter);
  renderBucket("x0", byMult.x0);
}

// ===== Autocomplete =====
let activeIndex = -1;
let currentMatches = [];

function prettifyName(n) {
  return n.charAt(0).toUpperCase() + n.slice(1);
}
function normalizeForMatch(s) {
  return (s || "").trim().toLowerCase();
}
function getMatches(query) {
  const q = normalizeForMatch(query);
  if (!q) return [];
  return POKEMON_NAME_LIST.filter(n => n.startsWith(q)).slice(0, 8);
}

function openSuggestions(matches, query) {
  currentMatches = matches;
  activeIndex = -1;

  if (!matches.length) {
    suggestionsEl.innerHTML = `<div class="suggestion-empty">${t("emptySuggestions")}</div>`;
    suggestionsEl.style.display = "block";
    return;
  }

  const q = normalizeForMatch(query);

  suggestionsEl.innerHTML = matches.map((name, idx) => {
    const pretty = prettifyName(name);
    const strong = pretty.slice(0, q.length);
    const rest = pretty.slice(q.length);

    return `
      <div class="suggestion-item" role="option" data-idx="${idx}">
        <div><strong>${strong}</strong>${rest}</div>
        <small>Enter</small>
      </div>
    `;
  }).join("");

  suggestionsEl.style.display = "block";
}

function closeSuggestions() {
  suggestionsEl.style.display = "none";
  suggestionsEl.innerHTML = "";
  currentMatches = [];
  activeIndex = -1;
}

function setActive(idx) {
  const items = Array.from(suggestionsEl.querySelectorAll(".suggestion-item"));
  items.forEach(el => el.classList.remove("active"));
  if (idx >= 0 && idx < items.length) {
    items[idx].classList.add("active");
    activeIndex = idx;
  } else {
    activeIndex = -1;
  }
}

function chooseSuggestion(nameLower) {
  pokemonNameInput.value = prettifyName(nameLower);
  closeSuggestions();
  handlePokemonSearch();
}

// ===== i18n apply =====
function applyI18n() {
  const introEl = document.getElementById("introText") || document.querySelector("p.muted");
  if (introEl) introEl.textContent = t("intro");

  const pokemonNameLabel = document.getElementById("pokemonNameLabel") || document.querySelector('label[for="pokemonName"]');
  if (pokemonNameLabel) pokemonNameLabel.textContent = t("pokemonNameLabel");

const setText = (id, key) => {
    const el = document.getElementById(id);
    if (el) el.textContent = t(key);
  };

  setText("bucketTitle4x", "x4");
  setText("bucketTitle2x", "x2");
  setText("bucketTitleHalf", "half");
  setText("bucketTitleQuarter", "quarter");
  setText("bucketTitle0x", "x0");

  
  if (pokemonBtn) pokemonBtn.textContent = t("findBtn");
  if (orDivider) orDivider.textContent = t("or");
  if (fightLabel) fightLabel.textContent = t("fightLabel");
  if (type2HintEl) type2HintEl.textContent = t("type2Hint");

  if (pokemonNameInput) {
    pokemonNameInput.placeholder = currentLang === "no" ? "f.eks. charizard" : "e.g. charizard";
  }

  // refresh bucket headings even when no type chosen
  setBucketHeading(buckets.x4, t("x4"));
  setBucketHeading(buckets.x2, t("x2"));
  setBucketHeading(buckets.half, t("half"));
  setBucketHeading(buckets.quarter, t("quarter"));
  setBucketHeading(buckets.x0, t("x0"));

  if (!defender1.value && resultTitle) resultTitle.textContent = t("pickTypeHint");
}

// ===== Events =====
if (langToggle) {
  langToggle.addEventListener("click", () => {
    setLang(currentLang === "no" ? "en" : "no");
  });
}

defender1.addEventListener("change", () => {
  resetPokemonSearch();
  defender2.selectedIndex = 0;
  showFightLabel();
  hideOrDivider();
  render();
});

defender2.addEventListener("change", () => {
  resetPokemonSearch();
  showFightLabel();
  hideOrDivider();
  render();
});

pokemonBtn.addEventListener("click", handlePokemonSearch);

pokemonNameInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") handlePokemonSearch();
});

pokemonNameInput.addEventListener("input", () => {
  const matches = getMatches(pokemonNameInput.value);
  if (!pokemonNameInput.value.trim()) {
    closeSuggestions();
    return;
  }
  openSuggestions(matches, pokemonNameInput.value);
});

pokemonNameInput.addEventListener("keydown", (e) => {
  if (suggestionsEl.style.display !== "block") return;

  const items = Array.from(suggestionsEl.querySelectorAll(".suggestion-item"));
  if (!items.length) return;

  if (e.key === "ArrowDown") {
    e.preventDefault();
    setActive((activeIndex + 1) % items.length);
  }

  if (e.key === "ArrowUp") {
    e.preventDefault();
    setActive((activeIndex - 1 + items.length) % items.length);
  }

  if (e.key === "Enter" && activeIndex >= 0) {
    e.preventDefault();
    chooseSuggestion(currentMatches[activeIndex]);
  }

  if (e.key === "Escape") closeSuggestions();
});

suggestionsEl.addEventListener("click", (e) => {
  const item = e.target.closest(".suggestion-item");
  if (!item) return;
  const idx = Number(item.dataset.idx);
  const nameLower = currentMatches[idx];
  if (nameLower) chooseSuggestion(nameLower);
});

document.addEventListener("click", (e) => {
  if (e.target === pokemonNameInput) return;
  if (suggestionsEl.contains(e.target)) return;
  closeSuggestions();
});

// ===== Init =====
cleanupOldCaches();
loadCachedNames();

repopulateTypeSelectsForLang(); // ✅ bruker riktig språk


applyI18n();
render();
showOrDivider();
showFightLabel(); // vis label ved start (kan skjules ved pokemon-søk)

loadAllPokemonNames(); // async, oppdaterer POKEMON_NAME_LIST når ferdig

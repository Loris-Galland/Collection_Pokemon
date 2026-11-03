// Builds src/features/catalog/pokemon-tcg-images.ts, the pictures TCGdex lacks or announces without having.
// The app does not call pokemontcg.io itself, because that API often fails and would slow down each screen.
// Run it again from the mobile folder when new sets appear, with: node scripts/build-pokemon-tcg-images.mjs

import { writeFileSync } from 'node:fs';

// TCGdex set id to pokemontcg.io set id. Checked by hand, since the two catalogs name their sets differently.
const SETS = {
  ecard2: 'ecard2',
  'tk-ex-latia': 'tk1a',
  'tk-ex-latio': 'tk1b',
  'tk-ex-p': 'tk2a',
  'tk-ex-m': 'tk2b',
  hgssp: 'hsp',
  '2011bw': 'mcd11',
  '2012bw': 'mcd12',
  '2014xy': 'mcd14',
  '2015xy': 'mcd15',
  '2016xy': 'mcd16',
  smp: 'smp',
  '2017sm': 'mcd17',
  'sm3.5': 'sm35',
  'sm7.5': 'sm75',
  sma: 'sma',
  swshp: 'swshp',
  '2021swsh': 'mcd21',
  'swsh4.5sv': 'swsh45sv',
  cel25: 'cel25',
  cel25cc: 'cel25c',
  swsh9tg: 'swsh9tg',
  swsh10tg: 'swsh10tg',
  '2022swsh': 'mcd22',
  swsh11tg: 'swsh11tg',
  swsh12tg: 'swsh12tg',
  'swsh12.5gg': 'swsh12pt5gg',
  sve: 'sve',
  svp: 'svp',
  '30th-c': 'me55c',
  '30th': 'me55',
};

// Pictures TCGdex announces without having the file, found by checking each of its addresses.
const CORRECTIONS = {
  "me05": {
    "logo": "https://assets.tcgdex.net/en/me/me05/logo.webp",
    "images": {}
  },
  "base3": {
    "images": {
      "base3-1": "https://assets.tcgdex.net/en/base/base3/1",
      "base3-32": "https://assets.tcgdex.net/en/base/base3/32"
    }
  },
  "base5": {
    "images": {
      "base5-63": "https://assets.tcgdex.net/en/base/base5/63"
    }
  },
  "ecard1": {
    "images": {
      "ecard1-16": "https://assets.tcgdex.net/en/ecard/ecard1/16"
    }
  },
  "pl3": {
    "images": {
      "pl3-26": "https://assets.tcgdex.net/en/pl/pl3/26"
    }
  },
  "bw2": {
    "images": {
      "bw2-93": "https://assets.tcgdex.net/en/bw/bw2/93"
    }
  },
  "xy1": {
    "images": {
      "xy1-125": "https://assets.tcgdex.net/en/xy/xy1/125"
    }
  },
  "sm5": {
    "images": {
      "sm5-147": "https://assets.tcgdex.net/en/sm/sm5/147"
    }
  },
  "sm12": {
    "images": {
      "sm12-72": "https://assets.tcgdex.net/en/sm/sm12/72"
    }
  },
  "swsh11": {
    "images": {
      "swsh11-188": "https://assets.tcgdex.net/en/swsh/swsh11/188"
    }
  },
  "sv02": {
    "images": {
      "sv02-108": "https://assets.tcgdex.net/en/sv/sv02/108"
    }
  },
  "sv08": {
    "images": {
      "sv08-102": "https://assets.tcgdex.net/en/sv/sv08/102"
    }
  },
  "30th": {
    "images": {
      "30th-G": "https://images.scrydex.com/pokemon/me55-G/small",
      "30th-R": "https://images.scrydex.com/pokemon/me55-R/small",
      "30th-B": "https://images.scrydex.com/pokemon/me55-B/small"
    }
  }
};

const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** That API often answers with a server error for a moment, so it gets several tries. */
async function fetchJson(url) {
  for (let attempt = 0; attempt < 8; attempt++) {
    const response = await fetch(url).catch(() => undefined);
    if (response?.ok) return response.json();
    if (response?.status === 404) return undefined;
    await pause(1500 * (attempt + 1));
  }
  throw new Error(`No answer from ${url}`);
}

const tcgdexSet = (language, id) => fetchJson(`https://api.tcgdex.net/v2/${language}/sets/${encodeURIComponent(id)}`);

const comparable = (name) =>
  name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]/g, '');
const comparableNumber = (number) => number.replace(/^0+(?=.)/, '').toLowerCase();

/**
 * Numbers differ between the two catalogs in some sets, so a card must have the same English name to be matched, and
 * the number only decides between cards of the same name. A doubtful card keeps no picture rather than a wrong one.
 */
function findPicture(card, candidates) {
  const sameName = candidates.filter((candidate) => comparable(candidate.name) === comparable(card.name));
  if (sameName.length === 1) return sameName[0].images.small;
  return sameName.find((candidate) => comparableNumber(candidate.number) === comparableNumber(card.localId))?.images.small;
}

/** Some addresses listed by that API lead nowhere, and a blank tile is worse than a card with its name on it. */
async function exists(url) {
  const response = await fetch(url, { method: 'HEAD' }).catch(() => undefined);
  return response?.status === 200;
}

const allSets = (await fetchJson('https://api.pokemontcg.io/v2/sets?pageSize=250&select=id,images')).data;
const result = {};
let filled = 0;
let unmatched = 0;

for (const [setId, otherId] of Object.entries(SETS)) {
  const [french, english] = await Promise.all([tcgdexSet('fr', setId), tcgdexSet('en', setId)]);
  const otherLogo = french?.logo || english?.logo ? undefined : allSets.find((set) => set.id === otherId)?.images.logo;
  const logo = otherLogo && (await exists(otherLogo)) ? otherLogo : undefined;

  const hasPicture = new Set([...(french?.cards ?? []), ...(english?.cards ?? [])].filter((card) => card.image).map((card) => card.id));
  const missing = (english?.cards ?? []).filter((card) => !hasPicture.has(card.id));
  const images = {};
  if (missing.length > 0) {
    const cards = (await fetchJson(`https://api.pokemontcg.io/v2/cards?q=set.id:${otherId}&pageSize=250&select=name,number,images`)).data;
    for (const card of missing) {
      const picture = findPicture(card, cards);
      if (picture && (await exists(picture))) images[card.id] = picture;
      else unmatched++;
    }
  }
  filled += Object.keys(images).length;
  console.log(setId.padEnd(13), `${Object.keys(images).length}/${missing.length}`.padEnd(9), logo ? 'logo' : '');
  if (logo || Object.keys(images).length > 0) result[setId] = { logo, images };
}

for (const [id, fix] of Object.entries(CORRECTIONS)) {
  result[id] = { logo: fix.logo ?? result[id]?.logo, images: { ...result[id]?.images, ...fix.images } };
}

const source = `// Generated by scripts/build-pokemon-tcg-images.mjs. Do not edit by hand.
// Pictures for what TCGdex lacks in every language or announces without having, by TCGdex set id and card id.

export const POKEMON_TCG_IMAGES: Record<string, { logo?: string; images: Record<string, string> }> = ${JSON.stringify(result, null, 2)};
`;
writeFileSync(new URL('../src/features/catalog/pokemon-tcg-images.ts', import.meta.url), source);
console.log(`${filled} pictures, ${unmatched} cards left without one`);

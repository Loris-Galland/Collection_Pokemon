// Hue of each set card. TCGdex does not provide a color, so it is derived from the series, which is the prefix of the
// set id ("sv" in "sv03.5"). Sets from the same series end up looking alike.

const SERIES_HUES: Record<string, number> = {
  me: 205,
  sv: 265,
  swsh: 190,
  sm: 25,
  xy: 220,
  bw: 0,
  hgss: 45,
  pl: 280,
  dp: 230,
  ex: 140,
  base: 355,
  gym: 15,
  neo: 170,
  ecard: 35,
};

/** Series prefix of a set id, for example "swsh12pt5" gives "swsh". */
function seriesOf(setId: string): string {
  return setId.match(/^[a-z]+/i)?.[0].toLowerCase() ?? setId;
}

/** Stable hue for an unknown series, computed from its name. */
function hashHue(key: string): number {
  let hash = 0;
  for (const char of key) hash = (hash * 31 + char.charCodeAt(0)) % 360;
  return hash;
}

export interface SetTheme {
  /** Bright color used for the progress bar and the glow. */
  tint: string;
  /** Card background gradient, from the top left corner to the bottom right corner. */
  gradient: string;
}

const themes = new Map<string, SetTheme>();

/** Colors of a set, cached per series. */
export function setThemeOf(setId: string): SetTheme {
  const series = seriesOf(setId);
  let theme = themes.get(series);
  if (!theme) {
    const hue = SERIES_HUES[series] ?? hashHue(series);
    theme = {
      tint: `hsl(${hue}, 85%, 66%)`,
      gradient: `linear-gradient(135deg, hsl(${hue}, 45%, 24%) 0%, hsl(${hue}, 30%, 12%) 55%, hsl(${hue}, 20%, 8%) 100%)`,
    };
    themes.set(series, theme);
  }
  return theme;
}

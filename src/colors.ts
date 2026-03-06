/**
 * Centralized color constants for the Geometry Wars visual style.
 * All hex color literals live here — import instead of hardcoding.
 */

export const Colors = {
  player: {
    main: 0x22aaff,
    inner: 0xaaeeff,
    glow: 0x4488ff,
    trail: [0x2288ff, 0x44aaff, 0x66ccff] as const,
    hitFlash: 0xffffff,
  },

  enemies: {
    bat:      { main: 0xff8800, inner: 0xffcc44 },
    skeleton: { main: 0xffdd44, inner: 0xffff88 },
    zombie:   { main: 0xaa6644, inner: 0xddaa77 },
    ghost:    { main: 0xaaaaff, inner: 0xddddff },
    werewolf: { main: 0xcccccc, inner: 0xffffff },
    mummy:    { main: 0xffee44, inner: 0xffff99 },
    vampire:  { main: 0xff0000, inner: 0xff6644 },
    lich:     { main: 0xaa00ff, inner: 0xdd66ff },
    dragon:   { main: 0xff6600, inner: 0xffbb44 },
    reaper:   { main: 0x8800cc, inner: 0xcc44ff },
    death: {
      halo: 0x8833dd,
      spiral: 0xbb66ff,
      core: 0x000000,
      coreEdge: 0x9900ff,
      coreOutline: 0xcc66ff,
    },
  },

  projectiles: {
    base:      { main: 0xffffff, inner: 0xffffff },
    magic:     { main: 0xee66ff, inner: 0xffbbff },
    fire:      { main: 0xff6600, inner: 0xffcc44 },
    ice:       { main: 0x00eeff, inner: 0x88ffff },
    boomerang: { main: 0xffcc00, inner: 0xffee66 },
    scythe:    { main: 0xaaaaaa, inner: 0xeeeeee },
  },

  trails: {
    fire:     [0xff6600, 0xffcc00] as const,
    ice:      [0x00ddff, 0xffffff] as const,
    magic:    [0xcc44ff, 0xffffff] as const,
    boomerang: 0xffcc00,
    scythe:   0xbbbbbb,
    deathRay: 0xffffff,
  },

  gems: {
    xp:     { main: 0x00ff66, bright: 0xaaffcc, trail: 0x00ff66 },
    heal:   { main: 0xff2222, bright: 0xffaaaa, trail: 0xff2222 },
    gold:   { main: 0xffcc00, bright: 0xffee88, trail: 0xffcc00 },
    vortex: { main: 0x2288ff, bright: 0xaaccff, trail: 0x2288ff },
  },

  tiles: {
    floorBg: 0x000000,
    gridGlow: 0x003355,
    gridLine: 0x0077aa,
    wallFill: 0x001122,
    wallGlow: 0x0066aa,
    wallOutline: 0x00aaff,
    wallHighlight: 0x00ddff,
  },

  parallax: {
    bgStar: 0x115588,
    bgStarBright: 0x2299cc,
    fgDust: 0xffffff,
  },

  effects: {
    danger: 0xff0000,
    bloomThreshold: 0x222222,
    burstPalette: [
      0xff2266, 0xff6600, 0xffcc00, 0x00ff66,
      0x00ccff, 0x8844ff, 0xff44cc, 0xffffff,
    ] as const,
    burstFlash: { white: 0xffffff, pink: 0xff44cc, cyan: 0x00ccff },
    hotCenter: 0xffffff,
  },

  ui: {
    white: 0xffffff,
    button: 0x333366,
    buttonBorder: 0x444477,
    aoeRing: 0xff660044,
  },
} as const;

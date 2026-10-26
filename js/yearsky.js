/* The year's sky: the ecliptic, the annual meteor showers and the famous comets. Pure data and maths, no DOM, so the engine, the map and
   the tests all share it. Dates are UTC; the ecliptic maths is low precision (a hundredth of a degree is plenty for a star map). */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.YearSky = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const RAD = Math.PI / 180;
  const EPS = 23.4393; // obliquity of the ecliptic (degrees), J2000
  const DAY = 86400e3;
  const wrap360 = d => ((d % 360) + 360) % 360;

  // ---------------------------------------------------------------- the ecliptic
  // ecliptic longitude and latitude -> right ascension and declination (degrees)
  function eclToEq(lon, lat) {
    const l = lon * RAD, b = lat * RAD, e = EPS * RAD;
    const x = Math.cos(b) * Math.cos(l);
    const y = Math.cos(b) * Math.sin(l) * Math.cos(e) - Math.sin(b) * Math.sin(e);
    const z = Math.cos(b) * Math.sin(l) * Math.sin(e) + Math.sin(b) * Math.cos(e);
    return [wrap360(Math.atan2(y, x) / RAD), Math.asin(Math.max(-1, Math.min(1, z))) / RAD];
  }
  function eqToEcl(ra, dec) {
    const a = ra * RAD, d = dec * RAD, e = EPS * RAD;
    const x = Math.cos(d) * Math.cos(a);
    const y = Math.cos(d) * Math.sin(a) * Math.cos(e) + Math.sin(d) * Math.sin(e);
    const z = Math.sin(d) * Math.cos(e) - Math.cos(d) * Math.sin(a) * Math.sin(e);
    return [wrap360(Math.atan2(y, x) / RAD), Math.asin(Math.max(-1, Math.min(1, z))) / RAD];
  }
  const julian = ms => ms / DAY + 2440587.5;
  // where the Sun is along the ecliptic on a date (the low-precision formula of the Astronomical Almanac); only used to know which way a
  // comet's tail points and to date the ticks on the ecliptic. The game never draws the Sun.
  function sunLongitude(ms) {
    const n = julian(ms) - 2451545.0;
    const L = 280.460 + 0.9856474 * n, g = (357.528 + 0.9856003 * n) * RAD;
    return wrap360(L + 1.915 * Math.sin(g) + 0.020 * Math.sin(2 * g));
  }
  const sunEq = ms => eclToEq(sunLongitude(ms), 0);
  // the twelve signs of the tropical zodiac: the Sun's longitude at the start of each, and the usual date it gets there
  const SIGNS = [
    ['♈', 'Aries', 0, '21 Mar'], ['♉', 'Taurus', 30, '20 Apr'], ['♊', 'Gemini', 60, '21 May'], ['♋', 'Cancer', 90, '21 Jun'],
    ['♌', 'Leo', 120, '23 Jul'], ['♍', 'Virgo', 150, '23 Aug'], ['♎', 'Libra', 180, '23 Sep'], ['♏', 'Scorpio', 210, '23 Oct'],
    ['♐', 'Sagittarius', 240, '22 Nov'], ['♑', 'Capricorn', 270, '22 Dec'], ['♒', 'Aquarius', 300, '20 Jan'], ['♓', 'Pisces', 330, '19 Feb'],
  ].map(([glyph, name, lon, date]) => ({ glyph: glyph + '\uFE0E', name, lon, date })); // the text form of the glyph, not the colour emoji
  // the four turning points of the Sun's year and the two poles of the ecliptic, with where they lie among the constellations today
  const ECLIPTIC_POINTS = [
    { id: 'mar', name: 'March equinox', lon: 0, lat: 0, date: '~20 Mar', note: 'The Sun crosses the celestial equator going north. This is the “First Point of Aries”, but precession has carried it into Pisces.' },
    { id: 'jun', name: 'June solstice', lon: 90, lat: 0, date: '~21 Jun', note: 'The Sun is farthest north (declination +23.4°), on the Taurus–Gemini border today.' },
    { id: 'sep', name: 'September equinox', lon: 180, lat: 0, date: '~22 Sep', note: 'The Sun crosses the celestial equator going south, in Virgo today.' },
    { id: 'dec', name: 'December solstice', lon: 270, lat: 0, date: '~21 Dec', note: 'The Sun is farthest south (declination −23.4°), in Sagittarius today.' },
    { id: 'nep', name: 'North ecliptic pole', lon: 0, lat: 90, date: '', note: 'The pole of Earth’s orbit, in Draco, 23.4° from the north celestial pole.' },
    { id: 'sop', name: 'South ecliptic pole', lon: 0, lat: -90, date: '', note: 'The southern pole of Earth’s orbit, in Dorado.' },
  ];

  // ---------------------------------------------------------------- calendar
  const CUM = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334]; // days before each month in a normal year
  const doy = (m, d) => CUM[m - 1] + d - 1; // day of year (0 = 1 January) for month m, day d
  function dayOfYear(ms) { // fractional, UTC, a leap day counts as 28 February's twin so the year is always 365 long
    const t = new Date(ms), m = t.getUTCMonth() + 1, d = t.getUTCDate();
    const base = doy(m, m === 2 && d === 29 ? 28 : d);
    return base + (t.getUTCHours() + t.getUTCMinutes() / 60) / 24;
  }
  // signed days from `a` to `b` on a 365-day circle, in [-182.5, 182.5)
  const circ = (a, b) => ((((b - a) % 365) + 365 + 182.5) % 365) - 182.5;
  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const dateText = md => md[1] + ' ' + MONTHS[md[0] - 1];

  // ---------------------------------------------------------------- meteor showers
  // radiants and dates from the IMO working list of visual showers (the radiant at maximum: right ascension and declination in degrees)
  // core = the days either side of the peak when the rate is well above the background
  const SHOWERS = [
    { id: 'qua', name: 'Quadrantids', con: 'Boötes', ra: 230, dec: 49, start: [12, 28], peak: [1, 4], end: [1, 12], core: 1.5, zhr: 110, speed: 41, parent: '2003 EH1', parentKind: 'asteroid',
      note: 'A sharp peak a few hours wide. Named after Quadrans Muralis, a constellation that no longer exists; the radiant now lies in Boötes. The parent is probably an extinct comet.' },
    { id: 'lyr', name: 'Lyrids', con: 'Lyra', ra: 271, dec: 34, start: [4, 14], peak: [4, 22], end: [4, 30], core: 2.5, zhr: 18, speed: 49, parent: 'C/1861 G1 Thatcher', parentKind: 'comet',
      note: 'One of the oldest showers on record: Chinese astronomers saw it in 687 BC. The comet takes about 415 years to orbit the Sun.' },
    { id: 'eta', name: 'Eta Aquariids', con: 'Aquarius', ra: 338, dec: -1, start: [4, 19], peak: [5, 6], end: [5, 28], core: 6, zhr: 50, speed: 66, parent: '1P/Halley', parentKind: 'comet',
      note: 'Debris from Halley’s Comet, at its best from the tropics and the southern hemisphere, where the radiant rises higher before dawn.' },
    { id: 'sda', name: 'Southern Delta Aquariids', con: 'Aquarius', ra: 339, dec: -16, start: [7, 12], peak: [7, 30], end: [8, 23], core: 8, zhr: 25, speed: 41, parent: '96P/Machholz', parentKind: 'comet',
      note: 'A long, gentle shower that overlaps the Alpha Capricornids and the start of the Perseids.' },
    { id: 'cap', name: 'Alpha Capricornids', con: 'Capricornus', ra: 307, dec: -10, start: [7, 3], peak: [7, 30], end: [8, 15], core: 8, zhr: 5, speed: 23, parent: '169P/NEAT', parentKind: 'comet',
      note: 'Few meteors, but slow, bright fireballs: the meteoroids hit the air at only 23 km/s.' },
    { id: 'per', name: 'Perseids', con: 'Perseus', ra: 48, dec: 58, start: [7, 17], peak: [8, 12], end: [8, 24], core: 5, zhr: 100, speed: 59, parent: '109P/Swift–Tuttle', parentKind: 'comet',
      note: 'The favourite: warm summer nights, fast bright meteors, many leaving trains. Swift–Tuttle (133 years, a 26 km nucleus) last passed in 1992.' },
    { id: 'dra', name: 'Draconids', con: 'Draco', ra: 262, dec: 54, start: [10, 6], peak: [10, 8], end: [10, 10], core: 0.8, zhr: 10, speed: 20, parent: '21P/Giacobini–Zinner', parentKind: 'comet',
      note: 'Usually feeble, but it stormed in 1933 and 1946 when the Earth met a fresh trail. Unusually, it is best seen in the evening, and the meteors are very slow (20 km/s).' },
    { id: 'ori', name: 'Orionids', con: 'Orion', ra: 95, dec: 16, start: [10, 2], peak: [10, 21], end: [11, 7], core: 5, zhr: 20, speed: 66, parent: '1P/Halley', parentKind: 'comet',
      note: 'The second shower from Halley’s Comet: fast meteors from a radiant in Orion’s club, near the Gemini border.' },
    { id: 'sta', name: 'Southern Taurids', con: 'Taurus', ra: 52, dec: 13, start: [9, 28], peak: [11, 5], end: [12, 2], core: 10, zhr: 5, speed: 27, parent: '2P/Encke', parentKind: 'comet',
      note: 'A broad, slow shower rich in bright fireballs, from the debris of Comet Encke (3.3 years, the shortest period of any well-known comet).' },
    { id: 'nta', name: 'Northern Taurids', con: 'Taurus', ra: 58, dec: 22, start: [10, 20], peak: [11, 12], end: [12, 10], core: 10, zhr: 5, speed: 29, parent: '2P/Encke', parentKind: 'comet',
      note: 'The northern branch of the Taurid stream: a slow shower of occasional spectacular fireballs.' },
    { id: 'leo', name: 'Leonids', con: 'Leo', ra: 152, dec: 22, start: [11, 6], peak: [11, 17], end: [11, 30], core: 2.5, zhr: 15, speed: 71, parent: '55P/Tempel–Tuttle', parentKind: 'comet',
      note: 'The fastest of the lot (71 km/s). Every 33 years, when the comet returns, it can storm: 1833, 1866, 1966 and 1999 to 2002 (thousands an hour).' },
    { id: 'gem', name: 'Geminids', con: 'Gemini', ra: 112, dec: 33, start: [12, 4], peak: [12, 14], end: [12, 20], core: 3.5, zhr: 150, speed: 35, parent: '3200 Phaethon', parentKind: 'asteroid',
      note: 'The richest shower of the year, with rates up to 150 an hour, and one of the few from an asteroid rather than a comet. The meteors are slow, bright and often yellowish.' },
    { id: 'urs', name: 'Ursids', con: 'Ursa Minor', ra: 219, dec: 75, start: [12, 17], peak: [12, 22], end: [12, 26], core: 1.5, zhr: 10, speed: 33, parent: '8P/Tuttle', parentKind: 'comet',
      note: 'A quiet shower around the winter solstice, from a radiant near Kochab in the Little Dipper; for most northern observers it never sets.' },
  ];
  SHOWERS.forEach(s => {
    s.startDay = doy(s.start[0], s.start[1]); s.peakDay = doy(s.peak[0], s.peak[1]); s.endDay = doy(s.end[0], s.end[1]);
    s.before = circ(s.startDay, s.peakDay); s.after = circ(s.peakDay, s.endDay); // days of run-up and of tail-off
    s.dates = dateText(s.start) + ' – ' + dateText(s.end); s.peakText = dateText(s.peak);
  });
  const SHOWER_BY_ID = Object.fromEntries(SHOWERS.map(s => [s.id, s]));
  const ZONE_DEG = 25; // colonies within this many degrees of the radiant share in a shower

  // how active a shower is on a date: 0 outside its window, a low background inside it, 1 at the peak
  function showerState(s, ms) {
    const now = dayOfYear(ms), dd = circ(s.peakDay, now); // days since the peak (negative before it)
    const active = dd >= -s.before - 1e-9 && dd <= s.after + 1e-9;
    const bell = Math.abs(dd) <= s.core ? 0.5 * (1 + Math.cos(Math.PI * dd / s.core)) : 0;
    return { id: s.id, active, activity: active ? 0.12 + 0.88 * bell : 0, daysToPeak: -dd, daysToStart: circ(now, s.startDay), daysToEnd: circ(now, s.endDay) };
  }
  // what a shower is worth to a colony in its zone: a share of the revenue that the strongest showers double
  const showerBoost = s => Math.min(1, 0.2 + s.zhr / 150);
  const activeShowers = ms => SHOWERS.map(s => Object.assign({ shower: s }, showerState(s, ms))).filter(x => x.active);
  // the next showers to begin (or begun): sorted by how soon they start, or by their peak when already running
  function upcoming(ms, n) {
    return SHOWERS.map(s => { const st = showerState(s, ms); return Object.assign({ shower: s }, st, { wait: st.active ? 0 : ((st.daysToStart % 365) + 365) % 365 }); })
      .sort((a, b) => a.wait - b.wait || Math.abs(a.daysToPeak) - Math.abs(b.daysToPeak)).slice(0, n || 4);
  }

  // ---------------------------------------------------------------- comets
  // The comets that visit as events. perihelion = the latest or next known passage; every number is rounded and meant as trivia.
  const COMETS = [
    { id: 'halley', name: 'Halley', desig: '1P/Halley', kind: 'periodic', period: '75 to 76 years', perihelion: 'last 9 Feb 1986, next 28 Jul 2061',
      note: 'The first comet shown to return: Edmond Halley predicted its 1758 return. It has been recorded since 240 BC, and it is the parent of the Eta Aquariids and the Orionids. Giotto flew through its coma in 1986.' },
    { id: 'hale-bopp', name: 'Hale–Bopp', desig: 'C/1995 O1', kind: 'long', period: 'about 2 500 years', perihelion: '1 Apr 1997',
      note: 'Found in 1995 by Alan Hale and Thomas Bopp while it was still beyond Jupiter, it was visible to the naked eye for 18 months in 1996 and 1997. Its nucleus is some 40 km across, and it grew a dust tail, an ion tail and a faint sodium tail.' },
    { id: 'hyakutake', name: 'Hyakutake', desig: 'C/1996 B2', kind: 'long', period: 'tens of thousands of years', perihelion: '1 May 1996',
      note: 'Found by the amateur Yuji Hyakutake in January 1996. It passed only 0.1 AU from Earth in March 1996, and its tail stretched across more than 70 degrees of sky. It was the first comet seen to emit X-rays.' },
    { id: 'swift-tuttle', name: 'Swift–Tuttle', desig: '109P', kind: 'periodic', period: '133 years', perihelion: 'last 12 Dec 1992, next 12 Jul 2126',
      note: 'Found in 1862, it is the parent of the Perseids. Its nucleus (about 26 km) is the largest of any object that repeatedly passes near the Earth.' },
    { id: 'tempel-tuttle', name: 'Tempel–Tuttle', desig: '55P', kind: 'periodic', period: '33 years', perihelion: 'last 28 Feb 1998, next 20 May 2031',
      note: 'The parent of the Leonids. Each return leaves a fresh trail of dust, and the Earth’s meetings with them gave the great Leonid storms of 1833, 1866, 1966 and 1999 to 2002.' },
    { id: 'encke', name: 'Encke', desig: '2P', kind: 'periodic', period: '3.3 years', perihelion: 'every 3.3 years, last 22 Oct 2023',
      note: 'The second periodic comet to be recognised (Johann Encke, 1819) and the shortest period of any well-known comet. It is the parent of the Taurid meteors.' },
    { id: 'giacobini-zinner', name: 'Giacobini–Zinner', desig: '21P', kind: 'periodic', period: '6.6 years', perihelion: 'every 6.6 years, last 26 Mar 2025',
      note: 'The parent of the Draconids. In 1985 the spacecraft ICE flew through its tail: the first visit to any comet.' },
    { id: '67p', name: 'Churyumov–Gerasimenko', desig: '67P', kind: 'periodic', period: '6.4 years', perihelion: 'every 6.4 years, last 2 Nov 2021',
      note: 'Rosetta orbited this 4 km, duck-shaped comet from 2014 to 2016, and its lander Philae made the first soft landing on a comet on 12 November 2014.' },
    { id: 'wild2', name: 'Wild 2', desig: '81P', kind: 'periodic', period: '6.4 years', perihelion: 'every 6.4 years',
      note: 'In 2004 the Stardust probe flew through its coma and caught dust grains in aerogel, and in 2006 brought them back to Earth: the first comet samples.' },
    { id: 'tempel1', name: 'Tempel 1', desig: '9P', kind: 'periodic', period: '5.5 years', perihelion: 'every 5.5 years',
      note: 'On 4 July 2005 the Deep Impact probe fired an impactor into it at 10 km/s, and the flash and the crater showed a dusty, fluffy, porous nucleus.' },
    { id: 'hartley2', name: 'Hartley 2', desig: '103P', kind: 'periodic', period: '6.5 years', perihelion: 'every 6.5 years',
      note: 'A small, very active comet. In 2010 the EPOXI probe flew past it and saw jets of carbon dioxide throwing out chunks of ice.' },
    { id: 'ikeya-seki', name: 'Ikeya–Seki', desig: 'C/1965 S1', kind: 'sungrazer', period: 'about 880 years', perihelion: '21 Oct 1965',
      note: 'A Kreutz sungrazer: it skimmed within about half a million kilometres of the Sun’s surface and was bright enough to see in daylight, then broke into pieces.' },
    { id: 'mcnaught', name: 'McNaught', desig: 'C/2006 P1', kind: 'long', period: 'tens of thousands of years', perihelion: '12 Jan 2007',
      note: 'The Great Comet of 2007, the brightest in more than 40 years: visible in daylight, with a fan-shaped tail across the southern sky.' },
    { id: 'neowise', name: 'NEOWISE', desig: 'C/2020 F3', kind: 'long', period: 'about 6 800 years', perihelion: '3 Jul 2020',
      note: 'Found in March 2020 by the NEOWISE space telescope. It was easy to see with the naked eye in July 2020, with a long dust tail near the Big Dipper.' },
    { id: 'biela', name: 'Biela', desig: '3D', kind: 'lost', period: '6.6 years', perihelion: 'split in 1846',
      note: 'It split in two in 1846 and then vanished; the Earth ploughed through the remains in 1872 and 1885 and met spectacular showers (the Andromedids). A comet can disintegrate.' },
    { id: 'thatcher', name: 'Thatcher', desig: 'C/1861 G1', kind: 'long', period: 'about 415 years', perihelion: '3 Jun 1861',
      note: 'The parent of the Lyrids. It was discovered in April 1861 by the amateur A. E. Thatcher and will return around the year 2276.' },
    { id: 'sl9', name: 'Shoemaker–Levy 9', desig: 'D/1993 F2', kind: 'lost', period: 'captured by Jupiter', perihelion: 'fell in July 1994',
      note: 'Torn into more than 20 pieces by Jupiter’s tides in 1992, its fragments struck the planet in July 1994: the first impact between two Solar System bodies ever watched.' },
    { id: 'pons-brooks', name: 'Pons–Brooks', desig: '12P', kind: 'periodic', period: '71 years', perihelion: 'last 21 Apr 2024',
      note: 'The “Devil comet” of 2024: repeated outbursts gave it a horned look. Its next return is around 2095.' },
    { id: 'borisov', name: 'Borisov', desig: '2I/Borisov', kind: 'interstellar', period: 'none: it is passing through', perihelion: '8 Dec 2019',
      note: 'Found by the amateur Gennady Borisov in 2019: the first confirmed interstellar comet, on an open (hyperbolic) orbit, with an eccentricity near 3.4.' },
  ];
  const COMET_BY_ID = Object.fromEntries(COMETS.map(c => [c.id, c]));

  return {
    EPS, SIGNS, ECLIPTIC_POINTS, eclToEq, eqToEcl, sunLongitude, sunEq, julian,
    doy, dayOfYear, circ, dateText, MONTHS,
    SHOWERS, SHOWER_BY_ID, ZONE_DEG, showerState, showerBoost, activeShowers, upcoming,
    COMETS, COMET_BY_ID,
  };
});

/* Olympiad Academy, part C: Solar system & exoplanets, Galaxies, Cosmology. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.AstroC = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  return function (A) {
    const { nums, fmt, P } = A;

    // =============================================================================================== Solar system & exoplanets
    const S = A.topic('planets');
    S.sheet([
      ['Planet equilibrium temperature', 'T = 278 K · (1 − A)^¼ / √d(AU)', 'A = Bond albedo'],
      ['Surface gravity', 'g = GM / R²', 'Earth 9.8, Moon 1.62, Mars 3.7, Jupiter 24.8 m/s²'],
      ['Transit depth', 'ΔF/F = (R_p / R_*)²', 'Jupiter/Sun 1%, Earth/Sun 84 ppm'],
      ['Radial-velocity amplitude', 'K = 28.4 m/s · (m sin i / M_J) (P / yr)^(−1/3) (M_*/M☉)^(−2/3)', 'Jupiter on the Sun 12.5 m/s'],
      ['Habitable zone', 'd ≈ √(L/L☉) AU', 'Earth-like stellar flux'],
      ['Roche limit', 'd ≈ 2.44 R_planet (ρ_planet / ρ_moon)^⅓', 'fluid moon'],
      ['Hill radius', 'r_H ≈ a (m / 3M)^⅓', ''],
      ['Escape and retention', 'a gas is kept for 10⁹ yr if v_thermal < v_esc / 6', 'v_thermal = √(3kT/m)'],
    ]);
    S.fact('planets', 'The planets', 1, [
      ['Which planets are the terrestrial (rocky) planets?', 'Mercury, Venus, Earth and Mars', ['Jupiter, Saturn, Uranus and Neptune', 'Mercury, Venus, Earth, Mars and Jupiter', 'Earth, Mars, Jupiter and Saturn']],
      ['Which planets are the ice giants?', 'Uranus and Neptune', ['Jupiter and Saturn', 'Mars and Venus', 'Saturn and Uranus']],
      ['Which planet has the shortest year?', 'Mercury (88 days)', ['Venus', 'Mars', 'Earth']],
      ['Which planet has a mean density lower than that of water?', 'Saturn', ['Jupiter', 'Earth', 'Neptune']],
      ['Which planet is the densest in the Solar System?', 'Earth', ['Mercury', 'Venus', 'Jupiter']],
    ], 'Terrestrial: Mercury, Venus, Earth, Mars. Gas giants: Jupiter, Saturn. Ice giants: Uranus, Neptune. Saturn’s mean density is 0.69 g/cm³; Earth’s 5.51 g/cm³ is the highest.');
    S.fact('iau', 'What is a planet?', 1, [
      ['According to the IAU definition (2006), a planet must…', 'orbit the Sun, be nearly round and have cleared its orbit of other bodies', ['orbit the Sun and be larger than 1 000 km', 'have at least one moon', 'be made only of rock or gas']],
      ['Which of these is a dwarf planet?', 'Ceres', ['Vesta', 'Titan', 'Ganymede']],
      ['Pluto was reclassified as a dwarf planet in…', '2006', ['1930', '1992', '2015']],
      ['Which discovery in 2005 helped prompt the IAU’s new definition of a planet?', 'Eris, a distant body slightly more massive than Pluto', ['a tenth planet inside Mercury’s orbit', 'a moon larger than Mercury', 'a second asteroid belt']],
    ], 'The IAU’s 2006 resolution: a planet (1) orbits the Sun, (2) is massive enough to be round (hydrostatic equilibrium), (3) has cleared its neighbourhood. Dwarf planets: Ceres, Pluto, Haumea, Makemake, Eris.');
    S.fact('facts', 'Planet facts', 2, [
      ['Which planet rotates retrograde, with a day longer than its year?', 'Venus', ['Mars', 'Uranus', 'Mercury']],
      ['Uranus has an axial tilt of about…', '98°', ['23°', '3°', '45°']],
      ['Which planet has the highest surface temperature, about 465 °C?', 'Venus', ['Mercury', 'Mars', 'Jupiter']],
      ['The tallest volcano in the Solar System, Olympus Mons, is on…', 'Mars', ['Earth', 'Venus', 'Io']],
      ['Mercury’s rotation is locked in a resonance with its orbit of…', '3:2', ['1:1', '2:1', '5:2']],
      ['Which planet has the Great Red Spot, a storm older than 300 years?', 'Jupiter', ['Saturn', 'Neptune', 'Mars']],
    ], 'Venus rotates retrograde in 243 days (its year is 225 days) and has a runaway greenhouse atmosphere (465 °C, 92 bar). Uranus rolls on its side (98°). Olympus Mons on Mars is ~22 km high. Mercury spins three times for every two orbits.');
    S.fact('moons', 'Moons', 2, [
      ['Which Galilean moon is the most volcanically active body in the Solar System?', 'Io', ['Europa', 'Ganymede', 'Callisto']],
      ['Which moon has a global ocean under its ice and is the target of the Europa Clipper mission?', 'Europa', ['Io', 'Callisto', 'Himalia']],
      ['The largest moon in the Solar System is…', 'Ganymede', ['Titan', 'the Moon', 'Callisto']],
      ['Titan is notable for…', 'a thick nitrogen atmosphere and lakes of methane', ['active sulfur volcanoes', 'having no atmosphere', 'orbiting Neptune']],
      ['Geysers of water vapour erupt from the south pole of…', 'Enceladus', ['Titan', 'Triton', 'Io']],
      ['Triton orbits Neptune…', 'in a retrograde direction (probably a captured Kuiper belt object)', ['in the equatorial plane in the normal direction', 'inside the planet’s rings', 'at the Roche limit']],
      ['Io is heated mainly by…', 'tidal flexing, because of its orbital resonance with Europa and Ganymede', ['radioactive decay', 'sunlight', 'a magnetic field']],
    ], 'Io: ~400 active volcanoes driven by tidal heating. Europa: subsurface ocean. Ganymede (5 268 km) is bigger than Mercury. Titan has 1.5 bar of N₂ and methane lakes (Huygens landed in 2005). Enceladus’ plumes feed Saturn’s E ring.');
    S.fact('small', 'Small bodies', 1, [
      ['The main asteroid belt lies between the orbits of…', 'Mars and Jupiter', ['Earth and Mars', 'Jupiter and Saturn', 'Neptune and Pluto']],
      ['The Kuiper belt lies…', 'beyond Neptune, from about 30 to 50 AU', ['between Mars and Jupiter', 'inside Mercury’s orbit', 'at 10 000 AU']],
      ['The Oort cloud is a spherical reservoir of…', 'long-period comets, extending to tens of thousands of AU', ['asteroids', 'dwarf planets', 'interstellar dust']],
      ['Kirkwood gaps in the asteroid belt are caused by…', 'orbital resonances with Jupiter', ['collisions', 'Mars’ gravity', 'the solar wind']],
      ['A meteorite is…', 'a piece of rock that survives the fall and reaches the ground', ['the streak of light in the sky', 'a comet’s tail', 'a small asteroid in orbit']],
      ['A meteor is…', 'the streak of light made by a meteoroid burning up in the atmosphere', ['a rock lying on the ground', 'a comet', 'a small moon']],
    ], 'Asteroid belt: 2.2–3.3 AU; Kuiper belt 30–50 AU (source of short-period comets); Oort cloud out to ~100 000 AU (long-period comets). Gaps in the belt appear at resonances with Jupiter (3:1 at 2.5 AU, etc.).');
    S.gallery([
      ['sol.comet', 'A comet', 'The ion tail is straight and blue, pushed directly away from the Sun by the solar wind; the dust tail is broader, yellowish and curved along the orbit.', 'Comets and transits'],
      ['star.transit', 'A planetary transit', 'The star dims by (R_p/R_*)² while the planet crosses its disc; the time between dips gives the orbital period.', 'Comets and transits'],
    ]);
    S.fact('comets', 'Comets', 1, [
      ['A comet’s ion tail always points…', 'directly away from the Sun', ['along its orbit', 'towards the Sun', 'towards the Earth']],
      ['A comet’s two tails are…', 'a straight bluish ion tail and a curved yellowish dust tail', ['both made of dust', 'one of water, one of rock', 'a tail and a jet']],
      ['Halley’s Comet returns about every…', '76 years (next in 2061)', ['11 years', '200 years', '3 years']],
      ['The nucleus of a comet is…', 'a “dirty snowball” of ice and dust a few kilometres across', ['a gas cloud', 'a rocky planet', 'a small star']],
      ['Short-period comets mainly come from the…', 'Kuiper belt', ['Oort cloud', 'asteroid belt', 'Jupiter’s Trojans']],
      ['In the picture, which direction does the comet’s ion tail point?', 'Away from the Sun (to the right)', ['Along the comet’s path', 'Towards the Sun', 'Downwards'], { fig: 'sol.comet' }],
    ], 'The solar wind blows the ion tail straight away from the Sun, radiation pressure curves the dust tail; so a comet’s tail leads the nucleus on the way out. Comets brighten as ices sublimate within ~3 AU.');
    S.fact('showers', 'Meteor showers', 2, [
      ['Meteor showers occur when the Earth passes through…', 'the debris trail of a comet (or asteroid)', ['the Moon’s shadow', 'the asteroid belt', 'the Van Allen belts']],
      ['The Perseids (August) come from the debris of comet…', 'Swift–Tuttle', ['Halley', 'Tempel–Tuttle', 'Encke']],
      ['The Geminids (December) come from the asteroid…', '3200 Phaethon', ['Ceres', 'Vesta', 'Apophis']],
      ['The Leonids (November) come from comet…', 'Tempel–Tuttle', ['Swift–Tuttle', 'Halley', 'Hale–Bopp']],
      ['The meteors of a shower appear to radiate from a point called the…', 'radiant', ['apex', 'nadir', 'zenith']],
    ], 'Parallel meteoroid streams look like they diverge from the radiant (perspective). Showers are named after the radiant’s constellation: Perseids, Geminids, Leonids, Orionids (Halley).');
    // ---- the year's sky: cards drawn from the same tables the game uses (js/yearsky.js), so the cards, the map and the Codex always agree
    const Y = typeof YearSky !== 'undefined' ? YearSky : require('./yearsky.js');
    const uniq = a => [...new Set(a)];
    const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    const radiantCons = uniq(Y.SHOWERS.map(s => s.con)), parentNames = uniq(Y.SHOWERS.map(s => s.parent));
    const hm = ra => Math.floor(ra / 15) + 'h' + String(Math.round((ra / 15 % 1) * 60)).padStart(2, '0') + 'm';
    for (const sh of Y.SHOWERS) {
      const month = MONTH_NAMES[sh.peak[0] - 1];
      const rates = uniq([Math.round(sh.speed * 0.5), Math.round(sh.speed * 0.75), Math.round(sh.speed * 1.5), Math.round(sh.speed * 2)].filter(v => v !== sh.speed)).map(v => v + ' km/s');
      S.fact('shower-' + sh.id, 'Meteor shower: ' + sh.name, 2, [
        ['The radiant of the ' + sh.name + ' lies in the constellation…', sh.con, radiantCons.filter(c => c !== sh.con), { why: 'The ' + sh.name + ' radiate from ' + sh.con + ' (right ascension ' + hm(sh.ra) + ', declination ' + (sh.dec >= 0 ? '+' : '−') + Math.abs(sh.dec) + '°). Showers are named after the constellation of their radiant.' }],
        ['The meteoroids of the ' + sh.name + ' come from…', sh.parent, parentNames.filter(p => p !== sh.parent), { why: sh.name + ': ' + sh.parent + ' (' + sh.parentKind + '). ' + sh.note }],
        ['The ' + sh.name + ' reach their peak in…', month, MONTH_NAMES.filter(m => m !== month), { why: 'The ' + sh.name + ' are active ' + sh.dates + ' and peak around ' + sh.peakText + ': the Earth meets the same stream on the same dates every year.' }],
        ['The ' + sh.name + ' meteors strike the atmosphere at about…', sh.speed + ' km/s', rates, { why: sh.name + ' meteors enter at about ' + sh.speed + ' km/s (the Earth’s own orbital speed is 30 km/s; a head-on meeting gives the fastest, like the Leonids at 71 km/s). ' + sh.note }],
      ], sh.note);
    }
    S.fact('shower-rates', 'Strongest, fastest, slowest', 3, [
      ['Which of these showers usually has the highest rate at its peak (the zenithal hourly rate)?', 'Geminids', ['Lyrids', 'Leonids', 'Ursids', 'Draconids', 'Orionids']],
      ['Which of these showers has the fastest meteors (about 71 km/s)?', 'Leonids', ['Geminids', 'Draconids', 'Quadrantids', 'Taurids']],
      ['Which of these showers has the slowest meteors (about 20 km/s)?', 'Draconids', ['Perseids', 'Leonids', 'Orionids', 'Eta Aquariids']],
      ['Which of these showers comes from an asteroid rather than a comet?', 'Geminids', ['Perseids', 'Leonids', 'Orionids', 'Eta Aquariids']],
      ['Which two showers both come from Halley’s Comet?', 'The Eta Aquariids and the Orionids', ['The Perseids and the Leonids', 'The Geminids and the Quadrantids', 'The Lyrids and the Draconids']],
      ['The Leonids can turn into a meteor storm about every…', '33 years, when comet Tempel–Tuttle returns', ['3 years', '76 years', '133 years']],
    ], 'ZHR: Geminids 150, Quadrantids 110, Perseids 100, Eta Aquariids 50. Entry speed: Leonids 71 km/s, Orionids and Eta Aquariids 66, Perseids 59, Geminids 35, Draconids 20. The Geminids’ parent 3200 Phaethon is an asteroid; Halley feeds two showers because the Earth crosses its orbit twice, in May and in October.');
    const N = id => Y.COMET_BY_ID[id].name, other = id => Y.COMETS.filter(c => c.id !== id).map(c => c.name);
    const about = (prompt, id, why) => [prompt, N(id), other(id), { why: why || Y.COMET_BY_ID[id].note }];
    S.fact('comet-missions', 'Spacecraft at comets', 2, [
      about('Rosetta orbited, and its lander Philae landed on, comet…', '67p'),
      about('The Deep Impact probe fired an impactor into comet…', 'tempel1'),
      about('The Stardust mission brought dust from the coma of comet … back to Earth.', 'wild2'),
      about('The spacecraft Giotto flew through the coma of…', 'halley'),
      about('The first spacecraft to fly through a comet (ICE, in 1985) visited comet…', 'giacobini-zinner'),
      about('The EPOXI probe flew past the very active comet…', 'hartley2'),
    ], 'Comet missions: Giotto at Halley (1986), ICE at Giacobini–Zinner (1985), Stardust at Wild 2 (sample return 2006), Deep Impact at Tempel 1 (2005), EPOXI at Hartley 2 (2010), Rosetta and Philae at 67P (2014–16).');
    S.fact('comet-records', 'Famous comets', 2, [
      about('The Great Comet of 1997, visible to the naked eye for 18 months, was…', 'hale-bopp'),
      about('The comet that was torn apart by Jupiter and struck it in July 1994 was…', 'sl9'),
      about('The first confirmed interstellar comet, found in 2019, was…', 'borisov'),
      about('The comet that split in two in 1846 and then vanished was…', 'biela'),
      about('The comet with the shortest period of any well-known comet (3.3 years) is…', 'encke'),
      about('The parent of the Perseids, the largest nucleus known to cross Earth’s orbit repeatedly (about 26 km), is…', 'swift-tuttle'),
      about('The comet that was easy to see with the naked eye in July 2020, found by an infrared space telescope, was…', 'neowise'),
      about('The sungrazer of 1965 that was bright enough to see in daylight was…', 'ikeya-seki'),
    ], 'Hale–Bopp (1997), Shoemaker–Levy 9 (1994), Borisov (2019, on a hyperbolic orbit, e ≈ 3.4), Biela (split 1846), Encke (3.3 years), Swift–Tuttle (133 years), NEOWISE (2020), Ikeya–Seki (a Kreutz sungrazer).');
    const SP = A.topic('sphere');
    SP.fact('ecl-year', 'The ecliptic through the year', 1, [
      ['At the June solstice the Sun is on the ecliptic at declination…', '+23.4° (its farthest north)', ['0°', '+66.6°', '−23.4°']],
      ['At an equinox the Sun is…', 'on the celestial equator, where the ecliptic crosses it', ['at its farthest north', 'at the ecliptic pole', 'on the galactic plane']],
      ['The north ecliptic pole lies in the constellation…', 'Draco', ['Ursa Minor', 'Cepheus', 'Lyra']],
      ['The ecliptic is tilted 23.4° to the celestial equator because…', 'the Earth’s axis is tilted 23.4° to the plane of its orbit', ['the Moon pulls on the Earth', 'the Sun is off the centre of the orbit', 'the Milky Way is tilted']],
      ['The March equinox point (the “First Point of Aries”) now lies in the constellation…', 'Pisces', ['Aries', 'Taurus', 'Cetus']],
      ['The ecliptic poles lie … from the celestial poles.', '23.4°', ['0°', '66.6°', '90°']],
      ['The zodiac band, within about 8° of the ecliptic, holds…', 'the Moon and the visible planets', ['all the Messier objects', 'only the Sun', 'the Milky Way']],
    ], 'The ecliptic is the plane of Earth’s orbit on the sky. Its poles are 23.4° from the celestial poles (the north ecliptic pole is in Draco, the south in Dorado); the equinoxes are where it crosses the celestial equator, and precession (26 000 years) has carried the March equinox from Aries into Pisces.');
    S.fact('formation', 'Formation of the Solar System', 2, [
      ['The nebular hypothesis says the Solar System formed from…', 'a collapsing, rotating cloud of gas and dust', ['a collision of two stars', 'a star captured by another', 'a supernova blast alone']],
      ['The frost line (about 3–5 AU in the early Solar System) separates…', 'the rocky inner planets from the icy outer ones', ['stars from planets', 'asteroids from comets only', 'the Sun from its disc']],
      ['The age of the Solar System, from meteorites, is about…', '4.57 billion years', ['13.8 billion years', '1 billion years', '10 billion years']],
      ['The giant planets formed by…', 'core accretion followed by capture of gas', ['condensation of the Sun’s atmosphere', 'collision of moons', 'stellar fission']],
      ['The planets orbit in nearly the same plane and direction because…', 'they formed from a flattened rotating disc', ['they were captured', 'gravity of Jupiter aligned them', 'tides circularised them']],
    ], 'The solar nebula collapsed into a spinning disc; beyond the frost line ices survive, so giant cores grew fast enough to capture gas. Meteorite uranium–lead dating gives 4.568 Gyr.');
    S.fact('moon', 'The Moon', 1, [
      ['The leading explanation for the Moon’s origin is…', 'a giant impact of a Mars-sized body (Theia) with the early Earth', ['capture of a passing planet', 'fission from a fast-spinning Earth', 'formation from a separate cloud']],
      ['The Moon recedes from the Earth by about…', '3.8 cm per year', ['3.8 m per year', '38 cm per year', '0.4 mm per year']],
      ['The Moon’s mean distance is about…', '384 000 km (60 Earth radii)', ['38 400 km', '3.84 million km', '150 million km']],
      ['The dark plains on the Moon are called…', 'maria (basalt lava plains)', ['highlands', 'craters', 'rilles']],
      ['Thanks to libration, from the Earth we can see about … of the Moon’s surface.', '59%', ['50%', '75%', '100%']],
    ], 'Tides transfer Earth’s rotational angular momentum to the Moon’s orbit, so it recedes 3.8 cm per year (laser ranging with Apollo retroreflectors). Libration reveals 59% of the surface.');
    S.fact('atmo', 'Atmospheres', 3, [
      ['Why does the Moon have almost no atmosphere?', 'Its escape speed (2.4 km/s) is too low to keep gases', ['It is too far from the Sun', 'It has no gravity', 'Solar wind makes it too cold']],
      ['A gas stays on a planet for billions of years if its mean thermal speed is less than about … of the escape speed.', '1/6', ['1/2', '1/100', 'the escape speed']],
      ['The greenhouse effect warms a planet because…', 'its atmosphere absorbs infrared radiation from the surface', ['it reflects sunlight', 'it traps the solar wind', 'it adds new energy']],
      ['Venus is hotter than Mercury mainly because…', 'its thick CO₂ atmosphere creates a strong greenhouse effect', ['it is closer to the Sun', 'it has volcanoes', 'it rotates faster']],
    ], 'Jeans escape: a gas is lost if v_thermal = √(3kT/m) exceeds about v_esc/6. Hydrogen escapes from Earth; the Moon (2.4 km/s) keeps nothing. Venus’ 92 bar CO₂ atmosphere heats the surface to 465 °C.');
    S.fact('exo', 'Detecting exoplanets', 2, [
      ['The radial-velocity method detects planets by…', 'the periodic Doppler shift of the star’s spectrum', ['dips in brightness', 'direct imaging', 'gravitational lensing']],
      ['The transit method detects planets by…', 'the dip in a star’s brightness when a planet crosses its disc', ['Doppler shifts', 'direct imaging', 'radio emission']],
      ['The radial-velocity method gives only a minimum mass, m sin i, because…', 'the orbital inclination is unknown', ['the star’s mass is unknown', 'the period is unknown', 'light is blocked']],
      ['51 Pegasi b (1995), the first planet found around a Sun-like star, was a…', 'hot Jupiter', ['super-Earth', 'rogue planet', 'brown dwarf']],
      ['Which mission found thousands of exoplanets by transits between 2009 and 2018?', 'Kepler', ['Gaia', 'Hubble', 'Voyager']],
      ['Direct imaging works best for planets that are…', 'young, massive and far from their star', ['small and close in', 'old and cold', 'in transit']],
      ['Microlensing detects planets through…', 'brief brightening when a planet’s gravity bends background starlight', ['Doppler shifts', 'transits', 'radio signals']],
    ], 'Radial velocity (Mayor & Queloz, 51 Peg b, Nobel 2019), transits (Kepler, TESS, CoRoT), direct imaging, microlensing, astrometry and timing. Transits plus radial velocity give both radius and mass, hence density.');
    S.fact('transit', 'Transit light curves', 2, [
      ['In this light curve a planet transits its star. What does the depth of the dip give?', 'The ratio of the planet’s and star’s areas, (R_p/R_*)²', ['The planet’s mass', 'The orbital period', 'The star’s temperature'], { fig: 'star.transit' }],
      ['The time between successive transits gives…', 'the orbital period', ['the planet’s radius', 'the star’s distance', 'the planet’s temperature']],
      ['The probability that a planet’s orbit is aligned to transit is about…', 'R_*/a (stellar radius over orbital radius)', ['a/R_*', 'always 100%', 'M_p/M_*']],
      ['A Jupiter-sized planet crossing a Sun-like star blocks about…', '1% of the light', ['10%', '0.01%', '50%']],
    ], 'Depth = (R_p/R_*)²: ~1% for Jupiter, 0.0084% for Earth. The duration gives the orbit speed and the interval the period. Only a fraction R_*/a of systems are oriented to transit (0.5% at 1 AU).');
    S.fact('habitable', 'Habitable zones', 2, [
      ['The habitable zone is the range of distances where…', 'liquid water could exist on a planet’s surface', ['life must exist', 'a planet is tidally locked', 'the temperature is exactly 300 K']],
      ['For a star more luminous than the Sun, the habitable zone is…', 'farther out', ['closer in', 'the same', 'absent']],
      ['TRAPPIST-1 has … Earth-sized planets, several in the habitable zone.', 'seven', ['three', 'twelve', 'one']],
      ['Proxima Centauri b is…', 'an Earth-mass planet in the habitable zone of the nearest star', ['a hot Jupiter', 'a rogue planet', 'a moon of Alpha Centauri A']],
    ], 'The habitable zone scales as √L: about 0.95–1.4 AU for the Sun, ~0.03–0.06 AU for a red dwarf. TRAPPIST-1 (40 ly) has seven rocky planets; Proxima b orbits in 11 days.');
    S.fact('space', 'Space exploration', 1, [
      ['The first artificial satellite, Sputnik 1, was launched in…', '1957', ['1961', '1969', '1946']],
      ['The first human in space was…', 'Yuri Gagarin (1961)', ['Neil Armstrong', 'Alan Shepard', 'John Glenn']],
      ['Humans first walked on the Moon in…', '1969 (Apollo 11)', ['1961', '1975', '1957']],
      ['Which spacecraft first entered interstellar space (2012)?', 'Voyager 1', ['Voyager 2', 'Pioneer 10', 'New Horizons']],
      ['New Horizons flew past Pluto in…', '2015', ['2006', '1989', '2021']],
      ['The Huygens probe landed on…', 'Titan (2005)', ['Europa', 'Venus', 'Callisto']],
    ], 'Sputnik 1 (4 Oct 1957), Gagarin (12 Apr 1961), Apollo 11 (20 July 1969), Voyager 1 (heliopause in August 2012), Cassini–Huygens (Titan, January 2005), New Horizons (Pluto, 14 July 2015).');
    S.fact('sun-earth', 'Space weather', 2, [
      ['The solar wind is…', 'a stream of charged particles flowing outwards from the Sun', ['a wind of neutral dust', 'a magnetic field of the Earth', 'a flow of neutrinos']],
      ['Auroras are caused by…', 'charged particles from the solar wind funnelled by Earth’s magnetic field into the upper atmosphere', ['sunlight reflecting off ice', 'volcanic dust', 'the Moon’s tides']],
      ['The Van Allen belts are…', 'regions of trapped charged particles in Earth’s magnetosphere', ['rings of dust', 'asteroid belts', 'layers of the atmosphere']],
      ['A coronal mass ejection is…', 'a huge eruption of plasma from the Sun’s corona', ['a sunspot', 'a solar eclipse', 'a comet’s tail']],
    ], 'The solar wind (400 km/s) is deflected by Earth’s magnetosphere; particles that enter near the poles excite oxygen (green and red) and nitrogen to make auroras. Coronal mass ejections cause geomagnetic storms.');
    S.calc('transit-calc', 'Transit depth', 2, r => {
      const pl = r.pick([['an Earth-sized planet', 1], ['a Neptune-sized planet', 3.88], ['a Jupiter-sized planet', 11.2]]), st = r.pick([['a Sun-like star', 1], ['a red dwarf of 0.3 R☉', 0.3], ['a giant of 2 R☉', 2], ['a star of 0.5 R☉', 0.5]]);
      const ratio = pl[1] / (st[1] * 109.1), dep = ratio * ratio, ppm = dep < 1e-3, val = ppm ? dep * 1e6 : dep * 100, unit = ppm ? 'ppm' : '%';
      const o = nums(val, unit, 3, [ratio * (ppm ? 1e6 : 100), val * 2, val / 2]);
      return { prompt: 'By what fraction does the brightness of ' + st[0] + ' drop when ' + pl[0] + ' (radius ' + pl[1] + ' R⊕; 1 R☉ = 109 R⊕) crosses its disc?', right: o.right, wrong: o.wrong,
        explain: 'Depth = (R_p/R_*)² = (' + pl[1] + ' / (' + st[1] + ' × 109.1))² = ' + fmt(dep, 3) + ' = ' + fmt(val, 3) + (ppm ? ' ' : '') + unit + '.' };
    });
    S.calc('hz-calc', 'Habitable-zone distance', 2, r => {
      const b = r.pick([['a red dwarf', 0.01], ['a small red dwarf', 0.1], ['a K dwarf', 0.25], ['an F star', 4], ['an A star', 25], ['a blue-white star', 100]]);
      const d = Math.sqrt(b[1]), o = nums(d, 'AU', 3, [b[1], b[1] * b[1], 1 / Math.sqrt(b[1])]);
      return { prompt: b[0].charAt(0).toUpperCase() + b[0].slice(1) + ' has a luminosity of ' + b[1] + ' L☉. At what distance does a planet receive the same stellar flux as the Earth?', right: o.right, wrong: o.wrong, explain: 'Same flux means L/d² = L☉/(1 AU)², so d = √(L/L☉) AU = √' + b[1] + ' = ' + fmt(d, 3) + ' AU.' };
    });
    S.calc('rv-calc', 'Radial-velocity amplitude', 3, r => {
      const b = r.pick([['Jupiter orbiting the Sun (P = 11.86 yr)', 1, 11.86, 1], ['a 1 M_J planet in a 3-day orbit around a Sun-like star', 1, 3 / 365.25, 1], ['51 Pegasi b (0.47 M_J, P = 4.23 d, star 1.1 M☉)', 0.47, 4.23 / 365.25, 1.1], ['an Earth-mass planet (0.00315 M_J) in a 1-year orbit around the Sun', 0.00315, 1, 1], ['a 5 M_J planet in a 2-year orbit around a 0.5 M☉ star', 5, 2, 0.5]]);
      const K = P.rvK(b[1], b[2], b[3]), o = nums(K, 'm/s', 3, [28.43 * b[1] * Math.pow(b[2], 1 / 3) * Math.pow(b[3], 2 / 3), K * Math.pow(b[3], 4 / 3), K * Math.pow(b[2], 2 / 3)]);
      return { prompt: 'Use K = 28.4 m/s × (m/M_J) × (P/1 yr)^(−1/3) × (M_*/M☉)^(−2/3) (edge-on orbit). What is the radial-velocity semi-amplitude of the star with ' + b[0] + '?', right: o.right, wrong: o.wrong,
        explain: 'K = 28.43 × ' + fmt(b[1], 3) + ' × ' + fmt(b[2], 3) + '^(−1/3) × ' + fmt(b[3], 3) + '^(−2/3) = ' + fmt(K, 3) + ' m/s.' };
    });
    S.calc('g-calc', 'Surface gravity', 2, r => {
      const b = r.pick([['the Moon', 7.342e22, 1.7374e6], ['Mars', 6.417e23, 3.3895e6], ['Venus', 4.867e24, 6.0518e6], ['Ceres', 9.38e20, 4.73e5], ['Jupiter (1-bar level)', 1.8982e27, 7.1492e7], ['Mercury', 3.301e23, 2.4397e6]]);
      const g = P.G * b[1] / (b[2] * b[2]), o = nums(g, 'm/s²', 3, [g / 4, g * 2, g * 4]);
      return { prompt: 'The mass of ' + b[0] + ' is ' + fmt(b[1], 3) + ' kg and its radius ' + fmt(b[2] / 1e3, 4) + ' km. What is its surface gravity?', right: o.right, wrong: o.wrong, explain: 'g = GM/R² = 6.674×10⁻¹¹ × ' + fmt(b[1], 3) + ' / (' + fmt(b[2], 4) + ')² = ' + fmt(g, 3) + ' m/s².' };
    });

    // =============================================================================================== Galaxies
    const G = A.topic('galaxies');
    G.sheet([
      ['Mass from rotation', 'M = v² r / G', 'G = 4.30×10⁻³ pc M☉⁻¹ (km/s)²'],
      ['Galactic orbit period', 'T = 2πr / v', 'Sun: 8 kpc, 220 km/s → 230 Myr'],
      ['Tully–Fisher', 'L ∝ v⁴', 'spirals; Faber–Jackson L ∝ σ⁴ for ellipticals'],
      ['Small-angle size', 'D = θ (rad) · d', ''],
      ['Hubble ellipticity', 'E n, n = 10 (1 − b/a)', 'E0 round … E7 flattest'],
      ['Sizes', 'Milky Way disc 30 kpc · Sun at 8 kpc · M31 at 780 kpc', ''],
    ]);
    G.fact('milkyway', 'The Milky Way', 1, [
      ['The Milky Way is classified as a…', 'barred spiral galaxy', ['elliptical galaxy', 'irregular galaxy', 'lenticular galaxy']],
      ['The Sun is about … from the Galactic centre.', '8 kpc (26 000 light-years)', ['800 pc', '80 kpc', '8 Mpc']],
      ['The diameter of the Milky Way’s stellar disc is about…', '30 kpc (100 000 light-years)', ['3 kpc', '300 kpc', '1 kpc']],
      ['The Sun orbits the Galactic centre at about…', '220 km/s, once every ~230 million years', ['22 km/s, once every 23 million years', '2 200 km/s', '30 km/s, once a year']],
      ['The supermassive black hole at the Galactic centre is called…', 'Sagittarius A*', ['Cygnus X-1', 'M87*', 'Andromeda A']],
      ['Roughly how many stars does the Milky Way contain?', '100–400 billion', ['1–10 million', '1 trillion', '10 thousand']],
    ], 'The Milky Way is an SBbc barred spiral, about 30 kpc across and 300 pc thick, with the Sun in the Orion spur 8 kpc from Sgr A* (4.3×10⁶ M☉); the Sun’s orbit takes ~230 Myr at 220 km/s.');
    G.gallery([
      ['gal.mw', 'The Milky Way', 'Top view: a bar and spiral arms with the Sun roughly halfway out from the centre. Side view: thin disc, central bulge and a halo with globular clusters.', 'Galactic structure'],
      ['gal.rotation#AB', 'Rotation curves', 'A: the observed flat curve. B: the expected fall-off if only the visible matter counted. The difference is dark matter.', 'Galactic structure'],
    ]);
    G.fact('structure', 'Structure of the Galaxy', 2, [
      ['Which components make up the Milky Way?', 'A thin disc with spiral arms, a central bulge/bar, and a halo with globular clusters', ['A single flat disc', 'A sphere of gas only', 'Two interlocking discs']],
      ['In the Milky Way, globular clusters are found mainly in the…', 'halo and bulge', ['thin disc', 'spiral arms only', 'Solar System']],
      ['The thin stellar disc of the Milky Way is about … thick.', '300 pc (1 000 light-years)', ['30 kpc', '3 pc', '10 kpc']],
      ['Spiral arms are…', 'density waves, not fixed groups of stars', ['rigid structures rotating as a whole', 'jets of gas', 'dark-matter filaments']],
      ['In the picture, where is the Sun in the Milky Way?', 'In the disc, roughly halfway out from the centre', ['At the centre', 'In the halo', 'At the edge of the disc'], { fig: 'gal.mw' }],
    ], 'Disc (young stars, gas, dust, spiral arms), bulge/bar (old stars), halo (old metal-poor stars, globular clusters, dark matter). Arms are density waves (Lin & Shu) where gas is compressed and forms stars.');
    G.figs({
      prefix: 'type', tier: 1, group: 'Galaxy types', ask: 'What type of galaxy is this?', askName: n => 'Which picture shows a ' + n.toLowerCase() + '?',
      items: [
        { id: 'e0', name: 'Round elliptical (E0)', fig: 'gal.type#E0', kin: 'e', note: 'E0: a round, featureless elliptical of old red stars with little gas or dust and almost no star formation.' },
        { id: 'e5', name: 'Flattened elliptical (E5)', fig: 'gal.type#E5', kin: 'e', note: 'E5: ellipticals are classed by flattening, n = 10(1 − b/a); E5 has an axis ratio of 2:1. Old stars, no spiral structure.' },
        { id: 's0', name: 'Lenticular galaxy (S0)', fig: 'gal.type#S0', kin: 's', note: 'S0: a disc and bulge but no spiral arms and little gas: the transition between ellipticals and spirals.' },
        { id: 'sa', name: 'Tightly wound spiral (Sa)', fig: 'gal.type#Sa', kin: 's', note: 'Sa: a large bulge and tightly wound, smooth arms; the oldest stars dominate.' },
        { id: 'sc', name: 'Loosely wound spiral (Sc)', fig: 'gal.type#Sc', kin: 's', note: 'Sc: a small bulge and open, clumpy arms rich in blue young stars and HII regions.' },
        { id: 'sbb', name: 'Barred spiral (SBb)', fig: 'gal.type#SBb', kin: 's', note: 'SBb: the arms start at the ends of a bright bar of stars across the centre (the Milky Way is of this kind).' },
        { id: 'irr', name: 'Irregular galaxy', fig: 'gal.type#Irr', kin: 'i', note: 'Irregular: no regular shape; gas-rich with active star formation, like the Magellanic Clouds.' },
      ],
    });
    G.fact('hubble-seq', 'Hubble’s classification', 2, [
      ['Compared with Sc galaxies, Sa galaxies have…', 'larger bulges and more tightly wound arms', ['smaller bulges and more open arms', 'no bulge', 'bars only']],
      ['Elliptical galaxies are made mostly of…', 'old, red stars with little gas and little star formation', ['young blue stars', 'gas only', 'dark matter only']],
      ['Spiral arms look blue because…', 'young, hot stars form there', ['the stars are old', 'of dust', 'of the Doppler effect']],
      ['The ellipticity class En is defined by n =', '10 × (1 − b/a)', ['10 × (b/a)', '(a − b)/10', 'a/b']],
      ['Hubble’s “tuning fork” diagram branches at…', 'S0, into normal and barred spirals', ['E0, into red and blue', 'Irr, into small and large', 'Sc, into old and young']],
    ], 'Hubble’s sequence runs E0–E7 → S0 → Sa, Sb, Sc (and SBa–SBc) → Irr. Ellipticals are red and old, spirals have blue arms with ongoing star formation.');
    G.fact('rotation', 'Rotation curves and dark matter', 2, [
      ['Rotation curves of spiral galaxies stay flat at large radii. This suggests…', 'dark matter extending far beyond the visible disc', ['no gravity at large radii', 'that outer stars move faster than light', 'that a central black hole dominates']],
      ['If all the mass were concentrated in the centre, the rotation speed would fall with radius as…', 'r^(−1/2) (Keplerian)', ['r', 'constant', 'r²']],
      ['Who showed convincingly in the 1970s that galaxy rotation curves are flat?', 'Vera Rubin', ['Fritz Zwicky', 'Jan Oort', 'Edwin Hubble']],
      ['Which curve shows the observed rotation of a typical spiral galaxy?', 'A', ['B', 'both', 'neither'], { fig: 'gal.rotation#AB' }],
      ['Which curve shows what would be expected from the visible matter alone?', 'B', ['A', 'both', 'neither'], { fig: 'gal.rotation#AB' }],
    ], 'v(r) = √(GM(<r)/r): a flat curve means M(<r) ∝ r, so mass keeps growing outwards although light does not: a dark halo (Rubin & Ford, 1970). Zwicky had already found “missing mass” in the Coma cluster in 1933.');
    G.fact('localgroup', 'The Local Group', 1, [
      ['The nearest large spiral galaxy to the Milky Way is…', 'Andromeda (M31), 2.5 million light-years away', ['Triangulum', 'the Large Magellanic Cloud', 'M87']],
      ['Andromeda is…', 'approaching the Milky Way at about 110 km/s', ['receding at 110 km/s', 'at rest', 'orbiting the Sun']],
      ['The Large Magellanic Cloud is…', 'an irregular satellite galaxy of the Milky Way, about 160 000 light-years away', ['a spiral galaxy beyond the Local Group', 'a star cluster in Orion', 'a nebula in Sagittarius']],
      ['The nearest big galaxy cluster is…', 'the Virgo Cluster, about 16.5 Mpc away', ['the Coma Cluster', 'the Local Group', 'the Perseus Cluster']],
      ['The Local Group has about … galaxies.', '80 (mostly dwarfs)', ['3', '8 000', '1 million']],
    ], 'The Local Group (Milky Way, Andromeda, Triangulum and dozens of dwarfs) spans ~3 Mpc. Andromeda (0.78 Mpc, 110 km/s approach) will merge with us in ~4–5 billion years.');
    G.fact('agn', 'Active galaxies', 2, [
      ['Quasars are powered by…', 'accretion of matter onto supermassive black holes', ['star formation in huge galaxies', 'colliding neutron stars', 'dark-matter annihilation']],
      ['Quasars are seen at…', 'very large distances (high redshift), so we see them as they were long ago', ['small distances only', 'the Galactic centre only', 'random distances, mostly nearby']],
      ['The jets of an active galactic nucleus are…', 'beams of plasma launched along the rotation axis near the black hole', ['streams of stars', 'dust trails', 'comet tails']],
      ['Blazars are active galaxies whose jets…', 'point almost directly at us', ['are missing', 'point away from us', 'are made of neutrinos']],
      ['Seyfert galaxies are…', 'spiral galaxies with bright, active nuclei', ['elliptical galaxies with no stars', 'dwarf galaxies', 'galaxy clusters']],
    ], 'Unified model: an accretion disc around a 10⁶–10¹⁰ M☉ black hole, with jets and a dusty torus; the type we see depends on our viewing angle. Quasars (up to 10¹² L☉) were most common at z ≈ 2.');
    G.fact('dm', 'Dark matter and lensing', 2, [
      ['The first evidence for dark matter came from Fritz Zwicky’s study of…', 'the Coma cluster (1933)', ['the Milky Way’s rotation', 'the CMB', 'the Andromeda galaxy’s distance']],
      ['The Bullet Cluster is evidence for dark matter because…', 'lensing shows the mass separated from the hot gas after a cluster collision', ['it contains no stars', 'it is the nearest cluster', 'it is a black hole']],
      ['Dark matter makes up about … of the matter in the universe.', '85%', ['5%', '50%', '99.9%']],
      ['Gravitational lensing is…', 'the bending of light by the gravity of a mass', ['absorption of light by dust', 'the Doppler shift', 'a lens in the telescope']],
      ['An Einstein ring forms when…', 'a source, a lens and the observer are almost exactly aligned', ['a star explodes', 'a galaxy rotates fast', 'two galaxies collide']],
      ['Eddington’s 1919 eclipse expedition confirmed…', 'the deflection of starlight by the Sun predicted by general relativity', ['the existence of dark matter', 'the expansion of the universe', 'the age of the Sun']],
    ], 'Evidence: cluster velocity dispersions (Zwicky), flat rotation curves (Rubin), lensing, the CMB’s acoustic peaks and the Bullet Cluster (2006). Starlight grazing the Sun is deflected by 1.75″ (Eddington 1919).');
    G.fact('ism', 'The interstellar medium', 2, [
      ['Most of the interstellar medium by mass is…', 'hydrogen gas', ['dust', 'helium only', 'heavy metals']],
      ['Molecular clouds are traced by…', 'CO emission (H₂ is hard to detect directly)', ['21 cm emission', 'X-rays', 'visible light']],
      ['HII regions have temperatures of about…', '10 000 K', ['10 K', '100 K', '10⁷ K']],
      ['Cold neutral hydrogen clouds (about 100 K) are seen via…', 'the 21 cm line', ['Hα emission', 'X-rays', 'CO lines']],
      ['The hot (about 10⁶ K) coronal gas in the ISM is heated by…', 'supernova shock waves', ['starlight', 'cosmic microwave background', 'dust grains']],
    ], 'ISM phases: molecular clouds (10–30 K, CO), cold HI (100 K, 21 cm), warm HI/HII (10⁴ K, Hα), hot ionised medium (10⁶ K, X-rays) — about 1% dust by mass, which dims and reddens stars.');
    G.fact('scaling', 'Distance indicators for galaxies', 3, [
      ['The Tully–Fisher relation links…', 'the luminosity of a spiral galaxy to its rotation speed (L ∝ v⁴)', ['the colour of a galaxy to its age', 'a galaxy’s size to its shape', 'redshift to distance']],
      ['The Faber–Jackson relation links…', 'the luminosity of an elliptical galaxy to its stellar velocity dispersion', ['the luminosity of a spiral to its colour', 'cluster mass to temperature', 'quasar luminosity to redshift']],
      ['Doubling the rotation speed of a spiral galaxy raises its luminosity by a factor of…', '16', ['2', '4', '8']],
      ['The M–σ relation connects…', 'a black hole’s mass to the velocity dispersion of the galaxy’s bulge', ['stellar mass to age', 'a galaxy’s mass to its colour', 'cluster mass to X-ray flux']],
    ], 'Tully–Fisher (L ∝ v⁴) and Faber–Jackson (L ∝ σ⁴) turn a measured velocity into a luminosity, hence a distance. The M–σ relation shows black holes and bulges co-evolve.');
    G.fact('mergers', 'Interacting galaxies', 2, [
      ['The Antennae Galaxies are…', 'two colliding galaxies with long tidal tails', ['a pair of ellipticals', 'a spiral and a quasar', 'a single galaxy with jets']],
      ['The Milky Way and Andromeda are predicted to merge in about…', '4–5 billion years', ['4–5 million years', '50 billion years', '400 years']],
      ['Galaxy mergers often trigger…', 'bursts of star formation (starbursts)', ['immediate black holes', 'supernovae only', 'no change']],
      ['The Magellanic Stream is…', 'a stream of gas pulled out of the Magellanic Clouds by the Milky Way', ['a river of stars', 'a jet from Sgr A*', 'a galaxy cluster']],
    ], 'Galaxies collide slowly (stars rarely hit each other); tides throw out tails, gas compresses into starbursts, and the remnant is often an elliptical. M51 is interacting with NGC 5195.');
    G.fact('structure-large', 'Large-scale structure', 2, [
      ['Hot gas in galaxy clusters emits mainly…', 'X-rays (10⁷–10⁸ K)', ['radio waves only', 'visible light', 'gamma rays only']],
      ['The Coma cluster is roughly … away.', '100 Mpc (330 million light-years)', ['1 Mpc', '10 kpc', '5 Gpc']],
      ['The largest known structures are…', 'superclusters, filaments and walls (the cosmic web)', ['single galaxies', 'globular clusters', 'galaxy groups']],
      ['Cosmic voids are…', 'huge regions, tens of Mpc across, almost empty of galaxies', ['clouds of dark gas', 'black holes', 'regions of dense gas']],
      ['The Hubble Deep Field (1995) revealed…', 'thousands of distant galaxies in a tiny patch of sky', ['a nearby supernova', 'a new planet', 'a new constellation']],
    ], 'Clusters hold 10¹⁴–10¹⁵ M☉, most of it as dark matter, with hot intracluster gas (X-rays) and a few percent in stars. The cosmic web has filaments, walls and voids (the Boötes void is ~100 Mpc).');
    G.calc('mass-rot', 'Mass from a rotation speed', 3, r => {
      const v = r.pick([120, 150, 200, 220, 250, 300]), rr = r.pick([5, 8, 10, 15, 30]), M = v * v * rr * 1e3 / 4.30091e-3;
      const o = nums(M, 'M☉', 2, [v * rr * 1e3 / 4.30091e-3, M / 2, M * 2]);
      return { prompt: 'Stars at ' + rr + ' kpc from the centre of a galaxy orbit at ' + v + ' km/s. What mass lies inside their orbit? (G = 4.30×10⁻³ pc M☉⁻¹ (km/s)²)', right: o.right, wrong: o.wrong, explain: 'M = v²r/G = ' + v + '² × ' + rr * 1000 + ' pc / 4.30×10⁻³ = ' + fmt(M, 2) + ' M☉.' };
    });
    G.calc('gal-period', 'Galactic year', 3, r => {
      const v = r.pick([200, 220, 240]), rr = r.pick([4, 8, 10, 15]), T = 2 * Math.PI * rr * 1e3 * P.pc / 1e3 / v / P.yr / 1e6;
      const o = nums(T, 'Myr', 3, [T / (2 * Math.PI), T * 2 * Math.PI, T / 2]);
      return { prompt: 'A star orbits the Galactic centre on a circle of radius ' + rr + ' kpc at a speed of ' + v + ' km/s (1 pc = 3.086×10¹³ km). How long is one orbit?', right: o.right, wrong: o.wrong, explain: 'T = 2πr/v = 2π × ' + rr * 1000 + ' pc × 3.086×10¹³ km/pc / ' + v + ' km/s = ' + fmt(T, 3) + ' Myr.' };
    });
    G.calc('gal-size', 'Physical size of a galaxy', 2, r => {
      const b = r.pick([['The Andromeda galaxy', 3.0, 780, '3°'], ['The Large Magellanic Cloud', 10.7, 50, '10.7°'], ['M51, the Whirlpool Galaxy,', 11 / 60, 8600, '11′'], ['The Triangulum galaxy', 1.0, 880, '1°']]);
      const D = b[1] * Math.PI / 180 * b[2], o = nums(D, 'kpc', 3, [b[1] * b[2], D / 2, D * 2]);
      return { prompt: b[0] + ' appears ' + b[3] + ' across and lies ' + b[2] + ' kpc away. Its diameter is…', right: o.right, wrong: o.wrong, explain: 'D = θ d with θ in radians: ' + b[3] + ' = ' + fmt(b[1] * Math.PI / 180, 3) + ' rad, so D = ' + fmt(D, 3) + ' kpc.' };
    });
    G.calc('tf-calc', 'Tully–Fisher scaling', 3, r => {
      const k = r.pick([1.5, 2, 2.5, 3]), v4 = Math.pow(k, 4);
      const o = nums(v4, '', 3, [k * k, k * k * k, k], x => x + ' times');
      return { prompt: 'By the Tully–Fisher relation L ∝ v⁴, a spiral galaxy rotating ' + k + ' times faster than another is how many times more luminous?', right: o.right, wrong: o.wrong, explain: 'L ∝ v⁴, so the ratio is ' + k + '⁴ = ' + fmt(v4, 3) + '.' };
    });

    // =============================================================================================== Cosmology
    const C = A.topic('cosmos');
    C.sheet([
      ['Hubble’s law', 'v = H₀ d', 'H₀ ≈ 70 km s⁻¹ Mpc⁻¹'],
      ['Hubble time and radius', '1/H₀ ≈ 14 Gyr · c/H₀ ≈ 4.3 Gpc', '1/H₀ = 977.8 / H₀ Gyr (H₀ in km/s/Mpc)'],
      ['Redshift', 'z = (λ_obs − λ_emit)/λ_emit · 1 + z = a₀/a', 'v ≈ cz for z ≪ 1'],
      ['CMB temperature', 'T = 2.725 K · (1 + z)', 'recombination z ≈ 1100, T ≈ 3000 K'],
      ['Critical density', 'ρ_c = 3H² / 8πG ≈ 9.2×10⁻²⁷ kg/m³', 'about 5.5 protons per m³'],
      ['Density parameters', 'Ω_m ≈ 0.31, Ω_Λ ≈ 0.69, Ω_b ≈ 0.05', 'flat: Ω_total = 1'],
      ['Age of the universe', '13.8 Gyr', 'observable radius ≈ 46 Gly (comoving)'],
    ]);
    C.gallery([['cos.hubble', 'The Hubble diagram', 'Recession velocity against distance: galaxies lie on a straight line whose slope is the Hubble constant H₀ ≈ 70 km/s per Mpc.', 'Expansion']]);
    C.fact('hubble', 'Hubble’s law', 1, [
      ['Hubble’s law states that the recession speed of a galaxy is…', 'proportional to its distance', ['inversely proportional to its distance', 'proportional to its mass', 'independent of distance']],
      ['The Hubble constant is about…', '70 km/s per Mpc', ['7 km/s per Mpc', '700 km/s per Mpc', '70 km/s per kpc']],
      ['Edwin Hubble published his law in…', '1929', ['1905', '1950', '1998']],
      ['The expansion of the universe is…', 'an expansion of space itself, not of galaxies moving through space', ['an explosion into empty space', 'an optical illusion', 'caused by the Doppler effect of motion through space']],
      ['The Milky Way and Andromeda do not follow the Hubble flow because…', 'they are gravitationally bound', ['they are too small', 'they are too close to the Sun', 'space does not expand locally']],
      ['In a Hubble diagram, the slope of the line of velocity against distance gives…', 'the Hubble constant', ['the age of the Sun', 'the speed of light', 'the redshift'], { fig: 'cos.hubble' }],
    ], 'v = H₀ d with H₀ ≈ 70 km s⁻¹ Mpc⁻¹ (the CMB gives 67.4, Cepheids and supernovae 73: the “Hubble tension”). A galaxy 100 Mpc away recedes at 7 000 km/s.');
    C.fact('redshift', 'Redshift', 1, [
      ['Cosmological redshift is caused by…', 'the stretching of light’s wavelength as space expands', ['galaxies moving through space (a Doppler shift)', 'dust absorption', 'the gravity of the observer']],
      ['A redshift z = 1 means that the universe has expanded by a factor … since the light was emitted.', '2', ['1', '0.5', '10']],
      ['The redshift is related to the scale factor by…', '1 + z = a_now / a_then', ['z = a_then / a_now', '1 − z = a_now / a_then', 'z = a_now − a_then']],
      ['For small redshifts, the recession velocity is approximately…', 'v ≈ cz', ['v ≈ c/z', 'v ≈ z²', 'v ≈ c(1 + z)']],
    ], 'Light waves stretch with the universe: λ_obs/λ_emit = 1 + z = a₀/a. For z ≪ 1, v ≈ cz, but at z ~ 1 and beyond the relativistic or cosmological formulae must be used.');
    C.fact('cmb', 'The cosmic microwave background', 1, [
      ['The CMB was released at recombination, about … after the Big Bang.', '380 000 years', ['3 minutes', '1 billion years', '13.8 billion years']],
      ['At recombination the temperature of the universe was about…', '3 000 K', ['300 K', '30 000 K', '3 million K']],
      ['The CMB temperature fluctuations are about…', '1 part in 100 000', ['1 part in 10', '1 part in a million million', '10%']],
      ['The CMB has been mapped by the satellites…', 'COBE, WMAP and Planck', ['Hubble, Kepler and Gaia', 'Voyager and Pioneer', 'Chandra and Fermi']],
      ['The CMB dipole is due to…', 'our motion through space at about 370 km/s', ['dark matter', 'the Milky Way’s magnetic field', 'the expansion of the universe']],
    ], 'At z ≈ 1100 hydrogen became neutral and photons streamed freely; they have been redshifted to 2.725 K. The anisotropies (ΔT/T ≈ 10⁻⁵) are the seeds of galaxies; the dipole shows we move at ~370 km/s relative to the CMB.');
    C.fact('bigbang', 'Evidence for the Big Bang', 2, [
      ['Big Bang nucleosynthesis took place during…', 'the first few minutes', ['the first 380 000 years', 'the first second only', 'the first billion years']],
      ['The primordial mass fraction of helium is about…', '25%', ['5%', '50%', '75%']],
      ['Which of the following is NOT direct evidence for the Big Bang?', 'The existence of black holes', ['The Hubble expansion', 'The cosmic microwave background', 'The abundance of light elements']],
      ['Cosmic inflation was proposed to solve…', 'the horizon and flatness problems', ['the dark matter problem', 'the age of globular clusters', 'the solar neutrino problem']],
      ['The first stars and galaxies reionised the universe around…', 'z ≈ 6–10 (within the first billion years)', ['z ≈ 0', 'z ≈ 1100', 'z ≈ 10⁹']],
    ], 'Three pillars: Hubble expansion, the CMB and the primordial abundances (75% H, 25% He, trace Li). Inflation (~10⁻³⁶–10⁻³² s) explains the uniformity and flatness; reionisation by the first stars ended the “dark ages”.');
    C.fact('age', 'Age and size of the universe', 1, [
      ['The age of the universe is about…', '13.8 billion years', ['4.6 billion years', '100 billion years', '1.4 million years']],
      ['The age of the universe is roughly equal to…', '1/H₀, the Hubble time', ['the age of the Sun', '1/H₀²', 'the light-crossing time of the Galaxy']],
      ['The radius of the observable universe is about…', '46 billion light-years', ['13.8 billion light-years', '100 million light-years', '1 trillion light-years']],
    ], '1/H₀ ≈ 14 Gyr; the actual age from Planck is 13.8 Gyr. Because space kept expanding while the light travelled, objects whose light has taken 13.8 Gyr now lie about 46 billion light-years away.');
    C.fact('olbers', 'Olbers’ paradox', 1, [
      ['Olbers’ paradox asks why the night sky is dark. The answer is that…', 'the universe has a finite age and is expanding', ['stars are too faint', 'dust blocks the light', 'the universe is finite in space']],
      ['If the universe were infinite, static and eternal, the night sky would be…', 'as bright as the surface of a star', ['completely dark', 'dim and red', 'brighter only at the poles']],
    ], 'In a static, infinite, eternal universe every line of sight would end on a stellar surface. Finite age (light from far away hasn’t arrived) and redshift darken the sky.');
    C.fact('contents', 'What the universe is made of', 2, [
      ['Ordinary (baryonic) matter makes up about … of the energy density of the universe.', '5%', ['50%', '27%', '68%']],
      ['Dark energy makes up about … of the energy density of the universe.', '68%', ['5%', '27%', '95%']],
      ['Dark matter makes up about … of the energy density of the universe.', '27%', ['5%', '68%', '1%']],
      ['The densities Ω_m ≈ 0.3 and Ω_Λ ≈ 0.7 add up to about 1, which means the universe is…', 'spatially flat', ['open', 'closed', 'rotating']],
      ['The accelerating expansion of the universe was discovered in 1998 using…', 'Type Ia supernovae', ['Cepheids', 'the CMB', 'gravitational waves']],
    ], 'ΛCDM: 68% dark energy, 27% cold dark matter, 5% ordinary matter. The 1998 supernova studies (Perlmutter, Schmidt, Riess; Nobel 2011) showed that distant supernovae are fainter than expected: the expansion accelerates.');
    C.fact('geometry', 'Geometry and fate', 3, [
      ['In a flat universe, the angles of a large triangle add up to…', '180°', ['more than 180°', 'less than 180°', '360°']],
      ['A closed universe has Ω greater than…', '1', ['0', '0.3', '10']],
      ['The critical density is…', '3H² / 8πG', ['H² / G', '8πG / 3H²', 'G / H²']],
      ['If Ω_total = 1, the universe is…', 'spatially flat (Euclidean)', ['closed', 'open', 'static']],
    ], 'Ω = ρ/ρ_c. Ω > 1: closed (spherical geometry, angles > 180°); Ω = 1: flat; Ω < 1: open (hyperbolic, angles < 180°). Observations (CMB) give Ω_total = 1.00 ± 0.01.');
    C.fact('horizon', 'Horizons', 3, [
      ['Galaxies beyond the Hubble radius c/H₀ recede faster than light. This…', 'does not violate relativity, since space itself expands', ['is impossible', 'proves relativity wrong', 'happens only for black holes']],
      ['The Hubble radius c/H₀ is about…', '4.3 Gpc (14 billion light-years)', ['43 kpc', '430 Mpc', '4.3 Mpc']],
      ['The particle horizon is…', 'the greatest distance from which light has reached us since the Big Bang', ['the edge of the Milky Way', 'the Schwarzschild radius', 'the distance to the CMB only']],
    ], 'v = H₀d reaches c at d = c/H₀ = 4.3 Gpc. Receding faster than light is allowed because it is the space between that grows, not motion through space.');
    C.fact('gw', 'Gravitational waves and relativity', 2, [
      ['Gravitational waves are…', 'ripples in spacetime produced by accelerating masses', ['light waves from black holes', 'sound waves in space', 'neutrino bursts']],
      ['LIGO detects gravitational waves using…', 'laser interferometers with 4 km arms', ['radio dishes', 'optical telescopes', 'neutrino detectors']],
      ['The 2017 Nobel Prize in Physics was awarded for…', 'the detection of gravitational waves', ['the discovery of dark energy', 'the Higgs boson', 'the CMB']],
      ['A typical gravitational-wave strain is of order…', '10⁻²¹', ['10⁻³', '1', '10⁻⁶⁰']],
      ['General relativity predicts that light grazing the Sun is deflected by…', '1.75″', ['0.5″', '17.5″', '10°']],
    ], 'LIGO detected GW150914 (two ~30 M☉ black holes merging 1.3 billion ly away) on 14 September 2015: arm lengths changed by 10⁻¹⁸ m (strain 10⁻²¹). GR bends starlight at the Sun’s limb by 1.75″, confirmed in 1919.');
    C.calc('hubble-v', 'Recession speed', 1, r => {
      const d = r.pick([10, 30, 50, 100, 200, 500, 1000]), v = 70 * d;
      const o = nums(v, 'km/s', 3, [d / 70, v * 3.26, v / 3.26]);
      return { prompt: 'Using H₀ = 70 km/s/Mpc, how fast does a galaxy ' + d + ' Mpc away recede?', right: o.right, wrong: o.wrong, explain: 'v = H₀ d = 70 × ' + d + ' = ' + fmt(v, 3) + ' km/s.' };
    });
    C.calc('hubble-d', 'Distance from recession speed', 1, r => {
      const v = r.pick([1400, 3500, 7000, 12000, 21000, 30000]), d = v / 70;
      const o = nums(d, 'Mpc', 3, [v * 70, d * 3.26, d / 3.26]);
      return { prompt: 'A galaxy recedes at ' + v + ' km/s. Using H₀ = 70 km/s/Mpc, how far away is it?', right: o.right, wrong: o.wrong, explain: 'd = v/H₀ = ' + v + ' / 70 = ' + fmt(d, 3) + ' Mpc.' };
    });
    C.calc('redshift-calc', 'Redshift from wavelengths', 2, r => {
      const l = r.pick([['Lyman-α', 121.6], ['Hα', 656.3], ['[O III]', 500.7], ['Mg II', 279.6]]), z = r.pick([0.5, 1, 2, 3, 5, 7]), obs = l[1] * (1 + z);
      const o = nums(z, '', 3, [obs / l[1], (obs - l[1]) / obs, l[1] / obs], x => 'z = ' + x);
      return { prompt: 'The ' + l[0] + ' line, with a rest wavelength of ' + l[1] + ' nm, is observed at ' + fmt(obs, 4) + ' nm. The redshift is…', right: o.right, wrong: o.wrong, explain: 'z = (λ_obs − λ_emit)/λ_emit = (' + fmt(obs, 4) + ' − ' + l[1] + ')/' + l[1] + ' = ' + fmt(z, 3) + '.' };
    });
    C.calc('hubble-time', 'Hubble time', 2, r => {
      const H = r.pick([50, 67.4, 70, 73, 100]), t = 977.8 / H;
      const o = nums(t, 'Gyr', 3, [H / 977.8, t * 3.26, t / 3.26]);
      return { prompt: 'What is the Hubble time 1/H₀ for H₀ = ' + H + ' km/s/Mpc? (1 Mpc = 3.086×10¹⁹ km, 1 Gyr = 3.156×10¹⁶ s)', right: o.right, wrong: o.wrong, explain: '1/H₀ = 3.086×10¹⁹ km/Mpc / ' + H + ' km/s/Mpc = ' + fmt(3.0857e19 / H, 3) + ' s = ' + fmt(t, 3) + ' Gyr.' };
    });
    C.calc('cmb-temp', 'CMB temperature in the past', 2, r => {
      const z = r.pick([0.5, 1, 2, 3, 6, 10, 1100]), T = 2.725 * (1 + z);
      const o = nums(T, 'K', 3, [2.725 * z, 2.725 / (1 + z), 2.725 * (1 + z) * (1 + z)]);
      return { prompt: 'The CMB temperature today is 2.725 K. What was it at redshift z = ' + z + '?', right: o.right, wrong: o.wrong, explain: 'T = T₀(1 + z) = 2.725 × ' + (1 + z) + ' = ' + fmt(T, 3) + ' K.' };
    });
    C.calc('rho-crit', 'Critical density', 3, r => {
      const H = r.pick([50, 67.4, 70, 73, 100]), rho = P.rhoCrit(H);
      const o = nums(rho, 'kg/m³', 2, [rho * 8 * Math.PI, rho / 3, rho * 2]);
      return { prompt: 'Find the critical density ρ_c = 3H₀²/(8πG) for H₀ = ' + H + ' km/s/Mpc. (G = 6.67×10⁻¹¹; 1 Mpc = 3.086×10²² m)', right: o.right, wrong: o.wrong, explain: 'H₀ = ' + H + ' km/s/Mpc = ' + fmt(H * 1e3 / P.Mpc, 3) + ' s⁻¹, so ρ_c = 3H₀²/8πG = ' + fmt(rho, 2) + ' kg/m³.' };
    });
    C.calc('scale-calc', 'Expansion since emission', 1, r => {
      const z = r.pick([1, 2, 3, 6, 9, 20]), f = 1 + z;
      const o = nums(f, '', 3, [z, f * f, f / 2], x => x + ' times');
      return { prompt: 'Light emitted by a galaxy is observed at redshift z = ' + z + '. By what factor has the universe expanded since the light left?', right: o.right, wrong: o.wrong, explain: '1 + z = a_now/a_then = ' + f + ', so the universe is ' + f + ' times larger now.' };
    });
    C.calc('hubble-radius', 'The Hubble radius', 2, r => {
      const H = r.pick([67.4, 70, 73]), d = 299792.458 / H;
      const o = nums(d, 'Mpc', 3, [d * 3.26, d / 3.26, d * 2]);
      return { prompt: 'At what distance does the Hubble-law recession speed equal the speed of light, for H₀ = ' + H + ' km/s/Mpc?', right: o.right, wrong: o.wrong, explain: 'v = c at d = c/H₀ = 299 792 / ' + H + ' = ' + fmt(d, 3) + ' Mpc = ' + fmt(d * 3.2616 / 1000, 3) + ' billion light-years.' };
    });
  };
});

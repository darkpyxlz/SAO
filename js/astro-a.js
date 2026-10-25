/* Olympiad Academy, part A: Sky & time, Orbital mechanics, Telescopes & optics. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.AstroA = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  return function (A) {
    const { nums, fmt, P } = A;
    const mn = v => String(v).replace('-', '−');
    const sgn = (v, d) => (v < 0 ? '−' : v > 0 ? '+' : '') + Math.abs(v).toFixed(d || 0);
    const hm = mins => { const s = mins < 0 ? '−' : '+', a = Math.abs(Math.round(mins)); return s + Math.floor(a / 60) + 'h ' + String(a % 60).padStart(2, '0') + 'm'; };
    const wrap12 = m => { m = ((m % 1440) + 1440) % 1440; return m > 720 ? m - 1440 : m; };
    const clock = m => { m = ((Math.round(m) % 1440) + 1440) % 1440; return String(Math.floor(m / 60)).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0'); };

    // =============================================================================================== Sky & time
    const S = A.topic('sphere');
    S.sheet([
      ['Altitude of the celestial pole', 'altitude of the pole = latitude φ'],
      ['Greatest altitude of a star', 'h = 90° − |φ − δ|', 'at upper culmination'],
      ['Circumpolar / never rises', 'δ > 90° − φ (never sets) · δ < −(90° − φ) (never rises)', 'northern observer'],
      ['Hour angle', 'H = LST − α', 'zero on the meridian; negative = east of it'],
      ['Time and longitude', '15° of longitude = 1 hour', 'local mean time = UT + λ/15'],
      ['Synodic period', '1/S = |1/T₁ − 1/T₂|', 'sidereal periods T'],
      ['Solar noon altitude', 'h = 90° − |φ − δ☉|', 'δ☉ = ±23.4° at the solstices'],
      ['Small angles', 'θ (rad) = size / distance', '1 rad = 206 265″'],
    ]);
    S.fact('pole-alt', 'Altitude of the celestial pole', 1, [
      ['The altitude of the celestial pole above the horizon equals the observer’s…', 'latitude', ['longitude', '90° minus the latitude', 'local sidereal time']],
      ['An observer sees the north celestial pole 35° above the horizon. Their latitude is…', '35° N', ['55° N', '35° S', '55° S']],
      ['What does an observer on the equator see of the celestial poles?', 'Both lie on the horizon, due north and due south', ['Both are at the zenith', 'The north pole is 45° up', 'They are below the horizon']],
      ['Where is the north celestial pole as seen from the Earth’s north pole?', 'At the zenith', ['On the horizon', '45° above the northern horizon', 'It cannot be seen']],
    ], 'The celestial pole’s altitude equals the observer’s latitude: 0° (on the horizon) at the equator, 90° (the zenith) at the pole.');
    S.fact('circumpolar', 'Circumpolar stars', 2, [
      ['At latitude 40° N, a star never sets if its declination is greater than…', '+50°', ['+40°', '+10°', '0°']],
      ['At latitude 40° N, stars south of which declination never rise?', '−50°', ['−40°', '−10°', '−90°']],
      ['At latitude 25° S, which stars are circumpolar?', 'Those with declination south of −65°', ['Those south of −25°', 'Those north of +65°', 'Those north of +25°']],
    ], 'A star is circumpolar when its declination is within 90° − |φ| of the elevated pole; the same band around the other pole never rises.');
    S.fact('eq-coords', 'Equatorial coordinates', 1, [
      ['The two coordinates of the equatorial system are…', 'right ascension and declination', ['altitude and azimuth', 'ecliptic longitude and latitude', 'galactic longitude and latitude']],
      ['Right ascension is measured eastwards from…', 'the vernal equinox (First Point of Aries)', ['the observer’s meridian', 'the Greenwich meridian', 'the north celestial pole']],
      ['Declination runs from…', '−90° to +90°', ['0° to 360°', '0h to 24h', '0° to 90°']],
      ['Right ascension is usually given in…', 'hours, minutes and seconds (24 h = 360°)', ['degrees only', 'arcseconds only', 'magnitudes']],
    ], 'Right ascension and declination are the sky’s longitude and latitude, fixed to the stars: α from the vernal equinox (0h to 24h), δ from the celestial equator (−90° to +90°).');
    S.fact('altaz', 'Horizon system', 1, [
      ['Which coordinates of a star change through the night for an observer who stays in one place?', 'Altitude and azimuth', ['Right ascension and declination', 'Ecliptic longitude and latitude', 'Galactic longitude and latitude']],
      ['The point on the celestial sphere directly above the observer is the…', 'zenith', ['nadir', 'meridian', 'vernal equinox']],
      ['The observer’s meridian is the great circle through…', 'the zenith and both celestial poles', ['the zenith and the ecliptic poles', 'the Sun and the Moon', 'the east and west points of the horizon']],
      ['The altitude of the zenith is…', '90°', ['0°', '45°', '180°']],
    ], 'Altitude and azimuth are measured from the observer’s horizon, so they change as the sky turns; α and δ stay fixed to the stars. The meridian runs through the zenith and the celestial poles.');
    S.fact('sidereal-day', 'Sidereal day', 1, [
      ['A sidereal day (one turn of the Earth relative to the stars) lasts about…', '23 h 56 min', ['24 h 00 min', '24 h 04 min', '27.3 days']],
      ['Why is the sidereal day shorter than the solar day?', 'The Earth also moves along its orbit, so it must turn about 1° further for the Sun to return to the meridian', ['Earth’s rotation speeds up in winter', 'The Moon drags the Earth along', 'Precession shortens it']],
      ['A given star crosses the meridian about… earlier each night', '4 minutes', ['1 minute', '15 minutes', '1 hour']],
    ], 'One rotation relative to the stars takes 23 h 56 min 4 s; because Earth moves ~1° along its orbit each day, the Sun needs 3 min 56 s longer, giving the 24 h solar day. Stars therefore rise ~4 min earlier each night (about 2 h per month).');
    S.fact('obliquity', 'Axial tilt', 1, [
      ['The tilt (obliquity) of the Earth’s axis is about…', '23.4°', ['5.1°', '66.6°', '90°']],
      ['The Sun’s declination at the June solstice is…', '+23.4°', ['0°', '−23.4°', '+66.6°']],
      ['The Tropic of Cancer lies at latitude…', '23.4° N', ['66.6° N', '23.4° S', '45° N']],
    ], 'The Earth’s axis is tilted 23.4° from the perpendicular to its orbit. The Sun therefore swings between declination +23.4° (June) and −23.4° (December).');
    S.fact('seasons', 'Cause of the seasons', 1, [
      ['What causes the seasons?', 'The tilt of the Earth’s axis relative to its orbit', ['The Earth’s changing distance from the Sun', 'Changes in the Sun’s brightness', 'The Moon’s gravity']],
      ['The Earth is closest to the Sun (perihelion) in…', 'early January', ['late June', 'March', 'September']],
      ['When it is summer in the northern hemisphere, the Earth is…', 'near aphelion, with the north pole tilted towards the Sun', ['at perihelion', 'tilted away from the Sun', 'at an equinox']],
    ], 'Seasons come from the axial tilt (the Sun is higher and days longer in the summer hemisphere), not from distance: Earth is nearest the Sun (0.983 AU) in early January and farthest (1.017 AU) in early July.');
    S.fact('dates', 'Solstices and equinoxes', 1, [
      ['The December solstice (northern winter solstice) falls about…', '21 December', ['21 March', '21 June', '23 September']],
      ['On the March equinox the Sun’s declination is…', '0°, and increasing', ['+23.4°', '−23.4°', '0°, and decreasing']],
      ['At an equinox the Sun rises…', 'due east and sets due west (anywhere except the poles)', ['at its northernmost point', 'due north', 'at midnight']],
      ['Day and night are about equal at…', 'the equinoxes', ['the solstices', 'perihelion', 'new Moon']],
    ], 'Equinoxes (about 20 March and 22 September) are when the Sun crosses the celestial equator; solstices (about 21 June and 21 December) when it reaches its extreme declinations ±23.4°.');
    S.fact('arctic', 'Polar circles', 2, [
      ['The Arctic Circle lies at latitude…', '66.6° N', ['23.4° N', '45° N', '90° N']],
      ['North of the Arctic Circle, the Sun stays above the horizon all day…', 'at least once a year (the midnight sun)', ['never', 'every day', 'only at the equinoxes']],
      ['At the north pole the Sun is above the horizon for about…', 'six months of the year', ['all year', 'three months', 'twelve hours at a time']],
    ], 'The polar circles lie at 90° minus the axial tilt = 66.6°. Poleward of them the Sun does not set around the summer solstice (and does not rise around the winter one).');
    S.fact('precession', 'Precession of the equinoxes', 2, [
      ['The precession of the Earth’s axis has a period of about…', '26 000 years', ['26 years', '2 600 years', '260 000 years']],
      ['Around the year 14 000, which bright star will lie near the north celestial pole?', 'Vega', ['Sirius', 'Betelgeuse', 'Arcturus']],
      ['Precession is caused by…', 'the gravity of the Sun and Moon pulling on Earth’s equatorial bulge', ['the Earth’s orbital eccentricity', 'the Moon’s orbital inclination', 'the solar wind']],
      ['Because of precession, the vernal equinox moves…', 'westwards along the ecliptic, about 50″ per year', ['eastwards, 50″ per year', 'westwards, 1° per year', 'not at all']],
    ], 'Torques on the equatorial bulge make the axis trace a cone every ~25 800 years; the equinoxes slide westwards by ~50″ per year, so pole stars change (Thuban ~2700 BC, Polaris now, Vega ~AD 14 000).');
    S.figs({
      prefix: 'phase', tier: 1, group: 'Moon phases', ask: 'Which phase of the Moon is shown? (northern-hemisphere view)', askName: n => 'Which picture shows the ' + n + '? (northern-hemisphere view)',
      items: [
        { id: 'new', name: 'New Moon', fig: 'moon.phase#0', note: 'New Moon: the Moon is between Earth and Sun and its night side faces us. It rises and sets with the Sun, and solar eclipses happen only at this phase.' },
        { id: 'wax-cres', name: 'Waxing crescent', fig: 'moon.phase#1', note: 'Waxing crescent: a growing sliver, lit on the right in the northern hemisphere, seen low in the west after sunset.' },
        { id: 'first', name: 'First quarter', fig: 'moon.phase#2', note: 'First quarter: half the disc is lit (the right half from the north), the Moon is 90° east of the Sun, rises near noon and is highest at sunset.' },
        { id: 'wax-gib', name: 'Waxing gibbous', fig: 'moon.phase#3', note: 'Waxing gibbous: more than half lit and growing towards full; visible in the evening and early night.' },
        { id: 'full', name: 'Full Moon', fig: 'moon.phase#4', note: 'Full Moon: opposite the Sun, it rises at sunset and sets at sunrise. Lunar eclipses happen only at this phase.' },
        { id: 'wan-gib', name: 'Waning gibbous', fig: 'moon.phase#5', note: 'Waning gibbous: more than half lit and shrinking (lit on the left from the north); rises late in the evening.' },
        { id: 'last', name: 'Last quarter', fig: 'moon.phase#6', note: 'Last (third) quarter: the left half is lit from the north; the Moon rises around midnight and is highest at sunrise.' },
        { id: 'wan-cres', name: 'Waning crescent', fig: 'moon.phase#7', note: 'Waning crescent: a thin sliver lit on the left, seen low in the east before sunrise.' },
      ],
    });
    S.fact('moon-times', 'When the Moon is up', 2, [
      ['A first-quarter Moon is highest in the sky at about…', 'sunset', ['midnight', 'noon', 'sunrise']],
      ['The full Moon rises around…', 'sunset', ['midnight', 'sunrise', 'noon']],
      ['A last-quarter Moon is highest in the sky at about…', 'sunrise', ['sunset', 'midnight', 'noon']],
      ['A thin waning crescent is best seen…', 'low in the east before sunrise', ['low in the west after sunset', 'overhead at midnight', 'at noon']],
    ], 'The Moon’s elongation from the Sun sets the time it is up: it lags the Sun by about 50 minutes more each day. New: with the Sun; first quarter: 90° east, transits at sunset; full: 180°, rises at sunset; last quarter: 90° west, transits at sunrise.');
    S.fact('month', 'Month lengths', 2, [
      ['The synodic month (new Moon to new Moon) lasts about…', '29.5 days', ['27.3 days', '30.4 days', '365 days']],
      ['The sidereal month (the Moon’s orbit relative to the stars) lasts about…', '27.3 days', ['29.5 days', '28.0 days', '24 h 50 min']],
      ['Why is the synodic month longer than the sidereal month?', 'The Earth–Moon system moves around the Sun, so the Moon must travel further to catch up with the Sun’s direction', ['The Moon’s orbit is slowing', 'Phases follow the tides', 'The Moon’s orbit is elliptical']],
    ], 'In 27.32 d the Moon returns to the same place among the stars, but the Sun has moved ~27° on, so it needs ~2.2 d more to reach the same phase: 29.53 d.');
    S.fact('eclipse', 'Eclipses', 2, [
      ['Why is there not a solar eclipse at every new Moon?', 'The Moon’s orbit is tilted about 5° to the ecliptic, so its shadow usually misses the Earth', ['The Moon is too small', 'The Earth’s shadow gets in the way', 'Eclipses only occur in summer']],
      ['A lunar eclipse can occur only at…', 'full Moon', ['new Moon', 'first quarter', 'any phase']],
      ['A solar eclipse can occur only at…', 'new Moon', ['full Moon', 'last quarter', 'any phase']],
      ['Total solar eclipses are possible because…', 'the Sun and Moon have almost the same angular size (about 0.5°)', ['the Moon is much larger than the Sun', 'the Sun is much closer than the Moon', 'the Moon gives off no light']],
      ['An annular eclipse happens when the Moon is…', 'too far from Earth to cover the whole Sun', ['inside Earth’s umbra', 'at the ascending node only', 'at first quarter']],
    ], 'Eclipses need the Sun, Earth and Moon in line, which only happens when new or full Moon occurs close to a node of the Moon’s orbit (inclined 5.1°). The Sun is ~400 times wider and ~400 times farther than the Moon.');
    S.fact('saros', 'Saros cycle', 3, [
      ['The saros eclipse cycle lasts about…', '18 years 11 days (6585 days)', ['19 years (Metonic cycle)', '1 year', '29.5 days']],
      ['After one saros, a solar eclipse recurs, shifted about… in longitude', '120° (one third of the way round)', ['0°, same place', '60°', '90°']],
    ], '223 synodic months ≈ 242 draconitic months ≈ 239 anomalistic months ≈ 6585.3 d: the Sun, Moon and node return to nearly the same geometry. The extra 8 hours shift the next eclipse 120° west.');
    S.fact('elong', 'Planetary configurations', 2, [
      ['Which planets can never be seen at opposition?', 'Mercury and Venus', ['Mars and Jupiter', 'Uranus and Neptune', 'Only Mercury']],
      ['The greatest elongation of Venus from the Sun is about…', '47°', ['28°', '90°', '180°']],
      ['The greatest elongation of Mercury from the Sun is at most about…', '28°', ['47°', '90°', '10°']],
      ['A superior planet at opposition is…', 'opposite the Sun in the sky, at its closest to Earth and visible all night', ['behind the Sun', 'at greatest eastern elongation', 'at the same longitude as the Sun']],
      ['At inferior conjunction, Venus is…', 'between the Earth and the Sun', ['behind the Sun', 'at greatest elongation', 'opposite the Sun']],
    ], 'Inner planets stay within a fixed angle of the Sun (Mercury ≤ 28°, Venus ≤ 47°) and show phases; outer planets can be at opposition (elongation 180°) or quadrature.');
    S.fact('retro', 'Retrograde motion', 2, [
      ['Mars appears to move backwards (retrograde) among the stars around…', 'opposition, when the Earth overtakes it', ['conjunction with the Sun', 'perihelion', 'greatest elongation']],
      ['Retrograde loops are evidence that…', 'we observe from a moving planet; they follow naturally from the heliocentric model', ['planets sometimes reverse direction', 'planets move on epicycles', 'the Earth is at rest']],
    ], 'Near opposition the faster, inner Earth passes the slower Mars, so Mars seems to loop backwards against the stars for a couple of months.');
    S.fact('refraction', 'Atmospheric refraction', 2, [
      ['Atmospheric refraction lifts an object at the horizon by about…', '0.5° (34′)', ['5°', '0.05°', '2°']],
      ['As a result, when the Sun’s lower edge appears to touch the horizon, the Sun is actually…', 'already below the horizon', ['exactly on the horizon', 'a few degrees above it', 'at the zenith']],
      ['Near the horizon, the Sun and Moon look flattened because…', 'refraction lifts their lower edge more than their upper edge', ['of the Earth’s shadow', 'light travels more slowly', 'of the Moon illusion']],
    ], 'Refraction bends light downwards through the thickening air so objects look higher, by ~34′ at the horizon (about a solar diameter) and much less at higher altitude.');
    S.fact('time', 'Time and longitude', 2, [
      ['Local mean solar time changes by one hour for every… of longitude', '15°', ['1°', '10°', '60°']],
      ['Universal Time (UT) is the mean solar time at…', 'the Greenwich meridian', ['the equator', 'the international date line', 'the observer’s meridian']],
      ['The equation of time (apparent minus mean solar time) reaches up to about…', '±16 minutes', ['±1 minute', '±2 hours', '±4 seconds']],
      ['The equation of time arises because…', 'Earth’s orbit is elliptical and its axis is tilted', ['of the Moon’s pull', 'time zones are irregular', 'the Earth’s rotation is not uniform']],
    ], 'The Sun moves 360° in 24 h = 15° per hour. Apparent solar time differs from mean time by the equation of time, up to about −14 min (February) and +16 min (November).');
    S.fact('ecliptic', 'The ecliptic', 1, [
      ['The ecliptic is…', 'the apparent annual path of the Sun against the stars', ['the celestial equator', 'the plane of the Milky Way', 'the Moon’s path only']],
      ['The ecliptic is inclined to the celestial equator by…', '23.4°', ['5.1°', '66.6°', '90°']],
      ['The Sun crosses the celestial equator going north at the…', 'March (vernal) equinox', ['June solstice', 'September equinox', 'December solstice']],
      ['The planets and the Moon always appear close to the…', 'ecliptic', ['celestial equator', 'galactic plane', 'celestial poles']],
    ], 'The ecliptic is the plane of Earth’s orbit projected on the sky. The Sun, Moon and planets stay near it because the Solar System is nearly flat (the Moon within 5°).');
    S.fact('zodiac', 'Zodiac constellations', 1, [
      ['Which of these constellations does the ecliptic pass through?', 'Ophiuchus', ['Ursa Major', 'Cassiopeia', 'Crux']],
      ['How many constellations does the Sun pass through along the ecliptic?', '13', ['12', '10', '88']],
      ['In which constellation is the Sun at the December solstice?', 'Sagittarius', ['Capricornus', 'Cancer', 'Taurus']],
    ], 'The ecliptic runs through 13 constellations, including Ophiuchus. Because of precession the December solstice now falls in Sagittarius (not Capricornus) and the June solstice on the Taurus–Gemini border (not in Cancer), although the tropics keep their old names.');
    S.fact('lst', 'Sidereal time', 2, [
      ['Local sidereal time equals the right ascension of…', 'stars currently on the local meridian', ['the Sun', 'the vernal equinox', 'the zenith’s ecliptic longitude']],
      ['A star culminates (crosses the meridian) when the local sidereal time equals its…', 'right ascension', ['declination', 'azimuth', 'altitude']],
      ['The hour angle of a star on the meridian is…', '0', ['6 h', '12 h', 'equal to its declination']],
      ['An hour angle of +3 h means the star is…', '3 hours past the meridian, in the west', ['3 hours before the meridian, in the east', 'on the horizon', 'at the zenith']],
    ], 'Hour angle = LST − α. Stars with H = 0 are on the meridian; positive H means west of it (already culminated), negative H east of it.');
    S.fact('twilight', 'Twilight', 2, [
      ['Astronomical twilight ends when the Sun is… below the horizon', '18°', ['6°', '12°', '0.8°']],
      ['Civil twilight is the time when the Sun’s centre is between 0° and… below the horizon', '6°', ['12°', '18°', '1°']],
      ['Nautical twilight corresponds to the Sun being between… below the horizon', '6° and 12°', ['0° and 6°', '12° and 18°', '18° and 24°']],
    ], 'Civil twilight: Sun 0–6° below the horizon; nautical 6–12°; astronomical 12–18°. The sky is fully dark only once the Sun is more than 18° down.');
    S.fact('angsize', 'Angular size', 1, [
      ['The Sun and the Moon both have an angular diameter of about…', '0.5° (30′)', ['5°', '0.05°', '2°']],
      ['The human eye can just separate two points that are about… apart', '1 arcminute (60″)', ['1 arcsecond', '10 arcminutes', '1 degree']],
      ['One degree contains…', '3600 arcseconds', ['60 arcseconds', '360 arcseconds', '100 arcseconds']],
      ['1 radian is about…', '206 265″ (57.3°)', ['3600″', '3.14″', '180°']],
    ], 'The Sun and Moon each span about half a degree (32′ and 31′ on average). The eye’s limit is about 1′. 1 rad = 57.3° = 206 265″.');
    S.fact('calendar', 'Calendar and year', 2, [
      ['The tropical year (equinox to equinox) is about…', '365.2422 days', ['365.0000 days', '366.0000 days', '365.2564 days']],
      ['A year is a leap year in the Gregorian calendar if it is divisible by 4, except century years that are…', 'not divisible by 400', ['divisible by 400', 'divisible by 100 only', 'divisible by 3']],
      ['The Julian Date counts days since…', 'noon UT on 1 January 4713 BC', ['midnight on 1 January AD 1', 'the Big Bang', 'noon on 1 January 1900']],
      ['The astronomical epoch J2000.0 is at…', 'JD 2451545.0 (1 January 2000, 12:00)', ['JD 2400000.5', 'JD 0', 'JD 1721424.5']],
    ], 'The tropical year is 365.2422 d; the Gregorian rule gives an average 365.2425 d. Julian Dates are a continuous day count from noon on 1 January 4713 BC; J2000.0 = JD 2451545.0.');
    S.calc('culm', 'Greatest altitude of a star', 2, r => {
      let lat, dec; do { lat = r.int(-60, 60); dec = r.int(-60, 60); } while (Math.abs(lat - dec) > 80 || Math.abs(lat - dec) < 3);
      const alt = 90 - Math.abs(lat - dec);
      const o = nums(alt, '°', 3, [90 - Math.abs(lat + dec), Math.abs(lat - dec), 90 - Math.abs(dec)], undefined, [0, 90]);
      return { prompt: 'A star of declination ' + sgn(dec) + '° is observed from latitude ' + Math.abs(lat) + '° ' + (lat >= 0 ? 'N' : 'S') + '. What is its greatest altitude above the horizon?', right: o.right, wrong: o.wrong,
        explain: 'Greatest (upper-culmination) altitude h = 90° − |φ − δ| = 90° − |' + mn(lat) + '° − (' + mn(dec) + '°)| = ' + alt + '°.' };
    });
    S.calc('circum', 'Circumpolar limit', 2, r => {
      const lat = r.pick([20, 28, 33, 52, 60, 66]), sd = v => (v < 0 ? '−' : '+') + Math.abs(v) + '°';
      return { prompt: 'From latitude ' + lat + '° N, a star is circumpolar (never sets) if its declination is greater than…', right: sd(90 - lat), wrong: [sd(lat), sd(lat - 90), sd(45)],
        explain: 'Circumpolar if δ > 90° − φ = 90° − ' + lat + '° = ' + sd(90 - lat) + '.' };
    });
    S.calc('hourangle', 'Hour angle', 2, r => {
      let lst, ra, ha;
      do { lst = r.int(0, 23) * 60 + r.int(0, 11) * 5; ra = r.int(0, 23) * 60 + r.int(0, 11) * 5; ha = wrap12(lst - ra); } while (Math.abs(ha) < 30 || Math.abs(ha) > 600);
      const right = hm(ha), wrongs = [hm(-ha), hm(wrap12(lst + ra)), hm(wrap12(ha + 720))].filter(w => w !== right);
      const hmm = m => Math.floor(m / 60) + 'h ' + String(m % 60).padStart(2, '0') + 'm';
      return { prompt: 'The local sidereal time is ' + hmm(lst) + '. A star has right ascension ' + hmm(ra) + '. What is its hour angle?', right, wrong: wrongs,
        explain: 'H = LST − α = ' + hmm(lst) + ' − ' + hmm(ra) + ' = ' + right + (ha < 0 ? ': the star is east of the meridian and will culminate in ' + hm(-ha).slice(1) + '.' : ': the star has already crossed the meridian ' + hm(ha).slice(1) + ' ago.') };
    });
    S.calc('longitude', 'Longitude and time', 1, r => {
      const lon = r.int(10, 175) + r.pick([0, 0.5]), east = r.rnd() < 0.5, mins = lon * 4;
      const f = (sg, m) => 'UT ' + sg + ' ' + Math.floor(Math.round(m) / 60) + ' h ' + String(Math.round(m) % 60).padStart(2, '0') + ' min';
      const right = f(east ? '+' : '−', mins), sg = east ? '+' : '−';
      return { prompt: 'A city lies at longitude ' + lon + '° ' + (east ? 'E' : 'W') + '. Its local mean solar time is…', right,
        wrong: [f(east ? '−' : '+', mins), f(sg, lon * 6), f(sg, lon * 2.5)].filter((w, k, a) => w !== right && a.indexOf(w) === k),
        explain: 'The Earth turns 15° per hour, so ' + lon + '° = ' + (lon / 15).toFixed(2) + ' h = ' + Math.floor(Math.round(mins) / 60) + ' h ' + (Math.round(mins) % 60) + ' min. East of Greenwich the Sun is ahead (later local time), west it is behind.' };
    });
    S.calc('angsize-calc', 'Angular size from size and distance', 1, r => {
      const obj = r.pick([['the lunar crater Tycho (85 km across) seen from Earth (384 400 km)', 85, 384400], ['the planet Mars (6 779 km across) at its closest (5.5×10⁷ km)', 6779, 5.46e7], ['Jupiter (139 820 km across) at opposition (6.29×10⁸ km)', 139820, 6.29e8], ['the Sun (1.392×10⁶ km across) from Earth (1.496×10⁸ km)', 1.392e6, 1.496e8], ['Venus (12 104 km across) at inferior conjunction (4.1×10⁷ km)', 12104, 4.1e7]]);
      const sec = obj[1] / obj[2] * 206265, big = sec > 150;
      const val = big ? sec / 60 : sec, unit = big ? '′' : '″';
      const o = nums(val, unit, 3, [val * 2, val / 2, val * Math.PI]);
      return { prompt: 'What is the angular diameter of ' + obj[0] + '?', right: o.right, wrong: o.wrong,
        explain: 'θ ≈ size / distance = ' + fmt(obj[1], 4) + ' / ' + fmt(obj[2], 4) + ' = ' + fmt(obj[1] / obj[2], 3) + ' rad × 206 265″ = ' + fmt(sec, 3) + '″' + (big ? ' = ' + fmt(val, 3) + '′' : '') + '.' };
    });
    S.calc('synodic', 'Synodic period', 2, r => {
      const pl = r.pick([['Mercury', 87.97], ['Venus', 224.70], ['Mars', 686.98], ['Jupiter', 4332.6], ['Saturn', 10759]]);
      const T = pl[1], E = 365.256, syn = P.synodic(T, E);
      const o = nums(syn, 'days', 3, [E * T / (E + T), Math.abs(T - E), T]);
      return { prompt: 'The sidereal orbital period of ' + pl[0] + ' is ' + pl[1] + ' days. How long between successive ' + (pl[1] < E ? 'inferior conjunctions' : 'oppositions') + ' as seen from Earth (synodic period)?', right: o.right, wrong: o.wrong,
        explain: '1/S = |1/T₁ − 1/T₂| = |1/' + pl[1] + ' − 1/365.26|, so S = ' + fmt(syn, 3) + ' days.' };
    });
    S.calc('rise-drift', 'Star rising times', 2, r => {
      const t0 = r.int(18 * 60, 23 * 60 + 59), n = r.pick([10, 15, 20, 30, 45, 61]), d = n * 3.9426;
      const right = clock(t0 - d);
      const wrongs = [clock(t0 + d), clock(t0 - n), clock(t0 - n * 4 / 2)].filter(w => w !== right);
      return { prompt: 'A star rises at ' + clock(t0) + ' tonight. At what time will it rise ' + n + ' nights later?', right, wrong: wrongs,
        explain: 'A star rises 3 min 56 s (3.94 min) earlier each night: ' + n + ' × 3.94 min = ' + Math.round(d) + ' min earlier, so ' + right + '.' };
    });
    S.calc('sunnoon', 'Midday altitude of the Sun', 2, r => {
      const lat = r.int(-60, 60), date = r.pick([['at the March equinox', 0], ['at the June solstice', 23.44], ['at the December solstice', -23.44]]);
      const dec = date[1], alt = 90 - Math.abs(lat - dec);
      const o = nums(alt, '°', 3, [90 - Math.abs(lat + dec), 90 - Math.abs(lat), 90 - Math.abs(lat - dec) + 23.44], undefined, [0, 90]);
      return { prompt: 'What is the altitude of the Sun at local noon ' + date[0] + ' for an observer at latitude ' + Math.abs(lat) + '° ' + (lat >= 0 ? 'N' : 'S') + '?', right: o.right, wrong: o.wrong,
        explain: 'h = 90° − |φ − δ☉| = 90° − |' + mn(lat) + '° − (' + mn(dec) + '°)| = ' + fmt(alt, 3) + '°.' };
    });

    // =============================================================================================== Orbital mechanics
    const O = A.topic('orbits');
    O.sheet([
      ['Kepler III (Sun, solar units)', 'T² = a³', 'T in years, a in AU'],
      ['Kepler III (general)', 'T² = 4π²a³ / G(M + m)', 'M₁ + M₂ = a³/P² in solar units'],
      ['Circular speed', 'v = √(GM/r)', 'Earth 29.8 km/s · ISS 7.7 km/s'],
      ['Escape speed', 'v_esc = √(2GM/r) = √2 · v_circ', 'Earth surface 11.2 km/s'],
      ['Vis-viva', 'v² = GM (2/r − 1/a)', 'any conic'],
      ['Perihelion / aphelion', 'q = a(1 − e) · Q = a(1 + e)', ''],
      ['Angular momentum', 'v_p · q = v_a · Q', 'so v_p/v_a = (1 + e)/(1 − e)'],
      ['Orbital energy per mass', 'ε = −GM / 2a', 'bound if negative'],
      ['Hohmann transfer', 'a_t = (r₁ + r₂)/2 · t = ½ T_t', 'two burns'],
      ['Rocket equation', 'Δv = v_e ln(m₀/m₁)', ''],
      ['Barycentre', 'm₁r₁ = m₂r₂', 'r₁ + r₂ = separation'],
      ['Tidal force', '∝ M / d³', 'Moon ≈ 2.2 × Sun'],
    ]);
    O.fact('kepler1', 'Kepler’s first law', 1, [
      ['Kepler’s first law says planets move on…', 'ellipses with the Sun at one focus', ['circles centred on the Sun', 'ellipses with the Sun at the centre', 'spirals around the Sun']],
      ['Where is the Sun in the ellipse of a planet’s orbit?', 'At one of the two foci', ['At the centre', 'At the end of the minor axis', 'It moves between the foci']],
    ], 'Every orbit is a conic section with the central body at one focus. The planets’ orbits are ellipses of small eccentricity (Earth 0.017).');
    O.fact('kepler2', 'Kepler’s second law', 1, [
      ['Kepler’s second law: a planet sweeps out equal … in equal times.', 'areas', ['angles', 'distances', 'arcs']],
      ['Where in its orbit does a planet move fastest?', 'At perihelion, closest to the Sun', ['At aphelion', 'At the ends of the minor axis', 'Its speed is constant']],
      ['The second law is a consequence of the conservation of…', 'angular momentum', ['energy', 'linear momentum', 'mass']],
      ['The two shaded areas are equal. Compare the times the planet takes to travel along the two shaded arcs.', 'The times are equal', ['It takes longer on the arc near the Sun', 'It takes longer on the arc far from the Sun', 'It depends on the planet’s mass'], { fig: 'orb.kepler2' }],
    ], 'The line from the Sun to the planet sweeps equal areas in equal times (dA/dt = L/2m is constant), so the planet is fastest at perihelion and slowest at aphelion.');
    O.fact('kepler3', 'Kepler’s third law', 1, [
      ['Kepler’s third law relates…', 'the orbital period and the semi-major axis: T² ∝ a³', ['period and eccentricity: T ∝ e', 'speed and mass: v² ∝ M', 'distance and brightness: d² ∝ 1/L']],
      ['A planet orbits a Sun-like star at a semi-major axis of 4 AU. Its period is…', '8 years', ['4 years', '16 years', '64 years']],
      ['If the semi-major axis of an orbit doubles, the period is multiplied by…', '2√2 ≈ 2.8', ['2', '4', '8']],
      ['For planets around the same star, T²/a³ is…', 'the same for all of them', ['proportional to the planet’s mass', 'larger for outer planets', 'smaller for outer planets']],
    ], 'T² = 4π²a³/GM: for planets of one star the ratio T²/a³ is constant. In years and AU for the Sun, T² = a³.');
    O.fact('gravity', 'Newton’s gravitation', 1, [
      ['The gravitational force between two masses is proportional to…', 'the product of the masses divided by the square of the distance', ['the sum of the masses divided by the distance', 'the product of the masses divided by the distance', 'the sum of the masses divided by the square of the distance']],
      ['If the distance between two bodies doubles, the gravitational force becomes…', '1/4', ['1/2', '1/8', '2']],
      ['The surface gravity of a spherical body of mass M and radius R is proportional to…', 'M/R²', ['M/R', 'MR', 'M²/R']],
      ['Kepler’s laws follow from an inverse-… force law', 'square', ['cube', 'linear', 'logarithmic']],
    ], 'F = GMm/r². Doubling the distance quarters the force; g = GM/R² at the surface (9.8 m/s² on Earth).');
    O.figs({
      prefix: 'conic', tier: 1, group: 'Orbit shapes', ask: 'What shape of orbit is shown (the central body is at the marked focus)?', askName: n => 'Which picture shows a ' + n + ' orbit?',
      items: [
        { id: 'circle', name: 'Circle (e = 0)', fig: 'orb.conics#circle', note: 'A circle has eccentricity 0: the foci coincide at the centre and the speed is constant, v = √(GM/r).' },
        { id: 'ellipse', name: 'Ellipse (0 < e < 1)', fig: 'orb.conics#ellipse', note: 'Bound orbits are ellipses with 0 < e < 1 and negative total energy; the central body sits at one focus.' },
        { id: 'parabola', name: 'Parabola (e = 1)', fig: 'orb.conics#parabola', note: 'e = 1: exactly escape speed, zero total energy. The body reaches infinity with zero speed.' },
        { id: 'hyperbola', name: 'Hyperbola (e > 1)', fig: 'orb.conics#hyperbola', note: 'e > 1: more than escape speed, positive total energy. The body reaches infinity with leftover speed (interstellar visitors like ʻOumuamua).' },
      ],
    });
    O.fact('ellipse', 'Parts of an ellipse', 2, [
      ['In the diagram the Sun is at the focus nearest A. Which letter marks the perihelion?', 'A', ['B', 'C', 'D'], { fig: 'orb.ellipse' }],
      ['In the diagram, at which letter does the planet move slowest?', 'B', ['A', 'C', 'D'], { fig: 'orb.ellipse' }],
      ['In the diagram, which letter marks the empty focus?', 'E', ['D', 'C', 'A'], { fig: 'orb.ellipse' }],
      ['In the diagram, which letter marks the position of the Sun?', 'D', ['E', 'C', 'B'], { fig: 'orb.ellipse' }],
      ['The semi-major axis of an ellipse is…', 'half the longest diameter, equal to the average of perihelion and aphelion distances', ['the distance from the Sun at perihelion', 'the distance between the foci', 'the average speed']],
    ], 'The Sun (D) is at one focus, the other focus (E) is empty. The nearest point (A, perihelion) is where the planet is fastest, the farthest point (B, aphelion) where it is slowest. The semi-major axis a = (q + Q)/2.');
    O.fact('elements', 'Orbital elements', 2, [
      ['Which orbital element describes how elongated an orbit is?', 'Eccentricity', ['Inclination', 'Longitude of the ascending node', 'Argument of perihelion']],
      ['The inclination of a planet’s orbit is measured between…', 'the orbital plane and the ecliptic', ['the orbit and the Sun’s equator', 'the orbit and the celestial equator', 'the major axis and the line of nodes']],
      ['The line of nodes is…', 'the intersection of the orbital plane with the reference plane', ['the major axis of the orbit', 'the line through the two foci', 'the direction to the vernal equinox']],
      ['An orbit with an inclination between 90° and 180° is…', 'retrograde', ['prograde', 'polar', 'circular']],
      ['How many numbers are needed to specify an orbit in space?', 'Six: a, e, i, Ω, ω and a time of perihelion (or mean anomaly)', ['Three', 'Four', 'Ten']],
    ], 'The six classical elements: a and e (size, shape), i (tilt), Ω (longitude of the ascending node), ω (argument of perihelion) and T₀ or M (when). Retrograde orbits have i > 90° (Halley: 162°).');
    O.fact('apsides', 'Apsides', 1, [
      ['The point of a planet’s orbit nearest the Sun is called…', 'perihelion', ['aphelion', 'perigee', 'apogee']],
      ['A satellite’s orbit is closest to the Earth at…', 'perigee', ['apogee', 'perihelion', 'periastron']],
      ['The closest approach of two stars in a binary system is called…', 'periastron', ['perigee', 'perihelion', 'aphelion']],
    ], 'Peri- means near, ap- far. The suffix names the central body: -helion for the Sun, -gee for the Earth, -astron for a star.');
    O.fact('visviva', 'Vis-viva equation', 3, [
      ['Which equation gives the speed at distance r on an orbit with semi-major axis a?', 'v² = GM(2/r − 1/a)', ['v² = GM/r', 'v² = 2GM/r', 'v² = GM(1/r − 1/a)']],
      ['What does the vis-viva equation give for a circular orbit (r = a)?', 'v² = GM/r', ['v² = 2GM/r', 'v² = GM/2r', 'v = 0']],
      ['What does the vis-viva equation give for a parabolic orbit (a → ∞)?', 'v² = 2GM/r, the escape speed', ['v² = GM/r', 'v = 0', 'v² = GM/2r']],
    ], 'Energy conservation on a Kepler orbit: ½v² − GM/r = −GM/2a, so v² = GM(2/r − 1/a). It reduces to v² = GM/r for a circle and 2GM/r for a parabola.');
    O.fact('energy', 'Orbital energy', 3, [
      ['The total orbital energy per unit mass of a bound Kepler orbit is…', '−GM/2a', ['−GM/a', '+GM/2a', '−GM/r']],
      ['The orbital energy of a bound orbit depends on…', 'the semi-major axis only', ['the eccentricity only', 'the inclination', 'the perihelion distance only']],
      ['An orbit with positive total energy is…', 'a hyperbola', ['an ellipse', 'a circle', 'a parabola']],
    ], 'ε = ½v² − GM/r = −GM/2a: it depends only on a. Negative: bound ellipse; zero: parabola; positive: hyperbola.');
    O.fact('escape', 'Escape speed', 1, [
      ['The escape speed from a body is … times the circular orbital speed at the same distance.', '√2', ['2', '1/√2', '1']],
      ['The escape speed from the Earth’s surface is about…', '11.2 km/s', ['7.9 km/s', '29.8 km/s', '3.1 km/s']],
      ['The orbital speed of a satellite just above the Earth’s surface would be about…', '7.9 km/s', ['11.2 km/s', '3.1 km/s', '29.8 km/s']],
      ['Earth’s orbital speed around the Sun is about…', '30 km/s', ['3 km/s', '300 km/s', '0.3 km/s']],
    ], 'v_esc = √(2GM/R) = √2 v_circ. For the Earth: 11.2 km/s from the surface, 7.9 km/s for a grazing circular orbit, and Earth itself moves 29.8 km/s around the Sun.');
    O.fact('geo', 'Geostationary and GPS orbits', 1, [
      ['A geostationary satellite has an orbital period of…', 'one sidereal day (23 h 56 min)', ['exactly 24 hours', '12 hours', '90 minutes']],
      ['A geostationary orbit must lie…', 'in the equatorial plane, about 35 800 km above the surface', ['over the poles, about 800 km up', 'inclined 45°, 20 000 km up', 'at the Moon’s distance']],
      ['GPS satellites orbit with a period of about…', '12 hours', ['24 hours', '90 minutes', '1 hour']],
      ['A satellite in low Earth orbit, like the ISS, circles the Earth roughly every…', '90 minutes', ['12 hours', '24 hours', '10 minutes']],
    ], 'The geostationary radius (42 164 km from Earth’s centre) follows from Kepler III with T = 23 h 56 min. GPS satellites (~20 200 km altitude) take 12 h; the ISS (~420 km) takes 92 minutes.');
    O.fact('hohmann', 'Hohmann transfer', 2, [
      ['A Hohmann transfer between two circular coplanar orbits uses an ellipse whose semi-major axis is…', 'the average of the two orbital radii', ['the larger radius', 'the sum of the radii', 'the difference of the radii']],
      ['How many engine burns does a Hohmann transfer need?', 'Two', ['One', 'Three', 'Four']],
      ['To go to a higher orbit with a Hohmann transfer, the first burn is…', 'prograde, at the lower orbit', ['retrograde, at the lower orbit', 'prograde, at the higher orbit', 'perpendicular to the orbit']],
      ['The transfer takes…', 'half the period of the transfer ellipse', ['the whole period of the transfer ellipse', 'the period of the lower orbit', 'the average of the two periods']],
      ['The dashed ellipse in the picture is a…', 'Hohmann transfer orbit', ['gravity assist', 'parabolic escape', 'geostationary orbit'], { fig: 'orb.hohmann' }],
    ], 'The cheapest two-impulse transfer touches both circles tangentially: a_t = (r₁ + r₂)/2, and the trip lasts half of T_t. Earth to Mars takes about 259 days.');
    O.fact('assist', 'Gravity assist', 2, [
      ['A gravity assist changes a spacecraft’s speed relative to the Sun because…', 'the planet is moving, so the flyby trades energy and momentum with it', ['the planet’s atmosphere pushes the craft', 'the planet’s magnetic field accelerates it', 'the craft burns less fuel nearby']],
      ['In the planet’s own frame, the speed of a spacecraft far from the planet before and after a flyby is…', 'the same (the encounter is elastic)', ['higher after', 'lower after', 'always zero']],
    ], 'Seen from the planet, the craft just changes direction. Seen from the Sun, adding the planet’s velocity gives a net change of speed — Voyager 2 gained from Jupiter, Saturn and Uranus.');
    O.figs({
      prefix: 'lagr', tier: 2, group: 'Lagrange points', ask: 'Which Lagrange point of the Sun–Earth system is marked?', askName: n => 'Which diagram marks the Sun–Earth point ' + n + '?',
      items: [
        { id: 'l1', name: 'L1', title: 'Lagrange point L1', fig: 'orb.lagrange#L1', note: 'L1: between the Sun and the Earth, about 1.5 million km sunward. Home of SOHO and other solar observatories (unstable).' },
        { id: 'l2', name: 'L2', title: 'Lagrange point L2', fig: 'orb.lagrange#L2', note: 'L2: 1.5 million km beyond the Earth, opposite the Sun. Home of JWST, Gaia and Planck (unstable, but the Sun, Earth and Moon are all on one side).' },
        { id: 'l3', name: 'L3', title: 'Lagrange point L3', fig: 'orb.lagrange#L3', note: 'L3: on the far side of the Sun, opposite the Earth (unstable and hidden from us).' },
        { id: 'l4', name: 'L4', title: 'Lagrange point L4', fig: 'orb.lagrange#L4', note: 'L4: 60° ahead of the Earth in its orbit, forming an equilateral triangle with Sun and Earth. Stable: Jupiter’s Trojan asteroids live at its L4 and L5.' },
        { id: 'l5', name: 'L5', title: 'Lagrange point L5', fig: 'orb.lagrange#L5', note: 'L5: 60° behind the Earth in its orbit. Stable for mass ratios above about 25.' },
      ],
    });
    O.gallery([
      ['orb.ellipse', 'Parts of an ellipse', 'A: perihelion (closest, fastest). B: aphelion (farthest, slowest). C: end of the minor axis. D: the Sun at one focus. E: the empty focus. The semi-major axis a is half of AB.', 'Orbits'],
      ['orb.kepler2', 'Kepler’s second law', 'The two shaded areas are equal, so they are swept in equal times: the planet moves fast near the Sun and slowly far from it.', 'Orbits'],
      ['orb.hohmann', 'Hohmann transfer', 'A half-ellipse touching both circular orbits: burn 1 at the inner orbit, burn 2 at the outer. Its semi-major axis is the average of the two radii.', 'Orbits'],
    ]);
    O.fact('lagrange', 'Lagrange points', 2, [
      ['Which Lagrange points are stable (for the Sun–Earth system)?', 'L4 and L5', ['L1 and L2', 'L1 and L3', 'L2 and L3']],
      ['The James Webb Space Telescope orbits near the Sun–Earth point…', 'L2', ['L1', 'L3', 'L4']],
      ['The Trojan asteroids of Jupiter lie…', 'at Jupiter’s L4 and L5, 60° ahead of and behind the planet', ['between Mars and Jupiter', 'at Jupiter’s L1', 'in the Kuiper belt']],
      ['The points L1, L2 and L3 lie…', 'on the line through the two main bodies', ['at 60° to that line', 'on the orbit of the smaller body only', 'inside the larger body']],
      ['L4 and L5 are stable only if the mass ratio of the two main bodies exceeds about…', '25', ['2', '100', '1000']],
    ], 'In the restricted three-body problem the five equilibrium points are L1–L3 (collinear, unstable) and L4–L5 (equilateral triangles, stable if M₁/M₂ > 24.96).');
    O.fact('roche', 'Roche limit and Hill sphere', 2, [
      ['A moon held together only by its own gravity that comes closer to its planet than the Roche limit will be…', 'torn apart by tides', ['crushed into a sphere', 'pushed outwards', 'spun into a binary']],
      ['Planetary rings lie mainly…', 'inside the Roche limit', ['outside the Roche limit', 'at the Lagrange points', 'beyond the Hill sphere']],
      ['The Hill sphere of a planet is the region in which…', 'its gravity dominates over the Sun’s, so moons can orbit stably', ['its magnetic field is strong', 'it can retain an atmosphere', 'tides destroy satellites']],
    ], 'Inside the Roche limit (about 2.4 R(ρ_planet/ρ_moon)^⅓) tides exceed a loose body’s self-gravity. The Hill radius a(m/3M)^⅓ bounds the region where satellites can stay bound.');
    O.fact('tidal-lock', 'Tidal locking and resonance', 2, [
      ['The Moon always shows the same face to the Earth because…', 'its rotation period equals its orbital period (tidal locking)', ['it does not rotate', 'Earth’s magnetic field holds it', 'its orbit is a perfect circle']],
      ['Mercury’s spin–orbit resonance is…', '3:2 (three rotations per two orbits)', ['1:1', '2:1', '5:2']],
      ['Pluto and Neptune are in the orbital resonance…', '3:2 (Pluto orbits twice while Neptune orbits three times)', ['1:1', '2:1', '5:3']],
      ['Io, Europa and Ganymede are locked in the orbital resonance…', '1 : 2 : 4', ['1 : 1 : 1', '1 : 3 : 9', '2 : 3 : 5']],
    ], 'Tidal friction slows a moon’s spin until it matches its orbit. Resonances such as Mercury 3:2, Pluto–Neptune 3:2 and the Laplace resonance of Io–Europa–Ganymede (1:2:4) keep orbits stable.');
    O.fact('tides', 'Tides', 2, [
      ['Tidal force varies with distance d as…', '1/d³', ['1/d²', '1/d', '1/d⁴']],
      ['Spring tides (the largest range) occur at…', 'new Moon and full Moon', ['first and last quarter', 'the equinoxes only', 'perigee only']],
      ['Neap tides (the smallest range) occur at…', 'first and last quarter', ['new and full Moon', 'the solstices', 'apogee only']],
      ['Which has the greater tidal effect on the Earth?', 'The Moon, about 2.2 times more than the Sun', ['The Sun, about 2.2 times more', 'They are equal', 'The Sun, about 100 times more']],
      ['How many high tides does a coastline typically see in a lunar day?', 'Two', ['One', 'Four', 'Three']],
    ], 'The tidal acceleration ∝ M/d³ makes the Moon (7.3×10²² kg at 384 000 km) about 2.2 times stronger than the Sun. Sun and Moon line up at new/full Moon (springs) and are at right angles at the quarters (neaps).');
    O.fact('binary-bary', 'Two-body motion', 2, [
      ['In a two-body system both bodies orbit…', 'their common centre of mass (barycentre)', ['the more massive body’s centre', 'the geometric midpoint', 'the nearest focus of each other’s orbit']],
      ['In a binary, the more massive body moves in an orbit that is…', 'smaller', ['larger', 'the same size', 'unrelated to the mass']],
      ['The ratio of the distances of two stars from their barycentre is…', 'the inverse ratio of their masses', ['the ratio of their masses', 'the ratio of their luminosities', 'always 1']],
    ], 'm₁r₁ = m₂r₂ about the centre of mass, so the heavier body is closer to it; both have the same period, and a₁ + a₂ = a with M₁ + M₂ = a³/P² (solar units).');
    O.fact('mercury', 'Perihelion precession', 3, [
      ['The unexplained 43″ per century advance of Mercury’s perihelion was explained by…', 'general relativity', ['an undiscovered planet (Vulcan)', 'Jupiter’s gravity', 'the Sun’s oblateness alone']],
    ], 'Newtonian perturbations by the other planets account for 532″ per century; the remaining 43″ is the relativistic effect of the Sun’s curvature of space-time (Einstein, 1915).');
    O.fact('weightless', 'Weightlessness', 1, [
      ['Astronauts in orbit feel weightless because…', 'they and the spacecraft are in free fall around the Earth', ['there is no gravity at that height', 'the spacecraft shields them from gravity', 'centrifugal force cancels the Sun’s gravity']],
      ['At the ISS’s altitude (about 400 km), gravity is about … of its value at the surface', '90%', ['0%', '50%', '10%']],
    ], 'Gravity at 400 km is still ~89% of its surface value. Astronauts feel weightless because everything falls together: orbiting is falling around the Earth.');
    O.fact('circular-v', 'Orbital speed and radius', 1, [
      ['For circular orbits around the same star, orbital speed v is proportional to…', 'r^(−1/2)', ['r^(1/2)', 'r^(−1)', 'r^(−3/2)']],
      ['Which planet moves fastest in its orbit?', 'Mercury', ['Earth', 'Jupiter', 'Neptune']],
      ['If the orbital radius of a circular orbit is quadrupled, the orbital period is multiplied by…', '8', ['4', '2', '16']],
    ], 'v = √(GM/r) decreases outwards (Mercury 47 km/s, Earth 30, Jupiter 13, Neptune 5.4), while T ∝ r^(3/2): quadrupling r multiplies T by 4^(3/2) = 8.');
    O.calc('kepler3-calc', 'Kepler III in numbers', 1, r => {
      const obj = r.pick([['asteroid Ceres', 2.77], ['asteroid Vesta', 2.36], ['comet Encke', 2.22], ['Halley’s comet', 17.8], ['Pluto', 39.5], ['Eris', 67.7], ['Sedna', 506], ['Neptune', 30.1], ['Jupiter', 5.20]]);
      const a = obj[1], T = P.keplerT(a);
      if (r.rnd() < 0.5) {
        const o = nums(T, 'years', 3, [a * a, a * a * a, Math.sqrt(a)]);
        return { prompt: 'The semi-major axis of ' + obj[0] + ' is ' + a + ' AU. Its orbital period is…', right: o.right, wrong: o.wrong, explain: 'T² = a³ (years, AU): T = ' + a + '^1.5 = ' + fmt(T, 3) + ' years.' };
      }
      const o = nums(a, 'AU', 3, [T * T, T * T * T, T / 2]);
      return { prompt: 'The orbital period of ' + obj[0] + ' is ' + fmt(T, 3) + ' years. Its semi-major axis is…', right: o.right, wrong: o.wrong, explain: 'a³ = T²: a = ' + fmt(T, 3) + '^(2/3) = ' + a + ' AU.' };
    });
    O.calc('vcirc-calc', 'Circular orbital speed', 2, r => {
      const sat = r.pick([['the ISS', 420], ['a Sun-synchronous satellite', 800], ['a GPS satellite', 20200], ['a geostationary satellite', 35786], ['a satellite at 2 000 km altitude', 2000]]);
      const rad = P.Rearth + sat[1] * 1e3, v = P.vcirc(P.Mearth, rad) / 1e3;
      const o = nums(v, 'km/s', 3, [P.vcirc(P.Mearth, sat[1] * 1e3) / 1e3, v * Math.SQRT2, P.vcirc(P.Mearth, P.Rearth) / 1e3]);
      return { prompt: 'Earth has mass 5.97×10²⁴ kg and radius 6 378 km. What is the circular orbital speed of ' + sat[0] + ', at an altitude of ' + sat[1] + ' km?', right: o.right, wrong: o.wrong,
        explain: 'v = √(GM/r) with r measured from the Earth’s centre: r = 6378 + ' + sat[1] + ' = ' + (6378 + sat[1]) + ' km, so v = ' + fmt(v, 3) + ' km/s.' };
    });
    O.calc('vesc-calc', 'Escape speed', 2, r => {
      const b = r.pick([['the Moon', 7.342e22, 1.7374e6], ['Mars', 6.417e23, 3.3895e6], ['Venus', 4.867e24, 6.0518e6], ['Jupiter', 1.8982e27, 6.9911e7], ['Ceres', 9.38e20, 4.73e5], ['the Sun', 1.98847e30, 6.957e8]]);
      const v = P.vesc(b[1], b[2]) / 1e3;
      const o = nums(v, 'km/s', 3, [v / Math.SQRT2, v * Math.SQRT2]);
      return { prompt: 'The mass of ' + b[0] + ' is ' + fmt(b[1], 3) + ' kg and its radius is ' + fmt(b[2] / 1e3, 4) + ' km. What is the escape speed from its surface?', right: o.right, wrong: o.wrong,
        explain: 'v_esc = √(2GM/R) = ' + fmt(v, 3) + ' km/s (the circular speed at the surface would be ' + fmt(v / Math.SQRT2, 3) + ' km/s).' };
    });
    O.calc('visviva-calc', 'Speed at perihelion or aphelion', 3, r => {
      const b = r.pick([['Halley’s comet', 17.8, 0.967], ['Comet 67P', 3.46, 0.64], ['Pluto', 39.48, 0.2488], ['Mercury', 0.387, 0.2056], ['the asteroid Icarus', 1.078, 0.827]]);
      const a = b[1], e = b[2], peri = r.rnd() < 0.5, d = a * (peri ? 1 - e : 1 + e);
      const v = P.visviva(P.Msun, d * P.AU, a * P.AU) / 1e3, vc = P.vcirc(P.Msun, d * P.AU) / 1e3, v2 = P.visviva(P.Msun, a * (peri ? 1 + e : 1 - e) * P.AU, a * P.AU) / 1e3;
      const o = nums(v, 'km/s', 3, [v2, vc, vc * Math.SQRT2]);
      return { prompt: b[0].charAt(0).toUpperCase() + b[0].slice(1) + ' has a semi-major axis of ' + a + ' AU and eccentricity ' + e + '. How fast does it move at ' + (peri ? 'perihelion' : 'aphelion') + '?', right: o.right, wrong: o.wrong,
        explain: (peri ? 'q = a(1 − e)' : 'Q = a(1 + e)') + ' = ' + fmt(d, 3) + ' AU. Vis-viva: v² = GM☉(2/r − 1/a) gives v = ' + fmt(v, 3) + ' km/s (the opposite apsis gives ' + fmt(v2, 3) + ' km/s).' };
    });
    O.calc('apsis', 'Perihelion and aphelion distances', 1, r => {
      const b = r.pick([['Halley’s comet', 17.8, 0.967], ['Mars', 1.524, 0.0934], ['Mercury', 0.387, 0.2056], ['Pluto', 39.48, 0.2488], ['Comet 67P', 3.46, 0.64], ['Jupiter', 5.203, 0.0489]]);
      const a = b[1], e = b[2], peri = r.rnd() < 0.5, d = a * (peri ? 1 - e : 1 + e);
      const o = nums(d, 'AU', 3, [a * (peri ? 1 + e : 1 - e), a * e, a / (peri ? 1 - e : 1 + e)]);
      return { prompt: b[0] + ' has a semi-major axis of ' + a + ' AU and eccentricity ' + e + '. Its ' + (peri ? 'perihelion' : 'aphelion') + ' distance is…', right: o.right, wrong: o.wrong,
        explain: (peri ? 'q = a(1 − e) = ' : 'Q = a(1 + e) = ') + a + ' × ' + (peri ? 1 - e : 1 + e).toFixed(4) + ' = ' + fmt(d, 3) + ' AU.' };
    });
    O.calc('hohmann-calc', 'Hohmann transfer time', 2, r => {
      const b = r.pick([['Venus', 0.723], ['Mars', 1.524], ['Jupiter', 5.203], ['Saturn', 9.58], ['Uranus', 19.2], ['Neptune', 30.1]]);
      const t = P.hohmann(1, b[1]), days = t < 2;
      const val = days ? t * 365.25 : t, unit = days ? 'days' : 'years';
      const wrongTotal = days ? 2 * t * 365.25 : 2 * t, wrongR = days ? 0.5 * Math.pow(b[1], 1.5) * 365.25 : 0.5 * Math.pow(b[1], 1.5);
      const o = nums(val, unit, 3, [wrongTotal, wrongR, days ? Math.pow(b[1], 1.5) * 365.25 : Math.pow(b[1], 1.5)]);
      return { prompt: 'How long does a Hohmann transfer from Earth’s orbit (1 AU) to the orbit of ' + b[0] + ' (' + b[1] + ' AU) take?', right: o.right, wrong: o.wrong,
        explain: 'The transfer ellipse has a = (1 + ' + b[1] + ')/2 = ' + fmt((1 + b[1]) / 2, 3) + ' AU, so T = a^1.5 = ' + fmt(Math.pow((1 + b[1]) / 2, 1.5), 3) + ' yr and the trip takes half of it: ' + fmt(val, 3) + ' ' + unit + '.' };
    });
    O.calc('angmom', 'Speeds at the apsides', 2, r => {
      const q = r.pick([0.3, 0.4, 0.5, 0.6, 0.8]), Q = r.pick([5, 8, 10, 20, 40]), k = Q / q;
      const o = nums(k, '', 3, [Math.sqrt(k), k * k, Q - q], x => x);
      return { prompt: 'A comet has perihelion distance ' + q + ' AU and aphelion distance ' + Q + ' AU. How many times faster does it move at perihelion than at aphelion?', right: o.right, wrong: o.wrong,
        explain: 'Angular momentum conservation: v_p·q = v_a·Q, so v_p/v_a = Q/q = ' + Q + '/' + q + ' = ' + fmt(k, 3) + '.' };
    });
    O.calc('satperiod', 'Period of a low orbit', 2, r => {
      const h = r.pick([300, 400, 600, 800, 1200, 2000]), rad = P.Rearth + h * 1e3;
      const T = P.period(rad, P.Mearth) / 60;
      const o = nums(T, 'min', 3, [P.period(h * 1e3, P.Mearth) / 60, 84.4 * (rad / P.Rearth), 84.4 * (rad / P.Rearth) * (rad / P.Rearth)]);
      return { prompt: 'A satellite is in a circular orbit ' + h + ' km above the Earth’s surface (R = 6 378 km, GM = 3.986×10¹⁴ m³/s²). Its period is…', right: o.right, wrong: o.wrong,
        explain: 'T = 2π√(r³/GM) with r = ' + (6378 + h) + ' km gives ' + fmt(T, 3) + ' minutes.' };
    });
    O.calc('binary-mass', 'Mass of a binary', 3, r => {
      const b = r.pick([['Sirius A and B', 19.8, 50.1], ['Alpha Centauri A and B', 23.4, 79.9], ['Procyon A and B', 15.0, 40.8]]);
      const M = b[1] * b[1] * b[1] / (b[2] * b[2]);
      const o = nums(M, 'M☉', 3, [b[1] * b[1] / Math.pow(b[2], 3), b[2] * b[2] / Math.pow(b[1], 3), Math.pow(b[1], 3) / b[2]]);
      return { prompt: b[0] + ' orbit each other with a period of ' + b[2] + ' years and a semi-major axis of ' + b[1] + ' AU. Their combined mass is…', right: o.right, wrong: o.wrong,
        explain: 'Kepler III in solar units: M₁ + M₂ = a³/P² = ' + b[1] + '³/' + b[2] + '² = ' + fmt(M, 3) + ' M☉.' };
    });
    O.calc('barycentre', 'Centre of mass', 2, r => {
      const m1 = r.pick([2, 3, 4, 5]), m2 = r.pick([1, 1.5, 0.5]), d = r.pick([6, 8, 10, 12]);
      const x = d * m2 / (m1 + m2), o = nums(x, 'AU', 3, [d * m1 / (m1 + m2), d / 2, d / (m1 + m2)]);
      return { prompt: 'Two stars of ' + m1 + ' M☉ and ' + m2 + ' M☉ are ' + d + ' AU apart. How far is the heavier star from the centre of mass?', right: o.right, wrong: o.wrong,
        explain: 'm₁r₁ = m₂r₂ and r₁ + r₂ = ' + d + ' AU, so r₁ = d·m₂/(m₁ + m₂) = ' + d + ' × ' + m2 + '/' + (m1 + m2) + ' = ' + fmt(x, 3) + ' AU.' };
    });
    O.calc('rocket', 'Rocket equation', 3, r => {
      const ve = r.pick([2.5, 3.0, 3.5, 4.4]), k = r.pick([3, 5, 8, 10, 20]);
      const dv = ve * Math.log(k), o = nums(dv, 'km/s', 3, [ve * k, ve * Math.log10(k), ve * Math.log(k - 1)]);
      return { prompt: 'A rocket with an exhaust speed of ' + ve + ' km/s has a launch mass ' + k + ' times its final mass (after the fuel is burnt). Its total Δv is…', right: o.right, wrong: o.wrong,
        explain: 'Tsiolkovsky: Δv = v_e ln(m₀/m₁) = ' + ve + ' × ln ' + k + ' = ' + fmt(dv, 3) + ' km/s.' };
    });

    // =============================================================================================== Telescopes & optics
    const T = A.topic('optics');
    T.sheet([
      ['Focal ratio', 'N = f / D', 'f/10 = 10 × the aperture'],
      ['Magnification', 'M = f_objective / f_eyepiece = D / exit pupil'],
      ['Light gathering', '∝ D²', 'dark-adapted eye D ≈ 7 mm'],
      ['Gain in limiting magnitude', 'Δm = 5 log₁₀(D / d)', 'd = 7 mm eye pupil'],
      ['Rayleigh criterion', 'θ = 1.22 λ / D', 'radians; × 206 265 for arcsec'],
      ['Dawes limit', 'θ ≈ 116″ / D(mm)', 'visual double stars'],
      ['Plate scale', 's = 206 265 / f(mm)  ″ per mm', 'pixel scale = s × pixel size'],
      ['Exit pupil', 'p = D / M = f_eyepiece / N', ''],
      ['True field of view', 'FOV = apparent FOV / M', ''],
      ['Interferometer', 'θ ≈ λ / B', 'B = baseline'],
      ['Useful magnification', 'about 2 × D(mm) at most', 'minimum ≈ D / 7 mm'],
    ]);
    T.figs({
      prefix: 'scope', tier: 1, group: 'Telescope designs', ask: 'What type of telescope is drawn here?', askName: n => 'Which picture shows a ' + n.toLowerCase() + '?',
      items: [
        { id: 'refractor', name: 'Refracting telescope', fig: 'tele.refractor', kin: 'optical', note: 'Refractor: a lens (objective) at the front brings light to a focus at the back end, where an eyepiece magnifies the image. Sharp and sealed, but chromatic aberration and the weight of large lenses limit the size (largest: Yerkes, 1.02 m).' },
        { id: 'newtonian', name: 'Newtonian reflector', fig: 'tele.newtonian', kin: 'optical', note: 'Newtonian: a parabolic primary mirror at the bottom reflects light back up the tube to a small flat diagonal mirror, which sends it out through the side to the eyepiece (Newton, 1668).' },
        { id: 'cassegrain', name: 'Cassegrain reflector', fig: 'tele.cassegrain', kin: 'optical', note: 'Cassegrain: a concave primary with a central hole and a small convex secondary; light reflects back through the hole to a focus behind the primary, folding a long focal length into a short tube.' },
        { id: 'sct', name: 'Schmidt–Cassegrain telescope', fig: 'tele.sct', kin: 'optical', note: 'Schmidt–Cassegrain: a spherical primary and secondary plus a thin corrector plate at the front of a short sealed tube. Very compact (popular with amateurs).' },
        { id: 'dobsonian', name: 'Dobsonian telescope', fig: 'tele.dobsonian', kin: 'optical', note: 'Dobsonian: a Newtonian reflector on a simple alt-azimuth rocker box. Cheap large apertures; it must be moved by hand in two axes.' },
        { id: 'segmented', name: 'Segmented-mirror telescope', fig: 'tele.segmented', kin: 'optical', note: 'Segmented mirror: many hexagonal segments act as one huge mirror (Keck: 36 segments for 10 m; JWST: 18 for 6.5 m; the ELT: 798 for 39 m).' },
        { id: 'radio', name: 'Radio telescope (single dish)', fig: 'tele.radio', kin: 'radio', note: 'Single-dish radio telescope: a large parabolic metal reflector focuses radio waves on a receiver at the focus (Parkes 64 m, Green Bank 100 m, FAST 500 m).' },
        { id: 'array', name: 'Interferometer array', fig: 'tele.array', kin: 'radio', note: 'Interferometer array: many dishes (VLA: 27, ALMA: 66) combined electronically to give the resolution of one dish as wide as the largest separation, the baseline.' },
        { id: 'space', name: 'Space telescope', fig: 'tele.space', kin: 'space', note: 'Space telescope (like Hubble: 2.4 m mirror, 540 km orbit): above the atmosphere it sees sharp images and wavelengths that the air absorbs, powered by solar panels.' },
      ],
    });
    T.figs({
      prefix: 'mount', tier: 1, group: 'Mounts', ask: 'What kind of telescope mount is shown?', askName: n => 'Which picture shows an ' + n.toLowerCase() + '?',
      items: [
        { id: 'altaz', name: 'Alt-azimuth mount', fig: 'mount.altaz', note: 'Alt-azimuth: one axis vertical, one horizontal. Simple and stable, but tracking needs both axes to move at changing speeds and the field slowly rotates.' },
        { id: 'equatorial', name: 'Equatorial mount', fig: 'mount.equatorial', note: 'Equatorial: the polar axis points at the celestial pole (tilted to the latitude), so one steady motion at the sidereal rate follows a star without field rotation.' },
      ],
    });
    T.figs({
      prefix: 'defect', tier: 2, group: 'Optical defects', ask: 'Which optical defect does this picture show?', askName: n => 'Which picture shows ' + n.toLowerCase() + '?',
      items: [
        { id: 'chromatic', name: 'Chromatic aberration', fig: 'opt.defect#chromatic', note: 'Chromatic aberration: glass bends blue light more than red, so a simple lens has a different focus for each colour (coloured fringes). Mirrors have none; achromatic and apochromatic multi-element lenses reduce it.' },
        { id: 'spherical', name: 'Spherical aberration', fig: 'opt.defect#spherical', note: 'Spherical aberration: rays from the rim of a spherical surface focus closer than rays near the axis, giving a blurred focus. A parabolic mirror or a corrector plate removes it.' },
        { id: 'coma', name: 'Coma', fig: 'opt.defect#coma', note: 'Coma: off-axis stars look like little comets with tails; it grows with the distance from the axis and with a faster focal ratio (typical for parabolic mirrors).' },
        { id: 'astig', name: 'Astigmatism', fig: 'opt.defect#astig', note: 'Astigmatism: off-axis star images are stretched into lines, one way on one side of focus and at right angles on the other.' },
      ],
    });
    T.gallery([
      ['opt.spikes#4', 'Four spikes', 'A four-vane spider (or two crossed struts) diffracts each bright star into four spikes, each at right angles to a vane.', 'Diffraction spikes'],
      ['opt.spikes#6', 'Six spikes', 'An odd number of vanes (three) doubles up: six spikes. The hexagonal JWST mirror and its struts give six large and two small spikes.', 'Diffraction spikes'],
    ]);
    T.fact('lens-mirror', 'Lenses versus mirrors', 1, [
      ['Why do the largest research telescopes use mirrors instead of lenses?', 'A mirror can be supported over its whole back and has no chromatic aberration', ['Lenses cannot focus light', 'Mirrors need no polishing', 'Mirrors give higher magnification by themselves']],
      ['Which telescope design suffers from chromatic aberration?', 'A refractor with a simple lens', ['A Newtonian reflector', 'A Cassegrain reflector', 'A radio dish']],
      ['Who discovered Jupiter’s four large moons with a telescope in 1610?', 'Galileo Galilei', ['Isaac Newton', 'Johannes Kepler', 'William Herschel']],
    ], 'A lens can only be held by its rim and sags under its own weight; light passes through it, so every surface and the glass itself must be perfect, and colours focus differently. A mirror is supported from behind and reflects every colour alike.');
    T.fact('aperture', 'Why aperture matters', 1, [
      ['The main advantage of a larger aperture is…', 'more light gathered and finer resolution', ['higher magnification only', 'a wider field of view', 'less atmospheric seeing']],
      ['The light-gathering power of a telescope is proportional to…', 'the square of its aperture diameter', ['its aperture diameter', 'its focal length', 'its magnification']],
      ['Doubling a telescope’s aperture collects … times more light.', '4', ['2', '8', '16']],
    ], 'Light collected ∝ area ∝ D². Resolution improves as 1/D. Magnification, in contrast, can be changed by swapping the eyepiece and does not add light or detail.');
    T.fact('focal-ratio', 'Focal ratio', 1, [
      ['A telescope has focal length 1000 mm and aperture 100 mm. Its focal ratio is…', 'f/10', ['f/0.1', 'f/100', 'f/1']],
      ['Compared with an f/10 telescope of the same aperture, an f/5 telescope gives a … image of an extended object.', 'smaller and brighter per unit area', ['larger and dimmer', 'larger and brighter', 'smaller and dimmer']],
      ['A “fast” telescope has a…', 'small focal ratio (such as f/4)', ['large focal ratio (such as f/15)', 'large aperture only', 'short exposure time only']],
    ], 'N = f/D. A short focal ratio gives a small, bright image scale (good for faint nebulae and wide fields); a long focal ratio gives high magnification (planets, double stars).');
    T.fact('magnification', 'Magnification', 1, [
      ['The magnification of a telescope is…', 'objective focal length ÷ eyepiece focal length', ['eyepiece focal length ÷ objective focal length', 'aperture × eyepiece focal length', 'objective focal length × eyepiece focal length']],
      ['To raise the magnification of a given telescope you should use an eyepiece with a…', 'shorter focal length', ['longer focal length', 'larger diameter only', 'wider field only']],
      ['A Barlow lens placed before the eyepiece…', 'increases the effective focal length and so the magnification', ['reduces the aperture', 'shortens the exposure', 'removes chromatic aberration']],
    ], 'M = f_o / f_e. Shorter eyepieces (or a Barlow) raise M, but the useful limit is about twice the aperture in millimetres: beyond it the image is only bigger, not sharper.');
    T.fact('resolution', 'Resolving power', 1, [
      ['The angular resolution of a telescope is limited by diffraction to about…', '1.22 λ / D', ['λ / 2D²', 'D / 1.22 λ', '1.22 D / λ']],
      ['To improve the diffraction-limited resolution you can…', 'increase the aperture or observe at a shorter wavelength', ['increase the magnification', 'use a longer eyepiece', 'increase the focal length only']],
      ['Why do radio telescopes need huge dishes or interferometry to match optical sharpness?', 'Radio wavelengths are about 10⁵ times longer than visible light', ['Radio waves are weaker', 'Radio telescopes have lower magnification', 'The atmosphere blurs radio waves']],
      ['The best ground-based optical telescopes without adaptive optics are limited to about … by the atmosphere', '1 arcsecond', ['1 arcminute', '0.001 arcsecond', '1 degree']],
    ], 'The Rayleigh criterion θ = 1.22λ/D (radians). A 10 cm telescope resolves about 1″ in visible light; radio at 21 cm needs a dish 400,000 times wider for the same sharpness. Turbulence limits ground-based images to ~1″ (“seeing”).');
    T.fact('seeing', 'Seeing and adaptive optics', 2, [
      ['Which technique corrects atmospheric turbulence in real time?', 'Adaptive optics', ['Interferometry', 'Longer exposures', 'Cooling the detector']],
      ['Why does the Hubble Space Telescope reach close to its diffraction limit?', 'It is above the atmosphere', ['It is very large', 'It is cooled', 'It uses lenses']],
      ['Observatories are built on high mountains in dry climates to get…', 'steadier, drier air above much of the atmosphere', ['more gravity', 'closer to the stars', 'warmer nights']],
    ], 'Turbulent air blurs and shakes images (“seeing”). Adaptive optics uses a deformable mirror and a guide star to cancel it; space telescopes avoid it altogether, and mountain sites such as Mauna Kea (4 200 m) sit above much of the air.');
    T.fact('detectors', 'Detectors', 2, [
      ['Compared with photographic plates, CCDs are…', 'far more sensitive, with a linear response', ['less sensitive but cheaper', 'only used for radio', 'sensitive only to red light']],
      ['What fraction of arriving photons can a good CCD detect at its best (quantum efficiency)?', 'Up to about 90% or more', ['About 1–3%', 'About 10%', 'Exactly 100% at all wavelengths']],
      ['Astronomical CCDs are cooled to reduce…', 'thermal noise (dark current)', ['chromatic aberration', 'atmospheric extinction', 'light pollution']],
    ], 'CCDs convert photons to electrons with up to 90–95% efficiency and respond linearly; photographic plates caught only a few percent. Cooling cuts the dark current.');
    T.fact('filters', 'Photometric filters', 2, [
      ['In the Johnson UBV system, the V filter is centred near…', '550 nm (green-yellow)', ['365 nm', '440 nm', '700 nm']],
      ['In the Johnson system the B filter is centred near…', '440 nm (blue)', ['365 nm', '550 nm', '650 nm']],
      ['The colour index B − V is…', 'the B magnitude minus the V magnitude', ['the V magnitude minus the B magnitude', 'the sum of B and V', 'the ratio of B to V']],
    ], 'U ≈ 365 nm, B ≈ 440 nm, V ≈ 550 nm. A hot, blue star is brighter in B (smaller magnitude), so B − V is negative or small; cool red stars have B − V of 1.5 or more.');
    T.fact('spectrograph', 'Spectrographs', 2, [
      ['A diffraction grating in a spectrograph…', 'disperses light into a spectrum by wavelength', ['collects more light', 'corrects coma', 'removes seeing']],
      ['The resolving power of a spectrograph is defined as…', 'λ / Δλ', ['Δλ / λ', 'λ · Δλ', 'λ² / Δλ']],
      ['Measuring a radial velocity of 1 km/s at 500 nm needs a wavelength resolution of about…', '0.002 nm', ['0.2 nm', '2 nm', '0.00002 nm']],
    ], 'R = λ/Δλ. A Doppler shift of 1 km/s is Δλ/λ = v/c = 3.3×10⁻⁶, i.e. 0.0017 nm at 500 nm, so R must exceed ~300 000.');
    T.fact('radio', 'Radio astronomy', 2, [
      ['The largest single-dish radio telescope, FAST in China, has an aperture of…', '500 m', ['100 m', '305 m', '1 km']],
      ['Which instrument imaged the shadow of the black hole in M87 in 2019?', 'The Event Horizon Telescope, a worldwide network of radio dishes', ['The Hubble Space Telescope', 'LIGO', 'The Chandra X-ray Observatory']],
      ['The VLA (Very Large Array) in New Mexico consists of…', '27 dishes in a Y-shaped arrangement', ['one 100 m dish', '66 dishes in Chile', '8 optical mirrors']],
      ['ALMA, observing at millimetre wavelengths, is located…', 'high in the Chilean Atacama desert', ['in Hawaii', 'in space', 'in Antarctica']],
    ], 'FAST (500 m, Guizhou) is the largest single dish; Arecibo (305 m) collapsed in 2020. Interferometers such as the VLA (27 dishes), ALMA (66 dishes at 5 000 m in Chile) and the global EHT reach milliarcsecond to microarcsecond resolution.');
    T.fact('interferometry', 'Interferometry', 3, [
      ['The resolution of an interferometer is set mainly by…', 'the longest baseline between its elements', ['the diameter of each dish', 'the number of dishes', 'the focal length']],
      ['What does very-long-baseline interferometry (VLBI) combine?', 'Signals recorded at telescopes thousands of kilometres apart', ['Many wavelengths from one dish', 'Gamma rays and X-rays', 'Images taken at different times by one telescope']],
    ], 'θ ≈ λ/B. VLBI correlates recordings from telescopes across the Earth: the EHT at 1.3 mm over 12 000 km resolves about 20 microarcseconds.');
    T.fact('windows', 'Atmospheric windows', 2, [
      ['Which parts of the spectrum reach the ground well?', 'Visible light and radio waves', ['X-rays and gamma rays', 'Ultraviolet and far infrared', 'Only visible light']],
      ['Why must X-ray telescopes be in space?', 'The atmosphere absorbs X-rays', ['X-rays are too bright', 'Earth’s magnetic field bends them', 'They would be damaged by rain']],
      ['Infrared telescopes are cooled because…', 'warm instruments radiate infrared that would swamp the faint signal', ['infrared light freezes', 'cold lenses are sharper', 'the detectors are made of ice']],
    ], 'Air absorbs UV, X-ray and gamma rays (and much of the infrared); only the optical and radio “windows” are open. Anything warm glows in the infrared, so IR instruments are chilled (JWST to ~40 K).');
    T.fact('jwst', 'James Webb Space Telescope', 2, [
      ['The James Webb Space Telescope observes mainly in the…', 'infrared', ['ultraviolet', 'X-ray', 'radio']],
      ['JWST’s primary mirror consists of 18 hexagonal segments of…', 'gold-coated beryllium', ['borosilicate glass', 'aluminium foil', 'Zerodur ceramic']],
      ['What is the diameter of JWST’s primary mirror?', '6.5 m', ['2.4 m', '10 m', '39 m']],
      ['How do the Hubble Space Telescope’s and JWST’s mirrors compare?', 'JWST’s is wider (6.5 m versus 2.4 m)', ['They are equal', 'Hubble’s is wider', 'JWST has no mirror']],
    ], 'JWST has a 6.5 m segmented gold-coated beryllium mirror (18 hexagons), a five-layer sunshield and sits at the Sun–Earth L2 point, cooled to about 40 K to see the infrared universe.');
    T.fact('spikes', 'Diffraction spikes', 3, [
      ['A bright star shows four diffraction spikes in a Newtonian reflector. What causes them?', 'The straight vanes supporting the secondary mirror', ['Atmospheric turbulence', 'Chromatic aberration', 'Spherical aberration'], { fig: 'opt.spikes#4' }],
      ['A telescope has a three-vane spider. How many diffraction spikes does a bright star show?', 'Six', ['Three', 'Two', 'Four'], { fig: 'opt.spikes#6' }],
      ['A telescope with a circular unobstructed aperture and no vanes shows…', 'no spikes, only concentric diffraction rings', ['four spikes', 'six spikes', 'one long streak']],
    ], 'Each straight edge or vane diffracts light into a spike perpendicular to it. An even number N of vanes gives N spikes; an odd number gives 2N (3 vanes → 6). The hexagonal JWST mirror and its struts give six large and two small spikes.');
    T.fact('giants', 'Famous telescopes', 2, [
      ['The largest refracting telescope ever built (Yerkes Observatory) has a lens diameter of…', '1.02 m (40 inches)', ['2.4 m', '0.5 m', '5 m']],
      ['The Extremely Large Telescope (ELT), under construction in Chile, has a mirror about…', '39 m wide', ['10 m wide', '100 m wide', '4 m wide']],
      ['The two Keck telescopes on Mauna Kea each have a segmented primary mirror of…', '10 m diameter', ['2.4 m', '5 m', '30 m']],
      ['The Hubble Space Telescope has a primary mirror of…', '2.4 m', ['6.5 m', '10 m', '0.5 m']],
      ['In which year was the Hubble Space Telescope launched?', '1990', ['1969', '1977', '2021']],
    ], 'Yerkes 1.02 m (1897) is the largest refractor. Keck 10 m (segmented, 36 hexagons), Hubble 2.4 m (1990), JWST 6.5 m (2021), ELT 39 m (planned for the late 2020s).');
    T.fact('eye', 'The human eye', 1, [
      ['The pupil of a dark-adapted young eye is about…', '7 mm', ['2 mm', '15 mm', '1 mm']],
      ['The naked-eye limiting magnitude at a dark site is about…', '6', ['3', '9', '12']],
      ['Dark adaptation of the eye takes about…', '20–30 minutes', ['1 second', '2 minutes', '3 hours']],
    ], 'The pupil opens to ~7 mm in the dark, so the eye reaches magnitude ~6 under a dark sky. Full dark adaptation takes about half an hour (rods use rhodopsin).');
    T.calc('fratio-calc', 'Focal ratio in numbers', 1, r => {
      const D = r.pick([60, 80, 100, 114, 130, 150, 200, 250, 305]), f = r.pick([400, 600, 750, 900, 1000, 1200, 1500, 2000, 2500]);
      const N = f / D, o = nums(N, '', 2, [D / f, N * 2, N / 2], x => 'f/' + x);
      return { prompt: 'A telescope has an aperture of ' + D + ' mm and a focal length of ' + f + ' mm. Its focal ratio is…', right: o.right, wrong: o.wrong, explain: 'N = f/D = ' + f + '/' + D + ' = ' + fmt(N, 2) + ', written f/' + fmt(N, 2) + '.' };
    });
    T.calc('mag-calc', 'Magnification in numbers', 1, r => {
      const f = r.pick([700, 900, 1000, 1200, 1500, 2000]), fe = r.pick([6, 9, 10, 12.5, 15, 20, 25, 32, 40]), M = f / fe;
      const o = nums(M, '×', 3, [f / (fe * 2), f * 2 / fe, f / (fe + 10)], x => x + '×');
      return { prompt: 'A telescope with a focal length of ' + f + ' mm is used with a ' + fe + ' mm eyepiece. The magnification is…', right: o.right, wrong: o.wrong, explain: 'M = f_objective / f_eyepiece = ' + f + '/' + fe + ' = ' + fmt(M, 3) + '×.' };
    });
    T.calc('grasp', 'Light-gathering power', 1, r => {
      const D = r.pick([60, 90, 114, 150, 200, 254, 305, 400]), d = r.pick([6, 7, 8]), k = (D / d) * (D / d);
      const o = nums(k, '', 3, [D / d, k * Math.PI / 4, (D / d) * 2], x => x + ' times');
      return { prompt: 'How many times more light does a telescope with a ' + D + ' mm aperture collect than a dark-adapted eye with a ' + d + ' mm pupil?', right: o.right, wrong: o.wrong, explain: 'Light grasp ∝ D²: (' + D + '/' + d + ')² = ' + fmt(k, 3) + '.' };
    });
    T.calc('limmag', 'Limiting magnitude', 2, r => {
      const D = r.pick([60, 100, 150, 200, 305, 400]), m = 6 + 5 * Math.log10(D / 7);
      const o = nums(m, '', 3, [5 * Math.log10(D / 7), 6 + 2.5 * Math.log10(D / 7), 6 + 5 * Math.log10((D / 7) * (D / 7))], x => x);
      return { prompt: 'A dark-adapted eye (7 mm pupil) sees stars down to magnitude 6.0. What is the faintest star visible through a ' + D + ' mm telescope?', right: o.right, wrong: o.wrong, explain: 'Δm = 5 log₁₀(D/d) = 5 log₁₀(' + D + '/7) = ' + fmt(5 * Math.log10(D / 7), 3) + ', so m = 6.0 + ' + fmt(5 * Math.log10(D / 7), 3) + ' = ' + fmt(m, 3) + '.' };
    });
    T.calc('rayleigh-calc', 'Rayleigh limit', 2, r => {
      const D = r.pick([0.05, 0.1, 0.15, 0.2, 0.3, 0.5, 1, 2.4, 8, 10]), lam = r.pick([400, 500, 550, 650, 700]) * 1e-9;
      const th = P.rayleigh(lam, D) * 206265, o = nums(th, '″', 3, [th * 2, th / 1.22, th * 1.22]);
      return { prompt: 'What is the diffraction-limited resolution (Rayleigh criterion) of a ' + (D < 1 ? Math.round(D * 100) + ' cm' : D + ' m') + ' telescope at a wavelength of ' + Math.round(lam * 1e9) + ' nm?', right: o.right, wrong: o.wrong, explain: 'θ = 1.22 λ/D = 1.22 × ' + Math.round(lam * 1e9) + '×10⁻⁹ / ' + D + ' = ' + fmt(P.rayleigh(lam, D), 3) + ' rad = ' + fmt(th, 3) + '″.' };
    });
    T.calc('dawes', 'Dawes limit', 2, r => {
      const D = r.pick([60, 80, 100, 114, 150, 200, 250, 300]), th = 116 / D;
      const o = nums(th, '″', 3, [th * 2, th / 2, th * 138 / 116]);
      return { prompt: 'Using the Dawes limit, what is the smallest separation of a double star that a ' + D + ' mm telescope can split?', right: o.right, wrong: o.wrong, explain: 'Dawes: θ ≈ 116″ / D(mm) = 116/' + D + ' = ' + fmt(th, 3) + '″.' };
    });
    T.calc('platescale', 'Plate scale', 3, r => {
      const f = r.pick([500, 800, 1000, 1500, 2000, 3000]), px = r.pick([3.8, 5.4, 6, 9]), s = 206265 / f, ps = s * px / 1000;
      const o = nums(ps, '″', 3, [s, ps * 2, ps / 2]);
      return { prompt: 'A camera with ' + px + ' µm pixels sits at the focus of a telescope with a focal length of ' + f + ' mm. What angle on the sky does one pixel cover?', right: o.right, wrong: o.wrong, explain: 'Plate scale = 206 265 / f(mm) = ' + fmt(s, 3) + '″ per mm, so one ' + px + ' µm pixel covers ' + fmt(s, 3) + ' × ' + (px / 1000) + ' = ' + fmt(ps, 3) + '″.' };
    });
    T.calc('exitpupil', 'Exit pupil', 2, r => {
      const D = r.pick([80, 100, 150, 200, 250]), M = r.pick([20, 25, 40, 50, 80, 100]), p = D / M;
      const o = nums(p, 'mm', 3, [M / D, D / (2 * M), 2 * D / M]);
      return { prompt: 'A ' + D + ' mm telescope is used at a magnification of ' + M + '×. What is the diameter of the exit pupil?', right: o.right, wrong: o.wrong, explain: 'Exit pupil = D / M = ' + D + '/' + M + ' = ' + fmt(p, 3) + ' mm (a pupil larger than the eye’s ~7 mm wastes light).' };
    });
    T.calc('fov', 'Field of view', 2, r => {
      const afov = r.pick([40, 52, 60, 68, 82]), M = r.pick([25, 40, 60, 80, 100, 120]), f = afov / M;
      const o = nums(f, '°', 3, [f * 2, f / 2, afov / (M + 50)]);
      return { prompt: 'An eyepiece with an apparent field of view of ' + afov + '° is used at ' + M + '×. The true field of view is…', right: o.right, wrong: o.wrong, explain: 'True FOV = apparent FOV / M = ' + afov + '/' + M + ' = ' + fmt(f, 3) + '°.' };
    });
    T.calc('interf-calc', 'Interferometer resolution', 3, r => {
      const b = r.pick([['the VLA at its widest (36 km) observing at 6 cm', 36e3, 0.06], ['the VLA (36 km) observing at 21 cm', 36e3, 0.21], ['the Event Horizon Telescope (12 700 km) observing at 1.3 mm', 1.27e7, 1.3e-3], ['ALMA (16 km) observing at 0.85 mm', 16e3, 0.85e-3], ['a 100 m optical interferometer at 550 nm', 100, 550e-9]]);
      const th = b[2] / b[1] * 206265, uas = th < 1e-4, mas = !uas && th < 0.1;
      const val = uas ? th * 1e6 : mas ? th * 1e3 : th, unit = uas ? 'µas' : mas ? 'mas' : '″';
      const o = nums(val, unit, 3, [val * 1e3, val / 1e3, val * 2]);
      return { prompt: 'What is the approximate resolution θ ≈ λ/B of ' + b[0] + '?', right: o.right, wrong: o.wrong, explain: 'θ ≈ λ/B = ' + fmt(b[2], 2) + ' m / ' + fmt(b[1], 3) + ' m = ' + fmt(b[2] / b[1], 3) + ' rad = ' + fmt(th, 3) + '″' + (uas ? ' (' + fmt(val, 3) + ' micro-arcseconds)' : mas ? ' (' + fmt(val, 3) + ' milli-arcseconds)' : '') + '.' };
    });
  };
});

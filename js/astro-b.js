/* Olympiad Academy, part B: Light & radiation, Stars, Magnitudes & distances, Stellar evolution. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.AstroB = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  return function (A) {
    const { nums, fmt, P } = A;
    const log10 = Math.log10;
    const mn = v => String(v).replace('-', '−');

    // =============================================================================================== Light & radiation
    const L = A.topic('light');
    L.sheet([
      ['Wave relation', 'c = λν', 'c = 3.00×10⁸ m/s'],
      ['Photon energy', 'E = hν = hc/λ ≈ 1240 eV·nm / λ', 'h = 6.63×10⁻³⁴ J·s'],
      ['Wien’s law', 'λ_max · T = 2.898×10⁻³ m·K', 'Sun 5772 K → 502 nm'],
      ['Stefan–Boltzmann', 'F = σT⁴ · L = 4πR²σT⁴', 'σ = 5.67×10⁻⁸ W m⁻² K⁻⁴'],
      ['Solar units', 'L/L☉ = (R/R☉)² (T/5772 K)⁴', ''],
      ['Inverse-square law', 'F = L / 4πd²', ''],
      ['Doppler shift', 'Δλ/λ = v/c', 'v ≪ c; redshift = receding'],
      ['Hydrogen lines', '1/λ = R (1/n₁² − 1/n₂²)', 'R = 1.097×10⁷ m⁻¹; Balmer n₁ = 2'],
      ['Planet equilibrium temperature', 'T = 278 K · (1 − A)^¼ / √d(AU)', 'Sun-like star, fast rotator'],
      ['Air mass', 'X = sec z = 1 / sin(altitude)', 'plane-parallel atmosphere'],
      ['Rayleigh scattering', '∝ λ⁻⁴', 'blue sky, red sunsets'],
    ]);
    L.fact('spectrum', 'The electromagnetic spectrum', 1, [
      ['Which list orders the spectrum from longest to shortest wavelength?', 'radio, microwave, infrared, visible, ultraviolet, X-ray, gamma', ['gamma, X-ray, ultraviolet, visible, infrared, microwave, radio', 'radio, infrared, microwave, visible, X-ray, ultraviolet, gamma', 'microwave, radio, visible, infrared, ultraviolet, gamma, X-ray']],
      ['Visible light spans wavelengths of about…', '400–700 nm', ['40–70 nm', '4–7 µm', '0.4–0.7 mm']],
      ['Which kind of radiation has the highest photon energy?', 'Gamma rays', ['Radio waves', 'Visible light', 'Infrared']],
      ['Compared with blue light, red light has a…', 'longer wavelength and lower photon energy', ['shorter wavelength and lower photon energy', 'longer wavelength and higher photon energy', 'the same wavelength but lower speed']],
    ], 'From long to short wavelength: radio, microwave, infrared, visible (red 700 nm to violet 400 nm), ultraviolet, X-rays, gamma rays. Photon energy rises as wavelength falls.');
    L.fact('waves', 'Waves and photons', 1, [
      ['For any electromagnetic wave, wavelength × frequency equals…', 'the speed of light', ['Planck’s constant', 'the photon energy', 'the temperature']],
      ['The energy of a photon is proportional to…', 'its frequency', ['its wavelength', 'the square of its wavelength', 'the intensity of the beam']],
      ['The speed of light in vacuum is about…', '3×10⁸ m/s', ['3×10⁶ m/s', '3×10⁵ m/s', '3×10¹⁰ m/s']],
      ['A photon of visible light has an energy of about…', '2 to 3 eV', ['0.002 eV', '2 keV', '2 MeV']],
    ], 'c = λν and E = hν = hc/λ. Visible photons (400–700 nm) carry about 1.8–3.1 eV.');
    L.fact('blackbody', 'Blackbody radiation', 2, [
      ['A hotter blackbody emits…', 'more power per unit area and peaks at a shorter wavelength', ['less power and peaks at a longer wavelength', 'the same power with a bluer peak', 'only visible light']],
      ['The power emitted per unit area of a blackbody is proportional to…', 'T⁴', ['T', 'T²', 'T³']],
      ['If a star’s temperature doubles while its radius stays the same, its luminosity multiplies by…', '16', ['2', '4', '8']],
      ['Wien’s displacement law says the peak wavelength is…', 'inversely proportional to the temperature', ['proportional to the temperature', 'proportional to T⁴', 'independent of the temperature']],
      ['Stars radiate approximately as…', 'blackbodies', ['monochromatic lasers', 'perfect mirrors', 'line emitters only']],
    ], 'Planck’s law: hotter bodies radiate more at every wavelength; the peak shifts blueward (Wien: λ_max T = 2.898×10⁻³ m·K) and the total flux rises as σT⁴ (Stefan–Boltzmann).');
    L.calc('bb-curves', 'Reading blackbody curves', 2, r => {
      const order = r.shuffle(['A', 'B', 'C']), want = r.pick(['hottest', 'coolest', 'reddest']);
      const right = want === 'hottest' ? order[2] : order[0];
      return { prompt: 'The diagram shows the spectra of three stars A, B and C. Which star is the ' + want + '?', fig: 'star.blackbody#' + order.join(''), right, wrong: ['A', 'B', 'C'].filter(x => x !== right),
        explain: 'The hottest blackbody curve is the highest and peaks at the shortest wavelength (Wien’s law); the coolest is the lowest and peaks at the longest wavelength, so it looks reddest.' };
    });
    L.gallery([['star.blackbody#ABC', 'Blackbody curves', 'Three stars: the hottest curve is the highest and peaks at the shortest wavelength (Wien), the coolest is the lowest and reddest. The shaded band is visible light.', 'Blackbody radiation']]);
    L.figs({
      prefix: 'spec', tier: 1, group: 'Kinds of spectrum', ask: 'What kind of spectrum is this?', askName: n => 'Which picture shows an ' + n.toLowerCase() + '?',
      items: [
        { id: 'continuous', name: 'Continuous spectrum', fig: 'star.spectra#continuous', ask: 'What kind of spectrum is this?', note: 'A hot dense source (a solid, liquid or dense gas) emits a smooth continuous spectrum with all colours, like a glowing filament or the interior of a star.' },
        { id: 'emission', name: 'Emission-line spectrum', fig: 'star.spectra#emission', note: 'A hot, low-density gas emits only at discrete wavelengths: bright lines on a dark background (nebulae, neon signs).' },
        { id: 'absorption', name: 'Absorption-line spectrum', fig: 'star.spectra#absorption', note: 'A cooler gas in front of a hot continuous source removes particular wavelengths: dark lines on a bright rainbow, as in stellar atmospheres (Fraunhofer lines).' },
      ],
    });
    L.fact('kirchhoff', 'Kirchhoff’s laws', 1, [
      ['A cool gas cloud in front of a hot continuous source produces…', 'an absorption-line spectrum', ['an emission-line spectrum', 'a continuous spectrum', 'no spectrum']],
      ['A hot, low-density gas seen against a dark background produces…', 'an emission-line spectrum', ['an absorption-line spectrum', 'a continuous spectrum', 'a blackbody curve']],
      ['The spectrum of a normal star such as the Sun shows…', 'dark absorption lines on a continuous background', ['bright emission lines only', 'a smooth continuum with no lines', 'only X-rays']],
      ['The pattern of spectral lines of an element is…', 'unique to that element (and its ionisation state)', ['the same for all elements', 'dependent on distance only', 'random']],
    ], 'Kirchhoff: a hot dense body gives a continuum; a hot thin gas gives emission lines; a cooler gas in front of a continuum gives absorption lines at the same wavelengths.');
    L.fact('doppler', 'Doppler effect', 1, [
      ['If a star’s spectral lines are shifted towards longer wavelengths, the star is…', 'moving away from us (redshift)', ['moving towards us', 'hotter than expected', 'rotating']],
      ['For speeds much less than c, the Doppler shift Δλ/λ equals…', 'v/c', ['c/v', 'v²/c²', 'v·c']],
      ['The Doppler shift measures only the … component of the velocity.', 'line-of-sight (radial)', ['tangential', 'rotational', 'total space']],
      ['Spectral lines shifted towards shorter wavelengths (blueshift) show that the source is…', 'approaching', ['receding', 'at rest', 'cooling']],
    ], 'The Doppler shift gives the radial velocity: Δλ/λ = v_r/c. Positive (redshift) = receding. Motion across the line of sight leaves no shift (proper motion measures that).');
    L.fact('hydrogen', 'Hydrogen spectrum', 2, [
      ['The Hα line of hydrogen has a wavelength of about…', '656 nm (red)', ['486 nm', '434 nm', '122 nm']],
      ['The Balmer series consists of hydrogen transitions to level…', 'n = 2', ['n = 1', 'n = 3', 'n = 4']],
      ['The Lyman series, with Lyman-α at 121.6 nm, lies in the…', 'ultraviolet', ['visible', 'infrared', 'radio']],
      ['The Paschen series (transitions to n = 3) lies in the…', 'near infrared', ['ultraviolet', 'visible', 'X-ray']],
      ['The energy needed to ionise hydrogen from its ground state is…', '13.6 eV', ['1.36 eV', '136 eV', '0.136 eV']],
    ], 'Balmer lines (n → 2): Hα 656.3, Hβ 486.1, Hγ 434.0, Hδ 410.2 nm. Lyman (n → 1) is UV, Paschen (n → 3) infrared. Ground-state ionisation takes 13.6 eV.');
    L.fact('h21', 'The 21 cm line', 2, [
      ['The 21 cm line of neutral hydrogen comes from…', 'the spin flip of the electron relative to the proton (hyperfine transition)', ['an electron transition from n = 3 to n = 2', 'rotation of H₂ molecules', 'recombination of ionised hydrogen']],
      ['The 21 cm line is used to…', 'map the neutral hydrogen of the Milky Way and measure its rotation', ['measure star temperatures', 'detect planets', 'photograph nebulae']],
      ['The frequency of the 21 cm line is about…', '1420 MHz', ['14.2 MHz', '142 GHz', '14 THz']],
    ], 'Neutral hydrogen’s hyperfine transition at 1420.4 MHz (21.1 cm) is a radio line that passes through dust, so it maps the galaxy’s gas and its rotation.');
    L.fact('fields', 'Magnetic effects', 3, [
      ['The splitting of spectral lines by a magnetic field is the…', 'Zeeman effect', ['Doppler effect', 'Stark effect', 'Compton effect']],
      ['Sunspots are cooler than their surroundings because…', 'strong magnetic fields suppress the convection that brings heat up', ['they are holes in the photosphere', 'they contain no hydrogen', 'they are shadows']],
      ['Synchrotron radiation is emitted by…', 'relativistic electrons spiralling in a magnetic field', ['hot dense gas', 'electron transitions in atoms', 'cold dust']],
    ], 'The Zeeman effect lets us measure solar magnetic fields (~0.3 T in sunspots). Synchrotron emission (e.g. the Crab Nebula, radio galaxies) has a non-thermal power-law spectrum.');
    L.fact('scattering', 'Scattering and reddening', 2, [
      ['The daytime sky is blue because of…', 'Rayleigh scattering, stronger at short wavelengths (∝ 1/λ⁴)', ['absorption by oxygen', 'reflection from the oceans', 'refraction by clouds']],
      ['Sunsets look red because…', 'blue light is scattered out of the long path through the atmosphere', ['the Sun cools at sunset', 'red light travels faster', 'the ozone layer emits red light']],
      ['Interstellar dust makes distant stars look…', 'fainter and redder', ['brighter and bluer', 'brighter and redder', 'fainter and bluer']],
    ], 'Scattering by small particles ∝ λ⁻⁴ removes blue light more than red: it makes the sky blue, sunsets red and stars seen through dust fainter and redder (interstellar reddening).');
    L.fact('cmb', 'The microwave background', 2, [
      ['The cosmic microwave background has the spectrum of a blackbody at…', '2.725 K', ['27 K', '2 725 K', '0.27 K']],
      ['Wien’s law puts the peak of the CMB at a wavelength of about…', '1 mm (microwaves)', ['500 nm', '21 cm', '10 µm']],
      ['The CMB was discovered in 1965 by…', 'Penzias and Wilson', ['Hubble and Humason', 'Jansky and Reber', 'Bell and Hewish']],
    ], 'λ_max = 2.898×10⁻³ / 2.725 = 1.06 mm. Arno Penzias and Robert Wilson found the 3 K hiss in 1965 using a horn antenna at Bell Labs.');
    L.fact('lighttime', 'Light travel times', 1, [
      ['Light from the Sun takes about … to reach the Earth.', '8 minutes 20 seconds', ['1.3 seconds', '4.2 years', '1 hour']],
      ['Light from the Moon takes about … to reach the Earth.', '1.3 seconds', ['8 minutes', '1 minute', '1 hour']],
      ['Light from Proxima Centauri takes about … to reach us.', '4.2 years', ['4.2 hours', '8 minutes', '42 years']],
      ['One light-year is about…', '9.46×10¹⁵ m', ['3.1×10¹⁶ m', '1.5×10¹¹ m', '9.46×10¹² m']],
    ], 'c = 299 792 km/s: Moon 384 400 km → 1.28 s; Sun 1 AU = 499 s; Proxima 4.24 ly = 4.24 years. 1 ly = 9.46×10¹⁵ m = 63 241 AU.');
    L.fact('brightness', 'Flux and surface brightness', 3, [
      ['The flux received from a point source falls with distance as…', '1/d²', ['1/d', '1/d³', 'e^(−d)']],
      ['The surface brightness of a resolved extended source (like the Moon’s disc) at different distances…', 'stays the same', ['falls as 1/d²', 'rises with distance', 'falls as 1/d']],
      ['Radiation pressure limits a star’s luminosity to the Eddington luminosity, about…', '3×10⁴ L☉ per solar mass', ['3×10² L☉ per solar mass', '3×10⁸ L☉ per solar mass', '1 L☉ per solar mass']],
    ], 'A point source obeys the inverse-square law. An extended source’s surface brightness is independent of distance (the area it covers falls as 1/d² just as its flux does). L_Edd = 3.3×10⁴ (M/M☉) L☉.');
    L.calc('wien-calc', 'Wien’s law in numbers', 2, r => {
      const st = r.pick([['the Sun', 5772], ['Betelgeuse', 3600], ['Sirius A', 9940], ['Rigel', 12100], ['Proxima Centauri', 3050], ['Vega', 9600], ['a human body', 310], ['the cosmic microwave background', 2.725], ['a lightbulb filament', 2800]]);
      const lam = P.wienPeak(st[1]) * 1e9, big = lam > 5000, val = big ? lam / (lam > 5e5 ? 1e6 : 1e3) : lam, unit = big ? (lam > 5e5 ? 'mm' : 'µm') : 'nm';
      const o = nums(val, unit, 3, [val * 2, val / 2, val * 1.5]);
      return { prompt: 'The surface temperature of ' + st[0] + ' is ' + st[1] + ' K. At what wavelength does its blackbody spectrum peak?', right: o.right, wrong: o.wrong,
        explain: 'Wien: λ_max = 2.898×10⁻³ m·K / T = 2.898×10⁻³ / ' + st[1] + ' = ' + fmt(lam * 1e-9, 3) + ' m = ' + fmt(val, 3) + ' ' + unit + '.' };
    });
    L.calc('stefan-calc', 'Stars from Stefan–Boltzmann', 2, r => {
      const R = r.pick([0.5, 2, 5, 10, 50, 100, 200]), T = r.pick([3000, 3500, 4000, 5000, 6500, 8000, 10000, 15000, 25000]), lum = R * R * Math.pow(T / 5772, 4);
      if (r.rnd() < 0.5) {
        const o = nums(lum, 'L☉', 3, [R * R, R * R * (T / 5772), R * Math.pow(T / 5772, 4)]);
        return { prompt: 'A star has a radius of ' + R + ' R☉ and a surface temperature of ' + T + ' K. Its luminosity is…', right: o.right, wrong: o.wrong,
          explain: 'L/L☉ = (R/R☉)² (T/5772 K)⁴ = ' + R + '² × (' + T + '/5772)⁴ = ' + fmt(lum, 3) + '.' };
      }
      const o = nums(R, 'R☉', 3, [R * R, Math.sqrt(R), R * Math.pow(T / 5772, 2)]);
      return { prompt: 'A star with a surface temperature of ' + T + ' K has a luminosity of ' + fmt(lum, 3) + ' L☉. Its radius is…', right: o.right, wrong: o.wrong,
        explain: 'R/R☉ = √(L/L☉) / (T/5772 K)² = √' + fmt(lum, 3) + ' / (' + T + '/5772)² = ' + R + '.' };
    });
    L.calc('flux-calc', 'Inverse-square law', 1, r => {
      const k = r.pick([2, 3, 4, 5, 10, 20]);
      if (r.rnd() < 0.5) {
        const o = nums(k * k, '', 3, [k, 1 / (k * k), 1 / k], x => x + ' times fainter');
        return { prompt: 'A star is moved ' + k + ' times farther away. Its apparent brightness (flux) becomes…', right: o.right, wrong: o.wrong, explain: 'Flux ∝ 1/d²: ' + k + '² = ' + k * k + ' times fainter.' };
      }
      const o = nums(k, '', 3, [k * k, Math.sqrt(k), 2 * k], x => x + ' times farther');
      return { prompt: 'Two identical stars have apparent brightnesses in the ratio ' + k * k + ' to 1. How many times farther away is the fainter one?', right: o.right, wrong: o.wrong, explain: 'Flux ∝ 1/d², so d₂/d₁ = √(F₁/F₂) = √' + k * k + ' = ' + k + '.' };
    });
    L.calc('doppler-calc', 'Radial velocity from a line shift', 2, r => {
      const line = r.pick([['Hα', 656.28], ['Hβ', 486.13], ['sodium D', 589.0], ['calcium K', 393.37], ['magnesium b', 517.27]]);
      const v = r.pick([-300, -150, -80, 50, 120, 250, 500]), obs = line[1] * (1 + v / 299792.458), dl = obs - line[1];
      const right = Math.abs(v) + ' km/s, ' + (v > 0 ? 'receding' : 'approaching');
      return { prompt: 'The ' + line[0] + ' line (rest wavelength ' + line[1] + ' nm) is observed at ' + obs.toFixed(3) + ' nm. The star is…', right,
        wrong: [Math.abs(v) + ' km/s, ' + (v > 0 ? 'approaching' : 'receding'), Math.round(Math.abs(v) / 2) + ' km/s, ' + (v > 0 ? 'receding' : 'approaching'), Math.round(Math.abs(v) * 2) + ' km/s, ' + (v > 0 ? 'receding' : 'approaching')],
        explain: 'Δλ = ' + obs.toFixed(3) + ' − ' + line[1] + ' = ' + dl.toFixed(3) + ' nm, so v = c Δλ/λ = 299 792 km/s × ' + fmt(dl / line[1], 3) + ' = ' + Math.abs(v) + ' km/s, ' + (v > 0 ? 'a redshift: receding.' : 'a blueshift: approaching.') };
    });
    L.calc('photon-calc', 'Photon energies', 2, r => {
      const lam = r.pick([121.6, 250, 400, 500, 656.3, 700, 1000, 2000]);
      if (r.rnd() < 0.5) {
        const E = 1239.84 / lam, o = nums(E, 'eV', 3, [lam / 1239.84, E * 1000, E / 1000 * 10]);
        return { prompt: 'What is the energy of a photon with a wavelength of ' + lam + ' nm? (hc ≈ 1240 eV·nm)', right: o.right, wrong: o.wrong, explain: 'E = hc/λ = 1240 eV·nm / ' + lam + ' nm = ' + fmt(E, 3) + ' eV.' };
      }
      const E = 1239.84 / lam, o = nums(lam, 'nm', 3, [E * 1239.84, lam * 2, lam / 2]);
      return { prompt: 'A photon carries ' + fmt(E, 3) + ' eV. What is its wavelength? (hc ≈ 1240 eV·nm)', right: o.right, wrong: o.wrong, explain: 'λ = hc/E = 1240 eV·nm / ' + fmt(E, 3) + ' eV = ' + lam + ' nm.' };
    });
    L.calc('balmer-calc', 'Hydrogen lines from the Rydberg formula', 3, r => {
      const l = r.pick([['Hα (3 → 2)', 2, 3], ['Hβ (4 → 2)', 2, 4], ['Hγ (5 → 2)', 2, 5], ['Lyman-α (2 → 1)', 1, 2], ['Lyman-β (3 → 1)', 1, 3], ['Paschen-α (4 → 3)', 3, 4]]);
      const lam = 1 / (P.RH * (1 / (l[1] * l[1]) - 1 / (l[2] * l[2]))) * 1e9, big = lam > 1500, val = big ? lam / 1000 : lam, unit = big ? 'µm' : 'nm';
      const o = nums(val, unit, 3, [val * (1 / (l[1] * l[1]) - 1 / (l[2] * l[2])), 1 / (P.RH * (1 / (l[1] * l[1]) + 1 / (l[2] * l[2]))) * 1e9 / (big ? 1000 : 1), val * 2]);
      return { prompt: 'Use 1/λ = R(1/n₁² − 1/n₂²) with R = 1.097×10⁷ m⁻¹. What is the wavelength of the ' + l[0] + ' line of hydrogen?', right: o.right, wrong: o.wrong,
        explain: '1/λ = 1.097×10⁷ × (1/' + l[1] * l[1] + ' − 1/' + l[2] * l[2] + ') = ' + fmt(P.RH * (1 / (l[1] * l[1]) - 1 / (l[2] * l[2])), 4) + ' m⁻¹, so λ = ' + fmt(val, 4) + ' ' + unit + '.' };
    });
    L.calc('airmass-calc', 'Air mass', 2, r => {
      const alt = r.pick([15, 20, 30, 40, 45, 60, 75]), X = 1 / Math.sin(alt * Math.PI / 180);
      const o = nums(X, '', 3, [1 / Math.cos(alt * Math.PI / 180), Math.sin(alt * Math.PI / 180), 90 / alt], x => x);
      return { prompt: 'A star is observed at an altitude of ' + alt + '°. In the plane-parallel approximation its air mass is…', right: o.right, wrong: o.wrong, explain: 'X = sec z = 1/sin(altitude) = 1/sin ' + alt + '° = ' + fmt(X, 3) + ' (z = ' + (90 - alt) + '° is the zenith distance).' };
    });
    L.calc('eqtemp-calc', 'Planet equilibrium temperature', 3, r => {
      const b = r.pick([['Mars', 1.524, 0.25], ['Earth', 1, 0.306], ['Venus', 0.723, 0.77], ['Jupiter', 5.2, 0.34], ['Neptune', 30.1, 0.29], ['an airless rock at 0.4 AU', 0.4, 0.1]]);
      const T = P.eqTemp(b[1], b[2]), o = nums(T, 'K', 3, [P.eqTemp(b[1], 0), P.eqTemp(b[1] * b[1], b[2]), P.eqTemp(b[1], b[2]) * 1.2]);
      return { prompt: 'Using T = 278 K × (1 − A)^¼ / √d (d in AU), find the equilibrium temperature of ' + b[0] + ' at ' + b[1] + ' AU from the Sun with Bond albedo ' + b[2] + '.', right: o.right, wrong: o.wrong,
        explain: 'T = 278 K × (1 − ' + b[2] + ')^¼ / √' + b[1] + ' = ' + fmt(T, 3) + ' K (the real surface can be warmer because of a greenhouse effect).' };
    });
    L.calc('lighttime-calc', 'Light travel time', 1, r => {
      const b = r.pick([['the Moon (384 400 km)', 3.844e8], ['the Sun (1 AU)', P.AU], ['Jupiter at 5.2 AU', 5.2 * P.AU], ['Neptune at 30.1 AU', 30.1 * P.AU], ['Mars at 1.0×10⁸ km', 1e11], ['Voyager 1 at 165 AU', 165 * P.AU]]);
      const t = b[1] / P.c, unit = t < 100 ? 's' : t < 7200 ? 'min' : 'hours', val = t < 100 ? t : t < 7200 ? t / 60 : t / 3600;
      const o = nums(val, unit, 3, [val * 2, val / 2, val * 60 / (unit === 'min' ? 1 : 10)]);
      return { prompt: 'How long does light (or a radio signal) take to travel from Earth to ' + b[0] + '?', right: o.right, wrong: o.wrong, explain: 't = d/c = ' + fmt(b[1], 3) + ' m / 3.00×10⁸ m/s = ' + fmt(t, 3) + ' s' + (unit === 's' ? '' : ' = ' + fmt(val, 3) + ' ' + unit) + '.' };
    });

    // =============================================================================================== Stars
    const S = A.topic('stars');
    S.sheet([
      ['Spectral sequence', 'O B A F G K M', 'hot → cool; Sun = G2V'],
      ['Temperatures', 'O > 30 000 K · B 10–30 000 · A 7.5–10 000 · F 6–7.5 000 · G 5.2–6 000 · K 3.7–5.2 000 · M < 3 700', ''],
      ['Mass–luminosity', 'L ∝ M^3.5', 'main sequence, roughly'],
      ['Main-sequence lifetime', 't ≈ 10¹⁰ yr · (M/M☉)/(L/L☉) ∝ M^−2.5', ''],
      ['Hydrostatic equilibrium', 'dP/dr = −Gm ρ / r²', ''],
      ['Virial theorem', '2K + U = 0 → T ~ GMμm_H / kR', 'contraction heats a star'],
      ['Proper motion → velocity', 'v_t = 4.74 μ d', 'μ in ″/yr, d in pc, v in km/s'],
      ['Space velocity', 'v² = v_r² + v_t²', ''],
      ['Mean density', 'ρ = 3M / 4πR³', 'Sun 1410, white dwarf 10⁹, neutron star 10¹⁷ kg/m³'],
    ]);
    S.fact('sequence', 'Spectral classes', 1, [
      ['Spectral types from hottest to coolest run…', 'O B A F G K M', ['M K G F A B O', 'O A B F G K M', 'B O A G F K M']],
      ['The Sun is a star of spectral type…', 'G2V', ['K2V', 'F5III', 'M2V']],
      ['Vega and Sirius are stars of spectral type…', 'A', ['O', 'G', 'M']],
      ['Red dwarfs like Proxima Centauri are of spectral type…', 'M', ['G', 'F', 'B']],
      ['Which spectral class is the hottest?', 'O', ['A', 'G', 'M']],
    ], 'OBAFGKM from about 40 000 K down to 2 500 K (“Oh, Be A Fine Girl/Guy, Kiss Me”). The Sun is G2 on the main sequence (V).');
    S.fact('temps', 'Temperatures of the classes', 2, [
      ['Stars of spectral class O have surface temperatures above about…', '30 000 K', ['10 000 K', '6 000 K', '3 000 K']],
      ['A star with a surface temperature of about 5 800 K is of class…', 'G', ['A', 'M', 'B']],
      ['The surface temperature of M stars is below about…', '3 700 K', ['6 000 K', '10 000 K', '30 000 K']],
      ['Class A stars have surface temperatures of about…', '7 500–10 000 K', ['3 700–5 200 K', '10 000–30 000 K', '5 200–6 000 K']],
    ], 'O > 30 000 K, B 10–30 000, A 7 500–10 000, F 6 000–7 500, G 5 200–6 000, K 3 700–5 200, M < 3 700 K.');
    S.fact('features', 'Spectral features', 2, [
      ['Hydrogen Balmer absorption lines are strongest in stars of class…', 'A (about 10 000 K)', ['O', 'M', 'K']],
      ['Molecular bands of titanium oxide (TiO) dominate the spectra of…', 'M stars', ['O stars', 'A stars', 'G stars']],
      ['Lines of ionised helium appear only in the spectra of…', 'the hottest stars (class O)', ['A stars', 'the Sun', 'M stars']],
      ['Different stars show different spectral lines mainly because of differences in…', 'surface temperature (excitation and ionisation), not composition', ['chemical composition alone', 'distance', 'rotation']],
    ], 'Line strengths follow the Boltzmann and Saha equations: hydrogen’s n = 2 level is most populated near 10 000 K (class A), He II needs > 30 000 K, molecules survive only below ~4 000 K (class M). Most stars are ~74% hydrogen by mass whatever their class.');
    S.fact('lumclass', 'Luminosity classes', 2, [
      ['Luminosity class V denotes…', 'main-sequence stars (dwarfs)', ['supergiants', 'giants', 'white dwarfs']],
      ['Luminosity class I denotes…', 'supergiants', ['dwarfs', 'subgiants', 'white dwarfs']],
      ['Luminosity class III denotes…', 'giants', ['dwarfs', 'supergiants', 'subdwarfs']],
      ['Narrow spectral lines indicate a star of … luminosity', 'high (low surface gravity and pressure)', ['low (high gravity)', 'zero', 'average']],
    ], 'I supergiants, II bright giants, III giants, IV subgiants, V dwarfs (main sequence). Large, luminous stars have low surface gravity and pressure, so their lines are narrower.');
    S.figs({
      prefix: 'hr', tier: 1, group: 'The H–R diagram', ask: 'Which group of stars lies in the circled region of the H–R diagram?', askName: n => 'In which picture is the circled region where ' + n.toLowerCase() + ' are found?',
      items: [
        { id: 'ms', name: 'Main-sequence stars', fig: 'star.hr#ms', note: 'The main sequence runs from hot, luminous blue stars (top left) to cool, faint red dwarfs (bottom right); about 90% of stars, including the Sun, are on it, fusing hydrogen in their cores.' },
        { id: 'giants', name: 'Red giants', fig: 'star.hr#giants', note: 'Red giants are cool (about 4 000–5 000 K) but luminous (10–1000 L☉) because they are huge: shell-burning stars that have left the main sequence.' },
        { id: 'super', name: 'Supergiants', fig: 'star.hr#super', note: 'Supergiants are the most luminous stars (10⁴–10⁶ L☉), across the top of the diagram, from blue Rigel to red Betelgeuse: massive stars near the end of their lives.' },
        { id: 'wd', name: 'White dwarfs', fig: 'star.hr#wd', note: 'White dwarfs are hot but very faint (small, Earth-sized) objects at the lower left: the cooling cores of dead low-mass stars.' },
      ],
    });
    S.gallery([
      ['star.hr#all', 'The Hertzsprung–Russell diagram', 'Luminosity against surface temperature (hot on the left). The main sequence runs from hot, luminous blue stars to cool, faint red dwarfs; giants and supergiants lie above it, white dwarfs below.', 'The H–R diagram'],
      ['star.eclipsing', 'Eclipsing binary light curve', 'Two dips per orbit; the deeper one is where the hotter star (higher surface brightness) is eclipsed. Timing gives the period, depths the temperature ratio.', 'Variable stars and clusters'],
      ['star.cepheid', 'Cepheid light curve', 'A fast rise and a slow decline repeating every few days; the period tells the luminosity.', 'Variable stars and clusters'],
      ['star.cluster#old', 'An old cluster’s H–R diagram', 'The main sequence ends low down at the turn-off point; red-giant and horizontal branches are populated.', 'Variable stars and clusters'],
      ['star.cluster#young', 'A young cluster’s H–R diagram', 'The main sequence reaches up to hot, bright blue stars: the cluster has not had time to evolve its massive stars.', 'Variable stars and clusters'],
    ]);
    S.fact('hr', 'The H–R diagram', 1, [
      ['In a Hertzsprung–Russell diagram, temperature increases towards the…', 'left', ['right', 'top', 'bottom']],
      ['The vertical axis of an H–R diagram shows…', 'luminosity (or absolute magnitude)', ['distance', 'mass', 'age']],
      ['About 90% of stars lie on the…', 'main sequence', ['giant branch', 'white-dwarf sequence', 'supergiant branch']],
      ['At the same temperature, a star that lies far above the main sequence is…', 'much larger', ['much smaller', 'much younger always', 'much closer always']],
      ['Which two astronomers independently created the diagram around 1910?', 'Hertzsprung and Russell', ['Hubble and Humason', 'Cannon and Pickering', 'Eddington and Chandrasekhar']],
    ], 'The H–R diagram plots luminosity (or M) against temperature (or spectral type or colour), with hot on the LEFT. Because L = 4πR²σT⁴, stars far above the main sequence at the same T must be larger.');
    S.fact('ms', 'Main-sequence physics', 2, [
      ['Main-sequence stars generate energy by…', 'fusing hydrogen into helium in their cores', ['gravitational contraction', 'burning carbon', 'nuclear fission']],
      ['In stars heavier than about 1.3 M☉ hydrogen fusion mainly proceeds via the…', 'CNO cycle', ['proton–proton chain', 'triple-alpha process', 'neutron capture']],
      ['The temperature at the Sun’s centre is about…', '15 million K', ['5 800 K', '1 million K', '15 billion K']],
      ['Fusing hydrogen to helium converts about … of the mass into energy.', '0.7%', ['7%', '0.07%', '25%']],
      ['Why does a star need a very high central temperature for fusion?', 'To overcome the electrostatic repulsion between nuclei (helped by quantum tunnelling)', ['To melt the hydrogen', 'To make the nuclei heavier', 'To produce neutrinos']],
    ], 'Four protons become one helium-4 nucleus, releasing 26.7 MeV (0.7% of the rest mass). The p–p chain dominates in the Sun, the CNO cycle (strongly temperature-dependent) above ~1.3 M☉.');
    S.fact('masslum', 'Mass, luminosity and lifetime', 2, [
      ['On the main sequence, luminosity depends on mass roughly as…', 'L ∝ M^3.5', ['L ∝ M', 'L ∝ M^0.5', 'L ∝ M^10']],
      ['More massive main-sequence stars live…', 'shorter lives', ['longer lives', 'equally long', 'forever']],
      ['Main-sequence lifetime scales roughly as…', 'M^−2.5', ['M^2.5', 'M^−1', 'M^0']],
      ['A 10 M☉ star lives about … on the main sequence.', '30 million years', ['10 billion years', '3 billion years', '300 000 years']],
    ], 'Fuel ∝ M but the burn rate L ∝ M^3.5, so lifetime ∝ M/L ∝ M^−2.5: the Sun 10 Gyr, a 10 M☉ star ~30 Myr (10¹⁰ × 10^−2.5).');
    S.fact('equilibrium', 'Hydrostatic equilibrium', 2, [
      ['A star is stable because…', 'gravity is balanced by the pressure gradient (hydrostatic equilibrium)', ['fusion pushes outwards faster than gravity pulls in', 'its rotation balances gravity', 'magnetic fields hold it together']],
      ['A self-gravitating star that loses energy and contracts…', 'heats up (virial theorem, negative heat capacity)', ['cools down', 'stays the same temperature', 'stops radiating']],
      ['A star’s fusion rate is self-regulating because…', 'a higher core temperature makes the star expand and cool, reducing fusion', ['fusion produces no heat', 'the outer layers absorb extra energy', 'neutrinos carry the energy away']],
    ], 'dP/dr = −Gmρ/r². By the virial theorem 2K + U = 0, so a contracting star’s kinetic (thermal) energy rises: it heats up. This feedback gives stars a thermostat.');
    S.fact('transport', 'Energy transport', 2, [
      ['In the Sun, energy in the outer ~30% by radius is carried mainly by…', 'convection', ['radiation', 'conduction', 'neutrinos']],
      ['In the Sun’s core and radiative zone energy is carried by…', 'radiation (photons diffusing slowly)', ['convection', 'conduction', 'sound waves']],
      ['Stars of less than about 0.35 M☉ are…', 'fully convective', ['fully radiative', 'made only of helium', 'unable to shine']],
      ['Photons need about … to random-walk out of the Sun’s core.', '100 000 years or more', ['8 minutes', '1 second', '1 day']],
    ], 'Radiation carries energy outward through the Sun’s inner 70% (photons take ~10⁵ years to diffuse out); above that the gas is convective. Low-mass red dwarfs are fully convective, high-mass stars have convective cores.');
    S.fact('sun', 'The Sun', 1, [
      ['The Sun’s visible “surface” is the…', 'photosphere', ['chromosphere', 'corona', 'core']],
      ['The temperature of the solar corona is about…', '1–2 million K', ['5 800 K', '15 million K', '4 000 K']],
      ['Sunspots look dark because they are…', 'cooler (about 4 000 K) than the surrounding photosphere', ['holes in the Sun', 'made of different elements', 'hotter']],
      ['The sunspot cycle lasts about…', '11 years', ['1 year', '22 months', '100 years']],
      ['The Sun’s radius is about … times that of the Earth.', '109', ['10', '1 000', '27']],
      ['The Sun’s luminosity is about…', '3.8×10²⁶ W', ['3.8×10²² W', '3.8×10³⁰ W', '3.8×10⁶ W']],
      ['The Sun’s mass is about…', '2×10³⁰ kg', ['2×10²⁷ kg', '2×10²⁴ kg', '2×10³³ kg']],
    ], 'The Sun: 1.99×10³⁰ kg, 6.96×10⁸ m (109 R⊕), 3.83×10²⁶ W, T_eff 5772 K, age 4.6 Gyr. The corona (1–2 MK) is far hotter than the photosphere; the 11-year sunspot cycle is half of a 22-year magnetic cycle.');
    S.fact('colour', 'Colour index', 1, [
      ['A star with a large positive B − V is…', 'red and cool', ['blue and hot', 'white and hot', 'yellow and medium']],
      ['A star with a negative B − V is…', 'blue and hot', ['red and cool', 'yellow like the Sun', 'always a giant']],
      ['The Sun’s B − V colour index is about…', '+0.65', ['−0.3', '+1.8', '0.0']],
    ], 'B − V compares brightness through the blue and visual filters: hot blue stars have B − V ≈ −0.3, Vega 0.0, the Sun +0.65, red Betelgeuse +1.85.');
    S.fact('binaries', 'Binary stars', 2, [
      ['Which type of binary is detected by periodic Doppler shifts of spectral lines?', 'Spectroscopic binary', ['Visual binary', 'Eclipsing binary', 'Astrometric binary']],
      ['An eclipsing binary shows…', 'periodic dips in brightness as one star passes in front of the other', ['a steady light curve', 'a pulsation with a fast rise and slow decline', 'a single brightening']],
      ['In this eclipsing-binary light curve, the deeper dip happens when…', 'the hotter star (higher surface brightness) is eclipsed', ['the larger star is eclipsed', 'the cooler star is eclipsed', 'the star is pulsating'], { fig: 'star.eclipsing' }],
      ['About what fraction of Sun-like stars are in binary or multiple systems?', 'About half', ['Almost none', 'Nearly all', 'One in a thousand']],
      ['Which method gives the masses of stars most directly?', 'Orbits of binary stars (Kepler’s third law)', ['Spectral type', 'Colour', 'Parallax']],
    ], 'Binaries are visual, astrometric, spectroscopic or eclipsing; eclipsing systems with radial velocities give both masses and radii. The primary (deeper) minimum is when the higher-surface-brightness (hotter) star is covered.');
    S.fact('cepheids', 'Variable stars', 2, [
      ['Cepheid variables follow a relation between…', 'pulsation period and luminosity', ['colour and distance', 'mass and radius', 'age and metallicity']],
      ['A Cepheid with a longer period is…', 'more luminous', ['less luminous', 'closer', 'hotter']],
      ['Who discovered the period–luminosity relation in 1908–1912?', 'Henrietta Leavitt', ['Edwin Hubble', 'Annie Cannon', 'Cecilia Payne']],
      ['A light curve with a fast rise and a slow decline over several days is typical of…', 'a Cepheid variable', ['an eclipsing binary', 'a supernova', 'a nova'], { fig: 'star.cepheid' }],
      ['RR Lyrae stars are used as standard candles for…', 'old populations such as globular clusters (M_V ≈ +0.6)', ['distant galaxies at z > 1', 'planetary nebulae', 'the Sun']],
      ['Mira variables are…', 'pulsating red giants with periods of hundreds of days', ['eclipsing binaries', 'young blue stars', 'supernova precursors']],
    ], 'Cepheids (periods 1–100 days) pulsate because of the helium ionisation “valve”; their period fixes their luminosity (Leavitt 1912), making them standard candles. RR Lyrae stars all have M_V ≈ +0.6.');
    S.fact('clusters', 'Star clusters', 2, [
      ['Compared with open clusters, globular clusters are…', 'older, richer and more tightly bound', ['younger and sparser', 'found only in the disc', 'made only of gas']],
      ['The turn-off point on a cluster’s H–R diagram tells us the cluster’s…', 'age', ['distance only', 'total mass', 'colour excess']],
      ['The H–R diagram of this cluster has its main-sequence turn-off at low luminosity. The cluster is…', 'old', ['young', 'closer than average', 'hotter than average'], { fig: 'star.cluster#old' }],
      ['The H–R diagram of this cluster extends along the main sequence far up to bright blue stars. The cluster is…', 'young', ['old', 'a globular cluster', 'made of white dwarfs'], { fig: 'star.cluster#young' }],
    ], 'All stars in a cluster formed together, so the most massive ones leave the main sequence first: the higher the turn-off, the younger the cluster. Open clusters (Pleiades) are young; globulars (M13) are ~12 Gyr old.');
    S.fact('populations', 'Stellar populations and metals', 2, [
      ['Population II stars are…', 'old and metal-poor', ['young and metal-rich', 'all blue giants', 'only found in the disc']],
      ['In astronomy “metals” means…', 'all elements heavier than helium', ['iron-group elements only', 'magnetic materials', 'elements heavier than hydrogen']],
      ['The Sun’s metal content (Z) is about…', '1–2% by mass', ['10%', '50%', '0.001%']],
    ], 'Population I (young, metal-rich, disc, spiral arms) versus Population II (old, metal-poor, halo, bulge and globular clusters). Z ≈ 0.014 for the Sun; X ≈ 0.74 (H), Y ≈ 0.25 (He).');
    S.fact('nearby', 'Nearby stars', 1, [
      ['The nearest star to the Sun (after the Sun) is…', 'Proxima Centauri (4.24 ly)', ['Sirius', 'Alpha Centauri A', 'Barnard’s Star']],
      ['Sirius, the brightest star in the night sky, is at a distance of about…', '8.6 light-years', ['4.2 light-years', '86 light-years', '860 light-years']],
      ['Which star has the largest proper motion (about 10″ per year)?', 'Barnard’s Star', ['Sirius', 'Polaris', 'Vega']],
      ['Which is the brightest star in the northern sky (apparent magnitude −0.05)?', 'Arcturus', ['Polaris', 'Vega', 'Betelgeuse']],
    ], 'Proxima Centauri is 4.24 ly away; Sirius A is 8.6 ly (magnitude −1.46). Barnard’s Star, 6 ly away, moves 10.4″ per year. Arcturus (−0.05) is the brightest star of the northern celestial hemisphere, ahead of Vega and Capella.');
    S.fact('masslimits', 'Mass limits', 3, [
      ['A star must have at least … to fuse ordinary hydrogen.', '0.08 M☉ (about 80 Jupiter masses)', ['0.8 M☉', '0.008 M☉', '8 M☉']],
      ['Objects between about 13 and 80 Jupiter masses are…', 'brown dwarfs', ['planets', 'white dwarfs', 'neutron stars']],
      ['The most massive stars known have about…', '100–200 solar masses', ['10 solar masses', '1 000 solar masses', '3 000 solar masses']],
    ], 'Below ~0.08 M☉ the core never reaches the temperature needed for hydrogen fusion (brown dwarfs, which can burn deuterium above ~13 M_Jup). Radiation pressure limits stars to ~150 M☉.');
    S.calc('mlr-calc', 'Luminosity from mass', 2, r => {
      const M = r.pick([0.5, 2, 3, 5, 8, 10, 15, 20]), lum = Math.pow(M, 3.5);
      const o = nums(lum, 'L☉', 3, [M * M, Math.pow(M, 3), Math.pow(M, 4)]);
      return { prompt: 'Assume a main-sequence mass–luminosity relation L ∝ M^3.5. What is the luminosity of a ' + M + ' M☉ star?', right: o.right, wrong: o.wrong, explain: 'L/L☉ = (M/M☉)^3.5 = ' + M + '^3.5 = ' + fmt(lum, 3) + '.' };
    });
    S.calc('lifetime-calc', 'Main-sequence lifetime', 2, r => {
      const M = r.pick([0.5, 2, 3, 5, 10, 20]), t = 1e10 * Math.pow(M, -2.5), gyr = t >= 1e9, div = gyr ? 1e9 : 1e6;
      const val = t / div, unit = gyr ? 'Gyr' : 'Myr';
      const o = nums(val, unit, 3, [1e10 / M / div, 1e10 * Math.pow(M, -3.5) / div, 1e10 * Math.pow(M, -1.5) / div]);
      return { prompt: 'The Sun’s main-sequence lifetime is about 10 Gyr. Using L ∝ M^3.5 and lifetime ∝ fuel / luminosity, how long does a ' + M + ' M☉ star spend on the main sequence?', right: o.right, wrong: o.wrong,
        explain: 't = 10¹⁰ yr × (M/L) = 10¹⁰ × M^−2.5 = 10¹⁰ × ' + M + '^−2.5 = ' + fmt(val, 3) + ' ' + unit + '.' };
    });
    S.calc('tangential-calc', 'Tangential velocity', 3, r => {
      const b = r.pick([['Barnard’s Star', 10.37, 1.83], ['61 Cygni', 5.28, 3.49], ['Kapteyn’s Star', 8.67, 3.93], ['Proxima Centauri', 3.85, 1.30], ['Groombridge 1830', 7.06, 9.2]]);
      const v = 4.74 * b[1] * b[2], o = nums(v, 'km/s', 3, [4.74 * b[1] / b[2], b[1] * b[2], 4.74 * b[1] * b[1] * b[2]]);
      return { prompt: b[0] + ' has a proper motion of ' + b[1] + '″ per year and lies ' + b[2] + ' pc away. What is its tangential velocity?', right: o.right, wrong: o.wrong, explain: 'v_t = 4.74 μ d = 4.74 × ' + b[1] + ' × ' + b[2] + ' = ' + fmt(v, 3) + ' km/s (μ in ″/yr, d in pc).' };
    });
    S.calc('density-calc', 'Mean density', 3, r => {
      const b = r.pick([['the Sun', 1.0, 1.0 * P.Rsun], ['Sirius B (a white dwarf)', 1.02, 0.0084 * P.Rsun], ['a typical white dwarf', 0.6, 0.0125 * P.Rsun], ['a neutron star', 1.4, 12e3], ['Betelgeuse', 15, 750 * P.Rsun], ['Earth (in kg, not solar masses)', P.Mearth / P.Msun, P.Rearth]]);
      const rho = 3 * b[1] * P.Msun / (4 * Math.PI * Math.pow(b[2], 3));
      const o = nums(rho, 'kg/m³', 2, [rho / 8, rho * 1000, rho * 3 / 4]);
      return { prompt: 'Estimate the mean density of ' + b[0] + ', with a mass of ' + fmt(b[1], 3) + ' M☉ and a radius of ' + fmt(b[2] / 1e3, 3) + ' km.', right: o.right, wrong: o.wrong, explain: 'ρ = 3M / 4πR³ = ' + fmt(rho, 2) + ' kg/m³.' };
    });

    // =============================================================================================== Magnitudes & distances
    const M = A.topic('mags');
    M.sheet([
      ['Pogson’s relation', 'm₁ − m₂ = −2.5 log₁₀(F₁/F₂)', '5 mag = ×100; 1 mag = ×2.512'],
      ['Distance modulus', 'm − M = 5 log₁₀(d / 10 pc) = 5 log d − 5', 'd in parsecs'],
      ['With extinction', 'm − M = 5 log d − 5 + A', 'dust makes stars fainter'],
      ['Parallax', 'd (pc) = 1 / p (″)', '1 pc = 3.26 ly = 206 265 AU'],
      ['Combining magnitudes', 'm = −2.5 log₁₀(10^−0.4m₁ + 10^−0.4m₂)', 'two equal stars: m − 0.75'],
      ['Bolometric', 'M_bol = 4.74 − 2.5 log₁₀(L/L☉)', ''],
      ['Cepheid P–L', 'M_V = −2.43 (log₁₀P − 1) − 4.05', 'P in days'],
      ['Units', '1 AU = 1.496×10¹¹ m · 1 ly = 9.46×10¹⁵ m · 1 pc = 3.086×10¹⁶ m', ''],
    ]);
    M.gallery([['mag.scale', 'The magnitude scale', 'Smaller (more negative) means brighter; every 5 magnitudes is a factor of 100 in flux. From the Sun to the faintest objects Hubble can image is more than 57 magnitudes, a factor of 10²³.', 'Magnitudes']]);
    M.fact('scale', 'The magnitude scale', 1, [
      ['A difference of 5 magnitudes corresponds to a brightness ratio of…', '100', ['5', '25', '10']],
      ['A star of magnitude 1 is … times brighter than a star of magnitude 6.', '100', ['5', '6', '1 000']],
      ['Smaller (more negative) magnitudes mean…', 'brighter objects', ['fainter objects', 'larger stars', 'hotter stars']],
      ['One magnitude step is a brightness ratio of about…', '2.5', ['2.0', '2.718', '10']],
      ['The magnitude scale was devised by Hipparchus and made quantitative by…', 'Norman Pogson (1856)', ['Edwin Hubble', 'Isaac Newton', 'William Herschel']],
    ], 'Hipparchus ranked stars from 1 (brightest) to 6; Pogson (1856) fixed 5 magnitudes = ×100, so one magnitude = 100^(1/5) = 2.512.');
    M.fact('known', 'Magnitudes to remember', 1, [
      ['The apparent magnitude of the Sun is about…', '−26.7', ['−12.7', '0', '+4.8']],
      ['The full Moon has an apparent magnitude of about…', '−12.7', ['−26.7', '−4', '0']],
      ['Sirius, the brightest star of the night sky, has magnitude…', '−1.46', ['0.0', '+1.5', '−4.6']],
      ['At its brightest, Venus reaches a magnitude of about…', '−4.9', ['−1', '−12', '0']],
      ['Vega defines the zero point of the magnitude scale, at about…', '0', ['−1.46', '+2', '+6']],
      ['Polaris has an apparent magnitude of about…', '2', ['−2', '6', '0']],
    ], 'Sun −26.7, full Moon −12.7, Venus −4.9, Sirius −1.46, Vega 0.0, Polaris 2.0, naked-eye limit ~6, binoculars ~9, Hubble ~31.');
    M.fact('absolute', 'Absolute magnitude', 1, [
      ['Absolute magnitude is the apparent magnitude a star would have at a distance of…', '10 parsecs', ['1 parsec', '1 light-year', '1 AU']],
      ['The Sun’s absolute visual magnitude is about…', '+4.8', ['−26.7', '0', '+10']],
      ['If a star’s apparent magnitude m is smaller than its absolute magnitude M, the star is…', 'closer than 10 pc', ['farther than 10 pc', 'exactly 10 pc away', 'hotter than the Sun']],
      ['m − M is called the…', 'distance modulus', ['colour index', 'bolometric correction', 'parallax']],
    ], 'M = m at d = 10 pc. The distance modulus m − M = 5 log₁₀(d/10 pc): positive for stars farther than 10 pc.');
    M.fact('parallax', 'Parallax', 1, [
      ['The parallax of a star at 10 parsecs is…', '0.1 arcsecond', ['10 arcseconds', '1 arcsecond', '0.01 arcsecond']],
      ['One parsec is the distance at which…', '1 AU subtends an angle of 1 arcsecond', ['1 light-year subtends 1″', '1 AU subtends 1°', 'the Earth’s radius subtends 1″']],
      ['1 parsec equals about…', '3.26 light-years', ['1 light-year', '206 light-years', '9.46 light-years']],
      ['The first stellar parallax (61 Cygni) was measured in 1838 by…', 'Friedrich Bessel', ['Edwin Hubble', 'Galileo', 'Tycho Brahe']],
      ['The Gaia satellite measures the parallaxes of…', 'over a billion stars, to microarcsecond precision', ['the 5 000 brightest stars only', 'only nearby galaxies', 'planets of other stars']],
    ], 'Annual parallax p = 1 AU / d, so d (pc) = 1/p (″). 1 pc = 206 265 AU = 3.26 ly. Ground-based parallaxes reach ~0.01″ (100 pc); Hipparcos 1 mas; Gaia ~10–100 µas.');
    M.fact('ladder', 'The distance ladder', 2, [
      ['What is the correct order of the cosmic distance ladder, from near to far?', 'Parallax → Cepheids → Type Ia supernovae → Hubble flow', ['Cepheids → parallax → Hubble flow → supernovae', 'Supernovae → Cepheids → parallax', 'Hubble flow → parallax → Cepheids']],
      ['A standard candle is an object that…', 'has a known luminosity', ['is brighter than the Sun', 'does not move', 'is within the Solar System']],
      ['Type Ia supernovae serve as standard candles because…', 'they reach nearly the same peak luminosity (M ≈ −19.3)', ['they are all nearby', 'they are very faint', 'they have no hydrogen']],
      ['Which standard candle is used in globular clusters and old populations?', 'RR Lyrae stars', ['Cepheids', 'Type Ia supernovae', 'Mira variables']],
    ], 'Each rung calibrates the next: parallax → Cepheids (to ~30 Mpc) → Type Ia supernovae (to ~Gpc) → redshift and the Hubble law. Standard candles: RR Lyrae (M_V ≈ +0.6), Cepheids (−2 to −7), SN Ia (−19.3).');
    M.fact('extinction', 'Extinction and reddening', 2, [
      ['Interstellar dust makes stars look…', 'fainter and redder', ['brighter and bluer', 'brighter and redder', 'fainter and bluer']],
      ['If extinction is ignored, the distance to a star is…', 'overestimated', ['underestimated', 'unaffected', 'zero']],
      ['The colour excess E(B − V) is used to find…', 'the amount of dust extinction', ['the star’s temperature', 'the star’s mass', 'the distance modulus']],
    ], 'Dust dims starlight (A_V ≈ 3.1 E(B − V)), more at shorter wavelengths. A dimmed star looks farther than it is unless m − M = 5 log d − 5 + A is used.');
    M.calc('pogson-ratio', 'Brightness ratios', 1, r => {
      const pair = r.pick([['the Sun (−26.74)', '−12.74', 'the full Moon', 14], ['Sirius (−1.46)', '1.98', 'Polaris', 3.44], ['Vega (0.03)', '6.0', 'the faintest naked-eye star', 5.97], ['Venus at its brightest (−4.9)', '−1.46', 'Sirius', 3.44]]);
      if (r.rnd() < 0.5) {
        const ratio = Math.pow(10, 0.4 * pair[3]), o = nums(ratio, '', 3, [pair[3] * 2.512, Math.pow(10, pair[3]), pair[3] * 20], x => x + ' times');
        return { prompt: 'How many times brighter does ' + pair[0] + ' appear than ' + pair[2] + ' (magnitude ' + pair[1] + ')?', right: o.right, wrong: o.wrong, explain: 'F₁/F₂ = 10^(0.4 Δm) = 10^(0.4 × ' + pair[3] + ') = ' + fmt(ratio, 3) + '.' };
      }
      const dm = r.pick([0.5, 1, 1.5, 2, 3, 4, 7.5, 10]), ratio = Math.pow(10, 0.4 * dm);
      const o = nums(ratio, '', 3, [dm * 2.512, Math.pow(10, dm), dm * 20], x => x + ' times');
      return { prompt: 'Star A is ' + dm + ' magnitudes brighter than star B. How many times more flux does A deliver?', right: o.right, wrong: o.wrong, explain: 'F_A/F_B = 10^(0.4 Δm) = 10^(0.4 × ' + dm + ') = ' + fmt(ratio, 3) + '.' };
    });
    M.calc('pogson-delta', 'Magnitude difference from a ratio', 1, r => {
      const k = r.pick([2, 4, 10, 40, 100, 250, 1000, 10000]), dm = 2.5 * log10(k);
      const o = nums(dm, 'mag', 3, [log10(k), 2.5 * k, 5 * log10(k)]);
      return { prompt: 'Star A delivers ' + k + ' times more flux than star B. By how many magnitudes is A brighter?', right: o.right, wrong: o.wrong, explain: 'Δm = 2.5 log₁₀(F_A/F_B) = 2.5 log₁₀ ' + k + ' = ' + fmt(dm, 3) + '.' };
    });
    M.calc('dmod-d', 'Distance from the distance modulus', 2, r => {
      const Mabs = r.pick([-5, -3.5, 0.6, 1.5, 4.8, 7, 10]), d = r.pick([15, 50, 120, 400, 1500, 6000, 20000]), m = Math.round((Mabs + 5 * log10(d / 10)) * 10) / 10;
      const dd = Math.pow(10, (m - Mabs + 5) / 5), o = nums(dd, 'pc', 3, [dd / 10, dd * 3.26, dd * dd / 10, dd / 3.26]);
      return { prompt: 'A star has an absolute magnitude of ' + mn(Mabs) + ' and an apparent magnitude of ' + mn(m) + '. Ignoring extinction, how far away is it?', right: o.right, wrong: o.wrong, explain: 'm − M = 5 log₁₀(d/10 pc) = ' + mn(fmt(m - Mabs, 3)) + ' → d = 10 × 10^((m − M)/5) = ' + fmt(dd, 3) + ' pc.' };
    });
    M.calc('dmod-M', 'Absolute magnitude from distance', 2, r => {
      const d = r.pick([5, 20, 50, 100, 500, 1000, 2000]), m = r.pick([3.5, 6.2, 8.2, 10.4, 12.1, 14.5]), Ma = m - 5 * log10(d / 10);
      const o = nums(Ma, '', 3, [m + 5 * log10(d / 10), m - 5 * log10(d), m - 2.5 * log10(d / 10)], x => x);
      return { prompt: 'A star at a distance of ' + d + ' pc has an apparent magnitude of ' + m + '. What is its absolute magnitude (no extinction)?', right: o.right, wrong: o.wrong, explain: 'M = m − 5 log₁₀(d/10 pc) = ' + m + ' − 5 log₁₀(' + d + '/10) = ' + fmt(Ma, 3) + '.' };
    });
    M.calc('parallax-calc', 'Distance from parallax', 1, r => {
      const b = r.pick([['Proxima Centauri', 0.7681], ['Sirius', 0.3792], ['Vega', 0.1302], ['Barnard’s Star', 0.5469], ['Arcturus', 0.0889], ['Procyon', 0.2859], ['61 Cygni', 0.2861]]);
      const d = 1 / b[1], o = nums(d, 'pc', 3, [b[1], d * 3.26, 1 / (b[1] * b[1])]);
      return { prompt: b[0] + ' has a parallax of ' + b[1] + '″. Its distance is…', right: o.right, wrong: o.wrong, explain: 'd (pc) = 1/p (″) = 1/' + b[1] + ' = ' + fmt(d, 3) + ' pc = ' + fmt(d * 3.2616, 3) + ' ly.' };
    });
    M.calc('combined', 'Combined magnitude', 3, r => {
      const m1 = r.pick([1, 2, 3, 4, 5]), m2 = m1 + r.pick([0, 0.5, 1, 1.5, 2]);
      const m = -2.5 * log10(Math.pow(10, -0.4 * m1) + Math.pow(10, -0.4 * m2));
      const o = nums(m, '', 3, [m1 + m2, (m1 + m2) / 2, m1], x => x);
      return { prompt: 'Two stars of magnitudes ' + m1 + ' and ' + m2 + ' are so close that they appear as one. What is their combined apparent magnitude?', right: o.right, wrong: o.wrong,
        explain: 'Add the fluxes, not the magnitudes: m = −2.5 log₁₀(10^(−0.4×' + m1 + ') + 10^(−0.4×' + m2 + ')) = ' + fmt(m, 3) + '. (Two equal stars are 0.75 mag brighter than one.)' };
    });
    M.calc('bolometric', 'Luminosity from bolometric magnitude', 3, r => {
      const mb = r.pick([-6, -3, 0, 2, 8, 10]), lum = Math.pow(10, -0.4 * (mb - 4.74));
      const o = nums(lum, 'L☉', 3, [Math.pow(10, 0.4 * (mb - 4.74)), Math.pow(10, -0.4 * mb), Math.pow(2.512, 4.74 - mb) / 10]);
      return { prompt: 'A star has an absolute bolometric magnitude of ' + mn(mb) + ' (the Sun’s is 4.74). Its luminosity is…', right: o.right, wrong: o.wrong, explain: 'L/L☉ = 10^(−0.4 (M_bol − 4.74)) = 10^(−0.4 × (' + mn(mb) + ' − 4.74)) = ' + fmt(lum, 3) + '.' };
    });
    M.calc('extinction-calc', 'Distance with extinction', 3, r => {
      const Mabs = r.pick([-2, 0.6, 1.5, 4.8]), A = r.pick([0.5, 1, 1.5, 2.5]), d = r.pick([200, 500, 1000, 2500, 5000]);
      const m = Math.round((Mabs + 5 * log10(d / 10) + A) * 10) / 10, dd = Math.pow(10, (m - Mabs - A + 5) / 5);
      const o = nums(dd, 'pc', 3, [Math.pow(10, (m - Mabs + 5) / 5), Math.pow(10, (m - Mabs + A + 5) / 5), dd / 10]);
      return { prompt: 'A star has M = ' + mn(Mabs) + ' and appears at m = ' + m + ', but interstellar dust dims it by A = ' + A + ' mag. How far away is it?', right: o.right, wrong: o.wrong, explain: 'm − M = 5 log₁₀(d/10) + A, so d = 10 × 10^((m − M − A)/5) = ' + fmt(dd, 3) + ' pc. Ignoring the dust would give ' + fmt(Math.pow(10, (m - Mabs + 5) / 5), 3) + ' pc.' };
    });
    M.calc('cepheid-calc', 'Cepheid distance', 3, r => {
      const Pd = r.pick([3, 5, 10, 20, 30, 50]), m = r.pick([12, 13.5, 15, 17, 19.5]), Mv = -2.43 * (log10(Pd) - 1) - 4.05, d = Math.pow(10, (m - Mv + 5) / 5);
      const big = d > 5000, val = big ? d / 1000 : d, unit = big ? 'kpc' : 'pc';
      const alt = [-2.43 * log10(Pd) - 4.05, Mv].map(x => Math.pow(10, (m - x + 5) / 5) / (big ? 1000 : 1));
      const o = nums(val, unit, 3, [alt[0], val / 10, val * 3.26]);
      return { prompt: 'A Cepheid has a period of ' + Pd + ' days and an apparent magnitude of ' + m + '. Using M_V = −2.43 (log₁₀P − 1) − 4.05, how far away is it?', right: o.right, wrong: o.wrong, explain: 'M_V = −2.43 (log ' + Pd + ' − 1) − 4.05 = ' + fmt(Mv, 3) + '. Then d = 10 × 10^((m − M)/5) = ' + fmt(d, 3) + ' pc.' };
    });
    M.calc('units-calc', 'Distance units', 1, r => {
      const c = r.pick([['pc', 'ly', 3.2616, 5, '3.26'], ['pc', 'AU', 206265, 2, '206 265'], ['ly', 'pc', 1 / 3.2616, 10, '0.307'], ['ly', 'AU', 63241, 3, '63 241'], ['AU', 'light-minutes', 8.317, 4, '8.32']]);
      const x = c[3], v = x * c[2], o = nums(v, c[1], 3, [x / c[2], v * 10, v / 10]);
      return { prompt: 'Convert ' + x + ' ' + c[0] + ' to ' + c[1] + '.', right: o.right, wrong: o.wrong, explain: '1 ' + c[0] + ' = ' + c[4] + ' ' + c[1] + ', so ' + x + ' ' + c[0] + ' = ' + fmt(v, 3) + ' ' + c[1] + '.' };
    });

    // =============================================================================================== Stellar evolution
    const E = A.topic('evolution');
    E.sheet([
      ['Chandrasekhar limit', '≈ 1.4 M☉', 'max mass of a white dwarf'],
      ['Neutron star limit', '≈ 2–3 M☉', 'above this → black hole'],
      ['Schwarzschild radius', 'R_s = 2GM/c² = 2.95 km · (M/M☉)', ''],
      ['Fusion yield', '4 ¹H → ⁴He releases 0.7% of the mass (26.7 MeV)', 'E = Δm c²'],
      ['Sun’s lifetime', 'about 0.1 × 0.007 M☉c² / L☉ ≈ 10 Gyr', ''],
      ['Jeans mass', 'M_J ∝ T^(3/2) ρ^(−1/2)', 'cold, dense clouds collapse'],
      ['Triple-alpha', '3 ⁴He → ¹²C at ~10⁸ K', ''],
      ['Size/density', 'WD: R ≈ R⊕, ρ ≈ 10⁹ kg/m³ · NS: R ≈ 12 km, ρ ≈ 10¹⁷ kg/m³', ''],
    ]);
    E.gallery([['evol.paths', 'Life paths of stars', 'A star’s mass decides its fate: below about 8 solar masses it ends as a white dwarf after a planetary nebula; above, a core-collapse supernova leaves a neutron star or a black hole.', 'Stellar life cycles']]);
    E.fact('birth', 'Star formation', 1, [
      ['Stars form in…', 'cold, dense molecular clouds', ['hot ionised nebulae only', 'supernova remnants only', 'the galactic halo']],
      ['A cloud collapses under its own gravity if its mass exceeds the…', 'Jeans mass', ['Chandrasekhar mass', 'Eddington mass', 'Roche mass']],
      ['A colder, denser cloud has a … Jeans mass.', 'smaller (so it collapses more easily)', ['larger', 'the same', 'infinite']],
      ['Young low-mass stars still contracting towards the main sequence are called…', 'T Tauri stars', ['Cepheids', 'Wolf–Rayet stars', 'Mira variables']],
      ['Which of these is a nearby star-forming region?', 'The Orion Nebula', ['The Crab Nebula', 'The Ring Nebula', 'The Veil Nebula']],
    ], 'Molecular clouds (10–30 K, mostly H₂ traced by CO) collapse and fragment when M > M_J ∝ T^(3/2)ρ^(−1/2). Protostars heat up until hydrogen fusion starts; low-mass ones pass through the T Tauri phase.');
    E.fact('sun-fate', 'The fate of the Sun', 1, [
      ['After the main sequence the Sun will become a…', 'red giant', ['blue giant', 'supernova', 'neutron star']],
      ['The Sun will end its life as a…', 'white dwarf (after a planetary nebula)', ['neutron star', 'black hole', 'supernova remnant']],
      ['The Sun will stay on the main sequence for a total of about…', '10 billion years', ['1 billion years', '100 billion years', '5 million years']],
      ['The Sun is now about … years old.', '4.6 billion', ['46 million', '13.8 billion', '460 billion']],
    ], 'The Sun, 4.6 Gyr old, will swell into a red giant in about 5 Gyr, shed a planetary nebula and leave a ~0.55 M☉ carbon–oxygen white dwarf.');
    E.fact('giant', 'Red giants', 2, [
      ['A star becomes a red giant when…', 'its core hydrogen is exhausted: the core contracts and hydrogen shell burning expands the envelope', ['it starts fusing helium in its core', 'it loses its magnetic field', 'it gains mass from a companion']],
      ['Helium burning in the degenerate core of a low-mass star starts with the…', 'helium flash', ['hydrogen flash', 'carbon detonation', 'nova']],
      ['The triple-alpha process fuses…', 'three helium nuclei into carbon-12', ['two protons into deuterium', 'four hydrogen into helium', 'carbon into oxygen']],
      ['Red giants are cool but very luminous because they are…', 'enormous', ['very massive', 'very dense', 'very young']],
    ], 'Once core hydrogen runs out, the helium core contracts and heats while a hydrogen shell burns; the envelope expands and cools. In stars below ~2 M☉ the helium ignites explosively in a degenerate core (helium flash) at ~10⁸ K.');
    E.fact('pn', 'Planetary nebulae', 2, [
      ['Planetary nebulae are…', 'shells of gas ejected by dying low-mass stars, ionised by the hot core', ['clouds in which planets form', 'supernova remnants', 'discs around young stars']],
      ['The Ring Nebula (M57) is a…', 'planetary nebula', ['supernova remnant', 'HII region', 'globular cluster']],
      ['The core left at the centre of a planetary nebula becomes a…', 'white dwarf', ['neutron star', 'black hole', 'brown dwarf']],
    ], 'The name comes from their planet-like discs in early telescopes. The envelope of an AGB star is ejected and lit by the hot (~100 000 K) core, which then cools as a white dwarf.');
    E.fact('wd', 'White dwarfs', 2, [
      ['White dwarfs are supported against gravity by…', 'electron degeneracy pressure', ['thermal pressure', 'neutron degeneracy pressure', 'radiation pressure']],
      ['The Chandrasekhar limit is about…', '1.4 solar masses', ['0.08 solar masses', '3 solar masses', '20 solar masses']],
      ['A typical white dwarf is about the size of…', 'the Earth', ['the Sun', 'a city', 'Jupiter']],
      ['A more massive white dwarf is…', 'smaller', ['larger', 'the same size', 'cooler']],
      ['Sirius B is a…', 'white dwarf', ['red giant', 'neutron star', 'brown dwarf']],
    ], 'Degenerate electrons support white dwarfs; R ∝ M^(−1/3), so heavier ones are smaller, and above 1.4 M☉ (Chandrasekhar) no stable white dwarf exists. Sirius B: ~1 M☉ in an Earth-sized body.');
    E.fact('massive', 'Massive stars and supernovae', 2, [
      ['The fusion chain of a massive star ends with an inert core of…', 'iron (and nickel)', ['carbon', 'hydrogen', 'uranium']],
      ['Why can fusion not continue beyond iron?', 'Iron-56 and nickel-62 have the highest binding energy per nucleon, so fusing them absorbs energy', ['iron is too heavy to move', 'iron is not nuclear matter', 'the core becomes too cool']],
      ['A core-collapse supernova leaves behind…', 'a neutron star or a black hole', ['a white dwarf', 'a main-sequence star', 'a planetary nebula']],
      ['Most of the energy of a core-collapse supernova is carried away by…', 'neutrinos (about 99%)', ['visible light', 'kinetic energy of the ejecta', 'gamma rays']],
      ['Supernova 1987A exploded in…', 'the Large Magellanic Cloud', ['the Andromeda Galaxy', 'the Milky Way', 'the Virgo cluster']],
    ], 'A >8 M☉ star burns H → He → C → Ne → O → Si → Fe; the iron core collapses in milliseconds to nuclear density and rebounds as a supernova; ~10⁴⁶ J emerges as neutrinos (SN 1987A: 24 detected).');
    E.fact('sntype', 'Supernova types', 2, [
      ['A Type Ia supernova is…', 'a thermonuclear explosion of a white dwarf', ['the collapse of a massive star’s iron core', 'a nova', 'a neutron star merger']],
      ['Type II supernovae show … in their spectra.', 'hydrogen lines', ['no hydrogen', 'only helium', 'only iron']],
      ['Type Ia supernovae are used as…', 'standard candles', ['clocks', 'thermometers', 'compasses']],
      ['The Crab Nebula is the remnant of the supernova seen in…', 'AD 1054', ['AD 1572', 'AD 1604', '1987']],
      ['Tycho’s supernova of 1572 and Kepler’s of 1604 were both Type…', 'Ia', ['II', 'Ib', 'IIn']],
    ], 'Type I has no hydrogen, Type II has it. Ia: an accreting or merging white dwarf reaches ~1.4 M☉ and detonates (peak M ≈ −19.3). II, Ib, Ic: massive-star core collapse.');
    E.fact('ns', 'Neutron stars and pulsars', 2, [
      ['A neutron star has a radius of about…', '10–12 km', ['1 km', '1 000 km', '100 000 km']],
      ['Pulsars are…', 'rapidly rotating, magnetised neutron stars', ['pulsating white dwarfs', 'black holes', 'variable supergiants']],
      ['The first pulsar was discovered in 1967 by…', 'Jocelyn Bell Burnell', ['Edwin Hubble', 'Fred Hoyle', 'Karl Jansky']],
      ['The density of a neutron star is comparable to…', 'that of an atomic nucleus (about 10¹⁷ kg/m³)', ['water', 'a white dwarf', 'iron']],
      ['The Crab pulsar spins about … times per second.', '30', ['1', '1 000', '0.001']],
    ], 'A 1.4 M☉ neutron star is ~12 km across; degenerate neutrons support it (limit ~2–3 M☉). Its beams sweep past Earth like a lighthouse: pulsars (Crab: 33 ms, B ~ 10⁸ T).');
    E.fact('bh', 'Black holes', 2, [
      ['The Schwarzschild radius of a black hole of mass M is…', '2GM/c²', ['GM/c²', '2GM/c', 'GM²/c']],
      ['The event horizon is…', 'the boundary beyond which nothing, not even light, can escape', ['the surface of a solid body', 'the innermost stable orbit', 'a ring of dust']],
      ['Sagittarius A* at the centre of the Milky Way has a mass of about…', '4 million solar masses', ['4 solar masses', '4 billion solar masses', '40 000 solar masses']],
      ['Hawking radiation implies that black holes…', 'slowly evaporate, the smaller the faster', ['grow without limit', 'cannot radiate', 'explode when they touch']],
      ['A black hole of one solar mass has a Schwarzschild radius of about…', '3 km', ['30 km', '300 m', '3 000 km']],
    ], 'R_s = 2GM/c² = 2.95 km (M/M☉). Sgr A* (4.3×10⁶ M☉) has R_s ≈ 0.08 AU; M87* (6.5×10⁹ M☉) about 130 AU. Its shadow was imaged by the EHT (M87* in 2019, Sgr A* in 2022).');
    E.fact('novae', 'Novae and mergers', 2, [
      ['A classical nova is…', 'a thermonuclear flash on the surface of an accreting white dwarf, which survives', ['the collapse of a massive star', 'a stellar merger', 'a pulsating star']],
      ['A kilonova is produced by…', 'the merger of two neutron stars', ['a white dwarf explosion', 'a nova on a neutron star', 'two main-sequence stars colliding']],
      ['The first gravitational waves from a neutron-star merger (GW170817) were detected in…', '2017', ['2015', '2019', '2009']],
      ['Which observatory made the first direct detection of gravitational waves (GW150914)?', 'LIGO', ['Hubble', 'Arecibo', 'Planck']],
    ], 'A nova is a surface event (the white dwarf survives, recurrent novae repeat); a supernova destroys or collapses the star; a kilonova (GW170817, 2017) is a neutron-star merger forging gold and platinum. LIGO found GW150914 on 14 September 2015.');
    E.fact('elements', 'Where the elements come from', 3, [
      ['Elements heavier than iron are made mainly by…', 'neutron capture (s-process in AGB stars, r-process in neutron-star mergers and supernovae)', ['fusion in main-sequence cores', 'the Big Bang', 'cosmic-ray collisions only']],
      ['Almost all the carbon in your body was made in…', 'stars (the triple-alpha process in red giants)', ['the Big Bang', 'cosmic rays', 'the Sun’s core today']],
      ['The Big Bang produced mainly…', 'hydrogen and helium (with traces of lithium)', ['carbon and oxygen', 'iron', 'all the elements up to uranium']],
    ], 'Big Bang nucleosynthesis made H, He (25% by mass) and a little Li; stars make C to Fe by fusion and heavier elements by neutron capture. “We are made of star-stuff.”');
    E.fact('lifetimes', 'Stellar lifetimes and the IMF', 1, [
      ['Which stars live the longest?', 'Low-mass red dwarfs (trillions of years)', ['O stars', 'The Sun', 'Red supergiants']],
      ['The most massive stars live only about…', 'a few million years', ['10 billion years', 'a trillion years', 'a hundred thousand years']],
      ['The initial mass function says that…', 'low-mass stars are far more numerous than high-mass stars', ['high-mass stars dominate by number', 'all stars form with the same mass', 'stars form only in pairs']],
    ], 'A 0.1 M☉ red dwarf will shine for ~10¹³ years, an O star only a few Myr. The Salpeter IMF dN/dM ∝ M^−2.35 means that for each O star there are hundreds of Sun-like and thousands of red dwarf stars.');
    E.fact('accretion', 'Accretion and close binaries', 3, [
      ['Mass transfer in a close binary happens when a star fills its…', 'Roche lobe', ['Hill sphere', 'Chandrasekhar limit', 'Strömgren sphere']],
      ['Gas falling onto a compact object usually forms…', 'an accretion disc', ['a planetary nebula', 'a jet only', 'a spherical shell']],
      ['X-ray binaries are powered by…', 'matter falling onto a neutron star or black hole', ['nuclear fusion in the companion', 'supernova remnants', 'pulsar winds only']],
      ['HII regions are…', 'clouds of ionised hydrogen around hot young stars', ['clouds of molecular hydrogen', 'dead stars', 'cold dust']],
    ], 'The Roche lobe is the region around a star in a binary where its material is bound to it; when a star swells to fill it, gas streams through L1 onto the companion and forms a disc. Accretion onto compact objects releases up to ~10% of mc² as X-rays.');
    E.calc('schw-calc', 'Schwarzschild radius', 2, r => {
      const b = r.pick([['a 1 solar mass body', 1], ['a 3 solar mass body', 3], ['a 10 solar mass stellar black hole', 10], ['a 30 solar mass black hole', 30], ['Sgr A* (4.3 million solar masses)', 4.3e6], ['M87* (6.5 billion solar masses)', 6.5e9]]);
      const Rs = P.schwarz(b[1] * P.Msun) / 1e3, au = Rs * 1e3 / P.AU > 0.05, val = au ? Rs * 1e3 / P.AU : Rs, unit = au ? 'AU' : 'km';
      const o = nums(val, unit, 3, [val / 2, val * 2, val * 1000]);
      return { prompt: 'What is the Schwarzschild radius of ' + b[0] + '? (M☉ = 1.99×10³⁰ kg, G = 6.67×10⁻¹¹, c = 3.00×10⁸ m/s)', right: o.right, wrong: o.wrong, explain: 'R_s = 2GM/c² = 2.95 km × ' + fmt(b[1], 3) + ' = ' + fmt(Rs, 3) + ' km' + (au ? ' = ' + fmt(val, 3) + ' AU' : '') + '.' };
    });
    E.calc('fusion-calc', 'Energy from fusion', 2, r => {
      const m = r.pick([1, 5, 100, 1000]), E1 = 0.007 * m * P.c * P.c;
      const o = nums(E1, 'J', 2, [E1 / P.c, m * P.c * P.c, E1 * 10]);
      return { prompt: 'Hydrogen fusing to helium converts 0.7% of its mass to energy. How much energy is released by fusing ' + m + ' kg of hydrogen?', right: o.right, wrong: o.wrong, explain: 'E = 0.007 m c² = 0.007 × ' + m + ' × (3.00×10⁸)² = ' + fmt(E1, 2) + ' J.' };
    });
    E.calc('sun-life', 'How long can the Sun shine?', 3, r => {
      const frac = r.pick([0.05, 0.1, 0.2]), t = frac * 0.007 * P.Msun * P.c * P.c / P.Lsun / P.yr / 1e9;
      const o = nums(t, 'Gyr', 3, [t / frac, t / 0.007, t * 10]);
      return { prompt: 'The Sun (L = 3.83×10²⁶ W) fuses ' + Math.round(frac * 100) + '% of its mass before leaving the main sequence, converting 0.7% of the fused mass to energy. How long does that last?', right: o.right, wrong: o.wrong, explain: 't = ' + frac + ' × 0.007 × M☉c² / L☉ = ' + fmt(t, 3) + ' Gyr.' };
    });
    E.calc('massloss', 'Mass lost by radiation', 3, r => {
      const L = r.pick([['the Sun', 1], ['a 10 000 L☉ giant', 1e4], ['a 1 million L☉ supergiant', 1e6]]);
      const dm = L[1] * P.Lsun / (P.c * P.c), o = nums(dm, 'kg/s', 2, [L[1] * P.Lsun / P.c, dm * 1e3, dm / 1e3]);
      return { prompt: 'At what rate does ' + L[0] + ' (L = ' + fmt(L[1] * 3.828e26, 2) + ' W) lose mass by radiating?', right: o.right, wrong: o.wrong, explain: 'dm/dt = L/c² = ' + fmt(L[1] * P.Lsun, 2) + ' / (3.00×10⁸)² = ' + fmt(dm, 2) + ' kg/s.' };
    });
  };
});

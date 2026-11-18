/* Section 05 — Hall plate array geometry & magnetic field definition */
window.ENC_SECTIONS = window.ENC_SECTIONS || [];
window.ENC_SECTIONS.push({
  id:'geometry', num:'05',
  title:'Hall Array Geometry & Field Physics',
  sub:'Where the Hall plates sit, what B circles through them, and how By/Bx become an angle. Drag the rotor — the physics is live.',
  refs:['Fig. 3–1/5–3/5–4/5–5 · DSH000237','Figure 2/4 · DS000307','Figure 2 · DS000686'],
  tabs:{
    hal:{
      watch:[
        {t:'Three vs six plates', d:'<b>HAL 3020: 3 plates @ 120°</b> · <b>HAL 3021: 6 plates @ 60°</b>, all on a <b>Ø1.9 mm</b> circle with the magnet axis through the center. The 3021’s extra pair set observes the same field half a pole-step later (redundant spatial sampling → better stray-field cancellation).'},
        {t:'What the plates feel', d:'A diametrically magnetized rotor produces a near-uniform rotating B on the plate circle. Plate pairs are arranged so SIN and COS signals appear <b>90° apart electrically</b>. Plate offsets up to ~a few % of diameter are absorbed by the calibration (offset/phase/0-angle).'},
        {t:'Field-strength window', d:'Operating range is <b>±5 … ±250 mT</b>, programmed via mag_range (FINE_GAIN_CUST trims 1.25–1.5×). Too little flux → offset eats the signal; too much → ADC clips before the gain stage. The field <u>at the plates</u>, not the magnet datasheet Br, is what counts — with gap & tolerance included.'},
        {t:'Field vector definition', d:'Fig. 5–5 defines Bz as the rotating vector along the plate plane; the sensor reports this vector’s angle. Stray DC fields rotate the measured vector — the 0.06/0.1° ΔEθ spec quantifies exactly that residual.'},
      ],
      play:function(container, data){
        const wrap = window.ENC_UI.h(`<div class="panel-grid cols-21"></div>`);
        const simCard = window.ENC_UI.h(`<div class="card"><h3>Rotor / gap / eccentricity sandbox <span class="tag">canvas sim</span></h3></div>`);
        window.ENC_SIMS.magnetPhysics(simCard, {});
        wrap.appendChild(simCard);
        const figCard = window.ENC_UI.h(`<div class="card"><h3>Plate layouts (datasheet) <span class="tag">Figs. 5–3/5–4</span></h3>
          <div class="fig-frame"><img src="${data.figures.plates3020}" alt="HAL 3020 hall plate configuration: 3 plates at 120 degrees on 1.9 mm circle" loading="lazy"></div>
          <p class="fig-caption">Fig. 5–3 — HAL 3020 plate configuration (DSH000237_002EN)</p>
          <div class="fig-frame" style="margin-top:10px"><img src="${data.figures.plates3021}" alt="HAL 3021 hall plate configuration: 6 plates at 60 degrees on 1.9 mm circle" loading="lazy"></div>
          <p class="fig-caption">Fig. 5–4 — HAL 3021 plate configuration (DSH000237_002EN)</p>
          <div class="fig-frame" style="margin-top:10px;background:#05070B"><img src="svg/field-lines.svg" alt="Ideal diametric magnet field lines, plate circle, Bz rotating vector" loading="lazy" style="background:#05070B"></div>
          <p class="fig-caption">Ideal diametric-magnet flux (educational SVG, svg/field-lines.svg) — the rotating Bz vector both ICs measure</p></div>`);
        wrap.appendChild(figCard);
        container.appendChild(wrap);
      }
    },
    as5147:{
      watch:[
        {t:'Four-plate cross', d:'AS5147 uses <b>4 Hall crosses @ 90°</b> on a circle of <b>R = 1.1 mm</b>. Bz optimum <b>35–70 mT</b> measured along that circle. Lateral B is unsupported — the magnet must be properly diametrically oriented.'},
        {t:'Distance window', d:'R = 1.1 mm nominal; magnet diameter and gap set Bz at the plates. Use the MAG register (0x3FFD) during bring-up: if MAG reads below the datasheet’s good-field threshold, increase field or reduce gap — don’t ship it.'},
        {t:'Angular step vs radius', d:'Lateral plate position error δ (in mm) produces an angle error ≈ δ / R radians in the worst case. At R = 1.1 mm, 50 µm lateral offset ≈ <b>2.6°</b> — mechanical centring dominates electrical error! Center the magnet; use the AGC as a go/no-go check.'},
        {t:'CORDIC doesn’t care — until it does', d:'The digital chain accepts a wide amplitude range thanks to AGC. But once Bz falls below ~35 mT, the AGC rails out and noise degrades visibly (0.068° → worse). Field window is a <b>hard</b> constraint, not a suggestion.'},
      ],
      play:function(container, data){
        const wrap = window.ENC_UI.h(`<div class="panel-grid cols-21"></div>`);
        const simCard = window.ENC_UI.h(`<div class="card"><h3>Rotor / gap / eccentricity sandbox <span class="tag">canvas sim</span></h3></div>`);
        window.ENC_SIMS.magnetPhysics(simCard, {});
        wrap.appendChild(simCard);
        const spec = window.ENC_UI.h(`<div class="card"><h3>Geometry rules of thumb <span class="tag">R = 1.1 mm</span></h3></div>`);
        spec.appendChild(window.ENC_UI.specTable([
          ['Plate circle radius', '1.1', 'mm'],
          ['Optimal Bz at plates', '35–70', 'mT'],
          ['Hall elements', '4 @ 90°', ''],
          ['Lateral-offset error', '≈ δ/R rad', '50 µm → ~2.6°'],
          ['AGC saturation', 'field too low', 'read MAG 0x3FFD'],
          ['Field polarity', 'diametric', 'radial Bz only'],
        ], 'AS5147 magnetic interface'));
        spec.appendChild(window.ENC_UI.h(`<div class="banner banner-info" style="margin-top:10px"><b>Bring-up tip:</b> log DIAAGC + MAG at 3 temperatures on 10 samples. Scatter &gt; 15 % in MAG code → magnet or airgap outliers in the line.</div>`));
        wrap.appendChild(spec);
        container.appendChild(wrap);
      }
    },
    as5116:{
      watch:[
        {t:'Four-plate cross + DMOD', d:'AS5116: <b>4 Hall crosses @ 90°</b>, R = <b>1.1 mm</b>, chopped and synchronously demodulated on-die. Raw plate outputs never leave the analog core — you receive DC-clean differential SIN/COS.'},
        {t:'Bz window 10–100 mT', d:'Widest linear flux window of the three: <b>10–100 mT peak</b>. Covers big magnet gaps (weak field) and small magnets at zero gap (strong field) — pick Gain_Code to sit mid-window for best GV.'},
        {t:'Grinding the numbers', d:'@5 V: Gain_Code 12 → 32 mV/mT ⇒ at 50 mT the differential swing is <b>±1.6 V</b> — comfortable for any differential ADC input stage. With GV = ±16 % worst-case, still ≥ 2.7 V peak-to-peak span.'},
        {t:'Air-gap robustness', d:'Because DMOD rejects offset, the limiting factor at large gaps is noise, not offset — you lose maybe 6 dB SNR over 1→2.5 mm gap but keep absolute accuracy until the DMOD carrier budget runs out.'},
      ],
      play:function(container, data){
        const wrap = window.ENC_UI.h(`<div class="panel-grid cols-21"></div>`);
        const simCard = window.ENC_UI.h(`<div class="card"><h3>Rotor / gap / eccentricity sandbox <span class="tag">canvas sim</span></h3></div>`);
        window.ENC_SIMS.magnetPhysics(simCard, {});
        wrap.appendChild(simCard);
        const spec = window.ENC_UI.h(`<div class="card"><h3>Geometry rules of thumb <span class="tag">R = 1.1 mm</span></h3></div>`);
        spec.appendChild(window.ENC_UI.specTable([
          ['Plate circle radius', '1.1', 'mm'],
          ['Optimal Bz (peak)', '10–100', 'mT'],
          ['Hall elements', '4 @ 90° + DMOD', ''],
          ['Sensitivity M', '8–60', 'mV/mT'],
          ['Output swing', 'GND+0.25 … VDD−0.5', 'V'],
          ['VCM defaults', '1.375 / 2.125', 'V'],
        ], 'AS5116 magnetic interface'));
        wrap.appendChild(spec);
        container.appendChild(wrap);
      }
    },
    compare:{
      watch:[
        {t:'R is the great divider', d:'HAL plate circle: <b>Ø1.9 mm</b> (radius 0.95) vs AS5147/AS5116: <b>R = 1.1 mm</b>. For the same magnet &amp; gap, HAL plates sample a slightly smaller radius — sensitivity &amp; linearity differ accordingly. Magnet specs are not interchangeable.'},
        {t:'Field windows', d:'HAL: ±5–250 mT (programmable, huge) · AS5147: 35–70 mT (narrow, AGC-assisted) · AS5116: 10–100 mT (wide). Design rule: compute Bz at plates over worst-case gap+tolerance; pick the device whose window it fits <u>without gain trim gymnastics</u>.'},
        {t:'Eccentricity dominates', d:'Lateral offset hurts everyone: ≈ δ/R rad of angle error. 3021’s 6-plate redundant sampling buys stray-field margin, not eccentricity margin. Mechanical runout budget ≤ 3 % of R for &lt;1° total error class applications.'},
      ],
      play:function(container, data){ window.ENC_UI.comparePane(container, ['Magnetic input','Identity & class']); }
    },
  }
});

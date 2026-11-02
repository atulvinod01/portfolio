import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.min.js';

const $ = s => document.querySelector(s);
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const finePointer = matchMedia('(hover: hover)').matches;
const hasGsap = !!window.gsap;
if (hasGsap) gsap.registerPlugin(ScrollTrigger);

/* ---------- NSE status + IST clock ---------- */
// ponytail: ignores exchange holidays; add the NSE holiday list if it matters.
function market() {
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Kolkata', weekday: 'short', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })
    .formatToParts(new Date()).map(x => [x.type, x.value]));
  const t = +p.hour * 60 + +p.minute, wd = p.weekday, weekday = !['Sat', 'Sun'].includes(wd);
  const open = weekday && t >= 555 && t < 930;
  $('#clock').textContent = `${p.hour}:${p.minute}:${p.second} IST`;
  $('#mk-dot').classList.toggle('open', open);
  $('#mk').textContent = open ? 'NSE open, closes 15:30'
    : weekday && t < 555 ? 'NSE closed, opens 09:15'
    : wd === 'Fri' || !weekday ? 'NSE closed, opens Mon 09:15' : 'NSE closed, opens 09:15 tomorrow';

  // footer countdown to the next open or close
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const now = t * 60 + +p.second;
  let left;
  if (open) left = 930 * 60 - now;
  else {
    let d = weekday && t < 555 ? 0 : 1;
    while (['Sat', 'Sun'].includes(days[(days.indexOf(wd) + d) % 7])) d++;
    left = d * 86400 + 555 * 60 - now;
  }
  const pad = n => String(n).padStart(2, '0');
  $('#cd').textContent = `${pad(left / 3600 | 0)}:${pad(left % 3600 / 60 | 0)}:${pad(left % 60)}`;
  $('#cd-l').textContent = open ? 'NSE closes in' : 'Next NSE open in';
}
market(); setInterval(market, 1000);

/* ---------- Monte Carlo ---------- */
const assets = [
  { name: 'Nifty 50', mu: .12, sd: .18 }, { name: 'US equities', mu: .11, sd: .17 },
  { name: 'Gold', mu: .08, sd: .14 }, { name: 'Govt bonds', mu: .07, sd: .04 },
];
const corr = [[1, .5, .05, .1], [.5, 1, .05, 0], [.05, .05, 1, 0], [.1, 0, 0, 1]];
const RF = .065, N = 2000;
function simulate() {
  const out = [];
  for (let k = 0; k < N; k++) {
    const w = assets.map(() => -Math.log(1 - Math.random()));
    const s = w.reduce((a, b) => a + b);
    let ret = 0, v = 0, hhi = 0;
    for (let i = 0; i < 4; i++) {
      w[i] /= s; ret += w[i] * assets[i].mu; hhi += w[i] * w[i];
    }
    for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) v += w[i] * w[j] * assets[i].sd * assets[j].sd * corr[i][j];
    const vol = Math.sqrt(v);
    out.push({ w, ret, vol, div: 1 - hhi, sharpe: (ret - RF) / vol });
  }
  return out;
}

/* ---------- 3D cloud ---------- */
const hero = $('.hero');
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
hero.prepend(renderer.domElement);
renderer.domElement.setAttribute('aria-hidden', 'true');
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(38, 1, .1, 100);
camera.position.set(0, 0, 11);
const group = new THREE.Group(); scene.add(group);

const dotTex = (() => {
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const g = c.getContext('2d'); g.fillStyle = '#fff'; g.beginPath(); g.arc(32, 32, 30, 0, 7); g.fill();
  return new THREE.CanvasTexture(c);
})();
const geo = new THREE.BufferGeometry();
geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(N * 3), 3));
geo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(N * 3), 3));
const cloud = new THREE.Points(geo, new THREE.PointsMaterial({ size: .075, map: dotTex, alphaTest: .5, vertexColors: true, sizeAttenuation: true }));
group.add(cloud);
const bestGeo = new THREE.BufferGeometry();
bestGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(3), 3));
const best = new THREE.Points(bestGeo, new THREE.PointsMaterial({ size: .32, map: dotTex, alphaTest: .5, color: 0xFF4D00 }));
group.add(best);

const X = v => (v - .04) / .14 * 6 - 3, Y = r => (r - .07) / .05 * 4 - 2, Z = d => (d - .15) / .6 * 4 - 2;
const O = new THREE.Vector3(-3.2, -2.3, -2.3);
const ends = { x: new THREE.Vector3(3.4, -2.3, -2.3), y: new THREE.Vector3(-3.2, 2.4, -2.3), z: new THREE.Vector3(-3.2, -2.3, 2.4) };
const axisGeo = new THREE.BufferGeometry().setFromPoints([O, ends.x, O, ends.y, O, ends.z]);
group.add(new THREE.LineSegments(axisGeo, new THREE.LineBasicMaterial({ color: 0x3A3A37 })));

let pts = [], top;
const pct = x => (x * 100).toFixed(1) + '%';
function load() {
  pts = simulate();
  const pos = geo.attributes.position.array, col = geo.attributes.color.array;
  const sMin = Math.min(...pts.map(p => p.sharpe)), sMax = Math.max(...pts.map(p => p.sharpe));
  top = pts.reduce((a, b) => b.sharpe > a.sharpe ? b : a);
  pts.forEach((p, i) => {
    pos[i * 3] = X(p.vol); pos[i * 3 + 1] = Y(p.ret); pos[i * 3 + 2] = Z(p.div);
    const s = (p.sharpe - sMin) / (sMax - sMin), c = .18 + .82 * s * s;
    col[i * 3] = col[i * 3 + 1] = col[i * 3 + 2] = c;
  });
  geo.attributes.position.needsUpdate = geo.attributes.color.needsUpdate = true;
  bestGeo.attributes.position.array.set([X(top.vol), Y(top.ret), Z(top.div)]);
  bestGeo.attributes.position.needsUpdate = true;
  $('#o-s').textContent = top.sharpe.toFixed(2);
  $('#o-r').textContent = pct(top.ret);
  $('#o-v').textContent = pct(top.vol);
  $('#o-w').innerHTML = 'Best mix: ' + top.w.map((w, i) => `<b>${Math.round(w * 100)}%</b> ${assets[i].name}`).join(', ');
  drawMini();
}
function grow(dur = 1.6) {
  if (reduce || !hasGsap) { geo.setDrawRange(0, N); best.visible = true; $('#o-n').textContent = N.toLocaleString('en-IN'); return; }
  const o = { n: 0 }; best.visible = false;
  gsap.to(o, { n: N, duration: dur, ease: 'power2.out', onUpdate() { geo.setDrawRange(0, o.n | 0); $('#o-n').textContent = (o.n | 0).toLocaleString('en-IN'); }, onComplete() { best.visible = true; } });
}

// interaction
let rotY = -.55, rotX = .18, tY = rotY, tX = rotX, drag = null, heroVisible = true, scrollK = 0;
renderer.domElement.addEventListener('pointerdown', e => { drag = { x: e.clientX, y: e.clientY, ry: tY, rx: tX }; });
addEventListener('pointerup', () => drag = null);
addEventListener('pointermove', e => {
  if (!drag) return;
  tY = drag.ry + (e.clientX - drag.x) * .006;
  if (e.pointerType === 'mouse') tX = Math.max(-.6, Math.min(.8, drag.rx + (e.clientY - drag.y) * .004));
});
new IntersectionObserver(([e]) => heroVisible = e.isIntersecting).observe(hero);

const labels = { x: $('#ax-x'), y: $('#ax-y'), z: $('#ax-z') }, bestL = $('#best-l'), v3 = new THREE.Vector3();
function place(el, vec) {
  v3.copy(vec).applyMatrix4(group.matrixWorld).project(camera);
  el.style.left = (v3.x + 1) / 2 * hero.clientWidth + 'px';
  el.style.top = (1 - v3.y) / 2 * hero.clientHeight + 'px';
}
function resize() {
  const w = hero.clientWidth, h = hero.clientHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  // fit the cloud's ~8.6-unit width on narrow screens
  camera.position.z = Math.max(12, 4.4 / (Math.tan(19 * Math.PI / 180) * camera.aspect));
  group.position.set(w < 820 ? 0 : .3, w < 820 ? .4 : .7, 0);
  camera.updateProjectionMatrix();
}
addEventListener('resize', resize); resize();
load();
(function frame() {
  requestAnimationFrame(frame);
  if (!heroVisible) return;
  if (!drag && !reduce) tY += .0016;
  rotY += (tY - rotY) * .08; rotX += (tX - rotX) * .08;
  group.rotation.set(rotX, rotY, 0);
  group.position.z = -scrollK * 6;
  group.updateMatrixWorld();
  for (const k in ends) place(labels[k], ends[k]);
  if (best.visible) { bestL.style.display = ''; place(bestL, new THREE.Vector3(X(top.vol), Y(top.ret), Z(top.div))); } else bestL.style.display = 'none';
  renderer.render(scene, camera);
})();

$('#rerun').addEventListener('click', () => { load(); grow(1.1); });

/* ---------- mini scatter for the portfolio case ---------- */
function drawMini() {
  const W = 600, H = 380, sx = v => 40 + (v - .03) / .16 * (W - 60), sy = r => H - 30 - (r - .065) / .06 * (H - 50);
  let s = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Volatility against return for the simulated portfolios, best Sharpe marked."><g fill="#0B0B0B" fill-opacity=".3">`;
  pts.forEach((p, i) => { if (i % 2 === 0) s += `<circle cx="${sx(p.vol).toFixed(1)}" cy="${sy(p.ret).toFixed(1)}" r="2.2"/>`; });
  s += `</g><circle cx="${sx(top.vol)}" cy="${sy(top.ret)}" r="8" fill="#FF4D00"/>`;
  s += `<text x="${W - 20}" y="${H - 8}" text-anchor="end" font-size="13" fill="#5B5953">Volatility</text><text x="40" y="16" font-size="13" fill="#5B5953">Return</text></svg>`;
  $('#mini').innerHTML = s;
}


/* ---------- smooth scroll ---------- */
let lenis = null;
if (!reduce && window.Lenis && hasGsap) {
  lenis = new Lenis({ lerp: .09 });
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add(t => lenis.raf(t * 1000));
  gsap.ticker.lagSmoothing(0);
}
document.querySelectorAll('a[href^="#"]').forEach(a => a.addEventListener('click', e => {
  const t = document.querySelector(a.getAttribute('href'));
  if (!t) return;
  e.preventDefault();
  lenis ? lenis.scrollTo(t === $('#top') ? 0 : t, { duration: 1.4 }) : t.scrollIntoView();
}));

/* ---------- work index: hover preview + case studies ---------- */
const preview = $('.preview'), pv = preview.querySelector('.pv');
let mx = 0, my = 0, px = 0, py = 0;
document.querySelectorAll('.row').forEach(row => {
  const dlg = document.getElementById(row.dataset.case);
  row.addEventListener('pointerenter', () => { if (!finePointer) return; pv.innerHTML = dlg.querySelector('.v').innerHTML; preview.classList.add('on'); });
  row.addEventListener('pointerleave', () => preview.classList.remove('on'));
  row.addEventListener('click', () => { preview.classList.remove('on'); dlg.showModal(); dlg.scrollTop = 0; lenis?.stop(); });
});
document.querySelectorAll('dialog.case').forEach(d => {
  d.querySelector('.x').addEventListener('click', () => d.close());
  d.addEventListener('close', () => lenis?.start());
});
addEventListener('pointermove', e => { mx = e.clientX; my = e.clientY; });
(function follow() {
  requestAnimationFrame(follow);
  if (!preview.classList.contains('on')) { px = mx; py = my; }
  px += (mx - px) * .14; py += (my - py) * .14;
  const w = preview.offsetWidth, h = preview.offsetHeight;
  const x = Math.min(px + 32, innerWidth - w - 16), y = Math.min(Math.max(py - h / 2, 16), innerHeight - h - 16);
  preview.style.transform = `translate(${x}px, ${y}px) rotate(${(mx - px) * .03}deg)`;
})();

/* ---------- intro + scroll motion ---------- */
const nameEl = $('#name');
nameEl.innerHTML = [...nameEl.textContent].map(c => `<span class="ch" aria-hidden="true">${c === ' ' ? '&nbsp;' : c}</span>`).join('');

let seen = false;
try { seen = sessionStorage.getItem('intro') === '1'; sessionStorage.setItem('intro', '1'); } catch (e) {}

if (!hasGsap || reduce) {
  $('.loader').remove(); grow();
} else {
  const tl = gsap.timeline();
  if (!seen) {
    const c = { n: 0 };
    lenis?.stop();
    tl.to(c, { n: N, duration: 1.8, ease: 'power3.inOut', onUpdate() { $('.loader .count').textContent = (c.n | 0); } })
      .to('.loader .bar', { scaleX: 1, duration: 1.8, ease: 'power3.inOut' }, 0)
      .to('.loader', { clipPath: 'inset(0 0 100% 0)', duration: 1, ease: 'expo.inOut', onComplete() { $('.loader').remove(); lenis?.start(); } }, '+=.15');
  } else $('.loader').remove();
  tl.from('.name .ch', { yPercent: 105, duration: 1.1, stagger: .045, ease: 'expo.out' }, seen ? 0 : '-=.45')
    .add(() => grow(), '<')
    .from('.hero .intro, .hero .sim, .hud', { autoAlpha: 0, y: 16, duration: .8, stagger: .08, ease: 'power3.out' }, '<.3');

  // hero exit: name and cloud drift as you leave
  gsap.to('.hero .name', { yPercent: -40, ease: 'none', scrollTrigger: { trigger: hero, start: 'top top', end: 'bottom top', scrub: true } });
  ScrollTrigger.create({ trigger: hero, start: 'top top', end: 'bottom top', onUpdate: s => scrollK = s.progress });

  // headings and rows rise in
  gsap.utils.toArray('.sec-head').forEach(el => gsap.from(el, { autoAlpha: 0, y: 20, duration: .8, ease: 'power3.out', scrollTrigger: { trigger: el, start: 'top 90%' } }));
  gsap.from('.row .t', { yPercent: 100, autoAlpha: 0, duration: 1, stagger: .09, ease: 'expo.out', clearProps: 'transform', scrollTrigger: { trigger: '.index', start: 'top 80%' } });
  gsap.from('.contact .big, footer .end', { yPercent: 40, autoAlpha: 0, duration: 1.2, ease: 'expo.out', stagger: .1, scrollTrigger: { trigger: '.contact .big', start: 'top 90%' } });
  gsap.from('tbody tr', { autoAlpha: 0, y: 12, duration: .6, stagger: .04, ease: 'power2.out', scrollTrigger: { trigger: 'table', start: 'top 85%' } });
  gsap.from('.about .cols p', { autoAlpha: 0, y: 24, duration: .9, stagger: .1, ease: 'power3.out', scrollTrigger: { trigger: '.about .cols', start: 'top 85%' } });

  // statement lights up word by word as you scroll through it
  const st = $('#statement');
  st.innerHTML = st.textContent.split(' ').map(w => `<span class="wd">${w}</span>`).join(' ');
  gsap.fromTo('#statement .wd', { opacity: .14 }, { opacity: 1, stagger: .1, ease: 'none', scrollTrigger: { trigger: st, start: 'top 80%', end: 'bottom 45%', scrub: true } });
}

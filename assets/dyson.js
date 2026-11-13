// Practical Fusion: the Dyson sphere on the opening screen.
// A sun wrapped in segmented ring bands, toon-shaded with ink outlines so it
// matches the hand-drawn art. Three of the rings sit at the logo's atom angles.
import * as THREE from 'three';
import { LineSegments2 } from './vendor/lines/LineSegments2.js';
import { LineSegmentsGeometry } from './vendor/lines/LineSegmentsGeometry.js';
import { LineMaterial } from './vendor/lines/LineMaterial.js';

const PALETTE = {
  band: '#D8CCFF',      // lit inner face of the rings
  ink: '#0B0326',       // outlines
  ambient: '#4B32A8',   // fills the unlit outer faces with indigo
  rim: '#9C86F0',
  sunCore: '#FFF6EE',
  sunGlow: '#FFB38A',
};
// Where the sphere sits in the scene's 1600x900 artwork, and how big it is.
const CENTER = { x: 1090, y: 300 }, RADIUS = 200, DEPTH = 0.22;

const deg = d => d * Math.PI / 180;
const RINGS = [ // r, band height, tilt, roll, spin speed, segments
  { r: 1.00, h: 0.11, tilt: 22, roll:   0, spin:  0.16, segs: 4 },
  { r: 0.95, h: 0.10, tilt: 22, roll:  60, spin: -0.13, segs: 3 },
  { r: 0.90, h: 0.10, tilt: 22, roll: -60, spin:  0.20, segs: 4 },
  { r: 0.80, h: 0.06, tilt: 76, roll:  18, spin:  0.28, segs: 5 },
  { r: 0.72, h: 0.05, tilt: 48, roll: 112, spin: -0.24, segs: 3 },
];

function init() {
  const scene0 = document.querySelector('[data-scene="0"]');
  if (!scene0) return;
  const svg = scene0.querySelector('svg');
  const planet = document.getElementById('planetSvg');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  const canvas = document.createElement('canvas');
  canvas.className = 'dyson';
  canvas.setAttribute('aria-hidden', 'true');
  scene0.insertBefore(canvas, scene0.firstChild); // behind the ridge and astronaut

  let renderer;
  try { renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true }); }
  catch (e) { canvas.remove(); return; }   // no WebGL: the drawn planet stays
  if (planet) planet.style.display = 'none';
  const skyGlow = document.getElementById('skyGlow0'); if (skyGlow) skyGlow.style.display = 'none';

  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, -5000, 5000);
  camera.position.z = 1000;

  // three flat light bands = cel shading
  const grad = new THREE.DataTexture(new Uint8Array([70,70,70,255, 165,165,165,255, 255,255,255,255]), 3, 1);
  grad.minFilter = grad.magFilter = THREE.NearestFilter; grad.needsUpdate = true;

  scene.add(new THREE.AmbientLight(PALETTE.ambient, 0.8));
  const rim = new THREE.DirectionalLight(PALETTE.rim, 0.55); rim.position.set(-0.6, 1, 0.8); scene.add(rim);
  const sunLight = new THREE.PointLight('#FFE6D2', 5.5, 0, 0); scene.add(sunLight);

  const root = new THREE.Group(); scene.add(root);
  sunLight.parent = root;

  // ---- the sun ----
  const core = new THREE.Mesh(new THREE.SphereGeometry(0.17, 48, 32), new THREE.MeshBasicMaterial({ color: PALETTE.sunCore, toneMapped: false }));
  root.add(core);
  const glowTex = (() => {
    const c = document.createElement('canvas'); c.width = c.height = 256;
    const g = c.getContext('2d'), r = g.createRadialGradient(128,128,0,128,128,128);
    r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(.18, 'rgba(255,236,220,.9)');
    r.addColorStop(.45, 'rgba(255,179,138,.35)'); r.addColorStop(1, 'rgba(255,179,138,0)');
    g.fillStyle = r; g.fillRect(0,0,256,256);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
  })();
  const glowMat = o => new THREE.SpriteMaterial({ map: glowTex, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: o });
  const glowBig = new THREE.Sprite(glowMat(1)); glowBig.scale.setScalar(2.1); root.add(glowBig);
  // a soft halo drawn over everything, so light seems to spill through the gaps
  const halo = new THREE.Sprite(glowMat(0.32)); halo.material.depthTest = false; halo.renderOrder = 10; halo.scale.setScalar(1.5); root.add(halo);
  const glowHot = new THREE.Sprite(glowMat(1));  glowHot.scale.setScalar(0.85); glowHot.position.z = 0.22; root.add(glowHot); // in front of the core, behind the front rings

  // the violet nebula the drawn sky used to provide, now behind the sphere
  const nebTex = (() => {
    const c = document.createElement('canvas'); c.width = c.height = 256;
    const g = c.getContext('2d'), r = g.createRadialGradient(128,128,0,128,128,128);
    r.addColorStop(0, 'rgba(110,80,220,.55)'); r.addColorStop(.5, 'rgba(90,50,170,.25)'); r.addColorStop(1, 'rgba(75,50,168,0)');
    g.fillStyle = r; g.fillRect(0,0,256,256);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
  })();
  const nebula = new THREE.Sprite(new THREE.SpriteMaterial({ map: nebTex, depthTest: false, depthWrite: false, transparent: true }));
  nebula.renderOrder = -10; nebula.scale.set(6.2, 4.4, 1); root.add(nebula);

  // ---- the rings ----
  const lineMats = [];
  const spinners = [];
  const bandMat = new THREE.MeshToonMaterial({ color: PALETTE.band, gradientMap: grad, side: THREE.DoubleSide });

  for (const cfg of RINGS) {
    const roll = new THREE.Group(); roll.rotation.z = deg(cfg.roll);
    const tilt = new THREE.Group(); tilt.rotation.x = deg(cfg.tilt);
    const spin = new THREE.Group(); spin.userData.speed = cfg.spin;
    roll.add(tilt); tilt.add(spin); root.add(roll); spinners.push(spin);

    const gap = 0.16, segLen = (Math.PI * 2) / cfg.segs - gap, y = cfg.h / 2;
    const pos = [];
    const P = (th, yy) => [cfg.r * Math.sin(th), yy, cfg.r * Math.cos(th)];
    for (let s = 0; s < cfg.segs; s++) {
      const t0 = s * (segLen + gap);
      spin.add(new THREE.Mesh(new THREE.CylinderGeometry(cfg.r, cfg.r, cfg.h, 48, 1, true, t0, segLen), bandMat));
      // ink: both long edges, the two ends, and two panel seams
      const steps = 40;
      for (let i = 0; i < steps; i++) {
        const a = t0 + segLen * i / steps, b = t0 + segLen * (i + 1) / steps;
        pos.push(...P(a, y), ...P(b, y), ...P(a, -y), ...P(b, -y));
      }
      for (const f of [0, 1 / 3, 2 / 3, 1]) { const a = t0 + segLen * f; pos.push(...P(a, y), ...P(a, -y)); }
    }
    const lg = new LineSegmentsGeometry(); lg.setPositions(pos);
    const lm = new LineMaterial({ color: PALETTE.ink, linewidth: 2.1 }); lineMats.push(lm);
    spin.add(new LineSegments2(lg, lm));
  }

  // ---- fit to the artwork ----
  let base = { x: 0, y: 0 }, unit = 1;
  function layout() {
    const W = scene0.clientWidth, H = scene0.clientHeight; if (!W || !H) return;
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
    renderer.setSize(W, H, false);
    const vb = svg.viewBox.baseVal, s = Math.max(W / vb.width, H / vb.height);
    const offX = (W - vb.width * s) / 2, offY = (H - vb.height * s) / 2;
    unit = s;
    base.x = offX + (CENTER.x - vb.x) * s - W / 2;
    base.y = H / 2 - (offY + (CENTER.y - vb.y) * s);
    Object.assign(camera, { left: -W / 2, right: W / 2, top: H / 2, bottom: -H / 2 });
    camera.updateProjectionMatrix();
    root.scale.setScalar(RADIUS * s);
    lineMats.forEach(m => m.resolution.set(W, H));
  }
  layout();
  addEventListener('resize', () => requestAnimationFrame(layout));
  new ResizeObserver(layout).observe(scene0);

  // ---- animate ----
  const clock = new THREE.Clock();
  let mx = 0, my = 0;
  function tick() {
    requestAnimationFrame(tick);
    if (scene0.style.visibility === 'hidden') return;          // off-screen: don't render
    const t = clock.getElapsedTime(), dt = Math.min(clock.getDelta(), 0.05);
    const pf = window.__pf || { mx: 0, my: 0, p: 0 };
    mx += (pf.mx - mx) * 0.08; my += (pf.my - my) * 0.08;

    // same parallax as the drawn layer it replaces
    const dx = -mx * DEPTH * 60 * unit, dy = -my * DEPTH * 36 * unit - pf.p * DEPTH * 120 * unit;
    root.position.set(base.x + dx, base.y - dy, 0);
    // tilt toward the cursor
    root.rotation.x = my * 0.35 + (reduce ? 0 : Math.sin(t * 0.21) * 0.05);
    root.rotation.y = mx * 0.45 + (reduce ? 0 : Math.sin(t * 0.17) * 0.07);

    if (!reduce) {
      spinners.forEach(s => { s.rotation.y += s.userData.speed * (dt || 0.016); });
      const pulse = 1 + Math.sin(t * 1.4) * 0.035;
      glowBig.scale.setScalar(2.1 * pulse); glowHot.scale.setScalar(0.85 * (2 - pulse));
    }
    renderer.render(scene, camera);
  }
  tick();
}

init();

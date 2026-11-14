// Practical Fusion — the two live 3D pieces
//  1. The Dyson sun behind the canyon (toon-shaded rings with ink outlines)
//  2. The transparent wireframe atom on the venture-studio card
import * as THREE from 'three';
import { LineSegments2 } from '../vendor/lines/LineSegments2.js';
import { LineSegmentsGeometry } from '../vendor/lines/LineSegmentsGeometry.js';
import { LineMaterial } from '../vendor/lines/LineMaterial.js';

const PF = window.PF || { mx: 0, my: 0, sun: { x: 0, y: 0, r: 1 }, heroVisible: true };
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const deg = d => d * Math.PI / 180;

function glowTexture(stops) {
  const c = document.createElement('canvas'); c.width = c.height = 256;
  const g = c.getContext('2d'), r = g.createRadialGradient(128, 128, 0, 128, 128, 128);
  stops.forEach(([o, col]) => r.addColorStop(o, col));
  g.fillStyle = r; g.fillRect(0, 0, 256, 256);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
function makeRenderer(canvas) {
  try { return new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: 'high-performance' }); }
  catch (e) { return null; }
}

/* ============================================================
   1. Dyson sun
   ============================================================ */
function dysonSun() {
  const canvas = document.getElementById('sun3d'); if (!canvas) return;
  const renderer = makeRenderer(canvas); if (!renderer) return;

  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, -5000, 5000); camera.position.z = 1000;
  const grad = new THREE.DataTexture(new Uint8Array([70,70,70,255, 165,165,165,255, 255,255,255,255]), 3, 1);
  grad.minFilter = grad.magFilter = THREE.NearestFilter; grad.needsUpdate = true;

  scene.add(new THREE.AmbientLight('#4B32A8', 0.8));
  const rim = new THREE.DirectionalLight('#9C86F0', 0.55); rim.position.set(-0.6, 1, 0.8); scene.add(rim);
  const root = new THREE.Group(); scene.add(root);
  const sunLight = new THREE.PointLight('#FFE6D2', 5.5, 0, 0); root.add(sunLight);

  const neb = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture([[0,'rgba(140,100,230,.5)'],[.5,'rgba(110,70,190,.2)'],[1,'rgba(75,50,168,0)']]), depthTest: false, depthWrite: false, transparent: true }));
  neb.renderOrder = -10; neb.scale.set(6.4, 4.6, 1); root.add(neb);

  root.add(new THREE.Mesh(new THREE.SphereGeometry(0.17, 48, 32), new THREE.MeshBasicMaterial({ color: '#FFF6EE', toneMapped: false })));
  const gTex = glowTexture([[0,'rgba(255,255,255,1)'],[.18,'rgba(255,236,220,.9)'],[.45,'rgba(255,179,138,.35)'],[1,'rgba(255,179,138,0)']]);
  const gMat = o => new THREE.SpriteMaterial({ map: gTex, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: o });
  const glowBig = new THREE.Sprite(gMat(1)); glowBig.scale.setScalar(2.1); root.add(glowBig);
  const halo = new THREE.Sprite(gMat(0.32)); halo.material.depthTest = false; halo.renderOrder = 10; halo.scale.setScalar(1.5); root.add(halo);
  const glowHot = new THREE.Sprite(gMat(1)); glowHot.scale.setScalar(0.85); glowHot.position.z = 0.22; root.add(glowHot);

  const RINGS = [
    { r: 1.00, h: 0.11, tilt: 22, roll:   0, spin:  0.16, segs: 4 },
    { r: 0.95, h: 0.10, tilt: 22, roll:  60, spin: -0.13, segs: 3 },
    { r: 0.90, h: 0.10, tilt: 22, roll: -60, spin:  0.20, segs: 4 },
    { r: 0.80, h: 0.06, tilt: 76, roll:  18, spin:  0.28, segs: 5 },
    { r: 0.72, h: 0.05, tilt: 48, roll: 112, spin: -0.24, segs: 3 },
  ];
  const bandMat = new THREE.MeshToonMaterial({ color: '#D8CCFF', gradientMap: grad, side: THREE.DoubleSide });
  const lineMats = [], spinners = [];
  for (const cfg of RINGS) {
    const roll = new THREE.Group(); roll.rotation.z = deg(cfg.roll);
    const tilt = new THREE.Group(); tilt.rotation.x = deg(cfg.tilt);
    const spin = new THREE.Group(); spin.userData.speed = cfg.spin;
    roll.add(tilt); tilt.add(spin); root.add(roll); spinners.push(spin);
    const gap = 0.16, segLen = Math.PI * 2 / cfg.segs - gap, y = cfg.h / 2, pos = [];
    const P = (th, yy) => [cfg.r * Math.sin(th), yy, cfg.r * Math.cos(th)];
    for (let s = 0; s < cfg.segs; s++) {
      const t0 = s * (segLen + gap);
      spin.add(new THREE.Mesh(new THREE.CylinderGeometry(cfg.r, cfg.r, cfg.h, 48, 1, true, t0, segLen), bandMat));
      for (let i = 0; i < 40; i++) {
        const a = t0 + segLen * i / 40, b = t0 + segLen * (i + 1) / 40;
        pos.push(...P(a, y), ...P(b, y), ...P(a, -y), ...P(b, -y));
      }
      for (const f of [0, 1/3, 2/3, 1]) { const a = t0 + segLen * f; pos.push(...P(a, y), ...P(a, -y)); }
    }
    const lg = new LineSegmentsGeometry(); lg.setPositions(pos);
    const lm = new LineMaterial({ color: '#0B0326', linewidth: 2.1 }); lineMats.push(lm);
    spin.add(new LineSegments2(lg, lm));
  }

  let W = 0, H = 0;
  function size() {
    const w = canvas.clientWidth, h = canvas.clientHeight; if (!w || !h || (w === W && h === H)) return;
    W = w; H = h;
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2)); renderer.setSize(W, H, false);
    Object.assign(camera, { left: -W / 2, right: W / 2, top: H / 2, bottom: -H / 2 }); camera.updateProjectionMatrix();
    lineMats.forEach(m => m.resolution.set(W, H));
  }
  const clock = new THREE.Clock(); let mx = 0, my = 0;
  (function tick() {
    requestAnimationFrame(tick);
    if (!PF.heroVisible) return;
    size();
    const dt = Math.min(clock.getDelta(), 0.05), t = clock.elapsedTime;
    mx += (PF.mx - mx) * 0.08; my += (PF.my - my) * 0.08;
    root.position.set(PF.sun.x - W / 2, H / 2 - PF.sun.y, 0);
    root.scale.setScalar(PF.sun.r);
    root.rotation.x = my * 0.35 + (reduce ? 0 : Math.sin(t * 0.21) * 0.05);
    root.rotation.y = mx * 0.45 + (reduce ? 0 : Math.sin(t * 0.17) * 0.07);
    if (!reduce) {
      spinners.forEach(s => { s.rotation.y += s.userData.speed * dt; });
      const pulse = 1 + Math.sin(t * 1.4) * 0.035;
      glowBig.scale.setScalar(2.1 * pulse); glowHot.scale.setScalar(0.85 * (2 - pulse));
    }
    renderer.render(scene, camera);
  })();
}

/* ============================================================
   2. Wireframe atom on the venture card
   ============================================================ */
function wireAtom() {
  const canvas = document.getElementById('atom3d'); if (!canvas) return;
  const renderer = makeRenderer(canvas); if (!renderer) return;
  const CARD = '#1D1E31', LILAC = '#CBC2FF';

  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(CARD, 5.0, 8.4);              // back lines fade into the card
  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 50); camera.position.set(0, 0, 6.6);

  const tiltGroup = new THREE.Group(); tiltGroup.rotation.z = deg(24); scene.add(tiltGroup);   // leaning left
  const mouseGroup = new THREE.Group(); tiltGroup.add(mouseGroup);

  // see-through sphere: a few meridians and latitudes
  const circlePts = (r, n, map) => { const a = []; for (let i = 0; i < n; i++) { const t0 = i / n * Math.PI * 2, t1 = (i + 1) / n * Math.PI * 2; a.push(...map(r, t0), ...map(r, t1)); } return a; };
  const pts = [];
  for (let k = 0; k < 6; k++) {               // meridians every 30°
    const phi = k * Math.PI / 6;
    pts.push(...circlePts(1, 96, (r, t) => [r * Math.sin(t) * Math.cos(phi), r * Math.cos(t), r * Math.sin(t) * Math.sin(phi)]));
  }
  for (const lat of [-40, 0, 40]) {            // three latitudes
    const y = Math.sin(deg(lat)), rr = Math.cos(deg(lat));
    pts.push(...circlePts(rr, 96, (r, t) => [r * Math.cos(t), y, r * Math.sin(t)]));
  }
  const sphereGeo = new THREE.BufferGeometry(); sphereGeo.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
  const sphere = new THREE.LineSegments(sphereGeo, new THREE.LineBasicMaterial({ color: LILAC, transparent: true, opacity: 0.55, fog: true }));
  mouseGroup.add(sphere);

  // nucleus
  const coreTex = glowTexture([[0,'rgba(255,246,238,1)'],[.25,'rgba(255,179,138,.75)'],[1,'rgba(255,179,138,0)']]);
  const core = new THREE.Sprite(new THREE.SpriteMaterial({ map: coreTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
  core.scale.setScalar(0.55); mouseGroup.add(core);

  // three orbits at the logo's angles, each carrying a sphere
  const eTex = glowTexture([[0,'rgba(255,255,255,1)'],[.3,'rgba(203,194,255,.8)'],[1,'rgba(203,194,255,0)']]);
  const orbits = [];
  [[0, '#FFFFFF', 0.55], [60, '#FFB38A', -0.42], [-60, '#CBC2FF', 0.35]].forEach(([roll, col, speed], i) => {
    const g = new THREE.Group(); g.rotation.z = deg(roll); const t = new THREE.Group(); t.rotation.x = deg(72); g.add(t);
    const R = 1.5;
    const oGeo = new THREE.BufferGeometry(); oGeo.setAttribute('position', new THREE.Float32BufferAttribute(circlePts(R, 160, (r, a) => [r * Math.cos(a), 0, r * Math.sin(a)]), 3));
    t.add(new THREE.LineSegments(oGeo, new THREE.LineBasicMaterial({ color: LILAC, transparent: true, opacity: 0.85, fog: true })));
    const e = new THREE.Mesh(new THREE.SphereGeometry(0.055, 20, 14), new THREE.MeshBasicMaterial({ color: col, fog: false }));
    const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: eTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: .7 }));
    halo.scale.setScalar(0.32); e.add(halo);
    t.add(e); orbits.push({ e, R, speed, phase: i * 2.1 });
    mouseGroup.add(g);
  });

  let visible = false;
  new IntersectionObserver(es => { visible = es[0].isIntersecting; }, { rootMargin: '100px' }).observe(canvas);
  let W = 0, H = 0;
  function size() {
    const w = canvas.clientWidth, h = canvas.clientHeight; if (!w || !h || (w === W && h === H)) return;
    W = w; H = h; renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2)); renderer.setSize(W, H, false);
    camera.aspect = W / H; camera.updateProjectionMatrix();
  }
  const clock = new THREE.Clock(); let mx = 0, my = 0;
  (function tick() {
    requestAnimationFrame(tick);
    const dt = Math.min(clock.getDelta(), 0.05), t = clock.elapsedTime;
    if (!visible) return;
    size();
    mx += (PF.mx - mx) * 0.06; my += (PF.my - my) * 0.06;
    mouseGroup.rotation.y = mx * 0.6; mouseGroup.rotation.x = my * 0.4;
    if (!reduce) sphere.rotation.y += dt * 0.12;
    for (const o of orbits) { const a = o.phase + (reduce ? 0 : t * o.speed * 1.6); o.e.position.set(o.R * Math.cos(a), 0, o.R * Math.sin(a)); }
    core.scale.setScalar(0.55 * (1 + Math.sin(t * 1.6) * 0.06));
    renderer.render(scene, camera);
  })();
}

dysonSun();
wireAtom();

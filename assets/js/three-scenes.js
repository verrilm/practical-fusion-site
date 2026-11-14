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
   1. Dyson sun: a clean sun disc (edge kept visible, very soft glow)
      wrapped in toon-shaded ring segments with ink outlines.
      On the mission, two circles grow out of it: one dotted & spinning, one solid.
   ============================================================ */
function circlePts(r, n) { const a = []; for (let i = 0; i < n; i++) { const t0 = i / n * Math.PI * 2, t1 = (i + 1) / n * Math.PI * 2; a.push(r * Math.cos(t0), r * Math.sin(t0), 0, r * Math.cos(t1), r * Math.sin(t1), 0); } return a; }

function dysonSun() {
  const canvas = document.getElementById('sun3d'); if (!canvas) return;
  const renderer = makeRenderer(canvas); if (!renderer) return;

  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, -5000, 5000); camera.position.z = 1000;
  const grad = new THREE.DataTexture(new Uint8Array([70,70,70,255, 165,165,165,255, 255,255,255,255]), 3, 1);
  grad.minFilter = grad.magFilter = THREE.NearestFilter; grad.needsUpdate = true;

  scene.add(new THREE.AmbientLight('#4B32A8', 0.8));
  const rim = new THREE.DirectionalLight('#9C86F0', 0.55); rim.position.set(-0.6, 1, 0.8); scene.add(rim);
  const anchor = new THREE.Group(); scene.add(anchor);        // position + scale only
  const root = new THREE.Group(); anchor.add(root);            // the sun + rings (tilts with the cursor)
  const sunLight = new THREE.PointLight('#FFF1E6', 3.6, 0, 0); root.add(sunLight);

  // a small bright sun with a wide, very diffuse glow (no visible edge to the glow)
  const SUN_R = 0.2;
  const glowMat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, depthTest: false,
    uniforms: { uColor: { value: new THREE.Color('#EFE6FF') }, uR: { value: SUN_R }, uSpread: { value: 0.55 }, uA: { value: 0.5 } },
    vertexShader: 'varying vec2 vP; void main(){ vP = position.xy; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    // gaussian falloff from the disc edge, plus a fade to zero well before the plane's border
    fragmentShader: 'uniform vec3 uColor; uniform float uR, uSpread, uA; varying vec2 vP; void main(){ float d = max(length(vP) - uR, 0.0); float g = exp(-(d*d)/(uSpread*uSpread)) * 0.75 + exp(-d/(uSpread*0.35)) * 0.25; g *= 1.0 - smoothstep(2.2, 3.0, length(vP)); gl_FragColor = vec4(uColor, uA * g); }'
  });
  const glow = new THREE.Mesh(new THREE.PlaneGeometry(6.2, 6.2), glowMat);
  glow.renderOrder = -5; anchor.add(glow);

  // the sun disc: a clean warm-white circle, always facing the camera
  const disc = new THREE.Mesh(new THREE.CircleGeometry(SUN_R, 96), new THREE.MeshBasicMaterial({ color: '#FFFBF2', toneMapped: false }));
  root.add(disc);
  const lineMats = [];
  const faceCam = [disc];

  const RINGS = [
    { r: 1.00, h: 0.10, tilt: 22, roll:   0, spin:  0.16, segs: 4 },
    { r: 0.94, h: 0.09, tilt: 22, roll:  60, spin: -0.13, segs: 3 },
    { r: 0.88, h: 0.09, tilt: 22, roll: -60, spin:  0.20, segs: 4 },
    { r: 0.74, h: 0.06, tilt: 76, roll:  18, spin:  0.28, segs: 5 },
    { r: 0.62, h: 0.05, tilt: 48, roll: 112, spin: -0.24, segs: 3 },
  ];
  const bandMat = new THREE.MeshToonMaterial({ color: '#D8CCFF', gradientMap: grad, side: THREE.DoubleSide });
  const spinners = [];
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
    const lm = new LineMaterial({ color: '#0B0326', linewidth: 2 }); lineMats.push(lm);
    spin.add(new LineSegments2(lg, lm));
  }

  // mission circles (flat, in the screen plane)
  const halos = new THREE.Group(); anchor.add(halos);
  const solidGeo = new LineSegmentsGeometry(); solidGeo.setPositions(circlePts(1.48, 256));
  const solidMat = new LineMaterial({ color: '#CBC2FF', linewidth: 1.3, transparent: true, opacity: 0 }); lineMats.push(solidMat);
  const solid = new LineSegments2(solidGeo, solidMat); halos.add(solid);
  const dotTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 32; const g = c.getContext('2d'); g.fillStyle = '#fff'; g.beginPath(); g.arc(16, 16, 14, 0, Math.PI * 2); g.fill(); const t = new THREE.CanvasTexture(c); return t; })();
  const N = 140, dp = [];
  for (let i = 0; i < N; i++) { const a = i / N * Math.PI * 2; dp.push(1.2 * Math.cos(a), 1.2 * Math.sin(a), 0); }
  const dotGeo = new THREE.BufferGeometry(); dotGeo.setAttribute('position', new THREE.Float32BufferAttribute(dp, 3));
  const dotMat = new THREE.PointsMaterial({ color: '#E4DEFF', size: 3.2, sizeAttenuation: false, map: dotTex, transparent: true, opacity: 0, depthWrite: false, alphaTest: 0.01 });
  const dotted = new THREE.Points(dotGeo, dotMat); halos.add(dotted);

  let W = 0, H = 0;
  function size() {
    const w = canvas.clientWidth, h = canvas.clientHeight; if (!w || !h || (w === W && h === H)) return;
    W = w; H = h;
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2)); renderer.setSize(W, H, false);
    Object.assign(camera, { left: -W / 2, right: W / 2, top: H / 2, bottom: -H / 2 }); camera.updateProjectionMatrix();
    lineMats.forEach(m => m.resolution.set(W, H));
  }
  const clock = new THREE.Clock(); let mx = 0, my = 0;
  const q = new THREE.Quaternion();
  (function tick() {
    requestAnimationFrame(tick);
    if (!PF.heroVisible) return;
    size();
    const dt = Math.min(clock.getDelta(), 0.05), t = clock.elapsedTime;
    mx += (PF.mx - mx) * 0.08; my += (PF.my - my) * 0.08;
    anchor.position.set(PF.sun.x - W / 2, H / 2 - PF.sun.y, 0);
    anchor.scale.setScalar(PF.sun.r);
    root.rotation.x = my * 0.35 + (reduce ? 0 : Math.sin(t * 0.21) * 0.05);
    root.rotation.y = mx * 0.45 + (reduce ? 0 : Math.sin(t * 0.17) * 0.07);
    root.updateMatrixWorld();
    q.copy(root.quaternion).invert();
    faceCam.forEach(o => o.quaternion.copy(q));
    if (!reduce) spinners.forEach(s => { s.rotation.y += s.userData.speed * dt; });

    // circles grow out of the sun with the mission
    const m = PF.m || 0, e = Math.max(0, Math.min(1, (m - 0.25) / 0.75));
    const grow = 0.55 + 0.45 * (1 - Math.pow(1 - e, 3));
    solid.scale.setScalar(grow); dotted.scale.setScalar(0.65 + 0.35 * (1 - Math.pow(1 - e, 3)));
    solidMat.opacity = 0.55 * e; dotMat.opacity = 0.9 * e;
    // on the mission the glow gets a little brighter and spreads wider
    glowMat.uniforms.uA.value = 0.5 + 0.18 * m;
    glowMat.uniforms.uSpread.value = 0.55 + 0.3 * m;
    halos.visible = e > 0.001;
    if (!reduce) dotted.rotation.z -= dt * 0.12;
    renderer.render(scene, camera);
  })();
}

/* ============================================================
   2. Wireframe atom on the venture card: a hollow see-through sphere and
      three long orbits at the logo's angles, each with a white dot travelling it.
      Only the left half shows, from the right edge of the card.
   ============================================================ */
function wireAtom() {
  const canvas = document.getElementById('atom3d'); if (!canvas) return;
  const renderer = makeRenderer(canvas); if (!renderer) return;
  const CARD = '#1D1E31', LINE = '#CBC2FF';

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 50);
  const DIST = 9; camera.position.set(0, 0, DIST);
  scene.fog = new THREE.Fog(CARD, DIST - 0.2, DIST + 4.5);       // back lines dim a little, for depth

  const tiltGroup = new THREE.Group(); tiltGroup.rotation.z = deg(-18); scene.add(tiltGroup);
  const mouseGroup = new THREE.Group(); tiltGroup.add(mouseGroup);

  const ring = (r, n, map) => { const a = []; for (let i = 0; i < n; i++) { const t0 = i / n * Math.PI * 2, t1 = (i + 1) / n * Math.PI * 2; a.push(...map(r, t0), ...map(r, t1)); } return a; };
  const pts = [];
  for (let k = 0; k < 6; k++) {               // meridians every 30°
    const phi = k * Math.PI / 6;
    pts.push(...ring(1, 96, (r, t) => [r * Math.sin(t) * Math.cos(phi), r * Math.cos(t), r * Math.sin(t) * Math.sin(phi)]));
  }
  for (const lat of [-45, 0, 45]) {            // three latitudes
    const y = Math.sin(deg(lat)), rr = Math.cos(deg(lat));
    pts.push(...ring(rr, 96, (r, t) => [r * Math.cos(t), y, r * Math.sin(t)]));
  }
  const sphereGeo = new THREE.BufferGeometry(); sphereGeo.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
  const sphere = new THREE.LineSegments(sphereGeo, new THREE.LineBasicMaterial({ color: LINE, transparent: true, opacity: 0.5, fog: true }));
  mouseGroup.add(sphere);

  // three long elliptical orbits like the logo: 0°, 60°, 120°, each about 0.36 as tall as wide
  const R = 2.0, FLAT = deg(23);
  const orbits = [];
  [[0, 0.5], [60, -0.38], [120, 0.3]].forEach(([roll, speed], i) => {
    const g = new THREE.Group(); g.rotation.z = deg(roll);
    const t = new THREE.Group(); t.rotation.x = FLAT; g.add(t);
    const oGeo = new THREE.BufferGeometry(); oGeo.setAttribute('position', new THREE.Float32BufferAttribute(ring(R, 200, (r, a) => [r * Math.cos(a), 0, r * Math.sin(a)]), 3));
    t.add(new THREE.LineSegments(oGeo, new THREE.LineBasicMaterial({ color: LINE, transparent: true, opacity: 0.85, fog: true })));
    const e = new THREE.Mesh(new THREE.SphereGeometry(0.032, 16, 12), new THREE.MeshBasicMaterial({ color: '#FFFFFF', fog: false }));
    t.add(e); orbits.push({ e, speed, phase: i * 2.1 });
    mouseGroup.add(g);
  });

  let visible = false;
  new IntersectionObserver(es => { visible = es[0].isIntersecting; }, { rootMargin: '100px' }).observe(canvas);
  let W = 0, H = 0;
  function size() {
    const w = canvas.clientWidth, h = canvas.clientHeight; if (!w || !h || (w === W && h === H)) return;
    W = w; H = h; renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2)); renderer.setSize(W, H, false);
    camera.aspect = W / H;
    // the canvas is twice the card's height and centred on its bottom edge, so only the top half shows;
    // fit the orbits' full width into the canvas width
    const vis = Math.max(4.2 / camera.aspect, 2.6);
    camera.fov = 2 * Math.atan(vis / 2 / DIST) * 180 / Math.PI;
    camera.updateProjectionMatrix();
  }
  const clock = new THREE.Clock(); let mx = 0, my = 0;
  (function tick() {
    requestAnimationFrame(tick);
    const dt = Math.min(clock.getDelta(), 0.05), t = clock.elapsedTime;
    if (!visible) return;
    size();
    mx += (PF.mx - mx) * 0.06; my += (PF.my - my) * 0.06;
    mouseGroup.rotation.y = mx * 0.4; mouseGroup.rotation.x = my * 0.12;
    if (!reduce) sphere.rotation.y += dt * 0.12;
    for (const o of orbits) { const a = o.phase + (reduce ? 0 : t * o.speed * 1.6); o.e.position.set(R * Math.cos(a), 0, R * Math.sin(a)); }
    renderer.render(scene, camera);
  })();
}

dysonSun();
wireAtom();

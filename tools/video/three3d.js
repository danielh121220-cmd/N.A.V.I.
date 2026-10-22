import * as THREE from 'three';
import { STLLoader } from './node_modules/three/examples/jsm/loaders/STLLoader.js';
import { RoomEnvironment } from './node_modules/three/examples/jsm/environments/RoomEnvironment.js';
import { toCreasedNormals } from './node_modules/three/examples/jsm/utils/BufferGeometryUtils.js';

export { THREE };

const FILES = ['lector_frente', 'lector_tapa', 'lector_panel_negro', 'camara_frente', 'camara_tapa', 'llavero_icono_base_mateo', 'llavero_icono_tapa', 'llavero_bot_base_mateo', 'llavero_bot_tapa'];
let GEO = null;

export async function load(base = 'stl') {
  if (GEO) return GEO;
  const loader = new STLLoader();
  GEO = {};
  await Promise.all(FILES.map(f => new Promise((res, rej) => loader.load(`${base}/${f}.stl`, g => { GEO[f] = toCreasedNormals(g, Math.PI / 5); res(); }, undefined, rej))));
  return GEO;
}

const WHITE = new THREE.Color('#f3f4f7');
const BLUE = new THREE.Color('#0057D9');
const SHELL = new THREE.Color('#0A5BD8');
const ENGRAVE = new THREE.Color('#dbe8ff');

function colored(geo, fn) {
  const g = geo.clone();
  const pos = g.attributes.position;
  const nor = g.attributes.normal;
  const col = new Float32Array(pos.count * 3);
  const c = new THREE.Color();
  for (let i = 0; i < pos.count; i += 3) {
    const cx = (pos.getX(i) + pos.getX(i + 1) + pos.getX(i + 2)) / 3;
    const cy = (pos.getY(i) + pos.getY(i + 1) + pos.getY(i + 2)) / 3;
    const cz = (pos.getZ(i) + pos.getZ(i + 1) + pos.getZ(i + 2)) / 3;
    fn(c, cx, cy, cz, nor.getZ(i));
    for (let k = 0; k < 3; k++) { col[(i + k) * 3] = c.r; col[(i + k) * 3 + 1] = c.g; col[(i + k) * 3 + 2] = c.b; }
  }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  return g;
}

function plastic(opts = {}) {
  return new THREE.MeshPhysicalMaterial({ vertexColors: true, roughness: 0.46, metalness: 0, clearcoat: 0.25, clearcoatRoughness: 0.45, side: THREE.DoubleSide, ...opts });
}

function boxMesh(w, h, d, color, opts = {}) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshPhysicalMaterial({ color, roughness: 0.5, ...opts }));
  m.castShadow = true;
  return m;
}

function oledTexture() {
  const cv = document.createElement('canvas');
  cv.width = 128; cv.height = 64;
  const tex = new THREE.CanvasTexture(cv);
  tex.magFilter = THREE.NearestFilter;
  tex.minFilter = THREE.LinearFilter;
  tex.colorSpace = THREE.SRGBColorSpace;
  return { cv, tex };
}

export function drawOled(cv, o) {
  const c = cv.getContext('2d');
  c.imageSmoothingEnabled = false;
  c.fillStyle = '#000';
  c.fillRect(0, 0, 128, 64);
  c.fillStyle = '#fff';
  c.textBaseline = 'top';
  c.font = 'bold 8px "DejaVu Sans Mono", monospace';
  c.fillText('N.A.V.I', 0, 1);
  c.fillText('WiFi', 104, 1);
  c.fillRect(0, 11, 128, 1);
  if (o.idle) {
    c.fillText('ACERQUE SU', 34, 22);
    c.fillText('LLAVERO', 43, 33);
    c.font = 'bold 9px "DejaVu Sans Mono", monospace';
    c.fillText(o.clock || '06:58', 49, 48);
  } else {
    if (o.bmp) {
      for (let y = 0; y < 32; y++) for (let bx = 0; bx < 4; bx++) {
        const byte = parseInt(o.bmp.substr((y * 4 + bx) * 2, 2), 16);
        for (let b = 0; b < 8; b++) if (byte & (0x80 >> b)) c.fillRect(bx * 8 + b, 22 + y, 1, 1);
      }
    }
    c.fillText(o.l1 || '', 38, 20);
    c.fillText(o.l2 || '', 38, 32);
    if (o.l3) { c.font = 'bold 15px "DejaVu Sans Mono", monospace'; c.fillText(o.l3, 38, 44); }
  }
  const img = c.getImageData(0, 0, 128, 64);
  for (let i = 0; i < img.data.length; i += 4) {
    const v = img.data[i] > 110 ? 255 : 0;
    img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
    img.data[i + 3] = 255;
  }
  c.putImageData(img, 0, 0);
}

export function buildReader() {
  const g = new THREE.Group();
  const shellGeo = colored(GEO.lector_frente, (c, x, y, z, nz) => {
    const engr = z > 0.3 && z < 0.75 && Math.abs(nz) > 0.8 && y < 8 && y > -45;
    c.copy(engr ? ENGRAVE : SHELL);
  });
  const shell = new THREE.Mesh(shellGeo, plastic());
  shell.castShadow = true;
  const panel = new THREE.Mesh(colored(GEO.lector_panel_negro, c => c.set('#0a0b0d')), plastic({ roughness: 0.22, clearcoat: 0.8, clearcoatRoughness: 0.15 }));
  const back = new THREE.Mesh(colored(GEO.lector_tapa, c => c.copy(SHELL)), plastic());
  back.scale.z = -1;
  back.position.z = 40;
  const vlBack = new THREE.Mesh(new THREE.PlaneGeometry(9, 7), new THREE.MeshBasicMaterial({ color: '#050506' }));
  vlBack.position.set(24, 41, 1.75);
  vlBack.rotation.y = Math.PI;
  const glass = new THREE.Mesh(new THREE.PlaneGeometry(30, 19), new THREE.MeshBasicMaterial({ color: '#030304' }));
  glass.position.set(0, 35, 1.75);
  glass.rotation.y = Math.PI;
  const oled = oledTexture();
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(22, 11), new THREE.MeshBasicMaterial({ map: oled.tex, toneMapped: false, transparent: true }));
  screen.position.set(0, 35, 1.7);
  screen.rotation.y = Math.PI;
  const leds = [-10, 0, 10].map((x, i) => {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(2.45, 2.45, 1.8, 24), new THREE.MeshStandardMaterial({ color: '#d4d7dd', roughness: 0.3, emissive: '#000000' }));
    m.rotation.x = Math.PI / 2;
    m.position.set(x, -50, 0.95);
    return m;
  });
  const glowTex = (() => { const cv = document.createElement('canvas'); cv.width = cv.height = 128; const c = cv.getContext('2d'); const gr = c.createRadialGradient(64, 64, 0, 64, 64, 64); gr.addColorStop(0, 'rgba(120,255,160,1)'); gr.addColorStop(0.25, 'rgba(52,199,89,0.55)'); gr.addColorStop(1, 'rgba(52,199,89,0)'); c.fillStyle = gr; c.fillRect(0, 0, 128, 128); const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; return t; })();
  const glow = new THREE.Mesh(new THREE.PlaneGeometry(16, 16), new THREE.MeshBasicMaterial({ map: glowTex, transparent: true, opacity: 0, depthWrite: false }));
  glow.position.set(10, -50, -0.4);
  glow.rotation.y = Math.PI;
  const parts = buildParts();
  const front = new THREE.Group();
  front.add(shell, vlBack, glass, screen, ...leds, glow);
  panel.position.z = -0.02;
  g.add(front, panel, back, parts.group);
  const inner = new THREE.Group();
  inner.add(g);
  inner.rotation.y = Math.PI;
  const api = {
    group: inner, shell, panel, back, parts, oled, _k: null,
    setOled(key, o) {
      if (this._k === key) return;
      drawOled(oled.cv, o);
      oled.tex.needsUpdate = true;
      this._k = key;
    },
    setLed(on) {
      const m = leds[2];
      m.material.color.set(on ? '#5dff8a' : '#d4d7dd');
      m.material.emissive.set(on ? '#2bd162' : '#000000');
      m.material.emissiveIntensity = on ? 2.2 : 0;
      glow.material.opacity = on ? 0.75 : 0;
    },
    front,
    explode(e) {
      front.position.z = -e * 125;
      panel.position.z = -0.02 - e * 160;
      back.position.z = 40 + e * 45;
      parts.explode(e);
      parts.group.visible = e > 0.001;
    }
  };
  api.explode(0);
  return api;
}

function coilTexture() {
  const cv = document.createElement('canvas');
  cv.width = 256; cv.height = 256;
  const c = cv.getContext('2d');
  c.fillStyle = '#b3121f'; c.fillRect(0, 0, 256, 256);
  c.strokeStyle = '#e8b04a'; c.lineWidth = 3;
  for (let i = 0; i < 4; i++) { const m = 30 + i * 9; c.strokeRect(m, m, 256 - 2 * m, 256 - 2 * m); }
  c.fillStyle = '#111'; c.fillRect(150, 150, 34, 34);
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; return t;
}

function buildParts() {
  const group = new THREE.Group();
  const pn = new THREE.Mesh(new THREE.BoxGeometry(42.7, 40.4, 1.6), [0, 1, 2, 3, 4, 5].map(i => new THREE.MeshPhysicalMaterial(i === 5 || i === 4 ? { map: coilTexture(), roughness: 0.5 } : { color: '#b3121f', roughness: 0.5 })));
  pn.position.set(0, -10, 2.4);
  const oledB = boxMesh(27.3, 27.8, 1.2, '#1f4fbf');
  oledB.position.set(0, 35, 3.4);
  const oledG = boxMesh(26, 19, 1.4, '#050506', { roughness: 0.15, clearcoat: 1 });
  oledG.position.set(0, 35, 2.3);
  const esp = new THREE.Group();
  const espB = boxMesh(51.5, 28.3, 1.6, '#151515');
  const espS = boxMesh(18, 25.5, 3.2, '#c9ccd2', { metalness: 0.9, roughness: 0.3 });
  espS.position.set(8, 0, -2.4);
  const usb = boxMesh(5.6, 7.6, 2.8, '#c9ccd2', { metalness: 0.9, roughness: 0.3 });
  usb.position.set(-24.5, 0, -2.2);
  esp.add(espB, espS, usb);
  esp.position.set(0, -45, 34.2);
  const buzz = new THREE.Mesh(new THREE.CylinderGeometry(6, 6, 9.5, 32), new THREE.MeshPhysicalMaterial({ color: '#111', roughness: 0.6 }));
  buzz.rotation.x = Math.PI / 2;
  buzz.position.set(32, 6, 6.4);
  const vl = boxMesh(10.7, 25, 1.2, '#5b2bbf');
  vl.position.set(24, 32.5, 2.3);
  const ledCols = ['#34c759', '#ffcc00', '#ff3b30'];
  const ledM = [-10, 0, 10].map((x, i) => {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(2.5, 2.5, 6, 20), new THREE.MeshPhysicalMaterial({ color: ledCols[i], roughness: 0.15, clearcoat: 1 }));
    m.rotation.x = Math.PI / 2;
    m.position.set(x, -50, 4.5);
    return m;
  });
  const items = [[pn, -22], [oledB, -30], [oledG, -38], [esp, 18], [buzz, -14], [vl, -26], ...ledM.map(m => [m, -40])];
  items.forEach(([m]) => group.add(m));
  const base = items.map(([m]) => m.position.z);
  return {
    group,
    explode(e) { items.forEach(([m, d], i) => { m.position.z = base[i] + e * d; }); }
  };
}

export function buildKey(style = 'icono') {
  const g = new THREE.Group();
  const baseGeo = GEO[`llavero_${style}_base_mateo`];
  const lidGeo = GEO[`llavero_${style}_tapa`];
  const base = new THREE.Mesh(colored(baseGeo, c => c.copy(BLUE)), plastic({ roughness: 0.42, clearcoat: 0.15 }));
  const lid = new THREE.Mesh(colored(lidGeo, (c, x, y, z) => c.copy(style === 'icono' ? (z < 0.55 ? BLUE : WHITE) : (z < 0.55 ? WHITE : BLUE))), plastic({ roughness: 0.42, clearcoat: 0.15 }));
  lid.scale.z = -1;
  lid.position.z = 3.6 + 1.8;
  base.castShadow = lid.castShadow = true;
  const ringY = style === 'icono' ? 21 : 16.5;
  const ring = new THREE.Mesh(new THREE.TorusGeometry(11, 0.95, 16, 64), new THREE.MeshStandardMaterial({ color: '#d9dbe0', metalness: 1, roughness: 0.22 }));
  ring.position.set(0, ringY + 9.5, 2.7);
  ring.rotation.y = Math.PI / 2;
  g.add(base, lid, ring);
  return { group: g, base, lid, ring, explode(e) { lid.position.z = 5.4 + e * 14; } };
}

export function buildPod() {
  const g = new THREE.Group();
  const shell = new THREE.Mesh(colored(GEO.camara_frente, c => c.copy(WHITE)), plastic());
  const back = new THREE.Mesh(colored(GEO.camara_tapa, c => c.copy(WHITE)), plastic());
  back.scale.z = -1; back.position.z = 25;
  const lens = new THREE.Mesh(new THREE.CylinderGeometry(4, 4, 2, 32), new THREE.MeshPhysicalMaterial({ color: '#050507', roughness: 0.05, clearcoat: 1 }));
  lens.rotation.x = Math.PI / 2; lens.position.set(0, 8, 1.6);
  g.add(shell, back, lens);
  const inner = new THREE.Group(); inner.add(g); inner.rotation.y = Math.PI;
  return { group: inner };
}

export function createView(canvas, { width, height, env = 0.9, shadow = true, fov = 30, antialias = true } = {}) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias, alpha: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(1);
  renderer.setSize(width, height, false);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.shadowMap.enabled = shadow;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = env;
  const camera = new THREE.PerspectiveCamera(fov, width / height, 1, 5000);
  const key = new THREE.DirectionalLight('#ffffff', 1.6);
  key.position.set(-180, 260, 320);
  key.castShadow = shadow;
  key.shadow.mapSize.set(2048, 2048);
  key.shadow.camera.left = -200; key.shadow.camera.right = 200; key.shadow.camera.top = 200; key.shadow.camera.bottom = -200;
  key.shadow.radius = 6;
  key.shadow.bias = -0.0005;
  scene.add(key);
  const fill = new THREE.DirectionalLight('#dfe9ff', 0.5);
  fill.position.set(250, -60, 200);
  scene.add(fill);
  return { renderer, scene, camera, key, fill, render() { renderer.render(scene, camera); } };
}

export function shadowPlane(size = 2000, opacity = 0.16) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(size, size), new THREE.ShadowMaterial({ opacity }));
  m.receiveShadow = true;
  return m;
}

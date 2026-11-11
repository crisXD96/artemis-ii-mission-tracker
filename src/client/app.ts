/**
 * Artemis II Mission Tracker — Main App
 * Orchestrates 3D scene, HUD, timeline, and events panel.
 */

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { createCrewComms } from './crew-dialogue.js';
import type { TrajectoryPoint, MissionEvent, CrewMember } from '../types.js';

type CameraMode = 'earth' | 'moon' | 'follow' | 'overview' | 'earthrise';
type TrajectorySample = Omit<TrajectoryPoint, 'met'>;

// Falla con un mensaje claro si index.html y este archivo dejan de coincidir
function byId<T extends HTMLElement = HTMLElement>(id: string): T {
  const el = document.getElementById(id);
  if (!el) throw new Error(`Falta el elemento #${id} en index.html`);
  return el as T;
}

function get2d(canvas: HTMLCanvasElement): CanvasRenderingContext2D {
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('El navegador no soporta canvas 2D');
  return ctx;
}

// ——— Constants ———
const TOTAL_MET = 803400;    // segundos (9d 7h 10m — amerizaje)
const EARTH_R = 6.371;       // units (1 unit = 1000 km)
const MOON_R = 1.7374;
const EARTH_MOON_DIST = 384.4;
const SCALE_FACTOR = 1;      // visual scale

// ——— State ———
let trajectory: TrajectoryPoint[] = [];
let events: MissionEvent[] = [];
let crew: CrewMember[] = [];
let currentMET = 0;
let isPlaying = false;
let playSpeed = 100;
let lastTimestamp: number | null = null;
let orionPosition = new THREE.Vector3(0, 0, EARTH_R);

// ——— Cached DOM ———
const hudMet = byId('hud-met');
const hudDistEarth = byId('hud-dist-earth');
const hudDistMoon = byId('hud-dist-moon');
const hudVelocity = byId('hud-velocity');
const hudPhase = byId('hud-phase');
const timelineSlider = byId<HTMLInputElement>('timeline-slider');
const timelineMetDisplay = byId('timeline-met-display');
const eventsList = byId('events-list');
const speedSelect = byId<HTMLSelectElement>('speed-select');
const btnPlayPause = byId<HTMLButtonElement>('btn-playpause');
const crewTooltip = byId('crew-tooltip');
const crewListEl = byId('crew-list');

// ——— THREE.js setup ———
const renderer = new THREE.WebGLRenderer({
  canvas: byId<HTMLCanvasElement>('space-canvas'),
  antialias: true,
  alpha: false,
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.01, 10000);
camera.position.set(0, 80, 200);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.minDistance = 10;
controls.maxDistance = 1200;
controls.zoomSpeed = 1.2;

// ——— STARFIELD ———
function createStarfield() {
  const starCount = 8000;
  const positions = new Float32Array(starCount * 3);
  const sizes = new Float32Array(starCount);
  for (let i = 0; i < starCount; i++) {
    const r = 800 + Math.random() * 200;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    positions[i * 3]     = r * Math.sin(phi) * Math.cos(theta);
    positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
    positions[i * 3 + 2] = r * Math.cos(phi);
    sizes[i] = 0.5 + Math.random() * 1.5;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

  const mat = new THREE.PointsMaterial({
    color: 0xffffff,
    size: 0.8,
    sizeAttenuation: true,
    transparent: true,
    opacity: 0.85,
  });
  const stars = new THREE.Points(geo, mat);
  scene.add(stars);
  return stars;
}

// ——— EARTH ———
function createEarth() {
  const geo = new THREE.SphereGeometry(EARTH_R, 64, 64);

  // Procedural Earth texture
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 512;
  const ctx = get2d(canvas);

  // Base ocean blue
  ctx.fillStyle = '#1a4f8a';
  ctx.fillRect(0, 0, 1024, 512);

  // Simplified continent shapes
  const drawContinent = (path: Array<[number, number]>, color: string) => {
    ctx.fillStyle = color;
    ctx.beginPath();
    path.forEach(([x, y], i) => i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y));
    ctx.closePath();
    ctx.fill();
  };

  // Americas
  drawContinent([
    [150,80],[200,70],[220,100],[240,120],[230,160],[250,200],
    [240,260],[220,300],[200,340],[180,360],[160,340],[150,300],
    [140,260],[130,200],[120,160],[130,120],[140,100]
  ], '#2d8a3e');

  // Europe/Africa
  drawContinent([
    [450,60],[510,55],[530,80],[540,100],[520,140],[500,160],
    [480,200],[490,240],[510,280],[530,340],[520,400],[500,440],
    [480,460],[460,440],[450,400],[430,360],[420,300],[410,240],
    [420,180],[430,140],[440,100],[445,75]
  ], '#2d8a3e');

  // Asia
  drawContinent([
    [560,50],[700,40],[820,60],[880,80],[900,120],[880,160],
    [840,180],[820,200],[780,220],[750,240],[720,230],[700,210],
    [680,230],[650,240],[620,220],[590,200],[570,170],[550,140],
    [540,110],[545,80]
  ], '#2d8a3e');

  // Australia
  drawContinent([
    [720,310],[780,300],[820,310],[840,340],[830,370],[800,390],
    [760,395],[730,380],[710,355],[710,330]
  ], '#8a6a2d');

  // Ice caps
  ctx.fillStyle = '#e8f4f8';
  ctx.fillRect(0, 0, 1024, 30);
  ctx.fillRect(0, 490, 1024, 22);

  // Cloud layer (semi-transparent white swirls)
  ctx.globalAlpha = 0.4;
  ctx.fillStyle = '#ffffff';
  for (let i = 0; i < 30; i++) {
    const cx = Math.random() * 1024;
    const cy = Math.random() * 512;
    const rx = 40 + Math.random() * 80;
    const ry = 10 + Math.random() * 20;
    ctx.beginPath();
    ctx.ellipse(cx, cy, rx, ry, Math.random() * Math.PI, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  const texture = new THREE.CanvasTexture(canvas);
  const mat = new THREE.MeshPhongMaterial({
    map: texture,
    shininess: 15,
    specular: new THREE.Color(0x224466),
  });

  const earth = new THREE.Mesh(geo, mat);
  scene.add(earth);

  // Atmósfera con Fresnel real: el brillo crece solo hacia el borde del disco.
  // Un material Phong aditivo iluminaba toda la cara diurna y la dejaba lavada.
  const atmGeo = new THREE.SphereGeometry(EARTH_R * 1.06, 64, 64);
  const atmMat = new THREE.ShaderMaterial({
    uniforms: {
      glowColor: { value: new THREE.Color(0x4488ff) },
      maxOpacity: { value: 0.15 },
      falloff: { value: 3.0 },
    },
    vertexShader: `
      varying vec3 vNormal;
      varying vec3 vViewDir;
      void main() {
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        vNormal = normalize(normalMatrix * normal);
        vViewDir = normalize(-mvPosition.xyz);
        gl_Position = projectionMatrix * mvPosition;
      }
    `,
    fragmentShader: `
      uniform vec3 glowColor;
      uniform float maxOpacity;
      uniform float falloff;
      varying vec3 vNormal;
      varying vec3 vViewDir;
      void main() {
        float fresnel = pow(1.0 - abs(dot(vNormal, vViewDir)), falloff);
        gl_FragColor = vec4(glowColor, fresnel * maxOpacity);
      }
    `,
    transparent: true,
    side: THREE.FrontSide,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const atmosphere = new THREE.Mesh(atmGeo, atmMat);
  scene.add(atmosphere);

  return earth;
}

// ——— MOON ———
function createMoon() {
  const geo = new THREE.SphereGeometry(MOON_R, 48, 48);

  // Procedural moon texture (grey with craters)
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 256;
  const ctx = get2d(canvas);

  ctx.fillStyle = '#8a8a8a';
  ctx.fillRect(0, 0, 512, 256);

  // Add surface variation
  for (let i = 0; i < 200; i++) {
    const x = Math.random() * 512;
    const y = Math.random() * 256;
    const r = 1 + Math.random() * 8;
    const brightness = 100 + Math.floor(Math.random() * 80);
    ctx.fillStyle = `rgb(${brightness},${brightness},${brightness})`;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  // Craters
  for (let i = 0; i < 40; i++) {
    const x = Math.random() * 512;
    const y = Math.random() * 256;
    const r = 5 + Math.random() * 20;
    ctx.strokeStyle = '#555';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = `rgba(60,60,60,0.3)`;
    ctx.fill();
    // Crater rim highlight
    ctx.strokeStyle = '#aaa';
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.arc(x - 1, y - 1, r * 0.95, Math.PI * 1.2, Math.PI * 1.8);
    ctx.stroke();
  }

  // Mare (dark regions)
  ctx.globalAlpha = 0.4;
  for (let i = 0; i < 8; i++) {
    const x = Math.random() * 512;
    const y = Math.random() * 256;
    ctx.fillStyle = '#5a5a5a';
    ctx.beginPath();
    ctx.ellipse(x, y, 30 + Math.random() * 50, 20 + Math.random() * 30, Math.random() * Math.PI, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  const texture = new THREE.CanvasTexture(canvas);
  const mat = new THREE.MeshPhongMaterial({
    map: texture,
    shininess: 5,
    color: 0xcccccc,
  });

  const moon = new THREE.Mesh(geo, mat);
  moon.position.set(EARTH_MOON_DIST, 0, 0);
  scene.add(moon);
  return moon;
}

// ——— SUN ———
function createSun() {
  // Directional light from the Sun
  const sunLight = new THREE.DirectionalLight(0xfff5e0, 2.5);
  sunLight.position.set(500, 100, 300);
  scene.add(sunLight);

  // Ambient light (very dim — space)
  const ambient = new THREE.AmbientLight(0x111122, 0.3);
  scene.add(ambient);

  // Sun sphere (distant visual)
  const sunGeo = new THREE.SphereGeometry(15, 16, 16);
  const sunMat = new THREE.MeshBasicMaterial({ color: 0xffee88 });
  const sun = new THREE.Mesh(sunGeo, sunMat);
  sun.position.set(600, 80, 200);

  // Sun glow
  const glowGeo = new THREE.SphereGeometry(18, 16, 16);
  const glowMat = new THREE.MeshBasicMaterial({
    color: 0xffdd44,
    transparent: true,
    opacity: 0.2,
    side: THREE.BackSide,
    blending: THREE.AdditiveBlending,
  });
  const glow = new THREE.Mesh(glowGeo, glowMat);
  sun.add(glow);
  scene.add(sun);

  return { sunLight, sun };
}

// ——— IMPACTO DE METEORITO ———
// Se calcula a partir del MET y no del reloj: se ve igual a cualquier velocidad,
// se puede pausar a la mitad y desaparece al regresar el slider.
const IMPACT_APPROACH = 20 * 60;   // s de MET que tarda en caer
const IMPACT_FLASH = 5 * 60;       // s de MET que dura el destello
const IMPACT_GLOW = 30 * 60;       // s de MET que el cráter sigue incandescente
const METEOR_START_DIST = 25;      // unidades desde el punto de impacto
const TRAIL_POINTS = 24;
const TRAIL_LENGTH = 3;
// Exagerados como Orion: a escala real el meteorito y el cráter serían invisibles
const CRATER_R = 0.18;

function makeGlowTexture() {
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = get2d(canvas);
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.25, 'rgba(255,242,204,0.85)');
  g.addColorStop(0.6, 'rgba(255,190,110,0.25)');
  g.addColorStop(1, 'rgba(255,160,60,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  return new THREE.CanvasTexture(canvas);
}

function createMeteorImpact(moon: THREE.Mesh) {
  const ev = events.find(e => e.id === 'meteor-impact');
  if (!ev || !moon) return null;

  const glowTex = makeGlowTexture();
  const glowMat = () => new THREE.SpriteMaterial({
    map: glowTex,
    color: 0xfff2cc,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });

  const meteor = new THREE.Mesh(
    new THREE.SphereGeometry(0.12, 12, 12),
    new THREE.MeshBasicMaterial({ color: 0xfff2cc })
  );
  const meteorGlow = new THREE.Sprite(glowMat());
  meteorGlow.scale.setScalar(1.4);
  meteor.add(meteorGlow);

  const trailGeo = new THREE.BufferGeometry();
  trailGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(TRAIL_POINTS * 3), 3));
  const colors = new Float32Array(TRAIL_POINTS * 3);
  for (let i = 0; i < TRAIL_POINTS; i++) {
    const c = 1 - i / (TRAIL_POINTS - 1);
    colors.set([c, c * 0.8, c * 0.5], i * 3);
  }
  trailGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  const trail = new THREE.Line(trailGeo, new THREE.LineBasicMaterial({
    vertexColors: true,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  }));

  const flash = new THREE.Sprite(glowMat());
  const flashLight = new THREE.PointLight(0xfff2cc, 0, 10, 1);

  // El cráter va pegado a la Luna para que gire y orbite con ella
  const crater = new THREE.Group();
  const craterFloor = new THREE.Mesh(
    new THREE.CircleGeometry(CRATER_R, 24),
    new THREE.MeshPhongMaterial({ color: 0x2b2b2b, emissive: 0xff5a1f, emissiveIntensity: 0 })
  );
  const craterRim = new THREE.Mesh(
    new THREE.RingGeometry(CRATER_R, CRATER_R * 1.45, 24),
    new THREE.MeshPhongMaterial({ color: 0xd8d8d8 })
  );
  crater.add(craterFloor, craterRim);
  moon.add(crater);

  [meteor, trail, flash, flashLight, crater].forEach(o => { o.visible = false; });
  scene.add(meteor, trail, flash, flashLight);

  return {
    met: ev.met,
    meteor, trail, flash, flashLight, crater, craterFloor,
    localNormal: null as THREE.Vector3 | null,
  };
}

type ImpactFx = NonNullable<ReturnType<typeof createMeteorImpact>>;

const _impactTmp = {
  normal: new THREE.Vector3(),
  tangent: new THREE.Vector3(),
  incoming: new THREE.Vector3(),
  point: new THREE.Vector3(),
  up: new THREE.Vector3(0, 1, 0),
  zAxis: new THREE.Vector3(0, 0, 1),
};

function updateMeteorImpact(fx: ImpactFx | null | undefined, met: number) {
  if (!fx || !moonRef) return;
  const start = fx.met - IMPACT_APPROACH;

  if (met < start) {
    fx.meteor.visible = fx.trail.visible = fx.flash.visible = fx.crater.visible = false;
    fx.flashLight.visible = false;
    fx.localNormal = null;
    return;
  }

  // El punto de impacto se fija en la cara de la Luna que mira a la cámara cuando empieza la
  // caída; si se fijara hacia Orion, desde la vista de la Luna quedaría del lado oculto.
  if (!fx.localNormal) {
    const worldDir = camera.position.clone().sub(moonRef.position).normalize();
    fx.localNormal = worldDir.applyQuaternion(moonRef.quaternion.clone().invert());
    fx.crater.position.copy(fx.localNormal).multiplyScalar(MOON_R + 0.004);
    fx.crater.quaternion.setFromUnitVectors(_impactTmp.zAxis, fx.localNormal);
  }

  const { normal, tangent, incoming, point, up } = _impactTmp;
  normal.copy(fx.localNormal).applyQuaternion(moonRef.quaternion);
  point.copy(moonRef.position).addScaledVector(normal, MOON_R);
  tangent.crossVectors(normal, up).normalize();
  // Llega casi de lado para que la estela cruce la pantalla en vez de venir de frente
  incoming.copy(normal).multiplyScalar(0.35).add(tangent).normalize();

  // Caída
  const falling = met < fx.met;
  fx.meteor.visible = fx.trail.visible = falling;
  if (falling) {
    const t = (met - start) / IMPACT_APPROACH;
    const dist = METEOR_START_DIST * (1 - t * t); // acelera al acercarse
    fx.meteor.position.copy(point).addScaledVector(incoming, dist);
    const pos = fx.trail.geometry.attributes.position;
    for (let i = 0; i < TRAIL_POINTS; i++) {
      const back = Math.min(TRAIL_LENGTH, METEOR_START_DIST - dist) * (i / (TRAIL_POINTS - 1));
      pos.setXYZ(i,
        fx.meteor.position.x + incoming.x * back,
        fx.meteor.position.y + incoming.y * back,
        fx.meteor.position.z + incoming.z * back);
    }
    pos.needsUpdate = true;
  }

  // Destello
  const sinceImpact = met - fx.met;
  const flashing = sinceImpact >= 0 && sinceImpact < IMPACT_FLASH;
  fx.flash.visible = fx.flashLight.visible = flashing;
  if (flashing) {
    const f = sinceImpact / IMPACT_FLASH;
    const fade = (1 - f) * (1 - f);
    fx.flash.position.copy(point).addScaledVector(normal, 0.05);
    fx.flash.scale.setScalar(1.5 + 9 * Math.sqrt(f));
    fx.flash.material.opacity = fade;
    fx.flashLight.position.copy(point).addScaledVector(normal, 0.6);
    fx.flashLight.intensity = 6 * fade;
  }

  // Cráter, incandescente al principio
  fx.crater.visible = sinceImpact >= 0;
  if (sinceImpact >= 0) {
    fx.craterFloor.material.emissiveIntensity = Math.max(0, 1 - sinceImpact / IMPACT_GLOW);
  }
}

// ——— ORION SPACECRAFT ———
function createOrion() {
  const group = new THREE.Group();
  const SCALE = 0.8; // visual scale - exaggerated 500x real

  // Crew Module (cone)
  const cmGeo = new THREE.ConeGeometry(0.4 * SCALE, 0.8 * SCALE, 16);
  const cmMat = new THREE.MeshPhongMaterial({ color: 0xcccccc, shininess: 80 });
  const cm = new THREE.Mesh(cmGeo, cmMat);
  cm.position.y = 0.9 * SCALE;
  cm.rotation.z = Math.PI;
  group.add(cm);

  // Service Module (cylinder)
  const smGeo = new THREE.CylinderGeometry(0.35 * SCALE, 0.35 * SCALE, 1.2 * SCALE, 16);
  const smMat = new THREE.MeshPhongMaterial({ color: 0x8899aa, shininess: 40 });
  const sm = new THREE.Mesh(smGeo, smMat);
  sm.position.y = -0.2 * SCALE;
  group.add(sm);

  // Solar panels (flat rectangles)
  const panelMat = new THREE.MeshPhongMaterial({ color: 0x1144aa, shininess: 30, side: THREE.DoubleSide });
  [-1, 1].forEach(side => {
    const panelGeo = new THREE.BoxGeometry(1.8 * SCALE, 0.02 * SCALE, 0.5 * SCALE);
    const panel = new THREE.Mesh(panelGeo, panelMat);
    panel.position.set(side * 1.3 * SCALE, -0.2 * SCALE, 0);
    // Panel cell lines
    group.add(panel);
  });

  // Engine nozzle
  const nozzleGeo = new THREE.CylinderGeometry(0.1 * SCALE, 0.2 * SCALE, 0.3 * SCALE, 8);
  const nozzleMat = new THREE.MeshPhongMaterial({ color: 0x555566 });
  const nozzle = new THREE.Mesh(nozzleGeo, nozzleMat);
  nozzle.position.y = -0.95 * SCALE;
  group.add(nozzle);

  // Marker light (always visible beacon)
  const markerGeo = new THREE.SphereGeometry(0.15, 8, 8);
  const markerMat = new THREE.MeshBasicMaterial({
    color: 0xff8800,
    transparent: true,
    opacity: 0.9,
  });
  const marker = new THREE.Mesh(markerGeo, markerMat);
  group.add(marker);

  // Point light to make Orion glow
  const light = new THREE.PointLight(0xff8844, 2, 8);
  group.add(light);

  scene.add(group);
  return group;
}

// ——— TRAJECTORY LINE ———
function createTrajectoryLine(trajectoryData: TrajectoryPoint[]) {
  const points = trajectoryData.map(p => new THREE.Vector3(p.x, p.y, p.z));

  // Full trajectory (dim)
  const futureGeo = new THREE.BufferGeometry().setFromPoints(points);
  const futureMat = new THREE.LineBasicMaterial({
    color: 0x00ff88,
    transparent: true,
    opacity: 0.3,
  });
  const futureLine = new THREE.Line(futureGeo, futureMat);
  scene.add(futureLine);

  // Traversed (solid green) — will be updated each frame
  const traversedPoints = [points[0], points[0]];
  const traversedGeo = new THREE.BufferGeometry().setFromPoints(traversedPoints);
  const traversedMat = new THREE.LineBasicMaterial({ color: 0x00ff88 });
  const traversedLine = new THREE.Line(traversedGeo, traversedMat);
  scene.add(traversedLine);

  // Current segment (orange)
  const currentPoints = [points[0], points[0]];
  const currentGeo = new THREE.BufferGeometry().setFromPoints(currentPoints);
  const currentMat = new THREE.LineBasicMaterial({ color: 0xff8800, linewidth: 2 });
  const currentLine = new THREE.Line(currentGeo, currentMat);
  scene.add(currentLine);

  return { futureLine, traversedLine, currentLine, points };
}

// Update trajectory rendering based on current MET
type TrajectoryLines = ReturnType<typeof createTrajectoryLine>;

function updateTrajectoryLines(lines: TrajectoryLines, trajectoryData: TrajectoryPoint[], met: number) {
  const totalMet = trajectoryData[trajectoryData.length - 1].met;
  const progress = met / totalMet;
  const totalPoints = lines.points.length;
  const currentIdx = Math.min(Math.floor(progress * totalPoints), totalPoints - 2);

  // Traversed portion
  if (currentIdx > 0) {
    const tPoints = lines.points.slice(0, currentIdx + 1);
    lines.traversedLine.geometry.setFromPoints(tPoints);
  }

  // Current segment (small chunk around current position)
  const segStart = Math.max(0, currentIdx - 3);
  const segEnd = Math.min(totalPoints - 1, currentIdx + 3);
  const cPoints = lines.points.slice(segStart, segEnd + 1);
  lines.currentLine.geometry.setFromPoints(cPoints.length > 1 ? cPoints : [lines.points[0], lines.points[1]]);
}

// ——— CAMERA PRESETS ———
let cameraTarget: 'follow' | null = null;
let cameraMode: CameraMode = 'overview';

function setCameraPreset(mode: CameraMode) {
  cameraMode = mode;
  document.querySelectorAll('.cam-btn').forEach(b => b.classList.remove('active'));
  document.querySelector(`[data-cam="${mode}"]`)?.classList.add('active');
  cameraTarget = null;

  if (mode === 'earth') {
    // Look at Earth from a medium distance
    animateCameraTo(new THREE.Vector3(0, 30, 80), new THREE.Vector3(0, 0, 0));
  } else if (mode === 'moon') {
    if (!moonRef) return;
    const moonPos = moonRef.position;
    animateCameraTo(
      new THREE.Vector3(moonPos.x - 20, moonPos.y + 15, moonPos.z + 30),
      moonPos.clone()
    );
  } else if (mode === 'follow') {
    cameraTarget = 'follow';
  } else if (mode === 'overview') {
    animateCameraTo(new THREE.Vector3(200, 150, 400), new THREE.Vector3(0, 0, 0));
  } else if (mode === 'earthrise') {
    // Behind the Moon, looking back at Earth
    if (!moonRef) return;
    const moonPos = moonRef.position;
    animateCameraTo(
      new THREE.Vector3(moonPos.x + 15, moonPos.y + 5, moonPos.z + 8),
      new THREE.Vector3(0, 0, 0)
    );
  }
}

let camAnimating = false;
let camAnimStart = new THREE.Vector3();
let camAnimEnd = new THREE.Vector3();
let camLookStart = new THREE.Vector3();
let camLookEnd = new THREE.Vector3();
let camAnimT = 0;

function animateCameraTo(targetPos: THREE.Vector3, lookAt: THREE.Vector3) {
  camAnimating = true;
  camAnimT = 0;
  camAnimStart = camera.position.clone();
  camAnimEnd = targetPos;
  camLookStart = controls.target.clone();
  camLookEnd = lookAt;
}

function tickCameraAnimation(dt: number) {
  if (!camAnimating) return;
  camAnimT = Math.min(camAnimT + dt * 1.2, 1);
  const ease = 1 - Math.pow(1 - camAnimT, 3);
  camera.position.lerpVectors(camAnimStart, camAnimEnd, ease);
  controls.target.lerpVectors(camLookStart, camLookEnd, ease);
  if (camAnimT >= 1) camAnimating = false;
}

// ——— Utility: interpolate trajectory at MET ———
function getPositionAtMET(met: number): TrajectorySample {
  if (!trajectory.length) {
    return { x: 0, y: 0, z: EARTH_R, dist_earth: NaN, dist_moon: NaN, velocity: NaN, phase: '' };
  }
  const last = trajectory[trajectory.length - 1];
  if (met <= trajectory[0].met) return trajectory[0];
  if (met >= last.met) return last;

  let lo = 0, hi = trajectory.length - 1;
  while (lo < hi - 1) {
    const mid = (lo + hi) >> 1;
    if (trajectory[mid].met <= met) lo = mid;
    else hi = mid;
  }
  const a = trajectory[lo], b = trajectory[hi];
  const t = (met - a.met) / (b.met - a.met);
  return {
    x: a.x + (b.x - a.x) * t,
    y: a.y + (b.y - a.y) * t,
    z: a.z + (b.z - a.z) * t,
    dist_earth: a.dist_earth + (b.dist_earth - a.dist_earth) * t,
    dist_moon: a.dist_moon + (b.dist_moon - a.dist_moon) * t,
    velocity: a.velocity + (b.velocity - a.velocity) * t,
    phase: a.phase,
  };
}

function formatMET(seconds: number): string {
  const s = Math.floor(Math.abs(seconds));
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  const ss = s % 60;
  return `T+ ${String(d).padStart(3,'0')}:${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(ss).padStart(2,'0')}`;
}

function formatNum(n: number, decimals = 0): string {
  return Math.round(n).toLocaleString('en-US');
}

// ——— Moon position (visual orbit) ———
function getMoonOrbitPosition(met: number): THREE.Vector3 {
  const PERIOD = 27.3 * 86400;
  const angle = (met / PERIOD) * Math.PI * 2;
  return new THREE.Vector3(
    EARTH_MOON_DIST * Math.cos(angle),
    0,
    EARTH_MOON_DIST * Math.sin(angle)
  );
}

// ——— Update HUD ———
function updateHUD(point: TrajectorySample) {
  if (!point) return;
  hudMet.textContent = formatMET(currentMET);
  hudDistEarth.textContent = `${formatNum(point.dist_earth * 1000)} km`;
  hudDistMoon.textContent = `${formatNum(point.dist_moon * 1000)} km`;
  hudVelocity.textContent = `${formatNum(point.velocity)} km/h`;
  hudPhase.textContent = point.phase || '—';
  // Nota: los textos del HUD vienen del HTML traducido
  timelineMetDisplay.textContent = formatMET(currentMET);

  // Update slider progress gradient
  const pct = (currentMET / TOTAL_MET) * 100;
  timelineSlider.style.setProperty('--progress', `${pct}%`);
  timelineSlider.value = String(currentMET);
}

// ——— Events panel ———
function buildEventsPanel() {
  eventsList.innerHTML = '';
  events.forEach(ev => {
    const div = document.createElement('div');
    div.className = 'event-item';
    div.dataset.met = String(ev.met);
    div.innerHTML = `
      <div class="event-header">
        <span class="event-icon">${ev.icon}</span>
        <span class="event-title">${ev.title}</span>
      </div>
      <div class="event-met">MET ${ev.metFormatted}</div>
      <div class="event-desc">${ev.description}</div>
    `;
    div.addEventListener('click', () => {
      currentMET = ev.met;
      // Toggle expand
      div.classList.toggle('expanded');
    });
    eventsList.appendChild(div);
  });
}

function updateEventsHighlight(met: number) {
  let closestIdx = 0;
  let closestDist = Infinity;
  events.forEach((ev, i) => {
    const d = Math.abs(ev.met - met);
    if (d < closestDist) { closestDist = d; closestIdx = i; }
  });

  const items = eventsList.querySelectorAll('.event-item');
  items.forEach((item, i) => {
    item.classList.remove('current', 'past');
    if (i === closestIdx) {
      item.classList.add('current');
    } else if (events[i].met < met) {
      item.classList.add('past');
    }
  });

  document.querySelectorAll('.timeline-marker').forEach((marker, i) => {
    marker.classList.toggle('past', events[i].met <= met);
  });

  document.querySelectorAll<HTMLElement>('.phase-band').forEach(band => {
    const start = Number(band.dataset.start);
    const end = Number(band.dataset.end);
    band.classList.toggle('current', met >= start && met < end);
  });

  // Auto-scroll to current event
  const current = eventsList.querySelector('.event-item.current');
  if (current) {
    current.scrollIntoView({ block: 'nearest', behavior: prefersReducedMotion.matches ? 'auto' : 'smooth' });
  }
}

const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

// Las fases finas de los eventos se agrupan en tramos legibles en la tira de la línea de tiempo;
// la fase exacta sigue visible en el HUD.
const PHASE_GROUPS: Record<string, string> = {
  'LANZAMIENTO': 'Órbita terrestre',
  'ASCENSO': 'Órbita terrestre',
  'ÓRBITA DE ESTACIONAMIENTO': 'Órbita terrestre',
  'VUELO DE IDA': 'Vuelo de ida',
  'ESFERA DE INFLUENCIA LUNAR': 'Sobrevuelo lunar',
  'OBSERVACIÓN LUNAR': 'Sobrevuelo lunar',
  'SOBREVUELO LUNAR': 'Sobrevuelo lunar',
  'ADQUISICIÓN DE SEÑAL': 'Sobrevuelo lunar',
  'ECLIPSE SOLAR': 'Sobrevuelo lunar',
  'VUELO DE REGRESO': 'Vuelo de regreso',
  'APROXIMACIÓN FINAL': 'Vuelo de regreso',
  'REENTRADA': 'Reentrada',
  'AMERIZAJE': 'Reentrada',
};

function buildPhaseBands() {
  const container = byId('timeline-phases');
  container.innerHTML = '';
  const bands: Array<{ name: string; start: number; end: number }> = [];
  events.forEach(ev => {
    const name = PHASE_GROUPS[ev.phase] || ev.phase;
    const last = bands[bands.length - 1];
    if (last && last.name === name) return;
    if (last) last.end = ev.met;
    bands.push({ name, start: ev.met, end: TOTAL_MET });
  });

  bands.forEach(band => {
    const left = (band.start / TOTAL_MET) * 100;
    const width = ((band.end - band.start) / TOTAL_MET) * 100;
    const el = document.createElement('div');
    el.className = 'phase-band';
    if (width < 6) el.classList.add('narrow');
    if (width < 18) el.classList.add('mobile-narrow');
    el.style.left = `${left}%`;
    el.style.width = `${width}%`;
    el.dataset.start = String(band.start);
    el.dataset.end = String(band.end);
    el.title = band.name;
    el.textContent = band.name;
    container.appendChild(el);
  });
}

function buildDayTicks() {
  const container = byId('timeline-days');
  container.innerHTML = '';
  const days = Math.floor(TOTAL_MET / 86400);
  for (let d = 0; d <= days; d++) {
    const tick = document.createElement('span');
    tick.className = 'day-tick';
    tick.style.left = `${(d * 86400 / TOTAL_MET) * 100}%`;
    tick.textContent = `día ${d}`;
    container.appendChild(tick);
  }
}

// ——— Build timeline markers ———
function buildTimelineMarkers() {
  buildPhaseBands();
  buildDayTicks();

  const container = byId('timeline-events-markers');
  container.innerHTML = '';
  events.forEach(ev => {
    const pct = (ev.met / TOTAL_MET) * 100;
    const marker = document.createElement('button');
    marker.type = 'button';
    marker.className = 'timeline-marker';
    marker.style.left = `${pct}%`;
    marker.title = `${ev.title} (MET ${ev.metFormatted})`;
    marker.setAttribute('aria-label', `Ir a: ${ev.title}`);
    marker.addEventListener('click', () => { currentMET = ev.met; });
    container.appendChild(marker);
  });
}

// ——— Crew tooltip ———
function buildCrewTooltip() {
  const close = document.createElement('button');
  close.className = 'crew-close';
  close.textContent = '✕';
  close.title = 'Cerrar';
  close.onclick = () => crewTooltip.classList.remove('visible');
  crewTooltip.appendChild(close);

  crew.forEach(member => {
    const avatars = ['👨‍🚀', '👨🏾‍🚀', '👩‍🚀', '👨🏻‍🚀'];
    const idx = crew.indexOf(member);
    const div = document.createElement('div');
    div.className = 'crew-member';
    div.innerHTML = `
      <div class="crew-avatar">${avatars[idx] || '🧑‍🚀'}</div>
      <div class="crew-info">
        <div class="crew-name">${member.name}</div>
        <div class="crew-role">${member.role}</div>
        <div class="crew-agency">${member.agency}</div>
        <div class="crew-bio">${member.bio}</div>
      </div>
    `;
    crewListEl.appendChild(div);
  });
}

// ——— Click on Orion (raycasting) ———
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();

function onCanvasClick(event: MouseEvent) {
  if (event.target !== renderer.domElement) return;
  pointer.x = (event.clientX / window.innerWidth) * 2 - 1;
  pointer.y = -(event.clientY / window.innerHeight) * 2 + 1;

  raycaster.setFromCamera(pointer, camera);
  if (!orionRef) return;

  const box = new THREE.Box3().setFromObject(orionRef);
  box.expandByScalar(2); // make click target larger

  if (raycaster.ray.intersectsBox(box)) {
    crewTooltip.classList.add('visible');
  }
}
document.addEventListener('click', onCanvasClick);

// ——— Scene objects (set after init) ———
let earthRef: THREE.Mesh | undefined;
let moonRef: THREE.Mesh | undefined;
let orionRef: THREE.Group | undefined;
let trajectoryLines: TrajectoryLines | undefined;
let starsRef: THREE.Points | undefined;
let impactFx: ImpactFx | null | undefined;
let crewComms: ReturnType<typeof createCrewComms> | undefined;

// ——— MAIN INIT ———
async function init() {
  // Show loading
  const loading = document.createElement('div');
  loading.id = 'loading-screen';
  loading.innerHTML = `
    <div class="loading-title">ARTEMIS II</div>
    <div class="loading-subtitle">Iniciando el seguimiento de la misión</div>
    <div class="loading-bar-wrap"><div class="loading-bar" id="load-bar"></div></div>
  `;
  document.body.appendChild(loading);

  const loadBar = byId('load-bar');
  const setProgress = (p: number) => { loadBar.style.width = `${p}%`; };

  try {
    // Fetch data
    setProgress(20);
    const [trajRes, eventsRes, crewRes] = await Promise.all([
      fetch('/api/trajectory'),
      fetch('/api/events'),
      fetch('/api/crew'),
    ]);

    trajectory = await trajRes.json() as TrajectoryPoint[];
    events = await eventsRes.json() as MissionEvent[];
    crew = await crewRes.json() as CrewMember[];

    setProgress(60);

    // Build scene
    starsRef = createStarfield();
    earthRef = createEarth();
    moonRef = createMoon();
    createSun();
    orionRef = createOrion();
    trajectoryLines = createTrajectoryLine(trajectory);
    impactFx = createMeteorImpact(moonRef);

    setProgress(85);

    // Build UI
    buildEventsPanel();
    buildTimelineMarkers();
    buildCrewTooltip();
    crewComms = createCrewComms(byId('comms-log'), events);
    setupControls();

    // Initial camera
    setCameraPreset('overview');

    setProgress(100);
    setTimeout(() => loading.remove(), 400);

    // Start render loop
    requestAnimationFrame(animate);

  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    loading.innerHTML = `<div class="loading-title loading-error">No se pudieron cargar los datos de la misión</div><div class="loading-subtitle">Revisa que el servidor esté corriendo y recarga la página. Detalle: ${detail}</div>`;
  }
}

// ——— Controls setup ———
function setupControls() {
  // Timeline slider
  timelineSlider.addEventListener('input', () => {
    currentMET = parseFloat(timelineSlider.value);
  });

  // Play/Pause
  btnPlayPause.addEventListener('click', () => {
    isPlaying = !isPlaying;
    // U+FE0E fuerza el glifo de texto en vez del emoji a color
    btnPlayPause.textContent = isPlaying ? '❚❚' : '▶︎';
    const label = isPlaying ? 'Pausar' : 'Reproducir';
    btnPlayPause.title = label;
    btnPlayPause.setAttribute('aria-label', label);
    lastTimestamp = null;
  });

  // Retroceder
  byId('btn-rewind').addEventListener('click', () => {
    currentMET = Math.max(0, currentMET - 3600 * 12); // retroceder 12h
  });

  // Avanzar
  byId('btn-forward').addEventListener('click', () => {
    currentMET = Math.min(TOTAL_MET, currentMET + 3600 * 12);
  });

  // Velocidad
  speedSelect.addEventListener('change', () => {
    playSpeed = parseInt(speedSelect.value);
  });

  // Botones de cámara
  document.querySelectorAll<HTMLElement>('.cam-btn').forEach(btn => {
    btn.addEventListener('click', () => setCameraPreset(btn.dataset.cam as CameraMode));
  });

  // ——— Panel de eventos: plegar / desplegar ———
  const eventsPanel = byId('events-panel');
  const eventsReopenTab = byId('events-reopen-tab');

  function setEventsPanelCollapsed(collapsed: boolean) {
    eventsPanel.classList.toggle('collapsed', collapsed);
    byId('events-toggle').textContent = collapsed ? '▶' : '◀';
    eventsReopenTab.classList.toggle('visible', collapsed);
  }

  byId('events-toggle').addEventListener('click', () => {
    setEventsPanelCollapsed(!eventsPanel.classList.contains('collapsed'));
  });

  eventsReopenTab.addEventListener('click', () => {
    setEventsPanelCollapsed(false);
  });

  // ——— Panel de información / ayuda ———
  const infoPanel = byId('info-panel');
  const infoOpenBtn = byId('info-open-btn');

  function setInfoPanelVisible(visible: boolean) {
    infoPanel.classList.toggle('hidden', !visible);
    infoOpenBtn.classList.toggle('visible', !visible);
  }

  byId('info-close').addEventListener('click', () => {
    setInfoPanelVisible(false);
  });

  infoOpenBtn.addEventListener('click', () => {
    setInfoPanelVisible(true);
  });

  // ——— Diálogo de la tripulación: plegar / desplegar ———
  const comms = byId('comms');
  const commsToggle = byId('comms-toggle');
  commsToggle.addEventListener('click', () => {
    const collapsed = comms.classList.toggle('collapsed');
    const label = collapsed ? 'Mostrar diálogo' : 'Ocultar diálogo';
    commsToggle.textContent = collapsed ? '+' : '−';
    commsToggle.title = label;
    commsToggle.setAttribute('aria-label', label);
    commsToggle.setAttribute('aria-expanded', String(!collapsed));
  });

  // En pantallas angostas la guía tapa la escena: empieza cerrada
  if (window.matchMedia('(max-width: 768px)').matches) {
    setInfoPanelVisible(false);
  }

  // Window resize
  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });
}

// ——— Main animation loop ———
let earthAngle = 0;
let moonAngle = 0;

function animate(timestamp: number) {
  requestAnimationFrame(animate);

  const dt = lastTimestamp ? Math.min((timestamp - lastTimestamp) / 1000, 0.1) : 0;
  lastTimestamp = timestamp;

  // Advance MET
  if (isPlaying && currentMET < TOTAL_MET) {
    currentMET += dt * playSpeed;
    currentMET = Math.min(currentMET, TOTAL_MET);
  }

  // Get current position
  const point = getPositionAtMET(currentMET);
  orionPosition.set(point.x, point.y, point.z);

  // Update spacecraft position
  if (orionRef) {
    orionRef.position.copy(orionPosition);
    orionRef.rotation.y += 0.005;
    orionRef.rotation.x = 0.1;
  }

  // Rotate Earth
  if (earthRef) {
    earthRef.rotation.y += 0.0002;
  }

  // Update Moon visual orbit
  if (moonRef) {
    const moonPos = getMoonOrbitPosition(currentMET);
    moonRef.position.copy(moonPos);
    moonRef.rotation.y += 0.0001;
  }

  // Update trajectory lines
  if (trajectoryLines) {
    updateTrajectoryLines(trajectoryLines, trajectory, currentMET);
  }

  updateMeteorImpact(impactFx, currentMET);
  crewComms?.update(currentMET);

  // Camera follow mode
  if (cameraMode === 'follow' && orionRef) {
    const orionPos = orionRef.position.clone();
    const camOffset = new THREE.Vector3(-8, 3, -12);
    camera.position.lerp(orionPos.clone().add(camOffset), 0.05);
    controls.target.lerp(orionPos, 0.05);
  }

  // Camera animation
  tickCameraAnimation(dt);

  // Update HUD
  updateHUD(point);
  updateEventsHighlight(currentMET);

  controls.update();
  renderer.render(scene, camera);
}

// ——— Boot ———
init();

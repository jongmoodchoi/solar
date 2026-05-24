/**
 * Solar System 3D Simulation
 * Uses Three.js for rendering and implements Kepler's equation
 * to compute real heliocentric planetary positions.
 */

import * as THREE from "three";
import { OrbitControls } from "three/controls/OrbitControls.js";

// ── Constants ─────────────────────────────────────────────────────────────────

const AU = 150; // pixels per AU (arbitrary scale)
const DEG = Math.PI / 180;

// ── Orbital elements (J2000.0 epoch) ─────────────────────────────────────────
// Source: Meeus "Astronomical Algorithms" Table 31.a
// Each planet: { name, color, radius, a, e, I, L, wBar, Omega, adot, edot, Idot, Ldot, wBarDot, OmegaDot }
// a  = semi-major axis (AU)
// e  = eccentricity
// I  = inclination (deg)
// L  = mean longitude (deg) at J2000.0
// wBar = longitude of perihelion (deg)
// Omega = longitude of ascending node (deg)
// *dot = rate per Julian century

const PLANETS = [
  {
    name: "Mercury",
    color: 0xb5b5b5,
    radius: 0.8,
    a: 0.38709927, adot: 0.00000037,
    e: 0.20563593, edot: 0.00001906,
    I: 7.00497902, Idot: -0.00594749,
    L: 252.25032350, Ldot: 149472.67411175,
    wBar: 77.45779628, wBarDot: 0.16047689,
    Omega: 48.33076593, OmegaDot: -0.12534081,
  },
  {
    name: "Venus",
    color: 0xe8cda0,
    radius: 1.4,
    a: 0.72333566, adot: 0.00000390,
    e: 0.00677672, edot: -0.00004107,
    I: 3.39467605, Idot: -0.00078890,
    L: 181.97909950, Ldot: 58517.81538729,
    wBar: 131.60246718, wBarDot: 0.00268329,
    Omega: 76.67984255, OmegaDot: -0.27769418,
  },
  {
    name: "Earth",
    color: 0x4fc3f7,
    radius: 1.5,
    a: 1.00000018, adot: -0.00000003,
    e: 0.01673163, edot: -0.00003661,
    I: -0.00054346, Idot: -0.01337178,
    L: 100.46457166, Ldot: 35999.37244981,
    wBar: 102.93768193, wBarDot: 0.32327364,
    Omega: -5.11260389, OmegaDot: -0.24123353,
  },
  {
    name: "Mars",
    color: 0xff6b35,
    radius: 1.1,
    a: 1.52371034, adot: 0.00001847,
    e: 0.09339410, edot: 0.00007882,
    I: 1.84969142, Idot: -0.00813131,
    L: -4.55343205, Ldot: 19140.30268499,
    wBar: -23.94362959, wBarDot: 0.44441088,
    Omega: 49.55953891, OmegaDot: -0.29257343,
  },
  {
    name: "Jupiter",
    color: 0xc88b3a,
    radius: 3.5,
    a: 5.20288700, adot: -0.00011607,
    e: 0.04838624, edot: -0.00013253,
    I: 1.30439695, Idot: -0.00183714,
    L: 34.39644051, Ldot: 3034.74612775,
    wBar: 14.72847983, wBarDot: 0.21252668,
    Omega: 100.47390909, OmegaDot: 0.20469106,
  },
  {
    name: "Saturn",
    color: 0xf0e68c,
    radius: 3.0,
    a: 9.53667594, adot: -0.00125060,
    e: 0.05386179, edot: -0.00050991,
    I: 2.48599187, Idot: 0.00193609,
    L: 49.95424423, Ldot: 1222.49362201,
    wBar: 92.59887831, wBarDot: -0.41897216,
    Omega: 113.66242448, OmegaDot: -0.28867794,
    hasRings: true,
  },
  {
    name: "Uranus",
    color: 0x7de8e8,
    radius: 2.2,
    a: 19.18916464, adot: -0.00196176,
    e: 0.04725744, edot: -0.00004397,
    I: 0.77263783, Idot: -0.00242939,
    L: 313.23810451, Ldot: 428.48202785,
    wBar: 170.95427630, wBarDot: 0.40805281,
    Omega: 74.01692503, OmegaDot: 0.04240589,
  },
  {
    name: "Neptune",
    color: 0x4169e1,
    radius: 2.1,
    a: 30.06992276, adot: 0.00026291,
    e: 0.00859048, edot: 0.00005105,
    I: 1.77004347, Idot: 0.00035372,
    L: -55.12002969, Ldot: 218.45945325,
    wBar: 44.96476227, wBarDot: -0.32241464,
    Omega: 131.78422574, OmegaDot: -0.00508664,
  },
];

// ── Kepler solver ─────────────────────────────────────────────────────────────

/**
 * Solve Kepler's equation: M = E - e*sin(E)
 * Returns eccentric anomaly E (radians) given mean anomaly M (radians)
 * and eccentricity e, using Newton-Raphson iteration.
 */
function solveKepler(M, e) {
  let E = M + e * Math.sin(M) * (1 + e * Math.cos(M));
  for (let i = 0; i < 50; i++) {
    const dE = (M - E + e * Math.sin(E)) / (1 - e * Math.cos(E));
    E += dE;
    if (Math.abs(dE) < 1e-10) break;
  }
  return E;
}

/**
 * Compute heliocentric ecliptic rectangular coordinates (AU)
 * for a planet at a given Julian date.
 */
function planetPosition(planet, jd) {
  // Julian centuries from J2000.0
  const T = (jd - 2451545.0) / 36525.0;

  // Evaluate orbital elements
  const a = planet.a + planet.adot * T;
  const e = planet.e + planet.edot * T;
  const I = (planet.I + planet.Idot * T) * DEG;
  const L = ((planet.L + planet.Ldot * T) % 360) * DEG;
  const wBar = (planet.wBar + planet.wBarDot * T) * DEG;
  const Omega = (planet.Omega + planet.OmegaDot * T) * DEG;

  // Argument of perihelion
  const w = wBar - Omega;
  // Mean anomaly
  const M = L - wBar;

  // Eccentric anomaly (Newton-Raphson)
  const E = solveKepler(M, e);

  // True anomaly
  const nu =
    2 *
    Math.atan2(
      Math.sqrt(1 + e) * Math.sin(E / 2),
      Math.sqrt(1 - e) * Math.cos(E / 2)
    );

  // Heliocentric distance
  const r = a * (1 - e * Math.cos(E));

  // Heliocentric coordinates in orbital plane
  const xOrbital = r * Math.cos(nu);
  const yOrbital = r * Math.sin(nu);

  // Rotate to ecliptic plane
  const cosO = Math.cos(Omega);
  const sinO = Math.sin(Omega);
  const cosI = Math.cos(I);
  const sinI = Math.sin(I);
  const cosW = Math.cos(w);
  const sinW = Math.sin(w);

  const x =
    (cosO * cosW - sinO * sinW * cosI) * xOrbital +
    (-cosO * sinW - sinO * cosW * cosI) * yOrbital;
  const y =
    (sinO * cosW + cosO * sinW * cosI) * xOrbital +
    (-sinO * sinW + cosO * cosW * cosI) * yOrbital;
  const z = (sinW * sinI) * xOrbital + (cosW * sinI) * yOrbital;

  return { x, y, z };
}

/** Convert a JavaScript Date to Julian Date */
function dateToJD(date) {
  return date.getTime() / 86400000 + 2440587.5;
}

// ── Scene setup ───────────────────────────────────────────────────────────────

const container = document.getElementById("canvas-container");

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(container.clientWidth, container.clientHeight);
renderer.setClearColor(0x000000, 1);
container.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x000000);

const camera = new THREE.PerspectiveCamera(
  45,
  container.clientWidth / container.clientHeight,
  0.1,
  100000
);
camera.position.set(0, 600, 900);
camera.lookAt(0, 0, 0);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.07;
controls.minDistance = 20;
controls.maxDistance = 8000;

// Sun
const sunGeo = new THREE.SphereGeometry(8, 32, 32);
const sunMat = new THREE.MeshBasicMaterial({ color: 0xffdd44 });
const sunMesh = new THREE.Mesh(sunGeo, sunMat);
scene.add(sunMesh);

// Sun glow
const glowGeo = new THREE.SphereGeometry(12, 32, 32);
const glowMat = new THREE.MeshBasicMaterial({
  color: 0xffaa00,
  transparent: true,
  opacity: 0.18,
});
scene.add(new THREE.Mesh(glowGeo, glowMat));

// Ambient + point light from sun
scene.add(new THREE.AmbientLight(0x222244, 0.6));
const sunLight = new THREE.PointLight(0xffffff, 2, 0, 1.5);
scene.add(sunLight);

// ── Build planet meshes & orbit lines ─────────────────────────────────────────

const planetMeshes = {};
const orbitLines = {};
const labelElements = {};

const planetDisplayRadii = {};

function makeCircleTexture(size = 128) {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");

  const r = size / 2;
  ctx.clearRect(0, 0, size, size);
  ctx.beginPath();
  ctx.arc(r, r, r * 0.48, 0, Math.PI * 2);
  ctx.closePath();
  ctx.fillStyle = "#ffffff";
  ctx.fill();

  return new THREE.CanvasTexture(canvas);
}

const circleTex = makeCircleTexture(128);

PLANETS.forEach((p) => {
  // Planet marker (simple circle)
  const displayRadius = Math.max(p.radius, 4);
  planetDisplayRadii[p.name] = displayRadius;

  const mat = new THREE.SpriteMaterial({ map: circleTex, color: p.color, transparent: true });
  const mesh = new THREE.Sprite(mat);
  mesh.scale.set(displayRadius * 2, displayRadius * 2, 1);
  scene.add(mesh);
  planetMeshes[p.name] = mesh;

  // Orbit path (360 points, computed at current date later)
  const orbitPoints = new Array(361).fill(null).map(() => new THREE.Vector3());
  const orbitGeo = new THREE.BufferGeometry().setFromPoints(orbitPoints);
  const orbitMat = new THREE.LineBasicMaterial({
    color: p.color,
    transparent: true,
    opacity: 0.25,
  });
  const orbitLine = new THREE.LineLoop(orbitGeo, orbitMat);
  scene.add(orbitLine);
  orbitLines[p.name] = { line: orbitLine, geo: orbitGeo };

  // Label (HTML overlay)
  const labelsLayer = document.getElementById("labels-layer");
  if (labelsLayer) {
    const el = document.createElement("div");
    el.className = "planet-label";
    el.textContent = p.name;
    labelsLayer.appendChild(el);
    labelElements[p.name] = el;
  }
});

// ── State ─────────────────────────────────────────────────────────────────────

let simulationDate = new Date();
let animating = false;
let speedMultiplier = 1; // days per second
let labelsVisible = true;
let orbitsVisible = true;

// ── DOM ───────────────────────────────────────────────────────────────────────

const dtInput = document.getElementById("dt-input");
const speedRange = document.getElementById("speed-range");
const speedLabel = document.getElementById("speed-label");
const btnPlay = document.getElementById("btn-play");
const btnLabels = document.getElementById("btn-labels");
const btnOrbits = document.getElementById("btn-orbits");
const btnNow = document.getElementById("btn-now");
const planetInfo = document.getElementById("planet-info");

// Init datetime input
function formatForInput(date) {
  const pad = (n) => String(n).padStart(2, "0");
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
    `T${pad(date.getHours())}:${pad(date.getMinutes())}`
  );
}

dtInput.value = formatForInput(simulationDate);

dtInput.addEventListener("change", () => {
  simulationDate = new Date(dtInput.value);
  updateScene();
});

speedRange.addEventListener("input", () => {
  speedMultiplier = parseFloat(speedRange.value);
  speedLabel.textContent = `${speedMultiplier} days/s`;
});
speedLabel.textContent = `${speedMultiplier} days/s`;

btnPlay.addEventListener("click", () => {
  animating = !animating;
  btnPlay.textContent = animating ? "⏸ Pause" : "▶ Play";
  btnPlay.classList.toggle("active", animating);
});

btnLabels.addEventListener("click", () => {
  labelsVisible = !labelsVisible;
  Object.values(labelElements).forEach((el) => {
    el.style.display = labelsVisible ? "block" : "none";
  });
  btnLabels.classList.toggle("active", !labelsVisible);
});

btnOrbits.addEventListener("click", () => {
  orbitsVisible = !orbitsVisible;
  Object.values(orbitLines).forEach(({ line }) => (line.visible = orbitsVisible));
  btnOrbits.classList.toggle("active", !orbitsVisible);
});

btnNow.addEventListener("click", () => {
  simulationDate = new Date();
  dtInput.value = formatForInput(simulationDate);
  updateScene();
});

// ── Raycasting for planet info ────────────────────────────────────────────────

const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();

renderer.domElement.addEventListener("mousemove", (e) => {
  const rect = renderer.domElement.getBoundingClientRect();
  pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
  pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

  raycaster.setFromCamera(pointer, camera);
  const meshList = Object.entries(planetMeshes).map(([name, mesh]) => ({ name, mesh }));
  const targets = meshList.map((m) => m.mesh);
  const intersects = raycaster.intersectObjects(targets);

  if (intersects.length > 0) {
    const idx = targets.indexOf(intersects[0].object);
    const name = meshList[idx].name;
    const pos = planetPosition(PLANETS.find((p) => p.name === name), dateToJD(simulationDate));
    const dist = Math.sqrt(pos.x ** 2 + pos.y ** 2 + pos.z ** 2);
    planetInfo.textContent = `${name}  ·  ${dist.toFixed(3)} AU from Sun`;
    planetInfo.classList.add("visible");
  } else {
    planetInfo.classList.remove("visible");
  }
});

// ── Scene update ──────────────────────────────────────────────────────────────

function updateScene() {
  const jd = dateToJD(simulationDate);
  const rect = renderer.domElement.getBoundingClientRect();

  PLANETS.forEach((p) => {
    // Planet position
    const pos = planetPosition(p, jd);
    const px = pos.x * AU;
    const py = pos.z * AU; // ecliptic z → Three.js y (up)
    const pz = pos.y * AU;
    planetMeshes[p.name].position.set(px, py, pz);

    // Update HTML label position (screen space)
    const el = labelElements[p.name];
    if (el) {
      if (!labelsVisible) {
        el.style.display = "none";
      } else {
        const v = new THREE.Vector3(px, py, pz);
        v.project(camera);

        const onScreen = v.z >= -1 && v.z <= 1 && v.x >= -1 && v.x <= 1 && v.y >= -1 && v.y <= 1;
        if (!onScreen) {
          el.style.display = "none";
        } else {
          const x = (v.x * 0.5 + 0.5) * rect.width;
          const y = (-v.y * 0.5 + 0.5) * rect.height;
          const yOffset = planetDisplayRadii[p.name] + 10;
          el.style.display = "block";
          el.style.left = `${x}px`;
          el.style.top = `${y - yOffset}px`;
        }
      }
    }

    // Orbit path (sample full orbit)
    const { line, geo } = orbitLines[p.name];
    const T = (jd - 2451545.0) / 36525.0;
    const a = p.a + p.adot * T;
    const e = p.e + p.edot * T;
    const I = (p.I + p.Idot * T) * DEG;
    const wBar = (p.wBar + p.wBarDot * T) * DEG;
    const Omega = (p.Omega + p.OmegaDot * T) * DEG;
    const w = wBar - Omega;

    const cosO = Math.cos(Omega);
    const sinO = Math.sin(Omega);
    const cosI = Math.cos(I);
    const sinI = Math.sin(I);
    const cosW = Math.cos(w);
    const sinW = Math.sin(w);

    const pts = [];
    for (let i = 0; i <= 360; i++) {
      const nu = (i / 360) * Math.PI * 2;
      const r = a * (1 - e * e) / (1 + e * Math.cos(nu));
      const xOrb = r * Math.cos(nu);
      const yOrb = r * Math.sin(nu);

      const ox =
        (cosO * cosW - sinO * sinW * cosI) * xOrb +
        (-cosO * sinW - sinO * cosW * cosI) * yOrb;
      const oy =
        (sinO * cosW + cosO * sinW * cosI) * xOrb +
        (-sinO * sinW + cosO * cosW * cosI) * yOrb;
      const oz = sinW * sinI * xOrb + cosW * sinI * yOrb;

      pts.push(new THREE.Vector3(ox * AU, oz * AU, oy * AU));
    }
    geo.setFromPoints(pts);
    line.geometry = geo;
  });
}

// ── Animation loop ────────────────────────────────────────────────────────────

let lastTime = performance.now();

function animate() {
  requestAnimationFrame(animate);

  const now = performance.now();
  const delta = (now - lastTime) / 1000; // seconds
  lastTime = now;

  if (animating) {
    simulationDate = new Date(simulationDate.getTime() + speedMultiplier * delta * 86400000);
    dtInput.value = formatForInput(simulationDate);
    updateScene();
  }

  controls.update();
  renderer.render(scene, camera);
}

// ── Resize ────────────────────────────────────────────────────────────────────

window.addEventListener("resize", () => {
  const w = container.clientWidth;
  const h = container.clientHeight;
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  renderer.setSize(w, h);
});

// ── Init ──────────────────────────────────────────────────────────────────────

updateScene();
animate();

import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.161.0/build/three.module.js";

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x091317);
scene.fog = new THREE.Fog(0x091317, 18, 70);
const camera = new THREE.PerspectiveCamera(75, innerWidth / innerHeight, 0.05, 120);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
document.querySelector("#game").append(renderer.domElement);

const clock = new THREE.Clock();
const raycaster = new THREE.Raycaster();
const keys = new Set();
const colliders = [];
const targets = [];
const effects = [];
const player = { pos: new THREE.Vector3(0, 1.7, 15), yaw: 0, pitch: 0, velocity: new THREE.Vector3(), grounded: true, health: 100, armor: 0, credits: 800, rifle: false, ammo: 12, reserve: Infinity, reloading: false };
const state = { active: false, training: false, phase: "preparation", round: 1, scoreA: 0, scoreB: 0, time: 25, site: "A", device: false, planted: false, plantTime: 0, defuseTime: 0, bots: [], lastShot: 0, wave: 0 };
const ui = id => document.getElementById(id);
const mat = (color, roughness = .8, emissive = 0) => new THREE.MeshStandardMaterial({ color, roughness, emissive, emissiveIntensity: emissive ? 1.2 : 0 });

scene.add(new THREE.HemisphereLight(0x9fc8d4, 0x14201b, 1.4));
const sun = new THREE.DirectionalLight(0xffe8c2, 2.2);
sun.position.set(-12, 25, 10); sun.castShadow = true; scene.add(sun);

function box(name, pos, size, color, solid = true) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), mat(color));
  mesh.name = name; mesh.position.set(...pos); mesh.castShadow = mesh.receiveShadow = true; scene.add(mesh);
  if (solid) colliders.push({ mesh, min: new THREE.Vector3(pos[0] - size[0] / 2, 0, pos[2] - size[2] / 2), max: new THREE.Vector3(pos[0] + size[0] / 2, size[1], pos[2] + size[2] / 2) });
  return mesh;
}
function label(text, position, color = "#76f5bb") {
  const canvas = document.createElement("canvas"); canvas.width = 256; canvas.height = 64;
  const ctx = canvas.getContext("2d"); ctx.fillStyle = color; ctx.font = "bold 26px sans-serif"; ctx.textAlign = "center"; ctx.fillText(text, 128, 38);
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(canvas), transparent: true }));
  sprite.position.set(...position); sprite.scale.set(3.5, .9, 1); scene.add(sprite); return sprite;
}

function buildMap() {
  box("floor", [0, -.15, 0], [42, .3, 42], 0x1b292b);
  box("north-wall", [0, 3, -21], [42, 6, .5], 0x26383a); box("south-wall", [0, 3, 21], [42, 6, .5], 0x26383a);
  box("west-wall", [-21, 3, 0], [.5, 6, 42], 0x26383a); box("east-wall", [21, 3, 0], [.5, 6, 42], 0x26383a);
  [[-8, 1.2, -6, 5, 2.4, 2], [8, 1.2, -7, 4, 2.4, 2], [-8, 1.2, 5, 3, 2.4, 3], [8, 1.2, 5, 5, 2.4, 2], [0, 1.2, -1, 2, 2.4, 4]].forEach(v => box("cover", v.slice(0, 3), v.slice(3), 0x34494b));
  const site = box("site-A", [-11, .04, -12], [5, .08, 5], 0x2c806a, false); site.material.transparent = true; site.material.opacity = .5;
  label("SITE A · E", [-11, 2.2, -12]); label("ALFA SPAWN", [0, 2.7, 17], "#f5c76b");
  const device = new THREE.Group(); const base = new THREE.Mesh(new THREE.BoxGeometry(.45, .2, .45), mat(0x69efae)); const antenna = new THREE.Mesh(new THREE.CylinderGeometry(.035, .035, .5), mat(0xf5c76b)); antenna.position.y = .35; device.add(base, antenna); device.position.set(-2, .1, 14); scene.add(device); state.deviceMesh = device;
}

function makeWeapon() {
  const weapon = new THREE.Group(); const body = new THREE.Mesh(new THREE.BoxGeometry(.22, .18, .65), mat(0x263237)); body.position.set(.37, -.28, -.72); body.rotation.x = -.08;
  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(.045, .045, .34, 10), mat(0x11191b)); barrel.rotation.x = Math.PI / 2; barrel.position.set(.37, -.25, -1.16);
  const grip = new THREE.Mesh(new THREE.BoxGeometry(.13, .35, .16), mat(0x182326)); grip.position.set(.37, -.48, -.55); grip.rotation.x = -.22; weapon.add(body, barrel, grip); camera.add(weapon);
}

function spawnBot(position, type = "omega") {
  const group = new THREE.Group(); const body = new THREE.Mesh(new THREE.CapsuleGeometry(.35, .65, 4, 8), mat(type === "omega" ? 0xd05a5a : 0x6b8bd6)); body.position.y = .85; body.castShadow = true;
  const visor = new THREE.Mesh(new THREE.BoxGeometry(.34, .12, .08), mat(0x151d20)); visor.position.set(0, 1.05, -.3); group.add(body, visor); group.position.copy(position); scene.add(group);
  const bot = { mesh: group, health: 100, speed: 1.1 + Math.random() * .5, cooldown: Math.random() * 2, origin: position.clone(), target: new THREE.Vector3(), type }; state.bots.push(bot); return bot;
}
function spawnWave() { state.bots.forEach(b => scene.remove(b.mesh)); state.bots = []; [-1, 1, 0].forEach((x, i) => spawnBot(new THREE.Vector3(10 + x * 3, 0, -14 + i * 3))); }

function collides(pos) {
  const radius = .35;
  return colliders.some(c => pos.x + radius > c.min.x && pos.x - radius < c.max.x && pos.z + radius > c.min.z && pos.z - radius < c.max.z && pos.y - 1.7 < c.max.y && pos.y > c.min.y);
}
function movePlayer(dt) {
  const forward = new THREE.Vector3(Math.sin(player.yaw), 0, Math.cos(player.yaw));
  const right = new THREE.Vector3(forward.z, 0, -forward.x); const wish = new THREE.Vector3();
  if (keys.has("KeyW")) wish.add(forward); if (keys.has("KeyS")) wish.sub(forward); if (keys.has("KeyD")) wish.add(right); if (keys.has("KeyA")) wish.sub(right);
  wish.normalize().multiplyScalar(keys.has("ShiftLeft") ? 7 : 4.2); player.velocity.x = THREE.MathUtils.damp(player.velocity.x, wish.x, 12, dt); player.velocity.z = THREE.MathUtils.damp(player.velocity.z, wish.z, 12, dt);
  player.velocity.y -= 18 * dt; if (keys.has("Space") && player.grounded) { player.velocity.y = 7; player.grounded = false; }
  const next = player.pos.clone().addScaledVector(player.velocity, dt); if (!collides(next)) player.pos.x = next.x, player.pos.z = next.z;
  player.pos.y += player.velocity.y * dt; if (player.pos.y <= 1.7) player.pos.y = 1.7, player.velocity.y = 0, player.grounded = true;
  camera.position.copy(player.pos); camera.rotation.set(player.pitch, player.yaw, 0, "YXZ");
}
function shoot() {
  if (player.reloading || player.ammo <= 0 || performance.now() - state.lastShot < (player.rifle ? 130 : 300)) return;
  state.lastShot = performance.now(); player.ammo--; raycaster.setFromCamera({ x: 0, y: 0 }, camera);
  const hits = raycaster.intersectObjects([...targets, ...state.bots.map(b => b.mesh)], true);
  if (hits.length) { let root = hits[0].object; while (root.parent && !state.bots.some(b => b.mesh === root)) root = root.parent; const bot = state.bots.find(b => b.mesh === root); if (bot) { bot.health -= player.rifle ? 34 : 50; flashHit(bot.mesh.position); if (bot.health <= 0) { scene.remove(bot.mesh); state.bots.splice(state.bots.indexOf(bot), 1); showToast("Objetivo neutralizado"); } } }
  updateUI();
}
function flashHit(position) { const light = new THREE.PointLight(0xffdf9b, 5, 4); light.position.copy(position).setY(1); scene.add(light); effects.push({ light, time: .08 }); }
function reload() { if (!player.reloading && player.ammo < (player.rifle ? 30 : 12)) { player.reloading = true; showToast("Recargando..."); setTimeout(() => { player.ammo = player.rifle ? 30 : 12; player.reloading = false; updateUI(); }, 900); } }

function interact() {
  if (state.training) { showToast("Modo entrenamiento: elimina los objetivos"); return; }
  const distance = player.pos.distanceTo(new THREE.Vector3(-2, 0, 14)); const siteDistance = player.pos.distanceTo(new THREE.Vector3(-11, 0, -12));
  if (!state.device && distance < 3) { state.device = true; state.deviceMesh.visible = false; showToast("Dispositivo recogido. Llévalo al sitio A."); }
  else if (state.device && !state.planted && siteDistance < 4) { state.planted = true; state.plantTime = 35; showToast("Dispositivo colocado. Defiende el sitio."); }
  else if (state.planted && siteDistance < 4) { state.defuseTime = 5; showToast("Desactivando..."); }
}

function startRound() { state.phase = "live"; state.time = 105; state.device = false; state.planted = false; state.plantTime = 0; state.deviceMesh.visible = true; spawnWave(); showToast("Ronda iniciada: asegura el sitio A"); }
function endRound(winner) { if (winner === "A") state.scoreA++; else state.scoreB++; state.round++; state.phase = "preparation"; state.time = 20; player.credits += winner === "A" ? 1800 : 500; player.pos.set(0, 1.7, 15); showToast(winner === "A" ? "Ronda ganada · bonificación $1800" : "Ronda perdida · bonificación $500"); }
function buy(kind) { if (state.training) return showToast("El entrenamiento es gratuito"); const costs = { armor: 600, rifle: 1600, medkit: 400 }; if (player.credits < costs[kind]) return showToast("Créditos insuficientes"); player.credits -= costs[kind]; if (kind === "armor") player.armor = 100; if (kind === "rifle") { player.rifle = true; player.ammo = 30; } if (kind === "medkit") player.health = Math.min(100, player.health + 50); showToast("Compra confirmada"); updateUI(); }
function toggleTraining() { state.training = !state.training; state.phase = state.training ? "training" : "preparation"; state.time = state.training ? 0 : 20; if (state.training) { state.bots.forEach(b => scene.remove(b.mesh)); state.bots = []; [-1, 0, 1].forEach(x => spawnBot(new THREE.Vector3(x * 4, 0, -5), "training")); showToast("Entrenamiento activo · objetivos infinitos"); } else startRound(); updateUI(); }
function updateUI() { ui("round").textContent = state.training ? "ENTRENAMIENTO" : `RONDA ${state.round}`; ui("phase").textContent = state.phase === "live" ? "EN JUEGO" : state.phase === "training" ? "PRÁCTICA" : "PREPARACIÓN"; ui("score").textContent = `ALFA ${state.scoreA} — OMEGA ${state.scoreB}`; ui("credits").textContent = `$${player.credits}`; ui("health").textContent = Math.max(0, Math.round(player.health)); ui("ammo").textContent = player.ammo; ui("buyCredits").textContent = `$${player.credits}`; ui("objective").textContent = state.training ? "Elimina los drones de práctica." : state.planted ? `DISPOSITIVO ACTIVO · ${Math.ceil(state.plantTime)}s` : state.device ? "Lleva el dispositivo a SITE A." : "Recoge el dispositivo y colócalo en SITE A."; }
let toastTimer; function showToast(message) { ui("toast").textContent = message; ui("toast").classList.add("show"); clearTimeout(toastTimer); toastTimer = setTimeout(() => ui("toast").classList.remove("show"), 2200); }
function botThink(dt) { state.bots.forEach(bot => { bot.cooldown -= dt; const toPlayer = player.pos.clone().sub(bot.mesh.position); if (toPlayer.length() < 20) { bot.mesh.lookAt(player.pos.x, bot.mesh.position.y, player.pos.z); if (bot.cooldown <= 0) { bot.cooldown = 2 + Math.random(); if (Math.random() < .35) { player.health -= player.armor ? 4 : 8; player.armor = Math.max(0, player.armor - 2); updateUI(); } } } else { bot.mesh.position.x += Math.sin(clock.elapsedTime + bot.origin.x) * dt * .2; } }); if (player.health <= 0) { player.health = 100; player.pos.set(0, 1.7, 15); showToast("Repliegue médico · vuelve al combate"); } }
function tick(dt) { movePlayer(dt); if (state.active && state.phase === "live") { state.time -= dt; if (state.planted) { state.plantTime -= dt; if (state.plantTime <= 0) endRound("A"); } else if (state.time <= 0) endRound("B"); botThink(dt); } if (state.active && state.phase === "preparation") { state.time -= dt; if (state.time <= 0) startRound(); } effects.forEach((e, i) => { e.time -= dt; e.light.intensity *= .8; if (e.time <= 0) { scene.remove(e.light); effects.splice(i, 1); } }); updateUI(); renderer.render(scene, camera); requestAnimationFrame(() => tick(clock.getDelta())); }

buildMap(); makeWeapon(); camera.position.copy(player.pos);
addEventListener("resize", () => { camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); renderer.setSize(innerWidth, innerHeight); });
addEventListener("keydown", e => { keys.add(e.code); if (e.code === "KeyR") reload(); if (e.code === "KeyE") interact(); if (e.code === "KeyB") ui("buy").classList.toggle("hidden"); if (e.code === "KeyT") toggleTraining(); });
addEventListener("keyup", e => keys.delete(e.code));
addEventListener("mousedown", e => { if (e.button === 0 && state.active) shoot(); });
addEventListener("mousemove", e => { if (document.pointerLockElement === renderer.domElement) { player.yaw -= e.movementX * .002; player.pitch -= e.movementY * .002; player.pitch = THREE.MathUtils.clamp(player.pitch, -1.45, 1.45); } });
ui("start").onclick = () => { ui("help").classList.add("hidden"); ui("hud").classList.remove("hidden"); state.active = true; renderer.domElement.requestPointerLock(); startRound(); };
renderer.domElement.onclick = () => state.active && renderer.domElement.requestPointerLock();
document.querySelectorAll("[data-buy]").forEach(button => button.onclick = () => buy(button.dataset.buy));
updateUI(); tick(0);

'use strict';

const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const W = 800;
const H = 600;

// ── Input ─────────────────────────────────────────────────────────────────────
const keys = {};
const justPressed = {};

window.addEventListener('keydown', e => {
  justPressed[e.code] = !keys[e.code];
  keys[e.code] = true;
  if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code))
    e.preventDefault();
});
window.addEventListener('keyup', e => { keys[e.code] = false; });

function pressed(code) {
  const val = justPressed[code];
  justPressed[code] = false;
  return val;
}

// ── Utils ─────────────────────────────────────────────────────────────────────
const wrap  = (v, max) => ((v % max) + max) % max;
const dist  = (a, b)   => Math.hypot(a.x - b.x, a.y - b.y);
const rand  = (min, max) => min + Math.random() * (max - min);
const randInt = (min, max) => Math.floor(rand(min, max + 1));

// ── Bullet ────────────────────────────────────────────────────────────────────
class Bullet {
  constructor(x, y, angle) {
    this.x = x;
    this.y = y;
    const SPEED = 520;
    this.vx = Math.cos(angle) * SPEED;
    this.vy = Math.sin(angle) * SPEED;
    this.ttl  = 1.1;
    this.radius = 2;
    this.dead = false;
  }

  update(dt) {
    this.x = wrap(this.x + this.vx * dt, W);
    this.y = wrap(this.y + this.vy * dt, H);
    this.ttl -= dt;
    if (this.ttl <= 0) this.dead = true;
  }

  draw() {
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fill();
  }
}

// ── Asteroid ──────────────────────────────────────────────────────────────────
const RADII  = [0, 16, 30, 50];   // por tamaño 1, 2, 3
const SPEEDS = [0, 85, 55, 32];   // velocidad base por tamaño
const POINTS = [0, 100, 50, 20];  // puntos por tamaño

const BOOST_DURATION  = 5;        // segundos que dura el power-up de Velocidad
const TRIPLE_DURATION = 5;        // segundos que dura el power-up de Triple Shot
const DROP_CHANCE     = 0.12;      // probabilidad de drop de power-up al destruir asteroide
const TRIPLE_SPREAD   = Math.PI / 36; // ±5° de abanico entre las 3 balas

class Asteroid {
  constructor(x, y, size = 3) {
    this.x    = x;
    this.y    = y;
    this.size = size;
    this.radius = RADII[size];
    this.dead = false;

    const angle = rand(0, Math.PI * 2);
    const speed = SPEEDS[size] + rand(-15, 15);
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;
    this.rotSpeed = rand(-1.2, 1.2);
    this.rot = rand(0, Math.PI * 2);

    // Polígono irregular
    const n = randInt(8, 13);
    this.verts = [];
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      const r = this.radius * rand(0.6, 1.0);
      this.verts.push([Math.cos(a) * r, Math.sin(a) * r]);
    }
  }

  update(dt) {
    this.x   = wrap(this.x + this.vx * dt, W);
    this.y   = wrap(this.y + this.vy * dt, H);
    this.rot += this.rotSpeed * dt;
  }

  split() {
    if (this.size <= 1) return [];
    return [
      new Asteroid(this.x, this.y, this.size - 1),
      new Asteroid(this.x, this.y, this.size - 1),
    ];
  }

  draw() {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rot);
    ctx.strokeStyle = '#fff';
    ctx.lineWidth   = 1.5;
    ctx.lineJoin    = 'round';
    ctx.beginPath();
    ctx.moveTo(this.verts[0][0], this.verts[0][1]);
    for (let i = 1; i < this.verts.length; i++)
      ctx.lineTo(this.verts[i][0], this.verts[i][1]);
    ctx.closePath();
    ctx.stroke();
    ctx.restore();
  }
}

// ── PowerUp (Velocidad / Triple Shot) ──────────────────────────────────────────
class PowerUp {
  constructor(x, y, type = 'speed') {
    this.x = x;
    this.y = y;
    this.type = type;
    const angle = rand(0, Math.PI * 2);
    const speed = rand(20, 50);
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;
    this.radius = 11;
    this.ttl = 12;
    this.rot = 0;
    this.rotSpeed = rand(-1.5, 1.5);
    this.dead = false;
  }

  update(dt) {
    this.x = wrap(this.x + this.vx * dt, W);
    this.y = wrap(this.y + this.vy * dt, H);
    this.rot += this.rotSpeed * dt;
    this.ttl -= dt;
    if (this.ttl <= 0) this.dead = true;
  }

  draw() {
    const isTriple = this.type === 'triple';
    const color = isTriple ? '#f0f' : '#0ff';
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rot);
    // Aura pulsante
    ctx.shadowColor = color;
    ctx.shadowBlur = 12;
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    ctx.lineJoin = 'round';
    // Círculo base
    ctx.beginPath();
    ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
    ctx.stroke();
    // Icono interior según tipo
    ctx.beginPath();
    if (isTriple) {
      // 3 puntos alineados (triple shot)
      for (let i = -1; i <= 1; i++) {
        ctx.moveTo(i * 4 + 2, 0);
        ctx.arc(i * 4, 0, 1.8, 0, Math.PI * 2);
      }
      ctx.strokeStyle = '#fff';
    } else {
      // Rayo "V" de velocidad
      ctx.moveTo(-4, -5);
      ctx.lineTo( 1,  0);
      ctx.lineTo(-4,  5);
      ctx.lineTo( 0,  0);
      ctx.lineTo( 4, -3);
      ctx.strokeStyle = '#fff';
    }
    ctx.stroke();
    ctx.restore();
  }
}

// ── Estrella fugaz ────────────────────────────────────────────────────────────
const SHOOTING_STAR_TTL    = 6;     // segundos antes de desaparecer
const SHOOTING_STAR_POINTS = 200;   // bonus por destruirla
const SHOOTING_STAR_SPEED  = 210;   // px/s (≈3-4× un asteroide tamaño 3)

class ShootingStar {
  constructor(x, y, vx, vy) {
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    this.radius = 14;
    this.ttl = SHOOTING_STAR_TTL;
    this.life = SHOOTING_STAR_TTL;
    this.rot = 0;
    this.rotSpeed = rand(-2.5, 2.5);
    this.dead = false;
    // Polígono estrellado de 5 puntas
    this.verts = [];
    const spikes = 5;
    for (let i = 0; i < spikes * 2; i++) {
      const a = (i / (spikes * 2)) * Math.PI * 2 - Math.PI / 2;
      const r = i % 2 === 0 ? this.radius : this.radius * 0.45;
      this.verts.push([Math.cos(a) * r, Math.sin(a) * r]);
    }
  }

  update(dt) {
    this.x = wrap(this.x + this.vx * dt, W);
    this.y = wrap(this.y + this.vy * dt, H);
    this.rot += this.rotSpeed * dt;
    this.ttl -= dt;
    if (this.ttl <= 0) this.dead = true;
  }

  draw() {
    // Estela dorada: partículas detrás del movimiento
    const ang = Math.atan2(this.vy, this.vx);
    for (let i = 0; i < 2; i++) {
      const back = this.radius * (0.4 + i * 0.4);
      particles.push(new Particle(
        this.x - Math.cos(ang) * back,
        this.y - Math.sin(ang) * back,
        '255,215,0',
        [10, 40],
        [0.2, 0.5],
      ));
    }

    const fade = Math.min(1, this.ttl / 1.0); // desvanecer en el último segundo
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rot);
    ctx.strokeStyle = `rgba(255,215,0,${fade.toFixed(2)})`;
    ctx.lineWidth = 1.8;
    ctx.lineJoin = 'round';
    ctx.shadowColor = '#ffd700';
    ctx.shadowBlur = 12 * fade;
    ctx.beginPath();
    ctx.moveTo(this.verts[0][0], this.verts[0][1]);
    for (let i = 1; i < this.verts.length; i++)
      ctx.lineTo(this.verts[i][0], this.verts[i][1]);
    ctx.closePath();
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.shadowColor = 'transparent';
    ctx.restore();
  }
}

// ── Ship ──────────────────────────────────────────────────────────────────────
class Ship {
  constructor() { this.reset(); }

  reset() {
    this.x      = W / 2;
    this.y      = H / 2;
    this.angle  = -Math.PI / 2;
    this.vx     = 0;
    this.vy     = 0;
    this.radius = 12;
    this.thrusting     = false;
    this.invincible    = 3;
    this.shootCooldown = 0;
    this.boostTimer    = 0;
    this.tripleTimer   = 0;
    this.dead          = false;
  }

  update(dt) {
    if (this.dead) return;
    if (this.invincible    > 0) this.invincible    -= dt;
    if (this.shootCooldown > 0) this.shootCooldown -= dt;
    if (this.boostTimer    > 0) this.boostTimer    -= dt;
    if (this.tripleTimer   > 0) this.tripleTimer   -= dt;

    const ROT   = 3.5;   // rad/s
    const THRUST = 260;  // px/s²
    const DRAG   = 0.987;
    const mult   = this.boostTimer > 0 ? 2 : 1;

    if (keys['ArrowLeft'])  this.angle -= ROT * dt;
    if (keys['ArrowRight']) this.angle += ROT * dt;

    this.thrusting = !!keys['ArrowUp'];
    if (this.thrusting) {
      this.vx += Math.cos(this.angle) * THRUST * mult * dt;
      this.vy += Math.sin(this.angle) * THRUST * mult * dt;
    }

    this.vx *= DRAG;
    this.vy *= DRAG;
    this.x = wrap(this.x + this.vx * dt, W);
    this.y = wrap(this.y + this.vy * dt, H);
  }

  tryShoot() {
    if (this.shootCooldown > 0 || this.dead) return [];
    this.shootCooldown = 0.2;
    const NOSE = 21;
    const ox = this.x + Math.cos(this.angle) * NOSE;
    const oy = this.y + Math.sin(this.angle) * NOSE;
    if (this.tripleTimer > 0) {
      return [
        new Bullet(ox, oy, this.angle - TRIPLE_SPREAD),
        new Bullet(ox, oy, this.angle),
        new Bullet(ox, oy, this.angle + TRIPLE_SPREAD),
      ];
    }
    return [new Bullet(ox, oy, this.angle)];
  }

  draw() {
    if (this.dead) return;
    // Parpadeo durante invencibilidad de reaparición
    if (this.invincible > 0 && Math.floor(this.invincible * 8) % 2 === 0) return;

    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle);
    ctx.strokeStyle = '#fff';
    ctx.lineWidth   = 1.5;
    ctx.lineJoin    = 'round';

    // Silueta clásica: triángulo con muesca trasera
    ctx.beginPath();
    ctx.moveTo( 20,  0);   // nariz
    ctx.lineTo(-12, -9);   // ala izquierda
    ctx.lineTo( -7,  0);   // muesca trasera
    ctx.lineTo(-12,  9);   // ala derecha
    ctx.closePath();
    ctx.stroke();

    // Llama del propulsor
    if (this.thrusting && Math.random() > 0.35) {
      const boosted = this.boostTimer > 0;
      const len = boosted ? rand(10, 22) : rand(6, 14);
      ctx.beginPath();
      ctx.moveTo(-8, -4);
      ctx.lineTo(-8 - len, 0);
      ctx.lineTo(-8,  4);
      ctx.strokeStyle = boosted ? 'rgba(0, 255, 255, 0.95)' : 'rgba(255, 130, 0, 0.85)';
      ctx.shadowColor  = boosted ? '#0ff' : 'transparent';
      ctx.shadowBlur   = boosted ? 8 : 0;
      ctx.stroke();
      ctx.shadowBlur   = 0;
      ctx.shadowColor  = 'transparent';
    }

    ctx.restore();
  }
}

// ── Partículas (explosión) ────────────────────────────────────────────────────
class Particle {
  constructor(x, y, color = '255,255,255', speedRange = [30, 130], lifeRange = [0.4, 1.1]) {
    this.x  = x;
    this.y  = y;
    const angle = rand(0, Math.PI * 2);
    const speed = rand(speedRange[0], speedRange[1]);
    this.vx   = Math.cos(angle) * speed;
    this.vy   = Math.sin(angle) * speed;
    this.life = rand(lifeRange[0], lifeRange[1]);
    this.ttl  = this.life;
    this.color = color;
    this.dead = false;
  }

  update(dt) {
    this.x  += this.vx * dt;
    this.y  += this.vy * dt;
    this.ttl -= dt;
    if (this.ttl <= 0) this.dead = true;
  }

  draw() {
    const alpha = this.ttl / this.life;
    ctx.strokeStyle = `rgba(${this.color},${alpha.toFixed(2)})`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(this.x, this.y);
    ctx.lineTo(this.x - this.vx * 0.05, this.y - this.vy * 0.05);
    ctx.stroke();
  }
}

// ── Estado del juego ──────────────────────────────────────────────────────────
let ship, bullets, asteroids, particles;
let powerUp;
let shootingStar;
let score, lives, level;
let state;      // 'playing' | 'dead' | 'gameover'
let deadTimer;

function spawnAsteroids(count) {
  const SAFE_DIST = 130;
  for (let i = 0; i < count; i++) {
    let x, y;
    do {
      x = rand(0, W);
      y = rand(0, H);
    } while (Math.hypot(x - W / 2, y - H / 2) < SAFE_DIST);
    asteroids.push(new Asteroid(x, y, 3));
  }
}

function spawnShootingStar() {
  // Aparece desde un borde, viajando hacia la zona central
  const side = randInt(0, 3);
  let x, y, angle;
  if (side === 0)      { x = rand(0, W); y = -20;       angle = rand(Math.PI * 0.25, Math.PI * 0.75); }
  else if (side === 1) { x = W + 20;     y = rand(0, H); angle = rand(Math.PI * 0.75, Math.PI * 1.25); }
  else if (side === 2) { x = rand(0, W); y = H + 20;     angle = rand(Math.PI * 1.25, Math.PI * 1.75); }
  else                { x = -20;        y = rand(0, H); angle = rand(-Math.PI * 0.25, Math.PI * 0.25); }
  const speed = SHOOTING_STAR_SPEED + rand(-20, 20);
  shootingStar = new ShootingStar(x, y, Math.cos(angle) * speed, Math.sin(angle) * speed);
}

function initGame() {
  ship          = new Ship();
  bullets   = [];
  asteroids = [];
  particles = [];
  powerUp   = null;
  shootingStar = null;
  score  = 0;
  lives  = 3;
  level  = 1;
  state  = 'playing';
  spawnAsteroids(4);
}

function nextLevel() {
  level++;
  bullets   = [];
  particles = [];
  powerUp   = null;
  shootingStar = null;
  ship.reset();
  spawnAsteroids(3 + level);
}

function explode(x, y, count = 8) {
  for (let i = 0; i < count; i++) particles.push(new Particle(x, y));
}

function killShip() {
  explode(ship.x, ship.y, 14);
  ship.dead = true;
  shootingStar = null;
  lives--;
  if (lives <= 0) {
    state = 'gameover';
  } else {
    state     = 'dead';
    deadTimer = 2;
  }
}

// ── Update ────────────────────────────────────────────────────────────────────
function update(dt) {
  if (state === 'gameover') {
    if (pressed('Space')) initGame();
    particles.forEach(p => p.update(dt));
    particles = particles.filter(p => !p.dead);
    return;
  }

  if (state === 'dead') {
    deadTimer -= dt;
    particles.forEach(p => p.update(dt));
    particles = particles.filter(p => !p.dead);
    asteroids.forEach(a => a.update(dt));
    if (deadTimer <= 0) { state = 'playing'; ship.reset(); }
    return;
  }

  // Disparar
  if (pressed('Space')) {
    bullets.push(...ship.tryShoot());
  }

  ship.update(dt);
  bullets.forEach(b => b.update(dt));
  asteroids.forEach(a => a.update(dt));
  particles.forEach(p => p.update(dt));
  if (powerUp) powerUp.update(dt);
  if (shootingStar) shootingStar.update(dt);

  // Spawn de estrella fugaz (azar)
  if (!shootingStar && Math.random() < 0.08 * dt)
    spawnShootingStar();

  bullets   = bullets.filter(b => !b.dead);
  particles = particles.filter(p => !p.dead);
  if (powerUp && powerUp.dead) powerUp = null;
  if (shootingStar && shootingStar.dead) shootingStar = null;

  // Bala vs asteroide
  const newAsteroids = [];
  for (const b of bullets) {
    for (const a of asteroids) {
      if (!a.dead && !b.dead && dist(b, a) < a.radius) {
        b.dead = true;
        a.dead = true;
        score += POINTS[a.size];
        explode(a.x, a.y, a.size * 5);
        newAsteroids.push(...a.split());
        // Drop de power-up (Velocidad o Triple Shot)
        if (!powerUp && Math.random() < DROP_CHANCE) {
          const type = Math.random() < 0.5 ? 'speed' : 'triple';
          powerUp = new PowerUp(a.x, a.y, type);
        }
      }
    }
  }
  asteroids = asteroids.filter(a => !a.dead).concat(newAsteroids);
  bullets   = bullets.filter(b => !b.dead);

  // Bala vs estrella fugaz
  if (shootingStar) {
    for (const b of bullets) {
      if (!b.dead && dist(b, shootingStar) < shootingStar.radius) {
        b.dead = true;
        shootingStar.dead = true;
        score += SHOOTING_STAR_POINTS;
        explode(shootingStar.x, shootingStar.y, 12);
        // Polvo dorado extra
        for (let i = 0; i < 10; i++)
          particles.push(new Particle(shootingStar.x, shootingStar.y, '255,215,0', [40, 120], [0.3, 0.7]));
        break;
      }
    }
    if (shootingStar && shootingStar.dead) shootingStar = null;
  }

  // Nave vs asteroide
  if (ship.invincible <= 0) {
    for (const a of asteroids) {
      if (dist(ship, a) < ship.radius + a.radius * 0.82) {
        killShip();
        break;
      }
    }
    // Nave vs estrella fugaz
    if (shootingStar && !ship.dead &&
        dist(ship, shootingStar) < ship.radius + shootingStar.radius * 0.82) {
      killShip();
    }
  }

  // Nave vs power-up (Velocidad / Triple Shot)
  if (powerUp && !ship.dead &&
      dist(ship, powerUp) < ship.radius + powerUp.radius) {
    if (powerUp.type === 'speed') {
      ship.boostTimer = BOOST_DURATION;
    } else {
      ship.tripleTimer = TRIPLE_DURATION;
    }
    explode(powerUp.x, powerUp.y, 10);
    powerUp = null;
  }

  // Nivel completado
  if (asteroids.length === 0) nextLevel();
}

// ── Draw ──────────────────────────────────────────────────────────────────────
function drawLifeIcon(x, y) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(-Math.PI / 2);
  ctx.strokeStyle = '#fff';
  ctx.lineWidth   = 1.2;
  ctx.lineJoin    = 'round';
  ctx.beginPath();
  ctx.moveTo( 9,  0);
  ctx.lineTo(-6, -5);
  ctx.lineTo(-3,  0);
  ctx.lineTo(-6,  5);
  ctx.closePath();
  ctx.stroke();
  ctx.restore();
}

function drawHUD() {
  ctx.fillStyle = '#fff';
  ctx.font = '15px monospace';

  ctx.textAlign = 'left';
  ctx.fillText(`SCORE  ${score}`, 14, 26);

  ctx.textAlign = 'center';
  ctx.fillText(`NIVEL ${level}`, W / 2, 26);

  for (let i = 0; i < lives; i++)
    drawLifeIcon(W - 16 - i * 22, 18);

  // Indicador de power-up de Velocidad
  if (ship.boostTimer > 0) {
    const BAR_W = 120;
    const BAR_H = 6;
    const BAR_X = 14;
    const BAR_Y = H - 22;

    // Texto del tiempo restante
    ctx.fillStyle = '#0ff';
    ctx.textAlign = 'left';
    ctx.font = '13px monospace';
    ctx.fillText(`BOOST ${ship.boostTimer.toFixed(1)}s`, BAR_X, H - 30);

    // Fondo de la barra
    ctx.fillStyle = 'rgba(255,255,255,0.15)';
    ctx.fillRect(BAR_X, BAR_Y, BAR_W, BAR_H);

    // Relleno proporcional al tiempo restante
    const frac = ship.boostTimer / BOOST_DURATION;
    ctx.fillStyle = '#0ff';
    ctx.fillRect(BAR_X, BAR_Y, BAR_W * frac, BAR_H);

    // Borde sutil
    ctx.strokeStyle = 'rgba(255,255,255,0.4)';
    ctx.lineWidth = 1;
    ctx.strokeRect(BAR_X, BAR_Y, BAR_W, BAR_H);
  }

  // Indicador de power-up de Triple Shot
  if (ship.tripleTimer > 0) {
    const BAR_W = 120;
    const BAR_H = 6;
    const BAR_X = 14;
    const BAR_Y = H - 44; // stacked above the boost bar

    ctx.fillStyle = '#f0f';
    ctx.textAlign = 'left';
    ctx.font = '13px monospace';
    ctx.fillText(`TRIPLE ${ship.tripleTimer.toFixed(1)}s`, BAR_X, H - 52);

    ctx.fillStyle = 'rgba(255,255,255,0.15)';
    ctx.fillRect(BAR_X, BAR_Y, BAR_W, BAR_H);

    const frac = ship.tripleTimer / TRIPLE_DURATION;
    ctx.fillStyle = '#f0f';
    ctx.fillRect(BAR_X, BAR_Y, BAR_W * frac, BAR_H);

    ctx.strokeStyle = 'rgba(255,255,255,0.4)';
    ctx.lineWidth = 1;
    ctx.strokeRect(BAR_X, BAR_Y, BAR_W, BAR_H);
  }

}

function drawOverlay(title, sub) {
  ctx.textAlign   = 'center';
  ctx.fillStyle   = '#fff';
  ctx.font        = 'bold 46px monospace';
  ctx.fillText(title, W / 2, H / 2 - 18);
  ctx.font        = '18px monospace';
  ctx.fillStyle   = 'rgba(255,255,255,0.65)';
  ctx.fillText(sub, W / 2, H / 2 + 22);
}

function draw() {
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, W, H);

  particles.forEach(p => p.draw());
  asteroids.forEach(a => a.draw());
  if (powerUp) powerUp.draw();
  if (shootingStar) shootingStar.draw();
  bullets.forEach(b => b.draw());
  ship.draw();

  drawHUD();

  if (state === 'gameover')
    drawOverlay('GAME OVER', `PUNTAJE: ${score}   —   ESPACIO PARA REINICIAR`);
}

// ── Loop principal ────────────────────────────────────────────────────────────
let lastTime = null;

function loop(ts) {
  const dt = lastTime === null ? 0 : Math.min((ts - lastTime) / 1000, 0.05);
  lastTime = ts;
  update(dt);
  draw();
  requestAnimationFrame(loop);
}

initGame();
requestAnimationFrame(loop);

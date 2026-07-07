function $(selector, root = document) {
  return root.querySelector(selector);
}

function $all(selector, root = document) {
  return Array.from(root.querySelectorAll(selector));
}

function initGalaxyHero() {
  const canvas = $("#galaxyHero");
  if (!canvas) return;

  const ctx = canvas.getContext("2d", { alpha: false });
  if (!ctx) return;

  const hero = $(".heroSection");
  const planetPages = $all(".planetPage");
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const galaxyArmCount = 5;
  const planets = [
    {
      pageId: "planet-1",
      orbit: 0.38,
      size: 11.4,
      speed: 0.31,
      color: "#2374ff",
      dark: "#061f4b",
      light: "#c7f4ff",
      detail: "ocean",
      spin: 0.32,
      moons: [{ distance: 1.78, radius: 0.12, speed: 0.92, color: "#dceaff", phase: 0.4, tilt: -0.3 }]
    },
    {
      pageId: "planet-2",
      orbit: 0.5,
      size: 10.2,
      speed: 0.24,
      color: "#e15a38",
      dark: "#451413",
      light: "#ffba8f",
      detail: "rust",
      spin: 0.26
    },
    {
      pageId: "planet-3",
      orbit: 0.66,
      size: 21.8,
      speed: 0.14,
      color: "#d79a48",
      dark: "#4a2615",
      light: "#fff0bc",
      detail: "giant",
      spin: 0.18,
      moons: [
        { distance: 1.78, radius: 0.075, speed: 0.56, color: "#f5dfb5", phase: 0.2, tilt: -0.42 },
        { distance: 2.18, radius: 0.1, speed: 0.34, color: "#c9d8ff", phase: 2.2, tilt: -0.42 }
      ]
    },
    {
      pageId: "planet-4",
      orbit: 0.82,
      size: 20.2,
      speed: 0.105,
      color: "#ceb05c",
      dark: "#433012",
      light: "#fff1a5",
      detail: "ringed",
      ring: true,
      spin: 0.15
    },
    {
      pageId: "planet-5",
      orbit: 0.96,
      size: 15.2,
      speed: 0.078,
      color: "#55d6df",
      dark: "#073348",
      light: "#eaffff",
      detail: "ice",
      spin: 0.12,
      moons: [{ distance: 1.92, radius: 0.09, speed: 0.42, color: "#bdf7ff", phase: 1.6, tilt: -0.22 }]
    },
    {
      pageId: "planet-6",
      orbit: 1.08,
      size: 14.6,
      speed: 0.058,
      color: "#9a63ff",
      dark: "#23144d",
      light: "#f1deff",
      detail: "violet",
      spin: 0.1,
      moons: [{ distance: 1.68, radius: 0.1, speed: 0.3, color: "#ffb9f6", phase: 2.8, tilt: -0.48 }]
    }
  ];

  let width = 1;
  let height = 1;
  let dpr = 1;
  let stars = [];
  let flashStars = [];
  let dust = [];
  let animationFrame = 0;
  let planetTargets = [];
  let zoomTransition = null;

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function random(min, max) {
    return min + Math.random() * (max - min);
  }

  function easeInOutCubic(value) {
    return value < 0.5
      ? 4 * value * value * value
      : 1 - Math.pow(-2 * value + 2, 3) / 2;
  }

  function updateRoute() {
    const pageId = window.location.hash.slice(1);
    const activePage = planetPages.find((page) => page.id === pageId);

    hero?.classList.toggle("is-hidden", Boolean(activePage));
    for (const page of planetPages) {
      const active = page === activePage;
      page.classList.toggle("is-active", active);
      page.setAttribute("aria-hidden", active ? "false" : "true");
    }

    if (activePage) {
      canvas.style.cursor = "default";
    }
  }

  function getCanvasPoint(event) {
    const rect = canvas.getBoundingClientRect();

    return {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top
    };
  }

  function getHitPlanet(point) {
    for (let index = planetTargets.length - 1; index >= 0; index--) {
      const target = planetTargets[index];
      const dx = point.x - target.x;
      const dy = point.y - target.y;
      const hitRadius = Math.max(28, target.size * 1.28);

      if (Math.hypot(dx, dy) <= hitRadius) {
        return target;
      }
    }

    return null;
  }

  function startPlanetTransition(target) {
    if (zoomTransition || hero?.classList.contains("is-hidden")) return;

    zoomTransition = {
      pageId: target.pageId,
      planet: target.planet,
      x: target.x,
      y: target.y,
      size: target.size,
      lockedTime: target.time,
      start: performance.now(),
      duration: 1200
    };
    canvas.style.cursor = "default";
    start();
  }

  function getGalaxyLayout() {
    const compact = width < 720;
    const radius = clamp(Math.min(width * 0.56, height * 0.9), 320, 760);

    return {
      x: width * 0.5,
      y: height * 0.5,
      radius,
      tilt: compact ? -0.16 : -0.24,
      flatten: compact ? 0.48 : 0.38
    };
  }

  function projectGalaxyParticle(particle, time, layout = getGalaxyLayout()) {
    const orbit = particle.orbit * layout.radius;
    const swirl = particle.orbit * particle.twist;
    const angle = particle.angle + swirl + time * particle.speed;
    const wobble = Math.sin(time * particle.wobbleSpeed + particle.phase) * particle.wobble;
    const rawX = Math.cos(angle) * orbit + particle.armOffset * layout.radius;
    const rawY = (Math.sin(angle) * orbit + wobble) * layout.flatten;
    const cos = Math.cos(layout.tilt);
    const sin = Math.sin(layout.tilt);

    return {
      x: layout.x + rawX * cos - rawY * sin,
      y: layout.y + rawX * sin + rawY * cos,
      depth: 0.72 + Math.sin(angle) * 0.18 + particle.orbit * 0.18
    };
  }

  function rebuildScene() {
    const rect = canvas.getBoundingClientRect();
    width = Math.max(1, Math.floor(rect.width));
    height = Math.max(1, Math.floor(rect.height));
    dpr = Math.min(window.devicePixelRatio || 1, 2);

    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const starCount = clamp(Math.floor((width * height) / 780), 820, 2500);
    const flashCount = clamp(Math.floor(starCount * 0.028), 24, 76);
    const dustCount = clamp(Math.floor((width * height) / 3900), 150, 460);

    stars = Array.from({ length: starCount }, () => ({
      angle:
        (Math.floor(Math.random() * galaxyArmCount) / galaxyArmCount) * Math.PI * 2 +
        random(-0.34, 0.34),
      orbit: Math.pow(Math.random(), 0.68),
      armOffset: random(-0.016, 0.016),
      twist: random(4.8, 7.2),
      size: random(0.3, 1.34),
      phase: random(0, Math.PI * 2),
      speed: random(0.045, 0.16),
      wobble: random(0.5, 5.2),
      wobbleSpeed: random(0.7, 1.6),
      alpha: random(0.22, 0.78),
      tint:
        Math.random() > 0.7
          ? "238, 214, 255"
          : Math.random() > 0.38
            ? "198, 178, 255"
            : "255, 248, 255"
    }));

    flashStars = Array.from({ length: flashCount }, () => ({
      angle:
        (Math.floor(Math.random() * galaxyArmCount) / galaxyArmCount) * Math.PI * 2 +
        random(-0.28, 0.28),
      orbit: Math.pow(Math.random(), 1.18),
      armOffset: random(-0.012, 0.012),
      twist: random(5.2, 7.6),
      size: random(0.82, 1.62),
      phase: random(0, Math.PI * 2),
      speed: random(0.052, 0.18),
      flashSpeed: random(1.15, 3.2),
      wobble: random(0.5, 4.8),
      wobbleSpeed: random(0.6, 1.4),
      tint: Math.random() > 0.55 ? "248, 214, 255" : "204, 176, 255"
    }));

    dust = Array.from({ length: dustCount }, () => ({
      angle:
        (Math.floor(Math.random() * galaxyArmCount) / galaxyArmCount) * Math.PI * 2 +
        random(-0.46, 0.46),
      orbit: Math.pow(Math.random(), 0.58),
      armOffset: random(-0.035, 0.035),
      twist: random(4.2, 7.4),
      size: random(0.7, 2.8),
      phase: random(0, Math.PI * 2),
      speed: random(0.02, 0.075),
      wobble: random(3, 18),
      wobbleSpeed: random(0.24, 0.72),
      alpha: random(0.026, 0.11),
      tint: Math.random() > 0.5 ? "178, 112, 255" : "232, 119, 255"
    }));

    draw(performance.now());
  }

  function fillBackground() {
    const base = ctx.createLinearGradient(0, 0, width, height);
    base.addColorStop(0, "#010105");
    base.addColorStop(0.48, "#06020d");
    base.addColorStop(1, "#000003");
    ctx.fillStyle = base;
    ctx.fillRect(0, 0, width, height);

    const nebula = ctx.createRadialGradient(
      width * 0.5,
      height * 0.5,
      0,
      width * 0.5,
      height * 0.5,
      Math.max(width, height) * 0.9
    );
    nebula.addColorStop(0, "rgba(116, 62, 219, 0.16)");
    nebula.addColorStop(0.34, "rgba(166, 66, 218, 0.1)");
    nebula.addColorStop(0.68, "rgba(42, 18, 88, 0.07)");
    nebula.addColorStop(1, "rgba(2, 3, 10, 0)");
    ctx.fillStyle = nebula;
    ctx.fillRect(0, 0, width, height);
  }

  function drawGalaxyBand(time) {
    const layout = getGalaxyLayout();

    ctx.save();
    ctx.translate(layout.x, layout.y);
    ctx.rotate(layout.tilt + time * 0.018);

    const bandWidth = layout.radius * 1.72;
    const bandHeight = layout.radius * layout.flatten * 0.94;
    const band = ctx.createRadialGradient(0, 0, 0, 0, 0, bandWidth * 0.58);
    band.addColorStop(0, "rgba(255, 238, 255, 0.34)");
    band.addColorStop(0.2, "rgba(211, 158, 255, 0.23)");
    band.addColorStop(0.48, "rgba(151, 83, 255, 0.14)");
    band.addColorStop(0.74, "rgba(94, 43, 173, 0.09)");
    band.addColorStop(1, "rgba(0, 0, 0, 0)");
    ctx.scale(1, bandHeight / bandWidth);
    ctx.fillStyle = band;
    ctx.beginPath();
    ctx.arc(0, 0, bandWidth * 0.55, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    const core = ctx.createRadialGradient(layout.x, layout.y, 0, layout.x, layout.y, layout.radius * 0.22);
    core.addColorStop(0, "rgba(255, 238, 255, 0.58)");
    core.addColorStop(0.28, "rgba(224, 161, 255, 0.3)");
    core.addColorStop(0.64, "rgba(149, 97, 255, 0.14)");
    core.addColorStop(1, "rgba(255, 255, 255, 0)");
    ctx.fillStyle = core;
    ctx.beginPath();
    ctx.arc(layout.x, layout.y, layout.radius * 0.22, 0, Math.PI * 2);
    ctx.fill();

    for (const mote of dust) {
      const point = projectGalaxyParticle(mote, time, layout);
      const size = mote.size * point.depth;
      ctx.fillStyle = `rgba(${mote.tint}, ${mote.alpha * point.depth})`;
      ctx.beginPath();
      ctx.arc(point.x, point.y, size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  function drawStars(time) {
    const layout = getGalaxyLayout();

    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    for (const star of stars) {
      const point = projectGalaxyParticle(star, time, layout);
      const twinkle = 0.62 + Math.sin(time * 2.2 + star.phase) * 0.18 + point.depth * 0.2;
      const alpha = clamp(star.alpha * twinkle, 0.14, 1);
      const size = star.size * (0.78 + point.depth * 0.5);

      ctx.fillStyle = `rgba(${star.tint}, ${alpha})`;
      ctx.beginPath();
      ctx.arc(point.x, point.y, size, 0, Math.PI * 2);
      ctx.fill();
    }

    for (const star of flashStars) {
      const pulse = Math.max(0, Math.sin(time * star.flashSpeed + star.phase));
      const flare = Math.pow(pulse, 5);
      if (flare < 0.06) continue;

      const point = projectGalaxyParticle(star, time, layout);
      const core = star.size * (0.7 + flare * 0.52) * point.depth;
      const glow = star.size * (3.2 + flare * 2.9) * point.depth;
      const alpha = 0.16 + flare * 0.62;
      const gradient = ctx.createRadialGradient(point.x, point.y, 0, point.x, point.y, glow);

      gradient.addColorStop(0, `rgba(${star.tint}, ${alpha})`);
      gradient.addColorStop(0.2, `rgba(${star.tint}, ${alpha * 0.46})`);
      gradient.addColorStop(1, "rgba(255, 255, 255, 0)");
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(point.x, point.y, glow, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = `rgba(255, 248, 255, ${0.74 + flare * 0.26})`;
      ctx.beginPath();
      ctx.arc(point.x, point.y, core, 0, Math.PI * 2);
      ctx.fill();

      const spike = glow * (1.8 + flare * 0.8);
      const shortSpike = spike * 0.42;
      ctx.save();
      ctx.translate(point.x, point.y);
      ctx.rotate(time * 0.16 + star.phase);
      ctx.strokeStyle = `rgba(255, 248, 255, ${0.18 + flare * 0.62})`;
      ctx.lineWidth = Math.max(0.7, core * 0.42);
      ctx.shadowColor = `rgba(${star.tint}, ${0.24 + flare * 0.48})`;
      ctx.shadowBlur = glow * 0.9;
      ctx.beginPath();
      ctx.moveTo(-spike, 0);
      ctx.lineTo(spike, 0);
      ctx.moveTo(0, -shortSpike);
      ctx.lineTo(0, shortSpike);
      ctx.stroke();
      ctx.restore();
    }
    ctx.restore();
  }

  function drawSun(x, y, radius, time) {
    ctx.save();
    ctx.globalCompositeOperation = "lighter";

    const halo = ctx.createRadialGradient(x, y, 0, x, y, radius * 3.35);
    halo.addColorStop(0, "rgba(255, 244, 183, 0.82)");
    halo.addColorStop(0.2, "rgba(255, 166, 62, 0.26)");
    halo.addColorStop(0.5, "rgba(243, 93, 45, 0.08)");
    halo.addColorStop(1, "rgba(243, 93, 45, 0)");
    ctx.fillStyle = halo;
    ctx.beginPath();
    ctx.arc(x, y, radius * 3.35, 0, Math.PI * 2);
    ctx.fill();

    const core = ctx.createRadialGradient(x - radius * 0.28, y - radius * 0.32, 0, x, y, radius);
    core.addColorStop(0, "#ffe0a0");
    core.addColorStop(0.22, "#ffd166");
    core.addColorStop(0.58, "#ff9e45");
    core.addColorStop(0.82, "#ff7a35");
    core.addColorStop(1, "#d9573d");
    ctx.fillStyle = core;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = "rgba(255, 232, 158, 0.22)";
    ctx.lineWidth = 1.1;
    for (let i = 0; i < 10; i++) {
      const angle = time * 0.24 + i * 0.63;
      ctx.beginPath();
      ctx.moveTo(x + Math.cos(angle) * radius * 0.66, y + Math.sin(angle) * radius * 0.66);
      ctx.lineTo(x + Math.cos(angle + 0.16) * radius * 1.16, y + Math.sin(angle + 0.16) * radius * 1.16);
      ctx.stroke();
    }

    ctx.restore();
  }

  function drawPlanet(x, y, planet, scale, time, options = {}) {
    const size = options.sizeOverride ?? clamp(planet.size * scale * 2, 14, 64);

    ctx.save();
    ctx.globalCompositeOperation = "lighter";

    const ringRotation = -0.38 + Math.sin(time * 0.2) * 0.05;
    const moons = options.drawMoons === false ? [] : planet.moons || [];
    const drawRings = options.drawRings !== false;
    const planetAlpha = options.planetAlpha ?? 0.82;
    const accessoryAlpha = options.accessoryAlpha ?? 0.92;

    function projectMoon(moon) {
      const distance = size * moon.distance;
      const tilt = moon.tilt ?? -0.34;
      const angle = time * moon.speed + moon.phase;
      const rawX = Math.cos(angle) * distance;
      const rawY = Math.sin(angle) * distance * 0.36;
      const cos = Math.cos(tilt);
      const sin = Math.sin(tilt);

      return {
        x: x + rawX * cos - rawY * sin,
        y: y + rawX * sin + rawY * cos,
        radius: clamp(size * moon.radius, 2, 7),
        front: Math.sin(angle) > 0,
        color: moon.color
      };
    }

    function drawMoonDot(point, alpha) {
      const moonGlow = ctx.createRadialGradient(point.x, point.y, 0, point.x, point.y, point.radius * 3.1);
      moonGlow.addColorStop(0, `rgba(255, 255, 255, ${alpha * 0.42})`);
      moonGlow.addColorStop(0.34, `rgba(190, 210, 255, ${alpha * 0.16})`);
      moonGlow.addColorStop(1, "rgba(255, 255, 255, 0)");
      ctx.fillStyle = moonGlow;
      ctx.beginPath();
      ctx.arc(point.x, point.y, point.radius * 3.1, 0, Math.PI * 2);
      ctx.fill();

      const moonShade = ctx.createRadialGradient(
        point.x - point.radius * 0.35,
        point.y - point.radius * 0.35,
        0,
        point.x,
        point.y,
        point.radius
      );
      moonShade.addColorStop(0, "#ffffff");
      moonShade.addColorStop(0.45, point.color);
      moonShade.addColorStop(1, "rgba(52, 60, 83, 0.86)");
      ctx.fillStyle = moonShade;
      ctx.beginPath();
      ctx.arc(point.x, point.y, point.radius, 0, Math.PI * 2);
      ctx.fill();
    }

    if (moons.length) {
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      ctx.globalAlpha = accessoryAlpha;
      for (const moon of moons) {
        const distance = size * moon.distance;
        ctx.strokeStyle = "rgba(200, 218, 255, 0.18)";
        ctx.lineWidth = Math.max(0.7, size * 0.018);
        ctx.beginPath();
        ctx.ellipse(x, y, distance, distance * 0.36, moon.tilt ?? -0.34, 0, Math.PI * 2);
        ctx.stroke();

        const point = projectMoon(moon);
        if (!point.front) {
          drawMoonDot(point, 0.66);
        }
      }
      ctx.restore();
    }

    ctx.globalAlpha = planetAlpha;
    const glow = ctx.createRadialGradient(x, y, 0, x, y, size * 2.45);
    glow.addColorStop(0, "rgba(255, 255, 255, 0.3)");
    glow.addColorStop(0.3, "rgba(204, 176, 255, 0.13)");
    glow.addColorStop(1, "rgba(255, 255, 255, 0)");
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(x, y, size * 2.45, 0, Math.PI * 2);
    ctx.fill();

    if (planet.ring && drawRings) {
      ctx.strokeStyle = "rgba(255, 231, 178, 0.34)";
      ctx.lineWidth = Math.max(2, size * 0.08);
      ctx.beginPath();
      ctx.ellipse(x, y, size * 2.28, size * 0.66, ringRotation, 0, Math.PI * 2);
      ctx.stroke();

      ctx.strokeStyle = "rgba(171, 132, 92, 0.2)";
      ctx.lineWidth = Math.max(1, size * 0.035);
      ctx.beginPath();
      ctx.ellipse(x, y, size * 1.86, size * 0.52, ringRotation, 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.globalCompositeOperation = "source-over";
    const shade = ctx.createRadialGradient(x - size * 0.35, y - size * 0.35, 0, x, y, size * 1.15);
    shade.addColorStop(0, planet.light);
    shade.addColorStop(0.28, planet.color);
    shade.addColorStop(1, planet.dark);
    ctx.fillStyle = shade;
    ctx.beginPath();
    ctx.arc(x, y, size, 0, Math.PI * 2);
    ctx.fill();

    ctx.save();
    ctx.beginPath();
    ctx.arc(x, y, size * 0.98, 0, Math.PI * 2);
    ctx.clip();
    ctx.translate(x, y);
    ctx.rotate(time * planet.spin);

    if (!["ocean", "ice", "violet"].includes(planet.detail)) {
      ctx.strokeStyle = "rgba(255, 255, 255, 0.1)";
      ctx.lineWidth = Math.max(0.55, size * 0.014);
      for (let i = -6; i <= 6; i++) {
        ctx.beginPath();
        ctx.ellipse(Math.sin(i * 1.7) * size * 0.06, i * size * 0.13, size * 0.9, size * 0.035, 0.08 * Math.sin(i), 0, Math.PI * 2);
        ctx.stroke();
      }
    }

    if (planet.detail === "ocean") {
      ctx.fillStyle = "rgba(68, 189, 129, 0.58)";
      ctx.beginPath();
      ctx.ellipse(-size * 0.32, -size * 0.12, size * 0.34, size * 0.18, -0.35, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(size * 0.24, size * 0.18, size * 0.3, size * 0.14, 0.42, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(size * 0.02, -size * 0.36, size * 0.2, size * 0.09, 0.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "rgba(225, 248, 255, 0.14)";
      for (const cloud of [[-0.46, 0.28, 0.16, 0.04], [0.34, -0.08, 0.2, 0.045], [-0.05, 0.48, 0.17, 0.035]]) {
        ctx.beginPath();
        ctx.ellipse(cloud[0] * size, cloud[1] * size, cloud[2] * size, cloud[3] * size, -0.2, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (planet.detail === "rust") {
      ctx.strokeStyle = "rgba(86, 28, 26, 0.58)";
      ctx.lineWidth = Math.max(1, size * 0.045);
      ctx.beginPath();
      ctx.moveTo(-size * 0.78, -size * 0.08);
      ctx.bezierCurveTo(-size * 0.28, -size * 0.24, size * 0.16, size * 0.1, size * 0.74, -size * 0.02);
      ctx.stroke();
      ctx.strokeStyle = "rgba(255, 190, 145, 0.24)";
      ctx.lineWidth = Math.max(0.7, size * 0.024);
      for (let i = -3; i <= 3; i++) {
        ctx.beginPath();
        ctx.ellipse(0, i * size * 0.16, size * 0.8, size * 0.034, i * 0.11, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.fillStyle = "rgba(255, 180, 132, 0.22)";
      ctx.beginPath();
      ctx.ellipse(size * 0.18, size * 0.32, size * 0.34, size * 0.12, -0.12, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "rgba(52, 18, 16, 0.35)";
      for (const crater of [[-0.32, -0.3, 0.08], [0.36, -0.24, 0.06], [-0.18, 0.22, 0.045], [0.46, 0.16, 0.04]]) {
        ctx.beginPath();
        ctx.arc(crater[0] * size, crater[1] * size, crater[2] * size, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (planet.detail === "giant" || planet.detail === "ringed") {
      const bands = planet.detail === "giant"
        ? ["rgba(255, 236, 185, 0.34)", "rgba(126, 72, 41, 0.28)", "rgba(255, 179, 108, 0.22)"]
        : ["rgba(255, 247, 201, 0.28)", "rgba(128, 96, 55, 0.22)", "rgba(220, 184, 112, 0.2)"];
      for (let i = -8; i <= 8; i++) {
        ctx.strokeStyle = bands[Math.abs(i) % bands.length];
        ctx.lineWidth = Math.max(0.9, size * (i % 2 === 0 ? 0.052 : 0.027));
        ctx.beginPath();
        ctx.ellipse(Math.sin(i) * size * 0.04, i * size * 0.095, size * 1.06, size * 0.028, 0.018 * i, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.strokeStyle = "rgba(255, 255, 255, 0.14)";
      ctx.lineWidth = Math.max(0.65, size * 0.016);
      for (let i = -5; i <= 5; i++) {
        ctx.beginPath();
        ctx.ellipse(0, i * size * 0.14 + size * 0.035, size * 0.95, size * 0.018, -0.08, 0, Math.PI * 2);
        ctx.stroke();
      }

      if (planet.detail === "giant") {
        ctx.fillStyle = "rgba(161, 64, 43, 0.72)";
        ctx.beginPath();
        ctx.ellipse(size * 0.36, size * 0.2, size * 0.2, size * 0.1, -0.16, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "rgba(255, 211, 160, 0.28)";
        ctx.lineWidth = Math.max(0.7, size * 0.018);
        ctx.beginPath();
        ctx.ellipse(size * 0.36, size * 0.2, size * 0.28, size * 0.13, -0.16, 0, Math.PI * 2);
        ctx.stroke();
      }
    } else if (planet.detail === "ice") {
      ctx.fillStyle = "rgba(238, 255, 255, 0.42)";
      ctx.beginPath();
      ctx.ellipse(0, -size * 0.58, size * 0.68, size * 0.2, -0.04, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = "rgba(27, 126, 166, 0.18)";
      for (const sheet of [[-0.26, -0.12, 0.46, 0.1, -0.12], [0.28, 0.22, 0.5, 0.12, 0.16], [0.04, 0.46, 0.36, 0.08, -0.24]]) {
        ctx.beginPath();
        ctx.ellipse(sheet[0] * size, sheet[1] * size, sheet[2] * size, sheet[3] * size, sheet[4], 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.strokeStyle = "rgba(16, 83, 120, 0.44)";
      ctx.lineWidth = Math.max(0.75, size * 0.02);
      const cracks = [
        [[-0.58, -0.06], [-0.34, -0.14], [-0.14, -0.05], [0.06, -0.16], [0.34, -0.1]],
        [[-0.34, 0.32], [-0.16, 0.22], [0.08, 0.3], [0.24, 0.18], [0.52, 0.24]],
        [[0.18, -0.44], [0.06, -0.28], [0.18, -0.1], [0.08, 0.08]]
      ];
      for (const crack of cracks) {
        ctx.beginPath();
        ctx.moveTo(crack[0][0] * size, crack[0][1] * size);
        for (let i = 1; i < crack.length; i++) {
          ctx.lineTo(crack[i][0] * size, crack[i][1] * size);
        }
        ctx.stroke();
      }

      ctx.strokeStyle = "rgba(185, 240, 249, 0.2)";
      ctx.lineWidth = Math.max(0.4, size * 0.008);
      for (const branch of [[-0.14, -0.05, -0.22, 0.08], [0.24, 0.18, 0.28, 0.32], [0.18, -0.1, 0.34, -0.2]]) {
        ctx.beginPath();
        ctx.moveTo(branch[0] * size, branch[1] * size);
        ctx.lineTo(branch[2] * size, branch[3] * size);
        ctx.stroke();
      }
    } else if (planet.detail === "violet") {
      ctx.fillStyle = "rgba(123, 204, 255, 0.35)";
      ctx.beginPath();
      ctx.arc(-size * 0.22, size * 0.18, size * 0.11, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "rgba(52, 46, 142, 0.32)";
      for (const spot of [[0.36, -0.24, 0.08], [-0.42, -0.05, 0.055], [0.16, 0.42, 0.05]]) {
        ctx.beginPath();
        ctx.arc(spot[0] * size, spot[1] * size, spot[2] * size, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();

    const night = ctx.createRadialGradient(x - size * 0.2, y - size * 0.22, size * 0.22, x + size * 0.26, y + size * 0.24, size * 1.18);
    night.addColorStop(0, "rgba(0, 0, 0, 0)");
    night.addColorStop(0.72, "rgba(0, 0, 0, 0.16)");
    night.addColorStop(1, "rgba(0, 0, 0, 0.52)");
    ctx.fillStyle = night;
    ctx.beginPath();
    ctx.arc(x, y, size, 0, Math.PI * 2);
    ctx.fill();

    ctx.globalCompositeOperation = "lighter";
    ctx.strokeStyle = "rgba(255, 255, 255, 0.18)";
    ctx.lineWidth = Math.max(1, size * 0.025);
    ctx.beginPath();
    ctx.arc(x, y, size * 0.98, Math.PI * 1.08, Math.PI * 1.68);
    ctx.stroke();

    if (planet.ring && drawRings) {
      ctx.strokeStyle = "rgba(255, 236, 184, 0.76)";
      ctx.lineWidth = Math.max(2, size * 0.065);
      ctx.beginPath();
      ctx.ellipse(x, y, size * 2.28, size * 0.66, ringRotation, 0.06, Math.PI - 0.06);
      ctx.stroke();
    }

    if (moons.length) {
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      ctx.globalAlpha = accessoryAlpha;
      for (const moon of moons) {
        const point = projectMoon(moon);
        if (point.front) {
          drawMoonDot(point, 1);
        }
      }
      ctx.restore();
    }

    ctx.restore();
  }

  function drawScene(time, options = {}) {
    fillBackground();
    drawGalaxyBand(time);
    drawStars(time);
    drawSolarSystem(time, options);
  }

  function drawPlanetTransition(now) {
    if (!zoomTransition) return;

    const rawProgress = clamp((now - zoomTransition.start) / zoomTransition.duration, 0, 1);
    const progress = easeInOutCubic(rawProgress);
    const moveProgress = 1 - Math.pow(1 - rawProgress, 4);
    const cameraScale = 1 + progress * 18;
    const cameraX = width * 0.5 + (zoomTransition.x - width * 0.5) * moveProgress;
    const cameraY = height * 0.5 + (zoomTransition.y - height * 0.5) * moveProgress;

    ctx.save();
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.globalCompositeOperation = "source-over";
    ctx.fillStyle = "#010105";
    ctx.fillRect(0, 0, width, height);
    ctx.translate(width * 0.5, height * 0.5);
    ctx.scale(cameraScale, cameraScale);
    ctx.translate(-cameraX, -cameraY);
    drawScene(zoomTransition.lockedTime, { updateTargets: false });
    ctx.restore();

    ctx.save();
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.globalCompositeOperation = "source-over";
    ctx.fillStyle = `rgba(1, 1, 5, ${Math.max(0, progress - 0.58) / 0.42})`;
    ctx.fillRect(0, 0, width, height);
    ctx.restore();

    ctx.save();
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.globalCompositeOperation = "lighter";
    ctx.strokeStyle = `rgba(255, 255, 255, ${Math.max(0, 0.2 - progress)})`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(width * 0.5, height * 0.5, Math.max(18, zoomTransition.size * 0.62), 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();

    if (rawProgress >= 1) {
      const pageId = zoomTransition.pageId;
      zoomTransition = null;

      if (window.location.hash === `#${pageId}`) {
        updateRoute();
      } else {
        window.location.hash = pageId;
      }
    }
  }

  function drawSolarSystem(time, options = {}) {
    const compact = width < 720;
    const scale = clamp(Math.min(width / 1180, height / 760), 0.72, 1.2);
    const sunX = width * 0.5;
    const sunY = height * 0.5;
    const sunRadius = clamp(84 * scale, 63, 105);
    const maxOrbit = clamp(Math.min(width * 0.5, height * 0.74), 260, 650) * scale;
    const tilt = compact ? -0.16 : -0.26;
    const updateTargets = options.updateTargets !== false;
    const nextPlanetTargets = [];

    ctx.save();
    ctx.translate(sunX, sunY);
    ctx.rotate(tilt);
    ctx.strokeStyle = "rgba(231, 214, 255, 0.18)";
    ctx.lineWidth = 1;

    for (const planet of planets) {
      const rx = maxOrbit * planet.orbit;
      const ry = rx * (compact ? 0.38 : 0.31);
      ctx.beginPath();
      ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();

    drawSun(sunX, sunY, sunRadius, time);

    for (let index = 0; index < planets.length; index++) {
      const planet = planets[index];
      const rx = maxOrbit * planet.orbit;
      const ry = rx * (compact ? 0.38 : 0.31);
      const angle = time * planet.speed + index * 0.82 + 0.9;
      const orbitX = Math.cos(angle) * rx;
      const orbitY = Math.sin(angle) * ry;
      const x = sunX + orbitX * Math.cos(tilt) - orbitY * Math.sin(tilt);
      const y = sunY + orbitX * Math.sin(tilt) + orbitY * Math.cos(tilt);
      const depthScale = 0.92 + Math.sin(angle) * 0.1;
      const planetScale = scale * depthScale;
      drawPlanet(x, y, planet, planetScale, time);
      nextPlanetTargets.push({
        index,
        pageId: planet.pageId,
        planet,
        x,
        y,
        time,
        size: clamp(planet.size * planetScale * 2, 14, 64)
      });
    }

    if (updateTargets) {
      planetTargets = nextPlanetTargets;
    }
  }

  function draw(now) {
    const time = now * 0.001;
    const motionTime = time * 0.58;

    if (zoomTransition) {
      drawPlanetTransition(now);
      return;
    }

    drawScene(motionTime);
  }

  function frame(now) {
    draw(now);
    animationFrame = window.requestAnimationFrame(frame);
  }

  function start() {
    window.cancelAnimationFrame(animationFrame);
    if (reducedMotion) {
      draw(performance.now());
      return;
    }
    animationFrame = window.requestAnimationFrame(frame);
  }

  if ("ResizeObserver" in window) {
    const observer = new ResizeObserver(() => {
      rebuildScene();
      start();
    });
    observer.observe(canvas);
  } else {
    window.addEventListener("resize", () => {
      rebuildScene();
      start();
    });
  }

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      window.cancelAnimationFrame(animationFrame);
    } else {
      start();
    }
  });

  canvas.addEventListener("pointermove", (event) => {
    if (zoomTransition || hero?.classList.contains("is-hidden")) return;

    canvas.style.cursor = getHitPlanet(getCanvasPoint(event)) ? "pointer" : "default";
  });

  canvas.addEventListener("pointerleave", () => {
    canvas.style.cursor = "default";
  });

  canvas.addEventListener("click", (event) => {
    const target = getHitPlanet(getCanvasPoint(event));
    if (target) {
      startPlanetTransition(target);
    }
  });

  window.addEventListener("hashchange", updateRoute);
  rebuildScene();
  updateRoute();
  start();
}

initGalaxyHero();

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
  const planetJumpLinks = $all("[data-planet-jump]");
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const galaxyArmCount = 5;
  const planets = [
    {
      pageId: "planet-1",
      orbit: 0.36,
      size: 8.8,
      speed: 0.36,
      color: "#e95722",
      dark: "#3a0c08",
      light: "#ffd08a",
      glow: "255, 108, 36",
      detail: "lava",
      spin: 0.42
    },
    {
      pageId: "planet-2",
      orbit: 0.5,
      size: 11.6,
      speed: 0.24,
      color: "#1eb3c3",
      dark: "#05304b",
      light: "#d9ffff",
      glow: "86, 229, 239",
      detail: "ocean",
      spin: 0.28
    },
    {
      pageId: "planet-3",
      orbit: 0.66,
      size: 13.4,
      speed: 0.14,
      color: "#8654d7",
      dark: "#211344",
      light: "#f0ddff",
      glow: "177, 139, 255",
      detail: "purpleIce",
      spin: 0.18
    },
    {
      pageId: "planet-4",
      orbit: 0.82,
      size: 22.2,
      speed: 0.105,
      color: "#c99f48",
      dark: "#473317",
      light: "#fff0bc",
      glow: "235, 190, 95",
      detail: "giant",
      spin: 0.15
    },
    {
      pageId: "planet-5",
      orbit: 0.96,
      size: 16.2,
      speed: 0.078,
      color: "#35c7d8",
      dark: "#073348",
      light: "#eaffff",
      glow: "112, 235, 255",
      detail: "ringedCyan",
      ring: true,
      ringStyle: "silverWide",
      spin: 0.12,
      moons: [{ distance: 2.72, radius: 0.07, speed: 0.32, color: "#d7f7ff", phase: 1.6, tilt: -0.28 }]
    },
    {
      pageId: "planet-6",
      orbit: 1.08,
      size: 14.6,
      speed: 0.058,
      color: "#2e3743",
      dark: "#06080d",
      light: "#8b9cab",
      glow: "53, 165, 255",
      detail: "aurora",
      spin: 0.1
    }
  ];

  let width = 1;
  let height = 1;
  let dpr = 1;
  let stars = [];
  let flashStars = [];
  let dust = [];
  let distantStars = [];
  let distantGalaxies = [];
  let asteroids = [];
  let animationFrame = 0;
  let planetTargets = [];
  let hoverPlanetId = null;
  let zoomTransition = null;
  let backgroundReady = false;
  const pointer = {
    x: 0,
    y: 0,
    targetX: 0,
    targetY: 0
  };
  const backgroundImage = new Image();

  backgroundImage.decoding = "async";
  backgroundImage.addEventListener("load", () => {
    backgroundReady = true;
    draw(performance.now());
  });
  backgroundImage.addEventListener("error", () => {
    backgroundReady = false;
  });
  backgroundImage.src = "/assets/hero-bg.png?v=20260717";

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

    for (const link of planetJumpLinks) {
      link.classList.toggle("is-active", link.dataset.planetJump === pageId);
    }

    if (activePage) {
      canvas.style.cursor = "default";
      hoverPlanetId = null;
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

  function getPlanetTarget(pageId) {
    return planetTargets.find((target) => target.pageId === pageId) || null;
  }

  function updatePointerParallax(event) {
    if (!hero) return;

    const rect = hero.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / Math.max(1, rect.width) - 0.5) * 32;
    const y = ((event.clientY - rect.top) / Math.max(1, rect.height) - 0.5) * 24;

    pointer.targetX = x;
    pointer.targetY = y;
    hero.style.setProperty("--mx", `${x.toFixed(2)}px`);
    hero.style.setProperty("--my", `${y.toFixed(2)}px`);
    hero.style.setProperty("--depth-x", `${(-x * 0.35).toFixed(2)}px`);
    hero.style.setProperty("--depth-y", `${(-y * 0.35).toFixed(2)}px`);
    hero.style.setProperty("--star-x", `${(x * 0.45).toFixed(2)}px`);
    hero.style.setProperty("--star-y", `${(y * 0.45).toFixed(2)}px`);
    hero.style.setProperty("--panel-x", `${(-x * 0.18).toFixed(2)}px`);
    hero.style.setProperty("--panel-y", `${(-y * 0.18).toFixed(2)}px`);
    hero.style.setProperty("--status-x", `${(x * 0.16).toFixed(2)}px`);
    hero.style.setProperty("--status-y", `${(y * 0.16).toFixed(2)}px`);
    hero.style.setProperty("--mission-x", `${(-x * 0.12).toFixed(2)}px`);
    hero.style.setProperty("--mission-y", `${(y * 0.12).toFixed(2)}px`);
  }

  function resetPointerParallax() {
    pointer.targetX = 0;
    pointer.targetY = 0;
    hero?.style.setProperty("--mx", "0px");
    hero?.style.setProperty("--my", "0px");
    hero?.style.setProperty("--depth-x", "0px");
    hero?.style.setProperty("--depth-y", "0px");
    hero?.style.setProperty("--star-x", "0px");
    hero?.style.setProperty("--star-y", "0px");
    hero?.style.setProperty("--panel-x", "0px");
    hero?.style.setProperty("--panel-y", "0px");
    hero?.style.setProperty("--status-x", "0px");
    hero?.style.setProperty("--status-y", "0px");
    hero?.style.setProperty("--mission-x", "0px");
    hero?.style.setProperty("--mission-y", "0px");
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
    const distantStarCount = clamp(Math.floor((width * height) / 760), 900, 2800);
    const asteroidCount = clamp(Math.floor((width * height) / 15000), 46, 128);

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

    distantStars = Array.from({ length: distantStarCount }, () => ({
      x: Math.random(),
      y: Math.random(),
      size: random(0.18, 1.06),
      alpha: random(0.12, 0.62),
      phase: random(0, Math.PI * 2),
      drift: random(1.2, 5.6),
      flare: Math.random() > 0.972,
      flareSize: random(5, 15),
      tint:
        Math.random() > 0.82
          ? "255, 214, 150"
          : Math.random() > 0.6
            ? "132, 238, 255"
            : Math.random() > 0.36
              ? "255, 160, 218"
              : "228, 220, 255"
    }));

    asteroids = Array.from({ length: asteroidCount }, () => ({
      angle: random(0, Math.PI * 2),
      orbit: random(0.69, 0.81),
      size: random(0.65, 2.6),
      speed: random(0.016, 0.062),
      wobble: random(-0.018, 0.018),
      alpha: random(0.16, 0.48),
      phase: random(0, Math.PI * 2),
      tint:
        Math.random() > 0.68
          ? "255, 221, 164"
          : Math.random() > 0.38
            ? "178, 222, 255"
            : "214, 193, 255"
    }));

    const galaxyAnchors = [
      {
        x: width < 720 ? 0.5 : 0.28,
        y: width < 720 ? 0.32 : 0.28,
        radius: width < 720 ? 0.22 : 0.18,
        rotation: -0.22,
        flatten: 0.34,
        primary: "122, 162, 255",
        accent: "196, 149, 255",
        rim: "255, 225, 190"
      }
    ];

    distantGalaxies = galaxyAnchors.map((anchor) => {
      const radius = clamp(Math.min(width, height) * anchor.radius, 88, 170);
      const arms = 2;
      const moteCount = Math.floor(clamp(radius * 6.2, 520, 1100));

      return {
        x: clamp(width * anchor.x, radius * 0.45, width - radius * 0.45),
        y: clamp(height * anchor.y, radius * 0.36, height - radius * 0.36),
        radius,
        arms,
        rotation: anchor.rotation,
        flatten: anchor.flatten,
        alpha: 0.58,
        phase: random(0, Math.PI * 2),
        float: random(2, 5),
        primary: anchor.primary,
        accent: anchor.accent,
        rim: anchor.rim,
        motes: Array.from({ length: moteCount }, () => ({
          arm: Math.floor(Math.random() * arms),
          orbit: Math.pow(Math.random(), 0.62),
          angle: random(-0.36, 0.36),
          twist: random(4.2, 6.8),
          spread: random(-0.13, 0.13),
          size: random(0.24, 1.18),
          alpha: random(0.1, 0.56),
          speed: random(0.002, 0.008),
          tint:
            Math.random() > 0.76
              ? anchor.rim
              : Math.random() > 0.44
                ? anchor.primary
                : anchor.accent
        }))
      };
    });

    draw(performance.now());
  }

  function drawImageBackground() {
    if (!backgroundReady || !backgroundImage.naturalWidth || !backgroundImage.naturalHeight) {
      return false;
    }

    const imageRatio = backgroundImage.naturalWidth / backgroundImage.naturalHeight;
    const viewportRatio = width / height;
    let sourceX = 0;
    let sourceY = 0;
    let sourceWidth = backgroundImage.naturalWidth;
    let sourceHeight = backgroundImage.naturalHeight;

    if (imageRatio > viewportRatio) {
      sourceWidth = sourceHeight * viewportRatio;
      sourceX = (backgroundImage.naturalWidth - sourceWidth) * 0.5;
    } else {
      sourceHeight = sourceWidth / viewportRatio;
      sourceY = (backgroundImage.naturalHeight - sourceHeight) * 0.5;
    }

    const parallaxX = pointer.x * 0.5;
    const parallaxY = pointer.y * 0.5;

    ctx.drawImage(
      backgroundImage,
      sourceX,
      sourceY,
      sourceWidth,
      sourceHeight,
      -18 + parallaxX,
      -14 + parallaxY,
      width + 36,
      height + 28
    );

    const vignette = ctx.createRadialGradient(width * 0.5, height * 0.48, 0, width * 0.5, height * 0.48, Math.max(width, height) * 0.78);
    vignette.addColorStop(0, "rgba(1, 1, 5, 0.04)");
    vignette.addColorStop(0.58, "rgba(1, 1, 5, 0.12)");
    vignette.addColorStop(1, "rgba(1, 1, 5, 0.44)");
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, width, height);

    return true;
  }

  function fillBackground() {
    if (drawImageBackground()) {
      return true;
    }

    const base = ctx.createLinearGradient(0, 0, width, height);
    base.addColorStop(0, "#030617");
    base.addColorStop(0.38, "#060725");
    base.addColorStop(0.72, "#080319");
    base.addColorStop(1, "#010105");
    ctx.fillStyle = base;
    ctx.fillRect(0, 0, width, height);

    const deepBlue = ctx.createRadialGradient(width * 0.46, height * 0.45, 0, width * 0.46, height * 0.45, Math.max(width, height) * 0.78);
    deepBlue.addColorStop(0, "rgba(80, 129, 255, 0.2)");
    deepBlue.addColorStop(0.36, "rgba(93, 76, 219, 0.16)");
    deepBlue.addColorStop(0.72, "rgba(24, 31, 93, 0.08)");
    deepBlue.addColorStop(1, "rgba(2, 3, 10, 0)");
    ctx.fillStyle = deepBlue;
    ctx.fillRect(0, 0, width, height);

    const roseCorner = ctx.createRadialGradient(width * 0.94, height * 0.9, 0, width * 0.94, height * 0.9, Math.max(width, height) * 0.42);
    roseCorner.addColorStop(0, "rgba(255, 127, 181, 0.18)");
    roseCorner.addColorStop(0.46, "rgba(130, 75, 203, 0.1)");
    roseCorner.addColorStop(1, "rgba(2, 3, 10, 0)");
    ctx.fillStyle = roseCorner;
    ctx.fillRect(0, 0, width, height);

    return false;
  }

  function drawDistantSpace(time, intensity = 1) {
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.globalAlpha = intensity;
    ctx.translate(pointer.x * 0.08, pointer.y * 0.08);

    const nebulaClouds = [
      { x: 0.38, y: 0.46, rx: 0.3, ry: 0.86, rotation: -0.18, color: "89, 142, 255", alpha: 0.18 },
      { x: 0.52, y: 0.42, rx: 0.22, ry: 0.72, rotation: 0.3, color: "176, 126, 255", alpha: 0.13 },
      { x: 0.76, y: 0.78, rx: 0.28, ry: 0.42, rotation: -0.42, color: "255, 124, 190", alpha: 0.11 },
      { x: 0.24, y: 0.2, rx: 0.24, ry: 0.42, rotation: 0.5, color: "92, 234, 255", alpha: 0.08 }
    ];

    for (const cloud of nebulaClouds) {
      const rx = Math.max(width, height) * cloud.rx;
      const ry = Math.max(width, height) * cloud.ry;

      ctx.save();
      ctx.translate(width * cloud.x, height * cloud.y);
      ctx.rotate(cloud.rotation + Math.sin(time * 0.012 + cloud.x * 10) * 0.035);
      ctx.scale(1, ry / rx);

      const cloudGlow = ctx.createRadialGradient(0, 0, 0, 0, 0, rx);
      cloudGlow.addColorStop(0, `rgba(255, 255, 255, ${cloud.alpha * 0.24})`);
      cloudGlow.addColorStop(0.18, `rgba(${cloud.color}, ${cloud.alpha})`);
      cloudGlow.addColorStop(0.52, `rgba(${cloud.color}, ${cloud.alpha * 0.46})`);
      cloudGlow.addColorStop(1, "rgba(255, 255, 255, 0)");
      ctx.fillStyle = cloudGlow;
      ctx.beginPath();
      ctx.arc(0, 0, rx, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    for (const galaxy of distantGalaxies) {
      const floatX = Math.sin(time * 0.018 + galaxy.phase) * galaxy.float;
      const floatY = Math.cos(time * 0.014 + galaxy.phase) * galaxy.float * 0.36;

      ctx.save();
      ctx.translate(galaxy.x + floatX, galaxy.y + floatY);
      ctx.rotate(galaxy.rotation + Math.sin(time * 0.01 + galaxy.phase) * 0.025);
      ctx.scale(1, galaxy.flatten);

      const halo = ctx.createRadialGradient(0, 0, 0, 0, 0, galaxy.radius * 1.78);
      halo.addColorStop(0, `rgba(255, 248, 255, ${0.2 * galaxy.alpha})`);
      halo.addColorStop(0.22, `rgba(${galaxy.rim}, ${0.22 * galaxy.alpha})`);
      halo.addColorStop(0.46, `rgba(${galaxy.primary}, ${0.24 * galaxy.alpha})`);
      halo.addColorStop(0.72, `rgba(${galaxy.accent}, ${0.14 * galaxy.alpha})`);
      halo.addColorStop(1, "rgba(255, 255, 255, 0)");
      ctx.fillStyle = halo;
      ctx.beginPath();
      ctx.arc(0, 0, galaxy.radius * 1.78, 0, Math.PI * 2);
      ctx.fill();

      const core = ctx.createRadialGradient(0, 0, 0, 0, 0, galaxy.radius * 0.42);
      core.addColorStop(0, `rgba(255, 250, 245, ${0.62 * galaxy.alpha})`);
      core.addColorStop(0.32, `rgba(${galaxy.rim}, ${0.42 * galaxy.alpha})`);
      core.addColorStop(0.7, `rgba(${galaxy.primary}, ${0.22 * galaxy.alpha})`);
      core.addColorStop(1, "rgba(255, 255, 255, 0)");
      ctx.fillStyle = core;
      ctx.beginPath();
      ctx.arc(0, 0, galaxy.radius * 0.42, 0, Math.PI * 2);
      ctx.fill();

      ctx.lineCap = "round";
      for (let arm = 0; arm < galaxy.arms; arm++) {
        const armBase = (arm / galaxy.arms) * Math.PI * 2 + time * 0.006;
        const armColors = [galaxy.primary, galaxy.accent, galaxy.rim];

        for (let pass = 0; pass < 4; pass++) {
          ctx.beginPath();
          for (let step = 0; step <= 118; step++) {
            const progress = step / 118;
            const orbit = galaxy.radius * (0.08 + progress * 1.24);
            const angle = armBase + progress * (5.2 + pass * 0.3);
            const wobble = Math.sin(progress * Math.PI * 4.8 + galaxy.phase + pass) * galaxy.radius * (0.024 + pass * 0.006);
            const x = Math.cos(angle) * orbit + Math.cos(angle + Math.PI * 0.5) * wobble;
            const y = Math.sin(angle) * orbit + Math.sin(angle + Math.PI * 0.5) * wobble;

            if (step === 0) {
              ctx.moveTo(x, y);
            } else {
              ctx.lineTo(x, y);
            }
          }

          const color = armColors[(arm + pass) % armColors.length];
          ctx.strokeStyle = `rgba(${color}, ${(0.09 - pass * 0.014) * galaxy.alpha})`;
          ctx.lineWidth = Math.max(0.8, galaxy.radius * (0.032 - pass * 0.005));
          ctx.shadowColor = `rgba(${color}, ${0.16 * galaxy.alpha})`;
          ctx.shadowBlur = galaxy.radius * (0.08 - pass * 0.012);
          ctx.stroke();
        }
      }

      ctx.shadowBlur = 0;

      for (const mote of galaxy.motes) {
        const orbit = mote.orbit * galaxy.radius;
        const angle =
          (mote.arm / galaxy.arms) * Math.PI * 2 +
          mote.angle +
          mote.orbit * mote.twist +
          time * mote.speed;
        const spread = mote.spread * galaxy.radius * (0.45 + mote.orbit);
        const x = Math.cos(angle) * orbit + Math.cos(angle + Math.PI * 0.5) * spread;
        const y = Math.sin(angle) * orbit + Math.sin(angle + Math.PI * 0.5) * spread;
        const fade = 1 - Math.pow(Math.abs(mote.orbit - 0.48), 1.4);

        ctx.fillStyle = `rgba(${mote.tint}, ${clamp(mote.alpha * galaxy.alpha * fade, 0.025, 0.24)})`;
        ctx.beginPath();
        ctx.arc(x, y, mote.size * (0.6 + mote.orbit * 0.55), 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
    }

    for (const star of distantStars) {
      const x = star.x * width + Math.sin(time * 0.035 + star.phase) * star.drift;
      const y = star.y * height + Math.cos(time * 0.028 + star.phase) * star.drift * 0.42;
      const twinkle = 0.74 + Math.sin(time * 1.15 + star.phase) * 0.24;
      const alpha = clamp(star.alpha * twinkle, 0.06, 0.78);

      if (star.flare) {
        const glow = star.flareSize * (0.8 + Math.sin(time * 0.7 + star.phase) * 0.16);
        const gradient = ctx.createRadialGradient(x, y, 0, x, y, glow);
        gradient.addColorStop(0, `rgba(255, 255, 255, ${alpha})`);
        gradient.addColorStop(0.22, `rgba(${star.tint}, ${alpha * 0.34})`);
        gradient.addColorStop(1, "rgba(255, 255, 255, 0)");
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(x, y, glow, 0, Math.PI * 2);
        ctx.fill();

        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(star.phase);
        ctx.strokeStyle = `rgba(255, 255, 255, ${alpha * 0.62})`;
        ctx.lineWidth = Math.max(0.6, star.size * 0.7);
        ctx.shadowColor = `rgba(${star.tint}, ${alpha * 0.45})`;
        ctx.shadowBlur = glow * 0.45;
        ctx.beginPath();
        ctx.moveTo(-glow * 1.1, 0);
        ctx.lineTo(glow * 1.1, 0);
        ctx.moveTo(0, -glow * 0.62);
        ctx.lineTo(0, glow * 0.62);
        ctx.stroke();
        ctx.restore();
      }

      ctx.fillStyle = `rgba(${star.tint}, ${alpha})`;
      ctx.beginPath();
      ctx.arc(x, y, star.size, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  function drawGalaxyBand(time, intensity = 1) {
    const layout = getGalaxyLayout();

    ctx.save();
    ctx.globalAlpha = intensity;
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
    ctx.globalAlpha = intensity;
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

  function drawStars(time, intensity = 1) {
    const layout = getGalaxyLayout();

    ctx.save();
    ctx.globalAlpha = intensity;
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
    ctx.globalCompositeOperation = "source-over";
    const pulse = 1 + Math.sin(time * 2.2) * 0.06;
    const flare = 0.5 + Math.sin(time * 0.86 + 0.7) * 0.5;

    const halo = ctx.createRadialGradient(x, y, 0, x, y, radius * (2.7 * pulse));
    halo.addColorStop(0, "rgba(255, 248, 220, 0.38)");
    halo.addColorStop(0.2, "rgba(255, 203, 104, 0.18)");
    halo.addColorStop(0.48, "rgba(255, 133, 58, 0.07)");
    halo.addColorStop(0.76, "rgba(255, 95, 48, 0.025)");
    halo.addColorStop(1, "rgba(243, 93, 45, 0)");
    ctx.fillStyle = halo;
    ctx.beginPath();
    ctx.arc(x, y, radius * (2.7 * pulse), 0, Math.PI * 2);
    ctx.fill();

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(time * 0.12);
    ctx.strokeStyle = "rgba(255, 232, 192, 0.18)";
    ctx.lineWidth = Math.max(1, radius * 0.04);
    for (let index = 0; index < 8; index++) {
      const angle = (index / 8) * Math.PI * 2;
      const inner = radius * (0.76 + flare * 0.06);
      const outer = radius * (1.8 + flare * 0.22);
      ctx.beginPath();
      ctx.moveTo(Math.cos(angle) * inner, Math.sin(angle) * inner);
      ctx.lineTo(Math.cos(angle) * outer, Math.sin(angle) * outer);
      ctx.stroke();
    }
    ctx.restore();

    const core = ctx.createRadialGradient(x - radius * 0.22, y - radius * 0.26, 0, x, y, radius * 1.08);
    core.addColorStop(0, "rgba(255, 251, 238, 0.96)");
    core.addColorStop(0.18, "rgba(255, 235, 180, 0.92)");
    core.addColorStop(0.42, "rgba(255, 198, 92, 0.86)");
    core.addColorStop(0.72, "rgba(255, 129, 52, 0.62)");
    core.addColorStop(1, "rgba(82, 27, 27, 0.38)");
    ctx.fillStyle = core;
    ctx.beginPath();
    ctx.arc(x, y, radius * 1.02, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = "rgba(255, 244, 205, 0.24)";
    ctx.lineWidth = Math.max(1, radius * 0.03);
    ctx.beginPath();
    ctx.arc(x, y, radius * (1.28 + flare * 0.08), time * 0.3, Math.PI * 1.4 + time * 0.3);
    ctx.stroke();

    ctx.restore();
  }

  function drawPlanet(x, y, planet, scale, time, options = {}) {
    const size = options.sizeOverride ?? clamp(planet.size * scale * 2, 14, 64);
    const lightSource = options.lightSource || { x: x - size, y: y - size };
    const lightDistance = Math.max(1, Math.hypot(lightSource.x - x, lightSource.y - y));
    const lightX = (lightSource.x - x) / lightDistance;
    const lightY = (lightSource.y - y) / lightDistance;

    ctx.save();
    ctx.globalCompositeOperation = "lighter";

    const ringRotation = -0.38 + Math.sin(time * 0.2) * 0.05;
    const moons = options.drawMoons === false ? [] : planet.moons || [];
    const drawRings = options.drawRings !== false;
    const planetAlpha = options.planetAlpha ?? 0.82;
    const accessoryAlpha = options.accessoryAlpha ?? 0.92;
    const glowTint = planet.glow || "204, 176, 255";

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
    glow.addColorStop(0.3, `rgba(${glowTint}, 0.15)`);
    glow.addColorStop(1, "rgba(255, 255, 255, 0)");
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(x, y, size * 2.45, 0, Math.PI * 2);
    ctx.fill();

    if (planet.detail === "aurora") {
      const auroraGlow = ctx.createRadialGradient(x, y, size * 0.55, x, y, size * 2.8);
      auroraGlow.addColorStop(0, "rgba(84, 196, 255, 0)");
      auroraGlow.addColorStop(0.48, "rgba(84, 196, 255, 0.2)");
      auroraGlow.addColorStop(0.72, "rgba(60, 116, 255, 0.12)");
      auroraGlow.addColorStop(1, "rgba(48, 120, 255, 0)");
      ctx.fillStyle = auroraGlow;
      ctx.beginPath();
      ctx.arc(x, y, size * 2.8, 0, Math.PI * 2);
      ctx.fill();
    }

    if (planet.ring && drawRings) {
      if (planet.ringStyle === "silverWide") {
        ctx.strokeStyle = "rgba(235, 247, 255, 0.56)";
        ctx.lineWidth = Math.max(3.8, size * 0.15);
        ctx.beginPath();
        ctx.ellipse(x, y, size * 3.05, size * 0.78, ringRotation, 0, Math.PI * 2);
        ctx.stroke();

        ctx.strokeStyle = "rgba(139, 182, 211, 0.36)";
        ctx.lineWidth = Math.max(1.2, size * 0.04);
        ctx.beginPath();
        ctx.ellipse(x, y, size * 2.38, size * 0.6, ringRotation, 0, Math.PI * 2);
        ctx.stroke();

        ctx.strokeStyle = "rgba(255, 255, 255, 0.28)";
        ctx.lineWidth = Math.max(0.9, size * 0.022);
        ctx.beginPath();
        ctx.ellipse(x, y, size * 3.44, size * 0.88, ringRotation, 0, Math.PI * 2);
        ctx.stroke();
      } else {
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
    }

    ctx.globalCompositeOperation = "source-over";
    const shade = ctx.createRadialGradient(
      x + lightX * size * 0.42,
      y + lightY * size * 0.42,
      0,
      x - lightX * size * 0.34,
      y - lightY * size * 0.34,
      size * 1.18
    );
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

    if (!["ocean", "lava", "purpleIce", "ringedCyan", "aurora"].includes(planet.detail)) {
      ctx.strokeStyle = "rgba(255, 255, 255, 0.1)";
      ctx.lineWidth = Math.max(0.55, size * 0.014);
      for (let i = -6; i <= 6; i++) {
        ctx.beginPath();
        ctx.ellipse(Math.sin(i * 1.7) * size * 0.06, i * size * 0.13, size * 0.9, size * 0.035, 0.08 * Math.sin(i), 0, Math.PI * 2);
        ctx.stroke();
      }
    }

    function drawCrack(points) {
      ctx.beginPath();
      ctx.moveTo(points[0][0] * size, points[0][1] * size);
      for (let i = 1; i < points.length; i++) {
        ctx.lineTo(points[i][0] * size, points[i][1] * size);
      }
      ctx.stroke();
    }

    if (planet.detail === "lava") {
      const heat = ctx.createRadialGradient(size * 0.12, size * 0.08, 0, size * 0.12, size * 0.08, size * 0.95);
      heat.addColorStop(0, "rgba(255, 155, 42, 0.34)");
      heat.addColorStop(0.52, "rgba(151, 42, 21, 0.12)");
      heat.addColorStop(1, "rgba(35, 8, 7, 0.18)");
      ctx.fillStyle = heat;
      ctx.beginPath();
      ctx.arc(0, 0, size, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = "rgba(255, 88, 24, 0.76)";
      ctx.shadowColor = "rgba(255, 98, 18, 0.72)";
      ctx.shadowBlur = size * 0.1;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      for (const fissure of [
        [[-0.7, -0.12], [-0.42, -0.24], [-0.12, -0.08], [0.1, -0.18], [0.48, -0.06], [0.74, -0.18]],
        [[-0.48, 0.34], [-0.24, 0.18], [0.02, 0.3], [0.28, 0.14], [0.56, 0.28]],
        [[-0.1, -0.62], [-0.18, -0.36], [-0.04, -0.18], [-0.12, 0.08], [0.04, 0.36], [-0.02, 0.62]]
      ]) {
        ctx.lineWidth = Math.max(1.2, size * 0.052);
        drawCrack(fissure);
        ctx.strokeStyle = "rgba(255, 222, 109, 0.92)";
        ctx.lineWidth = Math.max(0.65, size * 0.022);
        drawCrack(fissure);
        ctx.strokeStyle = "rgba(255, 88, 24, 0.76)";
      }
      ctx.shadowBlur = 0;

      ctx.fillStyle = "rgba(54, 13, 10, 0.4)";
      for (const rock of [[-0.34, 0.12, 0.12], [0.38, -0.34, 0.09], [0.42, 0.42, 0.07]]) {
        ctx.beginPath();
        ctx.arc(rock[0] * size, rock[1] * size, rock[2] * size, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (planet.detail === "ocean") {
      ctx.fillStyle = "rgba(28, 181, 138, 0.54)";
      for (const land of [[-0.3, -0.14, 0.35, 0.15, -0.36], [0.26, 0.2, 0.3, 0.13, 0.42], [0.02, -0.4, 0.18, 0.08, 0.2]]) {
        ctx.beginPath();
        ctx.ellipse(land[0] * size, land[1] * size, land[2] * size, land[3] * size, land[4], 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.strokeStyle = "rgba(241, 253, 255, 0.54)";
      ctx.lineWidth = Math.max(1, size * 0.034);
      ctx.lineCap = "round";
      for (let i = -3; i <= 3; i++) {
        ctx.beginPath();
        ctx.ellipse(Math.sin(i * 1.2) * size * 0.08, i * size * 0.19, size * 0.82, size * 0.026, -0.2 + i * 0.025, 0.08, Math.PI * 1.04);
        ctx.stroke();
      }

      ctx.strokeStyle = "rgba(255, 255, 255, 0.32)";
      ctx.lineWidth = Math.max(0.7, size * 0.018);
      for (const cloud of [[-0.46, 0.28, 0.18, 0.035], [0.34, -0.08, 0.22, 0.04], [-0.05, 0.48, 0.18, 0.032]]) {
        ctx.beginPath();
        ctx.ellipse(cloud[0] * size, cloud[1] * size, cloud[2] * size, cloud[3] * size, -0.18, 0, Math.PI * 2);
        ctx.stroke();
      }
    } else if (planet.detail === "purpleIce") {
      ctx.fillStyle = "rgba(239, 231, 255, 0.34)";
      ctx.beginPath();
      ctx.ellipse(0, -size * 0.56, size * 0.72, size * 0.18, -0.04, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = "rgba(64, 31, 122, 0.22)";
      for (const sheet of [[-0.28, -0.12, 0.42, 0.09, -0.12], [0.24, 0.24, 0.46, 0.11, 0.16], [0.04, 0.48, 0.36, 0.07, -0.24]]) {
        ctx.beginPath();
        ctx.ellipse(sheet[0] * size, sheet[1] * size, sheet[2] * size, sheet[3] * size, sheet[4], 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.strokeStyle = "rgba(216, 248, 255, 0.86)";
      ctx.shadowColor = "rgba(182, 236, 255, 0.72)";
      ctx.shadowBlur = size * 0.08;
      ctx.lineWidth = Math.max(1, size * 0.028);
      const cracks = [
        [[-0.58, -0.06], [-0.34, -0.14], [-0.14, -0.05], [0.06, -0.16], [0.34, -0.1], [0.58, -0.24]],
        [[-0.38, 0.32], [-0.16, 0.22], [0.08, 0.3], [0.24, 0.18], [0.52, 0.24]],
        [[0.18, -0.46], [0.06, -0.28], [0.18, -0.1], [0.08, 0.08], [0.2, 0.28]]
      ];
      for (const crack of cracks) {
        drawCrack(crack);
      }

      ctx.strokeStyle = "rgba(255, 255, 255, 0.58)";
      ctx.lineWidth = Math.max(0.45, size * 0.01);
      for (const branch of [[-0.14, -0.05, -0.24, 0.1], [0.24, 0.18, 0.3, 0.34], [0.18, -0.1, 0.36, -0.22], [0.06, -0.16, -0.08, -0.28]]) {
        ctx.beginPath();
        ctx.moveTo(branch[0] * size, branch[1] * size);
        ctx.lineTo(branch[2] * size, branch[3] * size);
        ctx.stroke();
      }
      ctx.shadowBlur = 0;
    } else if (planet.detail === "giant" || planet.detail === "ringedCyan") {
      const bands = planet.detail === "giant"
        ? ["rgba(255, 238, 190, 0.42)", "rgba(115, 78, 36, 0.32)", "rgba(225, 159, 74, 0.34)", "rgba(247, 208, 126, 0.28)"]
        : ["rgba(235, 255, 255, 0.34)", "rgba(23, 109, 135, 0.24)", "rgba(88, 220, 230, 0.26)"];
      for (let i = -8; i <= 8; i++) {
        ctx.strokeStyle = bands[Math.abs(i) % bands.length];
        ctx.lineWidth = Math.max(0.9, size * (i % 2 === 0 ? 0.058 : 0.032));
        ctx.beginPath();
        ctx.ellipse(Math.sin(i) * size * 0.05, i * size * 0.096, size * 1.08, size * 0.03, 0.018 * i, 0, Math.PI * 2);
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
    } else if (planet.detail === "aurora") {
      ctx.fillStyle = "rgba(9, 12, 18, 0.44)";
      for (const shadow of [[-0.34, -0.16, 0.34, 0.14, -0.3], [0.28, 0.3, 0.38, 0.16, 0.24]]) {
        ctx.beginPath();
        ctx.ellipse(shadow[0] * size, shadow[1] * size, shadow[2] * size, shadow[3] * size, shadow[4], 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.strokeStyle = "rgba(89, 203, 255, 0.82)";
      ctx.shadowColor = "rgba(53, 173, 255, 0.86)";
      ctx.shadowBlur = size * 0.12;
      ctx.lineCap = "round";
      for (let i = 0; i < 4; i++) {
        const yOffset = -size * (0.42 - i * 0.06);
        ctx.lineWidth = Math.max(0.7, size * (0.018 - i * 0.002));
        ctx.beginPath();
        ctx.ellipse(Math.sin(time * 0.8 + i) * size * 0.05, yOffset, size * (0.44 - i * 0.04), size * (0.08 + i * 0.01), 0.18, Math.PI * 0.04, Math.PI * 0.96);
        ctx.stroke();
      }
      ctx.strokeStyle = "rgba(107, 118, 136, 0.3)";
      ctx.shadowBlur = 0;
      ctx.lineWidth = Math.max(0.55, size * 0.012);
      for (let i = -3; i <= 3; i++) {
        ctx.beginPath();
        ctx.ellipse(Math.sin(i) * size * 0.05, i * size * 0.16, size * 0.78, size * 0.018, -0.08, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
    ctx.restore();

    const night = ctx.createRadialGradient(
      x + lightX * size * 0.24,
      y + lightY * size * 0.24,
      size * 0.2,
      x - lightX * size * 0.46,
      y - lightY * size * 0.46,
      size * 1.2
    );
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
      if (planet.ringStyle === "silverWide") {
        ctx.strokeStyle = "rgba(246, 253, 255, 0.84)";
        ctx.lineWidth = Math.max(3.2, size * 0.12);
        ctx.beginPath();
        ctx.ellipse(x, y, size * 3.05, size * 0.78, ringRotation, 0.06, Math.PI - 0.06);
        ctx.stroke();

        ctx.strokeStyle = "rgba(161, 204, 229, 0.5)";
        ctx.lineWidth = Math.max(0.9, size * 0.03);
        ctx.beginPath();
        ctx.ellipse(x, y, size * 2.38, size * 0.6, ringRotation, 0.06, Math.PI - 0.06);
        ctx.stroke();
      } else {
        ctx.strokeStyle = "rgba(255, 236, 184, 0.76)";
        ctx.lineWidth = Math.max(2, size * 0.065);
        ctx.beginPath();
        ctx.ellipse(x, y, size * 2.28, size * 0.66, ringRotation, 0.06, Math.PI - 0.06);
        ctx.stroke();
      }
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
    const usingImageBackground = fillBackground();
    const depthIntensity = usingImageBackground ? 0.46 : 1;
    const bandIntensity = usingImageBackground ? 0.62 : 1;
    const starIntensity = usingImageBackground ? 0.78 : 1;

    drawDistantSpace(time, depthIntensity);
    drawGalaxyBand(time, bandIntensity);
    drawStars(time, starIntensity);
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

  function drawAsteroidBelt(sunX, sunY, maxOrbit, tilt, time, compact) {
    const flatten = compact ? 0.38 : 0.31;

    ctx.save();
    ctx.translate(sunX, sunY);
    ctx.rotate(tilt);
    ctx.globalCompositeOperation = "lighter";
    ctx.strokeStyle = "rgba(176, 210, 255, 0.07)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.ellipse(0, 0, maxOrbit * 0.75, maxOrbit * 0.75 * flatten, 0, 0, Math.PI * 2);
    ctx.stroke();

    for (const asteroid of asteroids) {
      const orbit = maxOrbit * (asteroid.orbit + Math.sin(time * 0.2 + asteroid.phase) * asteroid.wobble);
      const angle = asteroid.angle + time * asteroid.speed;
      const x = Math.cos(angle) * orbit;
      const y = Math.sin(angle) * orbit * flatten;
      const depth = 0.78 + Math.sin(angle) * 0.22;
      const size = asteroid.size * depth;

      ctx.fillStyle = `rgba(${asteroid.tint}, ${asteroid.alpha * depth})`;
      ctx.beginPath();
      ctx.ellipse(x, y, size * 1.7, size, angle * 0.4, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  function drawSolarSystem(time, options = {}) {
    const compact = width < 720;
    const scale = clamp(Math.min(width / 1180, height / 760), 0.72, 1.2);
    const sunX = width * 0.5;
    const sunY = height * 0.5;
    const sunRadius = clamp(50 * scale, 34, 62);
    const maxOrbit = clamp(Math.min(width * 0.5, height * 0.74), 260, 650) * scale;
    const tilt = compact ? -0.16 : -0.26;
    const updateTargets = options.updateTargets !== false;
    const nextPlanetTargets = [];

    ctx.save();
    ctx.translate(sunX, sunY);
    ctx.rotate(tilt);
    ctx.globalCompositeOperation = "lighter";
    ctx.lineWidth = 1;

    for (let index = 0; index < planets.length; index++) {
      const planet = planets[index];
      const rx = maxOrbit * planet.orbit;
      const ry = rx * (compact ? 0.38 : 0.31);
      const arcStart = time * (0.1 + index * 0.012) + index * 0.58;

      ctx.shadowBlur = 0;
      ctx.strokeStyle = "rgba(231, 214, 255, 0.12)";
      ctx.beginPath();
      ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
      ctx.stroke();

      ctx.strokeStyle = `rgba(${planet.glow || "170, 210, 255"}, 0.38)`;
      ctx.shadowColor = `rgba(${planet.glow || "170, 210, 255"}, 0.45)`;
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.ellipse(0, 0, rx, ry, 0, arcStart, arcStart + Math.PI * 0.24);
      ctx.stroke();
    }
    ctx.restore();

    drawAsteroidBelt(sunX, sunY, maxOrbit, tilt, time, compact);
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
      drawPlanet(x, y, planet, planetScale, time, { lightSource: { x: sunX, y: sunY } });

      if (hoverPlanetId === planet.pageId && !zoomTransition) {
        ctx.save();
        ctx.globalCompositeOperation = "lighter";
        ctx.strokeStyle = `rgba(${planet.glow || "170, 210, 255"}, 0.72)`;
        ctx.lineWidth = 1;
        ctx.shadowColor = `rgba(${planet.glow || "170, 210, 255"}, 0.78)`;
        ctx.shadowBlur = 14;
        ctx.beginPath();
        ctx.arc(x, y, clamp(planet.size * planetScale * 2, 14, 64) * 1.32, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }

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
    pointer.x += (pointer.targetX - pointer.x) * 0.07;
    pointer.y += (pointer.targetY - pointer.y) * 0.07;

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

  hero?.addEventListener("pointermove", updatePointerParallax);
  hero?.addEventListener("pointerleave", () => {
    hoverPlanetId = null;
    resetPointerParallax();
  });

  canvas.addEventListener("pointermove", (event) => {
    if (zoomTransition || hero?.classList.contains("is-hidden")) return;

    const target = getHitPlanet(getCanvasPoint(event));
    hoverPlanetId = target?.pageId || null;
    canvas.style.cursor = target ? "pointer" : "default";
  });

  canvas.addEventListener("pointerleave", () => {
    hoverPlanetId = null;
    canvas.style.cursor = "default";
  });

  canvas.addEventListener("click", (event) => {
    const target = getHitPlanet(getCanvasPoint(event));
    if (target) {
      startPlanetTransition(target);
    }
  });

  for (const link of planetJumpLinks) {
    link.addEventListener("pointerenter", () => {
      hoverPlanetId = link.dataset.planetJump || null;
    });

    link.addEventListener("pointerleave", () => {
      hoverPlanetId = null;
    });

    link.addEventListener("click", (event) => {
      const pageId = link.dataset.planetJump;
      const target = getPlanetTarget(pageId);

      if (!target || reducedMotion || zoomTransition || hero?.classList.contains("is-hidden")) {
        return;
      }

      event.preventDefault();
      startPlanetTransition(target);
    });
  }

  window.addEventListener("hashchange", updateRoute);
  rebuildScene();
  updateRoute();
  start();
}

initGalaxyHero();

const uploadSlots = [
  "portrait",
  "mark",
  "work-one",
  "work-two",
  "work-three"
];

const fallbackImages = {
  hero: "/assets/hero-bg.png",
  portrait: "/assets/portrait-placeholder.png",
  mark: "/assets/mark-placeholder.png",
  "work-one": "/assets/work-one.png",
  "work-two": "/assets/work-two.png",
  "work-three": "/assets/work-three.png"
};

const state = {
  authenticated: false,
  assets: {},
  activeSlot: null,
  loginOpen: false
};

const el = {};

function $(selector, root = document) {
  return root.querySelector(selector);
}

function $all(selector, root = document) {
  return Array.from(root.querySelectorAll(selector));
}

function setHidden(node, hidden) {
  if (!node) return;
  node.classList.toggle("hidden", hidden);
}

function setNotice(message) {
  const toast = el.toast;
  if (!message) {
    setHidden(toast, true);
    toast.textContent = "";
    return;
  }

  toast.textContent = message;
  setHidden(toast, false);

  window.clearTimeout(setNotice.timer);
  setNotice.timer = window.setTimeout(() => {
    setHidden(toast, true);
    toast.textContent = "";
  }, 2400);
}

function updateHeader() {
  el.stateLabel.textContent = state.authenticated
    ? "编辑模式 / 已登录"
    : "私人展示 / 未登录";
  el.authLabel.textContent = state.authenticated ? "退出" : "登录";
  el.authButton.setAttribute(
    "aria-label",
    state.authenticated ? "退出登录" : "登录"
  );
  el.authButton.dataset.mode = state.authenticated ? "logout" : "login";
}

function updateUploadZone(button, slot) {
  const overlay = button.querySelector("[data-overlay]");
  const image = button.querySelector("img");
  const asset = state.assets[slot];
  const src = asset?.url || fallbackImages[slot];

  image.src = src;
  image.alt = button.getAttribute("aria-label") || slot;
  button.disabled = !state.authenticated;
  setHidden(overlay, !state.authenticated);
}

function renderAssets() {
  uploadSlots.forEach((slot) => {
    const button = document.getElementById(`slot-${slot}`);
    if (!button) return;
    updateUploadZone(button, slot);
  });
}

function openLogin() {
  state.loginOpen = true;
  setHidden(el.loginModal, false);
  el.loginModal.setAttribute("aria-hidden", "false");
  setHidden(el.loginError, true);
  el.loginForm.reset();
  el.emailInput.value = "1403608175@qq.com";
  el.passwordInput.focus();
}

function closeLogin() {
  state.loginOpen = false;
  setHidden(el.loginModal, true);
  el.loginModal.setAttribute("aria-hidden", "true");
  setHidden(el.loginError, true);
}

async function loadState() {
  const [sessionResponse, assetsResponse] = await Promise.all([
    fetch("/api/session", { cache: "no-store" }),
    fetch("/api/assets", { cache: "no-store" })
  ]);

  if (sessionResponse.ok) {
    const session = await sessionResponse.json();
    state.authenticated = Boolean(session.authenticated);
  }

  if (assetsResponse.ok) {
    const payload = await assetsResponse.json();
    state.assets = payload.assets || {};
  }

  updateHeader();
  renderAssets();
}

async function handleLogin(event) {
  event.preventDefault();
  el.loginSubmit.disabled = true;
  el.loginButtonLabel.textContent = "进入中";
  setHidden(el.loginError, true);

  try {
    const response = await fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: el.emailInput.value,
        password: el.passwordInput.value
      })
    });

    if (!response.ok) {
      setHidden(el.loginError, false);
      return;
    }

    state.authenticated = true;
    updateHeader();
    renderAssets();
    closeLogin();
    setNotice("已登录");
  } finally {
    el.loginSubmit.disabled = false;
    el.loginButtonLabel.textContent = "进入";
  }
}

async function handleLogout() {
  await fetch("/api/logout", { method: "POST" });
  state.authenticated = false;
  updateHeader();
  renderAssets();
  setNotice("已退出");
}

async function handleUploadFile(file) {
  if (!file || !state.activeSlot || !state.authenticated) {
    return;
  }

  const slot = state.activeSlot;
  const button = document.getElementById(`slot-${slot}`);
  if (!button) return;

  const overlayText = button.querySelector("[data-overlay-text]");
  const overlay = button.querySelector("[data-overlay]");
  const previousText = overlayText.textContent;
  overlayText.textContent = "上传中";
  button.disabled = true;

  try {
    const response = await fetch(`/api/upload?slot=${encodeURIComponent(slot)}`, {
      method: "POST",
      headers: {
        "Content-Type": file.type || "application/octet-stream",
        "X-File-Name": file.name || "upload"
      },
      body: file
    });

    if (response.status === 401) {
      state.authenticated = false;
      updateHeader();
      renderAssets();
      setNotice("登录已过期");
      return;
    }

    if (!response.ok) {
      setNotice("上传失败");
      return;
    }

    const payload = await response.json();
    state.assets[slot] = payload.asset;
    renderAssets();
    setNotice("已更新");
  } finally {
    state.activeSlot = null;
    overlayText.textContent = previousText;
    if (state.authenticated) {
      button.disabled = false;
      setHidden(overlay, false);
    }
  }
}

function initGalaxyHero() {
  const canvas = $("#galaxyHero");
  if (!canvas) return;

  const ctx = canvas.getContext("2d", { alpha: false });
  if (!ctx) return;

  const hero = canvas.closest(".heroSection");
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const galaxyArmCount = 5;
  const planets = [
    { orbit: 0.18, size: 4.2, speed: 0.58, color: "#b8c2cc" },
    { orbit: 0.27, size: 5.4, speed: 0.42, color: "#d6a76b" },
    { orbit: 0.38, size: 6.8, speed: 0.31, color: "#63a3ff" },
    { orbit: 0.5, size: 5.8, speed: 0.24, color: "#d46d52" },
    { orbit: 0.66, size: 13.5, speed: 0.14, color: "#d6b083" },
    { orbit: 0.82, size: 11.5, speed: 0.105, color: "#d8c18d", ring: true },
    { orbit: 0.96, size: 8.6, speed: 0.078, color: "#85cfd6" },
    { orbit: 1.08, size: 8.2, speed: 0.058, color: "#7c8dff" }
  ];

  let width = 1;
  let height = 1;
  let dpr = 1;
  let stars = [];
  let flashStars = [];
  let dust = [];
  let animationFrame = 0;
  const pointer = { x: 0, y: 0 };

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function random(min, max) {
    return min + Math.random() * (max - min);
  }

  function getGalaxyLayout() {
    const compact = width < 720;
    const radius = clamp(Math.min(width * 0.58, height * 0.92), 330, 760);

    return {
      x: width * (compact ? 0.66 : 0.62) + pointer.x * 22,
      y: height * (compact ? 0.34 : 0.39) + pointer.y * 14,
      radius,
      tilt: compact ? -0.18 : -0.26,
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
      tint: Math.random() > 0.7 ? "238, 214, 255" : Math.random() > 0.38 ? "198, 178, 255" : "255, 248, 255"
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
    base.addColorStop(0, "#05030c");
    base.addColorStop(0.48, "#120727");
    base.addColorStop(1, "#03020a");
    ctx.fillStyle = base;
    ctx.fillRect(0, 0, width, height);

    const nebula = ctx.createRadialGradient(
      width * 0.76,
      height * 0.32,
      0,
      width * 0.76,
      height * 0.32,
      Math.max(width, height) * 0.9
    );
    nebula.addColorStop(0, "rgba(151, 82, 255, 0.24)");
    nebula.addColorStop(0.34, "rgba(215, 83, 255, 0.16)");
    nebula.addColorStop(0.68, "rgba(61, 25, 112, 0.1)");
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
    core.addColorStop(0, "#fff8d0");
    core.addColorStop(0.34, "#ffd166");
    core.addColorStop(0.76, "#ff8b3d");
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

  function drawPlanet(x, y, planet, scale, time) {
    const size = clamp(planet.size * scale, 4, 18);

    ctx.save();
    ctx.globalCompositeOperation = "lighter";

    const glow = ctx.createRadialGradient(x, y, 0, x, y, size * 2.7);
    glow.addColorStop(0, "rgba(255, 255, 255, 0.52)");
    glow.addColorStop(0.3, "rgba(204, 176, 255, 0.18)");
    glow.addColorStop(1, "rgba(255, 255, 255, 0)");
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(x, y, size * 2.7, 0, Math.PI * 2);
    ctx.fill();

    const shade = ctx.createRadialGradient(x - size * 0.35, y - size * 0.35, 0, x, y, size * 1.15);
    shade.addColorStop(0, "#ffffff");
    shade.addColorStop(0.28, planet.color);
    shade.addColorStop(1, "rgba(13, 20, 33, 0.88)");
    ctx.fillStyle = shade;
    ctx.beginPath();
    ctx.arc(x, y, size, 0, Math.PI * 2);
    ctx.fill();

    if (planet.ring) {
      ctx.strokeStyle = "rgba(255, 236, 184, 0.68)";
      ctx.lineWidth = Math.max(1, scale);
      ctx.beginPath();
      ctx.ellipse(x, y, size * 2.15, size * 0.62, -0.38 + Math.sin(time * 0.2) * 0.05, 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.restore();
  }

  function drawSolarSystem(time) {
    const compact = width < 720;
    const scale = clamp(Math.min(width / 1180, height / 760), 0.66, 1.08);
    const sunX = width * (compact ? 0.72 : 0.78) + pointer.x * 18;
    const sunY = height * (compact ? 0.27 : 0.34) + pointer.y * 12;
    const sunRadius = clamp(48 * scale, 34, 56);
    const maxOrbit = clamp(Math.min(width * 0.5, height * 0.74), 250, 590) * scale;
    const tilt = compact ? -0.18 : -0.29;

    ctx.save();
    ctx.translate(sunX, sunY);
    ctx.rotate(tilt);
    ctx.strokeStyle = "rgba(231, 214, 255, 0.18)";
    ctx.lineWidth = 1;

    for (const planet of planets) {
      const rx = maxOrbit * planet.orbit;
      const ry = rx * (compact ? 0.37 : 0.3);
      ctx.beginPath();
      ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();

    drawSun(sunX, sunY, sunRadius, time);

    for (let index = 0; index < planets.length; index++) {
      const planet = planets[index];
      const rx = maxOrbit * planet.orbit;
      const ry = rx * (compact ? 0.37 : 0.3);
      const angle = time * planet.speed + index * 0.82 + 0.9;
      const orbitX = Math.cos(angle) * rx;
      const orbitY = Math.sin(angle) * ry;
      const x = sunX + orbitX * Math.cos(tilt) - orbitY * Math.sin(tilt);
      const y = sunY + orbitX * Math.sin(tilt) + orbitY * Math.cos(tilt);
      const depthScale = 0.9 + Math.sin(angle) * 0.1;
      drawPlanet(x, y, planet, scale * depthScale, time);
    }
  }

  function draw(now) {
    const time = now * 0.001;
    fillBackground();
    drawGalaxyBand(time);
    drawStars(time);
    drawSolarSystem(time);
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

  hero?.addEventListener("pointermove", (event) => {
    const rect = hero.getBoundingClientRect();
    pointer.x = (event.clientX - rect.left) / rect.width - 0.5;
    pointer.y = (event.clientY - rect.top) / rect.height - 0.5;
  });

  hero?.addEventListener("pointerleave", () => {
    pointer.x = 0;
    pointer.y = 0;
  });

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      window.cancelAnimationFrame(animationFrame);
    } else {
      start();
    }
  });

  rebuildScene();
  start();
}

function init() {
  el.authButton = $("#authButton");
  el.authLabel = $("#authLabel");
  el.stateLabel = $("#stateLabel");
  el.loginModal = $("#loginModal");
  el.loginForm = $("#loginForm");
  el.closeLogin = $("#closeLogin");
  el.loginError = $("#loginError");
  el.loginSubmit = $("#loginSubmit");
  el.loginButtonLabel = $("#loginButtonLabel");
  el.fileInput = $("#fileInput");
  el.toast = $("#toast");
  el.emailInput = $("#emailInput");
  el.passwordInput = $("#passwordInput");

  el.authButton.addEventListener("click", () => {
    if (state.authenticated) {
      handleLogout();
    } else {
      openLogin();
    }
  });

  el.closeLogin.addEventListener("click", closeLogin);
  el.loginModal.addEventListener("click", (event) => {
    if (event.target === el.loginModal) {
      closeLogin();
    }
  });

  el.loginForm.addEventListener("submit", handleLogin);
  el.fileInput.addEventListener("change", async () => {
    const file = el.fileInput.files?.[0];
    el.fileInput.value = "";
    await handleUploadFile(file);
  });

  $all(".uploadZone").forEach((button) => {
    const slot = button.dataset.slot;
    button.addEventListener("click", () => {
      if (!state.authenticated) {
        return;
      }

      state.activeSlot = slot;
      el.fileInput.click();
    });
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && state.loginOpen) {
      closeLogin();
    }
  });
}

initGalaxyHero();
init();
loadState().catch(() => setNotice("初始化失败"));

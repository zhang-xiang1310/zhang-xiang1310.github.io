const uploadSlots = ["hero", "portrait", "mark", "work-one", "work-two", "work-three"];
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

  window.clearTimeout(setNotice._timer);
  setNotice._timer = window.setTimeout(() => {
    setHidden(toast, true);
    toast.textContent = "";
  }, 2400);
}

function updateHeader() {
  el.stateLabel.textContent = state.authenticated
    ? "ADMIN PORTFOLIO / 2026"
    : "PRIVATE PORTFOLIO / 2026";
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

init();
loadState().catch(() => setNotice("初始化失败"));

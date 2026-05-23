import { ACCESS_CONTROL } from "./config.js";

const storageKey = "love-page-access-granted";

async function sha256(value) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function showPage() {
  document.documentElement.classList.add("access-granted");
}

function showLock() {
  document.documentElement.classList.add("access-locked");
  document.getElementById("lock-screen").hidden = false;
}

async function initAccessControl() {
  if (!ACCESS_CONTROL.enabled) {
    showPage();
    return;
  }

  if (window.localStorage.getItem(storageKey) === ACCESS_CONTROL.passwordHash) {
    showPage();
    return;
  }

  showLock();

  const form = document.getElementById("lock-form");
  const input = document.getElementById("lock-password");
  const message = document.getElementById("lock-message");

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const hash = await sha256(input.value);

    if (hash === ACCESS_CONTROL.passwordHash) {
      window.localStorage.setItem(storageKey, hash);
      document.documentElement.classList.remove("access-locked");
      showPage();
      document.getElementById("lock-screen").hidden = true;
      return;
    }

    message.textContent = "密码不对";
    input.value = "";
    input.focus();
  });

  input.focus();
}

initAccessControl();

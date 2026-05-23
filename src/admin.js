import { isSupabaseConfigured, supabase } from "./supabase.js";

const typeLabels = {
  wish: "愿望",
  project: "项目",
  anniversary: "每年纪念日",
};

const statusLabels = {
  todo: "未完成",
  doing: "进行中",
  done: "已完成",
};

let allItems = [];
let refreshQueued = false;

function withTimeout(promise, message, timeoutMs = 8000) {
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      window.setTimeout(() => reject(new Error(message)), timeoutMs);
    }),
  ]);
}

const elements = {
  setupStatus: document.getElementById("setup-status"),
  loginPanel: document.getElementById("login-panel"),
  editorPanel: document.getElementById("editor-panel"),
  loginForm: document.getElementById("login-form"),
  emailInput: document.getElementById("email-input"),
  logoutButton: document.getElementById("logout-button"),
  itemForm: document.getElementById("item-form"),
  formTitle: document.getElementById("form-title"),
  itemId: document.getElementById("item-id"),
  itemType: document.getElementById("item-type"),
  itemTitle: document.getElementById("item-title"),
  itemDate: document.getElementById("item-date"),
  itemStatusField: document.getElementById("item-status-field"),
  itemStatus: document.getElementById("item-status"),
  itemImage: document.getElementById("item-image"),
  itemDescription: document.getElementById("item-description"),
  resetForm: document.getElementById("reset-form"),
  filterType: document.getElementById("filter-type"),
  adminList: document.getElementById("admin-list"),
  toast: document.getElementById("toast"),
};

function updateStatusVisibility() {
  const usesStatus = elements.itemType.value === "wish" || elements.itemType.value === "project";
  elements.itemStatusField.hidden = !usesStatus;
  if (!usesStatus) {
    elements.itemStatus.value = "todo";
  }
}

function showToast(message) {
  elements.toast.textContent = message;
  elements.toast.classList.add("visible");
  window.setTimeout(() => elements.toast.classList.remove("visible"), 2400);
}

function readCachedSession() {
  try {
    return Object.keys(window.localStorage).some((key) => {
      if (!key.startsWith("sb-") || !key.endsWith("-auth-token")) return false;
      const value = window.localStorage.getItem(key);
      if (!value) return false;
      const parsed = JSON.parse(value);
      const session = Array.isArray(parsed) ? parsed[0] : parsed;
      return Boolean(session?.access_token);
    });
  } catch {
    return false;
  }
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatDate(value) {
  if (!value) return "未设置日期";
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(new Date(`${value}T00:00:00`));
}

function resetForm() {
  elements.formTitle.textContent = "添加记录";
  elements.itemId.value = "";
  elements.itemType.value = "wish";
  elements.itemTitle.value = "";
  elements.itemDate.value = "";
  elements.itemStatus.value = "todo";
  elements.itemImage.value = "";
  elements.itemDescription.value = "";
  updateStatusVisibility();
}

function applyQueryIntent() {
  const params = new URLSearchParams(window.location.search);
  const type = params.get("type");
  const editId = params.get("edit");

  if (type && Object.keys(typeLabels).includes(type)) {
    resetForm();
    elements.itemType.value = type;
    elements.formTitle.textContent = `添加${typeLabels[type]}`;
  }

  if (editId && allItems.length > 0) {
    editItem(editId);
  }
}

function renderAdminList() {
  const filter = elements.filterType.value;
  const items = filter === "all" ? allItems : allItems.filter((item) => item.type === filter);

  elements.adminList.innerHTML =
    items
      .map(
        (item) => `
          <article class="admin-item">
            <div>
              <span>${typeLabels[item.type] || "记录"} · ${formatDate(item.event_date)}</span>
              <h3>${escapeHtml(item.title)}</h3>
              <p>${escapeHtml(item.description || "没有描述")}</p>
              ${
                item.type === "wish" || item.type === "project"
                  ? `<small class="admin-status">${statusLabels[item.status] || "未完成"}</small>`
                  : ""
              }
            </div>
            <div class="admin-item-actions">
              <button class="button ghost compact" data-edit="${item.id}" type="button">编辑</button>
              <button class="button danger compact" data-delete="${item.id}" type="button">删除</button>
            </div>
          </article>
        `,
      )
      .join("") || `<div class="empty-state">还没有记录</div>`;

  elements.adminList.querySelectorAll("[data-edit]").forEach((button) => {
    button.addEventListener("click", () => editItem(button.dataset.edit));
  });

  elements.adminList.querySelectorAll("[data-delete]").forEach((button) => {
    button.addEventListener("click", () => deleteItem(button.dataset.delete));
  });
}

function showLoggedInShell(message = "Supabase 已连接，当前已登录。") {
  elements.loginPanel.hidden = true;
  elements.editorPanel.hidden = false;
  elements.logoutButton.hidden = false;
  elements.setupStatus.textContent = message;
}

function showLoggedOutShell(message = "Supabase 已连接，请使用白名单邮箱登录。") {
  elements.loginPanel.hidden = false;
  elements.editorPanel.hidden = true;
  elements.logoutButton.hidden = true;
  elements.setupStatus.textContent = message;
}

async function loadItems() {
  const { data, error } = await withTimeout(
    supabase.from("love_items").select("*").order("created_at", { ascending: false }),
    "读取记录超时，请刷新页面重试。",
  );

  if (error) {
    showToast(error.message);
    return;
  }

  allItems = data || [];
  renderAdminList();
  applyQueryIntent();
}

function editItem(id) {
  const item = allItems.find((entry) => entry.id === id);
  if (!item) return;

  elements.formTitle.textContent = "编辑记录";
  elements.itemId.value = item.id;
  elements.itemType.value = item.type;
  elements.itemTitle.value = item.title;
  elements.itemDate.value = item.event_date || "";
  elements.itemStatus.value = item.status || "todo";
  elements.itemImage.value = item.image_url || "";
  elements.itemDescription.value = item.description || "";
  updateStatusVisibility();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

async function deleteItem(id) {
  const confirmed = window.confirm("确定删除这条记录吗？");
  if (!confirmed) return;

  const { error } = await supabase.from("love_items").delete().eq("id", id);
  if (error) {
    showToast(error.message);
    return;
  }

  showToast("已删除");
  loadItems();
}

async function saveItem(event) {
  event.preventDefault();

  const payload = {
    type: elements.itemType.value,
    title: elements.itemTitle.value.trim(),
    description: elements.itemDescription.value.trim() || null,
    event_date: elements.itemDate.value || null,
    image_url: elements.itemImage.value.trim() || null,
    updated_at: new Date().toISOString(),
  };

  if (payload.type === "wish" || payload.type === "project") {
    payload.status = elements.itemStatus.value;
  } else {
    payload.status = null;
  }

  const id = elements.itemId.value;
  const request = id
    ? supabase.from("love_items").update(payload).eq("id", id)
    : supabase.from("love_items").insert(payload);

  const { error } = await request;
  if (error) {
    showToast(error.message);
    return;
  }

  showToast(id ? "已更新" : "已添加");
  resetForm();
  loadItems();
}

async function sendLogin(event) {
  event.preventDefault();

  const { error } = await supabase.auth.signInWithOtp({
    email: elements.emailInput.value.trim(),
    options: {
      emailRedirectTo: window.location.href,
    },
  });

  if (error) {
    showToast(error.message);
    return;
  }

  showToast("登录链接已发送，请查看邮箱");
}

async function refreshSession() {
  if (readCachedSession()) {
    showLoggedInShell("正在刷新登录状态和记录。");
  } else {
    elements.setupStatus.textContent = "Supabase 已连接，正在恢复登录状态。";
    elements.loginPanel.hidden = true;
    elements.editorPanel.hidden = true;
    elements.logoutButton.hidden = true;
  }

  let session = null;
  try {
    const { data } = await withTimeout(
      supabase.auth.getSession(),
      "确认登录状态超时，请刷新页面或重新登录。",
    );
    session = data.session;
  } catch (error) {
    showLoggedOutShell(error.message);
    return;
  }

  const isLoggedIn = Boolean(session);

  if (isLoggedIn) {
    showLoggedInShell();
  } else {
    showLoggedOutShell();
  }

  if (isLoggedIn) {
    try {
      await loadItems();
    } catch (error) {
      showToast(error.message);
    }
  }
}

function initAdmin() {
  if (!isSupabaseConfigured()) {
    elements.setupStatus.innerHTML =
      '请先在 <code>src/config.js</code> 中填写 Supabase URL 和 anon key。';
    return;
  }

  if (readCachedSession()) {
    showLoggedInShell("正在刷新登录状态和记录。");
  } else {
    elements.setupStatus.textContent = "Supabase 已连接，正在恢复登录状态。";
    elements.loginPanel.hidden = true;
    elements.editorPanel.hidden = true;
  }
  elements.loginForm.addEventListener("submit", sendLogin);
  elements.itemForm.addEventListener("submit", saveItem);
  elements.itemType.addEventListener("change", updateStatusVisibility);
  elements.resetForm.addEventListener("click", resetForm);
  elements.filterType.addEventListener("change", renderAdminList);
  elements.logoutButton.addEventListener("click", async () => {
    await supabase.auth.signOut();
    showToast("已退出");
    refreshSession();
  });

  supabase.auth.onAuthStateChange(() => {
    if (refreshQueued) return;
    refreshQueued = true;
    window.setTimeout(() => {
      refreshQueued = false;
      refreshSession();
    }, 80);
  });
  applyQueryIntent();
  updateStatusVisibility();
  refreshSession();
}

initAdmin();

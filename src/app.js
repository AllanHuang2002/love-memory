import { COMMON_COUPLE_DAYS, PERIOD_TRACKER, SITE_CONFIG, SPECIAL_DAYS } from "./config.js";
import { isSupabaseConfigured, supabase } from "./supabase.js";

const sampleItems = [
  {
    id: "sample-1",
    type: "anniversary",
    title: "第一次见面的日子",
    description: "那天之后，普通日子开始有了坐标。",
    event_date: SITE_CONFIG.startDate,
    status: "done",
    image_url: "",
  },
  {
    id: "sample-2",
    type: "wish",
    title: "一起去看海边日出",
    description: "带一壶热茶，拍一张不赶时间的照片。",
    event_date: "",
    status: "todo",
    image_url: "",
  },
  {
    id: "sample-3",
    type: "project",
    title: "做一本年度相册",
    description: "把这一年的小票、照片和碎碎念整理起来。",
    event_date: "",
    status: "doing",
    image_url: "",
  },
];

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

const statusOrder = {
  doing: 0,
  todo: 1,
  done: 2,
};

const addLinks = {
  wish: "./admin.html?type=wish",
  project: "./admin.html?type=project",
  anniversary: "./admin.html?type=anniversary",
};

const pinnedUpcomingOrder = ["西西生日", "烟雨生日", "恋爱起点"];
const periodStorageKey = "love-page-period-ranges";
let periodRanges = [];
let visiblePeriodMonth = null;
let periodStorageMode = "local";

function byId(id) {
  return document.getElementById(id);
}

function resolvePhotoUrl(fileName) {
  if (fileName.startsWith("http") || fileName.startsWith("./") || fileName.startsWith("/")) {
    return fileName;
  }

  return `./assets/photos/${fileName}`;
}

function dateKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function addDays(date, days) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function parseDateOnly(value) {
  return new Date(`${value}T00:00:00`);
}

function loadPeriodRanges() {
  try {
    const stored = JSON.parse(window.localStorage.getItem(periodStorageKey) || "null");
    periodRanges = Array.isArray(stored) && stored.length > 0 ? stored : PERIOD_TRACKER.ranges;
  } catch {
    periodRanges = PERIOD_TRACKER.ranges;
  }
}

function savePeriodRanges() {
  window.localStorage.setItem(periodStorageKey, JSON.stringify(periodRanges));
}

async function syncPeriodRangesFromDatabase() {
  if (!isSupabaseConfigured()) return false;

  const { data, error } = await supabase
    .from("period_ranges")
    .select("id,start_date,end_date")
    .order("start_date", { ascending: true });

  if (error) {
    console.warn(error.message);
    return false;
  }

  periodRanges = (data || []).map((range) => ({
    id: range.id,
    start: range.start_date,
    end: range.end_date,
  }));
  periodStorageMode = "database";
  return true;
}

async function addPeriodRange(range) {
  if (periodStorageMode === "database") {
    const { error } = await supabase.from("period_ranges").insert({
      start_date: range.start,
      end_date: range.end,
    });

    if (error) {
      window.alert(error.message);
      return false;
    }

    await syncPeriodRangesFromDatabase();
    return true;
  }

  periodRanges = [...periodRanges, range].sort((a, b) => parseDateOnly(a.start) - parseDateOnly(b.start));
  savePeriodRanges();
  return true;
}

async function deletePeriodRange(index) {
  const range = periodRanges[index];
  if (!range) return;

  if (periodStorageMode === "database" && range.id) {
    const { error } = await supabase.from("period_ranges").delete().eq("id", range.id);

    if (error) {
      window.alert(error.message);
      return;
    }

    await syncPeriodRangesFromDatabase();
    return;
  }

  periodRanges = periodRanges.filter((_, itemIndex) => itemIndex !== index);
  savePeriodRanges();
}

function formatDate(dateString) {
  if (!dateString) return "未设置日期";
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(new Date(`${dateString}T00:00:00`));
}

function parseLocalDateTime(value) {
  if (value instanceof Date) return new Date(value);
  return new Date(value.includes("T") ? value : `${value}T00:00:00`);
}

function daysUntilNext(dateString) {
  if (!dateString) return null;
  const now = new Date();
  const target = new Date(`${dateString}T00:00:00`);
  target.setFullYear(now.getFullYear());
  target.setHours(0, 0, 0, 0);

  const today = new Date(now);
  today.setHours(0, 0, 0, 0);

  if (target < today) {
    target.setFullYear(now.getFullYear() + 1);
  }

  return Math.ceil((target - today) / 86400000);
}

function daysUntilAnnual(month, day) {
  return daysBetween(new Date(), nextAnnualDate(month, day));
}

function daysBetween(startDate, endDate = new Date()) {
  const start = parseLocalDateTime(startDate);
  const end = endDate instanceof Date ? new Date(endDate) : new Date(`${endDate}T00:00:00`);
  return Math.max(0, Math.floor((end - start) / 86400000));
}

function nextAnnualDate(month, day) {
  const now = new Date();
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);

  const target = new Date(today.getFullYear(), month - 1, day);
  target.setHours(0, 0, 0, 0);

  if (target < today) {
    target.setFullYear(today.getFullYear() + 1);
  }

  return target;
}

function lunarParts(date) {
  const parts = new Intl.DateTimeFormat("zh-CN-u-ca-chinese", {
    month: "numeric",
    day: "numeric",
  }).formatToParts(date);

  return {
    month: Number(parts.find((part) => part.type === "month")?.value),
    day: Number(parts.find((part) => part.type === "day")?.value),
  };
}

function nextChineseLunarDate(month, day) {
  const cursor = new Date();
  cursor.setHours(0, 0, 0, 0);

  for (let offset = 0; offset <= 400; offset += 1) {
    const candidate = new Date(cursor);
    candidate.setDate(cursor.getDate() + offset);
    const parts = lunarParts(candidate);

    if (parts.month === month && parts.day === day) {
      return candidate;
    }
  }

  return nextAnnualDate(month, day);
}

function nextSpecialDate(item) {
  if (item.type === "chinese-lunar") {
    return nextChineseLunarDate(item.month, item.day);
  }

  return nextAnnualDate(item.month, item.day);
}

function formatShortDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}/${month}/${day}`;
}

function renderSpecialDays() {
  const togetherDays = daysBetween(SITE_CONFIG.startDate);
  const birthDays = SPECIAL_DAYS.filter((item) => item.birthDate);
  const rows = [
    `
      <article class="special-row">
        <span>我们相爱已经</span>
        <strong>${togetherDays}</strong>
        <span>天啦！</span>
      </article>
    `,
    ...birthDays.map((item) => {
      const livedDays = item.birthDate ? daysBetween(item.birthDate) : null;

      return livedDays === null
        ? ""
        : `
          <article class="special-row">
            <span>${escapeHtml(item.label.replace("距离", "").replace("生日", "出生距今"))}</span>
            <strong>${livedDays}</strong>
            <span>天啦！</span>
          </article>
        `;
    }),
  ];

  byId("special-day-list").innerHTML = rows.join("");
}

function updateClock() {
  const start = parseLocalDateTime(SITE_CONFIG.startDate);
  const diff = Math.max(0, Date.now() - start.getTime());
  const totalSeconds = Math.floor(diff / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  byId("days-together").textContent = days.toString();
  byId("hours-together").textContent = hours.toString().padStart(2, "0");
  byId("minutes-together").textContent = minutes.toString().padStart(2, "0");
  byId("seconds-together").textContent = seconds.toString().padStart(2, "0");
}

function adminLinkFor(item) {
  if (String(item.id).startsWith("sample-")) {
    return addLinks[item.type] || "./admin.html";
  }

  return `./admin.html?edit=${encodeURIComponent(item.id)}`;
}

function cardTemplate(item) {
  const hasImage = item.image_url && item.image_url.startsWith("http");
  const dateText = item.event_date ? formatDate(item.event_date) : statusLabels[item.status] || "记录";
  const countdown = item.type === "anniversary" ? daysUntilNext(item.event_date) : null;
  const statusClass = item.status ? ` status-${item.status}` : "";

  return `
    <a class="memory-card${statusClass}" href="${adminLinkFor(item)}">
      ${hasImage ? `<img src="${item.image_url}" alt="" loading="lazy" />` : ""}
      <div class="memory-card-body">
        <div class="meta-row">
          <span>${typeLabels[item.type] || "记录"}</span>
          <span>${dateText}</span>
        </div>
        <h3>${escapeHtml(item.title)}</h3>
        ${item.description ? `<p>${escapeHtml(item.description)}</p>` : ""}
        ${
          item.type === "wish" || item.type === "project"
            ? `<span class="status-pill">${statusLabels[item.status] || "未完成"}</span>`
            : ""
        }
        ${
          countdown === null
            ? ""
            : `<strong class="countdown">${countdown === 0 ? "今天就是这个日子" : `还有 ${countdown} 天`}</strong>`
        }
      </div>
    </a>
  `;
}

function birthdayCardTemplate(item) {
  const next = nextAnnualDate(item.month, item.day);
  const countdown = daysUntilAnnual(item.month, item.day);
  const title = item.title || item.label.replace("距离", "");
  const label = item.birthDate ? "生日" : "每年纪念日";

  return `
    <a class="memory-card birthday-card" href="${addLinks.anniversary}">
      <div class="memory-card-body">
        <div class="meta-row">
          <span>${label}</span>
          <span>${formatShortDate(next)}</span>
        </div>
        <h3>${escapeHtml(title)}</h3>
        <p>每年循环</p>
        <strong class="countdown">${countdown === 0 ? "今天就是这个日子" : `还有 ${countdown} 天`}</strong>
      </div>
    </a>
  `;
}

function commonDayCardTemplate(item) {
  const next = nextSpecialDate(item);
  const countdown = daysBetween(new Date(), next);
  const calendarText = item.type === "chinese-lunar" ? "农历循环" : "每年循环";

  return `
    <a class="memory-card festival-card" href="${addLinks.anniversary}">
      <div class="memory-card-body">
        <div class="meta-row">
          <span>${calendarText}</span>
          <span>${formatShortDate(next)}</span>
        </div>
        <h3>${escapeHtml(item.title)}</h3>
        <p>${calendarText}</p>
        <strong class="countdown">${countdown === 0 ? "今天就是这个日子" : `还有 ${countdown} 天`}</strong>
      </div>
    </a>
  `;
}

function timelineTemplate(item) {
  const href = item.href || adminLinkFor(item);
  return `
    <a class="timeline-item" href="${href}">
      <time>${formatDate(item.event_date)}</time>
      <div>
        <span>${typeLabels[item.type] || "记录"}</span>
        <h3>${escapeHtml(item.title)}</h3>
        <p>${escapeHtml(item.description || "")}</p>
      </div>
    </a>
  `;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function renderItems(items) {
  const sortByStatus = (a, b) =>
    (statusOrder[a.status] ?? 1) - (statusOrder[b.status] ?? 1) ||
    new Date(b.created_at || 0) - new Date(a.created_at || 0);
  const wishes = items.filter((item) => item.type === "wish").sort(sortByStatus);
  const projects = items.filter((item) => item.type === "project").sort(sortByStatus);
  const anniversaries = items.filter((item) => item.type === "anniversary");
  const fixedTimelineItems = [
    ...SPECIAL_DAYS.map((item) => {
      const date = item.startDate || `${new Date().getFullYear()}-${String(item.month).padStart(2, "0")}-${String(item.day).padStart(2, "0")}`;
      return {
        id: `special-${item.title || item.label}`,
        type: "anniversary",
        title: item.title || item.label.replace("距离", ""),
        description: item.birthDate ? "生日，每年循环提醒。" : "属于我们的固定纪念日，每年循环提醒。",
        event_date: String(date).split("T")[0],
        href: addLinks.anniversary,
      };
    }),
    ...COMMON_COUPLE_DAYS.map((item) => {
      const next = nextSpecialDate(item);
      return {
        id: `common-${item.title}`,
        type: "anniversary",
        title: item.title,
        description:
          item.type === "chinese-lunar"
            ? "农历节日，每年自动换算阳历日期。"
            : "常见情侣节日，每年循环提醒。",
        event_date: `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, "0")}-${String(next.getDate()).padStart(2, "0")}`,
        href: addLinks.anniversary,
      };
    }),
  ];
  const userTimelineItems = items.map((item) => ({
    ...item,
    event_date: item.event_date || item.created_at?.slice(0, 10),
    description:
      item.description ||
      (item.type === "wish" || item.type === "project" ? `状态：${statusLabels[item.status] || "未完成"}` : ""),
  }));
  const datedItems = [...fixedTimelineItems, ...userTimelineItems.filter((item) => item.event_date)]
    .sort((a, b) => new Date(a.event_date) - new Date(b.event_date));

  byId("wish-count").textContent = wishes.length.toString();
  byId("project-count").textContent = projects.length.toString();
  byId("anniversary-count").textContent = (
    anniversaries.length +
    SPECIAL_DAYS.length +
    COMMON_COUPLE_DAYS.length
  ).toString();

  const upcomingCards = [
    ...SPECIAL_DAYS.map((item) => ({
      title: item.title || item.label.replace("距离", ""),
      days: daysUntilAnnual(item.month, item.day),
      html: birthdayCardTemplate(item),
    })),
    ...COMMON_COUPLE_DAYS.map((item) => {
      const next = nextSpecialDate(item);
      return {
        title: item.title,
        days: daysBetween(new Date(), next),
        html: commonDayCardTemplate(item),
      };
    }),
    ...anniversaries.map((item) => ({
      title: item.title,
      days: daysUntilNext(item.event_date) ?? 9999,
      html: cardTemplate(item),
    })),
  ].sort((a, b) => {
    const aPinned = pinnedUpcomingOrder.indexOf(a.title);
    const bPinned = pinnedUpcomingOrder.indexOf(b.title);

    if (aPinned !== -1 || bPinned !== -1) {
      if (aPinned === -1) return 1;
      if (bPinned === -1) return -1;
      return aPinned - bPinned;
    }

    return a.days - b.days;
  });

  byId("wish-list").innerHTML = wishes.map(cardTemplate).join("") || emptyState("还没有愿望", addLinks.wish);
  byId("project-list").innerHTML =
    projects.map(cardTemplate).join("") || emptyState("还没有项目", addLinks.project);
  byId("anniversary-list").innerHTML = upcomingCards.map((item) => item.html).join("");
  byId("timeline-list").innerHTML = datedItems.map(timelineTemplate).join("") || emptyState("还没有时间线", addLinks.anniversary);

  const next = upcomingCards[0];

  byId("next-anniversary").textContent = next
    ? `最近：${next.title}，${next.days === 0 ? "就在今天" : `还有 ${next.days} 天`}`
    : "添加纪念日后，这里会显示最近提醒。";
}

function emptyState(text, href = "./admin.html") {
  return `<a class="empty-state" href="${href}">${text}，点击添加</a>`;
}

async function loadItems() {
  if (!isSupabaseConfigured()) {
    renderItems(sampleItems);
    return;
  }

  const { data, error } = await supabase
    .from("love_items")
    .select("*")
    .order("event_date", { ascending: true, nullsFirst: false });

  if (error) {
    console.error(error);
    renderItems(sampleItems);
    return;
  }

  renderItems(data || []);
}

function initPage() {
  document.title = SITE_CONFIG.coupleName;
  byId("couple-title").textContent = SITE_CONFIG.heroTitle;
  byId("hero-subtitle").textContent = SITE_CONFIG.heroSubtitle;
  byId("hero-eyebrow").textContent = `Since ${SITE_CONFIG.startDate
    .replace("T", " ")
    .replaceAll("-", ".")}`;

  updateClock();
  setInterval(updateClock, 1000);
  renderSpecialDays();
  initPeriodCalendar();
  loadPhotos();
  loadItems();
}

initPage();

async function loadPhotos() {
  const stage = byId("photo-stage");

  try {
    const response = await fetch("./assets/photos/photos.json", { cache: "no-store" });
    if (!response.ok) throw new Error("photos.json missing");

    const photos = await response.json();
    const normalized = photos
      .map((photo) => (typeof photo === "string" ? { src: photo, alt: "" } : photo))
      .filter((photo) => photo?.src);

    if (normalized.length === 0) return;

    stage.innerHTML = normalized
      .map(
        (photo, index) => `
          <img
            class="reel-photo${index === 0 ? " active" : ""}"
            src="${resolvePhotoUrl(photo.src)}"
            alt="${escapeHtml(photo.alt || "")}"
            loading="${index === 0 ? "eager" : "lazy"}"
          />
        `,
      )
      .join("");

    if (normalized.length > 1) {
      let current = 0;
      const images = [...stage.querySelectorAll(".reel-photo")];
      window.setInterval(() => {
        images[current].classList.remove("active");
        current = (current + 1) % images.length;
        images[current].classList.add("active");
      }, 4200);
    }
  } catch {
    stage.innerHTML = `<div class="photo-placeholder">把照片放进 assets/photos 后，这里会循环展示</div>`;
  }
}

function expandRange(start, end, type) {
  const dates = [];
  let cursor = parseDateOnly(start);
  const last = parseDateOnly(end);

  while (cursor <= last) {
    dates.push({ key: dateKey(cursor), type });
    cursor = addDays(cursor, 1);
  }

  return dates;
}

function buildPeriodMarks() {
  const marks = new Map();

  periodRanges.forEach((range) => {
    expandRange(range.start, range.end, "actual").forEach((entry) => {
      marks.set(entry.key, entry.type);
    });
  });

  const sortedRanges = [...periodRanges].sort(
    (a, b) => parseDateOnly(a.start) - parseDateOnly(b.start),
  );
  const latest = sortedRanges.at(-1);

  if (!latest) return marks;

  const latestStart = parseDateOnly(latest.start);
  const limit = new Date();
  limit.setMonth(limit.getMonth() + (PERIOD_TRACKER.visibleMonthsAhead || 3));
  limit.setHours(23, 59, 59, 999);

  for (
    let predictedStart = addDays(latestStart, PERIOD_TRACKER.cycleLength);
    predictedStart <= limit;
    predictedStart = addDays(predictedStart, PERIOD_TRACKER.cycleLength)
  ) {
    const predictedEnd = addDays(predictedStart, Math.max(1, PERIOD_TRACKER.periodLength) - 1);
    expandRange(dateKey(predictedStart), dateKey(predictedEnd), "predicted").forEach((entry) => {
      if (!marks.has(entry.key)) {
        marks.set(entry.key, entry.type);
      }
    });
  }

  return marks;
}

function renderPeriodCalendar(monthDate) {
  const calendar = byId("period-calendar");
  if (!PERIOD_TRACKER.enabled) {
    calendar.hidden = true;
    return;
  }

  const marks = buildPeriodMarks();
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const firstDay = new Date(year, month, 1);
  const firstWeekday = firstDay.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells = [];

  byId("calendar-title").textContent = new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "long",
  }).format(monthDate);

  ["日", "一", "二", "三", "四", "五", "六"].forEach((day) => {
    cells.push(`<div class="calendar-weekday">${day}</div>`);
  });

  for (let i = 0; i < firstWeekday; i += 1) {
    cells.push(`<div class="calendar-cell muted"></div>`);
  }

  for (let day = 1; day <= daysInMonth; day += 1) {
    const current = new Date(year, month, day);
    const key = dateKey(current);
    const mark = marks.get(key);
    const today = key === dateKey(new Date()) ? " today" : "";
    const markClass = mark ? ` ${mark}` : "";

    cells.push(`
      <div class="calendar-cell${today}${markClass}" title="${key}">
        <span>${day}</span>
      </div>
    `);
  }

  byId("calendar-grid").innerHTML = cells.join("");
  renderPeriodRanges();
}

async function initPeriodCalendar() {
  if (!byId("period-calendar")) return;

  loadPeriodRanges();
  await syncPeriodRangesFromDatabase();
  visiblePeriodMonth = new Date();
  visiblePeriodMonth.setDate(1);
  visiblePeriodMonth.setHours(0, 0, 0, 0);

  const startInput = byId("period-start");
  const endInput = byId("period-end");
  const todayKey = dateKey(new Date());
  startInput.value = todayKey;
  endInput.value = todayKey;

  byId("calendar-prev").addEventListener("click", () => {
    visiblePeriodMonth = new Date(visiblePeriodMonth.getFullYear(), visiblePeriodMonth.getMonth() - 1, 1);
    renderPeriodCalendar(visiblePeriodMonth);
  });

  byId("calendar-next").addEventListener("click", () => {
    visiblePeriodMonth = new Date(visiblePeriodMonth.getFullYear(), visiblePeriodMonth.getMonth() + 1, 1);
    renderPeriodCalendar(visiblePeriodMonth);
  });

  byId("period-form").addEventListener("submit", async (event) => {
    event.preventDefault();
    const start = startInput.value;
    const end = endInput.value;

    if (!start || !end) return;

    const normalized =
      parseDateOnly(start) <= parseDateOnly(end) ? { start, end } : { start: end, end: start };

    const saved = await addPeriodRange(normalized);
    if (!saved) return;

    visiblePeriodMonth = new Date(`${normalized.start}T00:00:00`);
    visiblePeriodMonth.setDate(1);
    renderPeriodCalendar(visiblePeriodMonth);
  });

  byId("period-clear").addEventListener("click", () => {
    const confirmed = window.confirm("确定清空这个浏览器里保存的周期记录吗？");
    if (!confirmed) return;

    if (periodStorageMode === "database") {
      window.alert("同步模式下请逐条删除需要移除的记录。");
      return;
    }

    periodRanges = [];
    savePeriodRanges();
    renderPeriodCalendar(visiblePeriodMonth);
  });

  byId("period-ranges").addEventListener("click", async (event) => {
    const button = event.target.closest("[data-period-delete]");
    if (!button) return;

    const index = Number(button.dataset.periodDelete);
    await deletePeriodRange(index);
    renderPeriodCalendar(visiblePeriodMonth);
  });

  renderPeriodCalendar(visiblePeriodMonth);
}

function renderPeriodRanges() {
  const container = byId("period-ranges");
  if (!container) return;

  container.innerHTML =
    periodRanges
      .map(
        (range, index) => `
          <span class="period-chip">
            ${range.start} 至 ${range.end}
            <button type="button" data-period-delete="${index}" aria-label="删除 ${range.start} 至 ${range.end}">×</button>
          </span>
        `,
      )
      .join("") ||
    `<span class="period-empty">还没有${periodStorageMode === "database" ? "同步" : "本机"}记录，添加后会标红并用于预测。</span>`;
}

const STORAGE_KEY = "frontend-roadmap-progress-v1";
const ACTIVE_GROUP_KEY = "frontend-roadmap-active-group";

const GROUP_META = {
  1: {
    name: "Основы веба",
    blurb: "HTML, CSS, дизайн, DOM и сеть",
  },
  2: {
    name: "JS & Frontend",
    blurb: "JavaScript, TypeScript, React и экосистема",
  },
  3: {
    name: "Git & Команда",
    blurb: "Версии, деплой и совместная работа",
  },
  4: {
    name: "Инструменты",
    blurb: "Сборка, качество, тесты и безопасность",
  },
};

const MOTIVATION = [
  { max: 0, text: "Старт дан. Отметь первый пункт — и путь начнётся." },
  { max: 10, text: "Отличное начало. Импульс уже есть — продолжай." },
  { max: 25, text: "Четверть пути. Ты уже видишь структуру целиком." },
  { max: 50, text: "Половина! Это уже серьёзный прогресс — не сбавляй." },
  { max: 75, text: "Три четверти. Финишная прямая становится реальной." },
  { max: 99, text: "Почти у цели. Остались последние штрихи." },
  { max: 100, text: "Roadmap пройден. Ты собрал сильную базу — гордись этим." },
];

const state = {
  data: null,
  progress: loadProgress(),
  activeGroupId: Number(localStorage.getItem(ACTIVE_GROUP_KEY)) || 1,
  noteTarget: null,
  openSections: new Set(),
  openNotes: new Set(),
};

const els = {
  app: document.getElementById("app"),
  groupNav: document.getElementById("groupNav"),
  overallPct: document.getElementById("overallPct"),
  overallFill: document.getElementById("overallFill"),
  overallBar: document.getElementById("overallBar"),
  ringProgress: document.getElementById("ringProgress"),
  doneCount: document.getElementById("doneCount"),
  leftCount: document.getElementById("leftCount"),
  totalCount: document.getElementById("totalCount"),
  motivation: document.getElementById("motivation"),
  noteDialog: document.getElementById("noteDialog"),
  noteForm: document.getElementById("noteForm"),
  noteInput: document.getElementById("noteInput"),
  noteDialogItem: document.getElementById("noteDialogItem"),
  clearNoteBtn: document.getElementById("clearNoteBtn"),
};

const RING_LEN = 2 * Math.PI * 52;

function loadProgress() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveProgress() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.progress));
}

function itemKey(groupId, sectionIdx, itemIdx) {
  return `${groupId}:${sectionIdx}:${itemIdx}`;
}

function getItemState(key) {
  return state.progress[key] || { done: false, note: "" };
}

function setItemDone(key, done) {
  const current = getItemState(key);
  state.progress[key] = { ...current, done };
  if (!done && !current.note) delete state.progress[key];
  saveProgress();
}

function setItemNote(key, note) {
  const current = getItemState(key);
  const trimmed = note.trim();
  if (!trimmed && !current.done) {
    delete state.progress[key];
  } else {
    state.progress[key] = { ...current, note: trimmed };
  }
  if (!trimmed) state.openNotes.delete(key);
  saveProgress();
}

function motivationFor(pct) {
  return MOTIVATION.find((m) => pct <= m.max)?.text || MOTIVATION.at(-1).text;
}

function countGroup(group) {
  let total = 0;
  let done = 0;
  group.sections.forEach((section, sIdx) => {
    section.items.forEach((_, iIdx) => {
      total += 1;
      if (getItemState(itemKey(group.id, sIdx, iIdx)).done) done += 1;
    });
  });
  return { total, done, left: total - done, pct: total ? Math.round((done / total) * 100) : 0 };
}

function countAll() {
  let total = 0;
  let done = 0;
  state.data.groups.forEach((group) => {
    const c = countGroup(group);
    total += c.total;
    done += c.done;
  });
  return { total, done, left: total - done, pct: total ? Math.round((done / total) * 100) : 0 };
}

function countSection(groupId, sectionIdx, items) {
  let done = 0;
  items.forEach((_, iIdx) => {
    if (getItemState(itemKey(groupId, sectionIdx, iIdx)).done) done += 1;
  });
  const total = items.length;
  return { total, done, left: total - done, pct: total ? Math.round((done / total) * 100) : 0 };
}

function updateOverallUI() {
  const { total, done, left, pct } = countAll();
  els.overallPct.textContent = `${pct}%`;
  els.doneCount.textContent = String(done);
  els.leftCount.textContent = String(left);
  els.totalCount.textContent = String(total);
  els.overallFill.style.width = `${pct}%`;
  els.overallBar.setAttribute("aria-valuenow", String(pct));
  els.ringProgress.style.strokeDasharray = String(RING_LEN);
  els.ringProgress.style.strokeDashoffset = String(RING_LEN - (RING_LEN * pct) / 100);
  els.motivation.textContent = motivationFor(pct);

  const hot = pct >= 75;
  els.ringProgress.closest(".ring-wrap").classList.toggle("is-hot", hot);
  els.overallBar.classList.toggle("is-hot", hot);

  document.querySelectorAll("[data-group-nav]").forEach((btn) => {
    const id = Number(btn.dataset.groupNav);
    const group = state.data.groups.find((g) => g.id === id);
    const c = countGroup(group);
    const meta = btn.querySelector(".group-nav__meta");
    if (meta) meta.textContent = `${c.done}/${c.total} · ${c.pct}%`;
  });
}

function renderNav() {
  els.groupNav.innerHTML = state.data.groups
    .map((group) => {
      const meta = GROUP_META[group.id] || { name: `Группа ${group.id}` };
      const c = countGroup(group);
      const active = group.id === state.activeGroupId ? "is-active" : "";
      return `
        <button
          type="button"
          class="group-nav__btn ${active}"
          data-group-nav="${group.id}"
        >
          ${meta.name}
          <span class="group-nav__meta">${c.done}/${c.total} · ${c.pct}%</span>
        </button>
      `;
    })
    .join("");
}

function checkIcon() {
  return `
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
      <path d="M3 7.2L5.8 10L11 3.5" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>
  `;
}

function chevronIcon() {
  return `
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
      <path d="M5 3L9 7L5 11" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>
  `;
}

function noteIcon() {
  return `
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M3.5 3.5h9v9H6.2L3.5 9.8V3.5Z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>
      <path d="M6 6.5h4M6 9h2.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
    </svg>
  `;
}

function noteExpandIcon() {
  return `
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M4 6.5L8 10.5L12 6.5" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>
  `;
}

function renderItem(groupId, sectionIdx, itemIdx, title) {
  const key = itemKey(groupId, sectionIdx, itemIdx);
  const item = getItemState(key);
  const noteOpen = state.openNotes.has(key);
  const notePreview = item.note
    ? `<div class="item__note-preview${noteOpen ? " is-open" : ""}"${noteOpen ? "" : " hidden"}>${escapeHtml(item.note)}</div>`
    : "";
  const expandBtn = item.note
    ? `
      <button
        type="button"
        class="note-btn note-btn--expand ${noteOpen ? "is-open" : ""}"
        data-toggle-note="${key}"
        aria-expanded="${noteOpen}"
        title="${noteOpen ? "Скрыть примечание" : "Показать примечание"}"
        aria-label="${noteOpen ? "Скрыть" : "Показать"} примечание: ${escapeAttr(title)}"
      >
        ${noteExpandIcon()}
      </button>
    `
    : "";

  return `
    <div class="item ${item.done ? "is-done" : ""}" data-item-key="${key}">
      <label class="check">
        <input type="checkbox" data-toggle="${key}" ${item.done ? "checked" : ""} />
        <span class="check__box">${checkIcon()}</span>
      </label>
      <div class="item__content">
        <span class="item__title">${escapeHtml(title)}</span>
        ${notePreview}
      </div>
      <div class="item__actions">
        ${expandBtn}
        <button
          type="button"
          class="note-btn ${item.note ? "has-note" : ""}"
          data-note="${key}"
          title="${item.note ? "Редактировать примечание" : "Добавить примечание"}"
          aria-label="${item.note ? "Редактировать" : "Добавить"} примечание: ${escapeAttr(title)}"
        >
          ${noteIcon()}
        </button>
      </div>
    </div>
  `;
}

function renderSection(group, sectionIdx, section) {
  const sectionKey = `${group.id}:${sectionIdx}`;
  const counts = countSection(group.id, sectionIdx, section.items);
  const isOpen = state.openSections.has(sectionKey);
  const complete = counts.done === counts.total && counts.total > 0;

  return `
    <section
      class="section ${isOpen ? "is-open" : ""} ${complete ? "is-complete" : ""}"
      data-section-key="${sectionKey}"
    >
      <button type="button" class="section__header" data-toggle-section="${sectionKey}" aria-expanded="${isOpen}">
        <span class="section__chevron">${chevronIcon()}</span>
        <span class="section__meta">
          <h3 class="section__title">${escapeHtml(section.title)}</h3>
          <p class="section__counts">${counts.done} из ${counts.total} · осталось ${counts.left}</p>
        </span>
        <span class="section__mini">
          <span class="section__pct">${counts.pct}%</span>
          <span class="section__bar" aria-hidden="true">
            <span class="section__bar-fill" style="width:${counts.pct}%"></span>
          </span>
        </span>
      </button>
      <div class="section__body">
        ${section.items
          .map((title, itemIdx) => renderItem(group.id, sectionIdx, itemIdx, title))
          .join("")}
      </div>
    </section>
  `;
}

function renderGroups() {
  els.app.innerHTML = state.data.groups
    .map((group) => {
      const meta = GROUP_META[group.id] || { name: `Группа ${group.id}`, blurb: "" };
      const c = countGroup(group);
      const visible = group.id === state.activeGroupId ? "is-visible" : "";
      return `
        <div class="group ${visible}" data-group="${group.id}">
          <div class="group__head">
            <div>
              <h2 class="group__title">${meta.name}</h2>
              <p class="group__progress-text">${meta.blurb}</p>
            </div>
            <p class="group__progress-text">${c.done} / ${c.total} · ${c.pct}%</p>
          </div>
          ${group.sections.map((section, idx) => renderSection(group, idx, section)).join("")}
        </div>
      `;
    })
    .join("");
}

function escapeHtml(str) {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function escapeAttr(str) {
  return escapeHtml(str).replaceAll("'", "&#39;");
}

function setActiveGroup(id) {
  state.activeGroupId = id;
  localStorage.setItem(ACTIVE_GROUP_KEY, String(id));
  document.querySelectorAll("[data-group-nav]").forEach((btn) => {
    btn.classList.toggle("is-active", Number(btn.dataset.groupNav) === id);
  });
  document.querySelectorAll("[data-group]").forEach((el) => {
    el.classList.toggle("is-visible", Number(el.dataset.group) === id);
  });
}

function refresh() {
  renderNav();
  renderGroups();
  updateOverallUI();
}

function openNoteDialog(key) {
  const item = getItemState(key);
  const [groupId, sectionIdx, itemIdx] = key.split(":").map(Number);
  const group = state.data.groups.find((g) => g.id === groupId);
  const title = group?.sections?.[sectionIdx]?.items?.[itemIdx] || "Пункт";

  state.noteTarget = key;
  els.noteDialogItem.textContent = title;
  els.noteInput.value = item.note || "";
  els.clearNoteBtn.hidden = !item.note;
  els.noteDialog.showModal();
  els.noteInput.focus();
}

function bindEvents() {
  els.groupNav.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-group-nav]");
    if (!btn) return;
    setActiveGroup(Number(btn.dataset.groupNav));
  });

  els.app.addEventListener("click", (e) => {
    const sectionBtn = e.target.closest("[data-toggle-section]");
    if (sectionBtn) {
      const key = sectionBtn.dataset.toggleSection;
      if (state.openSections.has(key)) state.openSections.delete(key);
      else state.openSections.add(key);
      const sectionEl = els.app.querySelector(`[data-section-key="${key}"]`);
      if (sectionEl) {
        const open = state.openSections.has(key);
        sectionEl.classList.toggle("is-open", open);
        sectionBtn.setAttribute("aria-expanded", String(open));
      }
      return;
    }

    const noteToggle = e.target.closest("[data-toggle-note]");
    if (noteToggle) {
      const key = noteToggle.dataset.toggleNote;
      const open = !state.openNotes.has(key);
      if (open) state.openNotes.add(key);
      else state.openNotes.delete(key);

      const itemEl = noteToggle.closest(".item");
      const preview = itemEl?.querySelector(".item__note-preview");
      noteToggle.classList.toggle("is-open", open);
      noteToggle.setAttribute("aria-expanded", String(open));
      noteToggle.title = open ? "Скрыть примечание" : "Показать примечание";
      noteToggle.setAttribute(
        "aria-label",
        `${open ? "Скрыть" : "Показать"} примечание`
      );
      if (preview) {
        preview.classList.toggle("is-open", open);
        preview.hidden = !open;
      }
      return;
    }

    const noteBtn = e.target.closest("[data-note]");
    if (noteBtn) {
      openNoteDialog(noteBtn.dataset.note);
    }
  });

  els.app.addEventListener("change", (e) => {
    const input = e.target.closest("[data-toggle]");
    if (!input) return;
    const key = input.dataset.toggle;
    setItemDone(key, input.checked);

    const itemEl = input.closest(".item");
    if (itemEl) itemEl.classList.toggle("is-done", input.checked);

    const [groupId, sectionIdx] = key.split(":").map(Number);
    const group = state.data.groups.find((g) => g.id === groupId);
    const section = group.sections[sectionIdx];
    const counts = countSection(groupId, sectionIdx, section.items);
    const sectionKey = `${groupId}:${sectionIdx}`;
    const sectionEl = els.app.querySelector(`[data-section-key="${sectionKey}"]`);

    if (sectionEl) {
      sectionEl.classList.toggle("is-complete", counts.done === counts.total);
      sectionEl.querySelector(".section__counts").textContent =
        `${counts.done} из ${counts.total} · осталось ${counts.left}`;
      sectionEl.querySelector(".section__pct").textContent = `${counts.pct}%`;
      sectionEl.querySelector(".section__bar-fill").style.width = `${counts.pct}%`;
    }

    const groupEl = els.app.querySelector(`[data-group="${groupId}"]`);
    if (groupEl) {
      const gc = countGroup(group);
      groupEl.querySelectorAll(".group__progress-text")[1].textContent =
        `${gc.done} / ${gc.total} · ${gc.pct}%`;
    }

    updateOverallUI();
  });

  els.noteForm.addEventListener("submit", (e) => {
    const submitter = e.submitter;
    if (submitter?.value === "save" && state.noteTarget) {
      e.preventDefault();
      setItemNote(state.noteTarget, els.noteInput.value);
      els.noteDialog.close();
      refresh();
    }
  });

  els.clearNoteBtn.addEventListener("click", () => {
    if (!state.noteTarget) return;
    setItemNote(state.noteTarget, "");
    els.noteDialog.close();
    refresh();
  });
}

function init() {
  try {
    if (!window.ROADMAP_DATA?.groups) {
      throw new Error("ROADMAP_DATA не найден. Проверь, что data.js загружается перед app.js.");
    }
    state.data = window.ROADMAP_DATA;

    if (!state.data.groups.some((g) => g.id === state.activeGroupId)) {
      state.activeGroupId = state.data.groups[0]?.id || 1;
    }

    // Open first incomplete section of active group by default
    const active = state.data.groups.find((g) => g.id === state.activeGroupId);
    if (active) {
      const firstIncomplete = active.sections.findIndex((section, sIdx) => {
        const c = countSection(active.id, sIdx, section.items);
        return c.done < c.total;
      });
      const idx = firstIncomplete >= 0 ? firstIncomplete : 0;
      state.openSections.add(`${active.id}:${idx}`);
    }

    refresh();
    bindEvents();
  } catch (err) {
    els.app.innerHTML = `
      <div class="error">
        Не удалось загрузить данные roadmap.
        <br /><br />
        <small>${escapeHtml(err.message)}</small>
      </div>
    `;
  }
}

init();

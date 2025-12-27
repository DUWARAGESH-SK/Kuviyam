// Ensure notes.js & storage.js are loaded
let allNotes = [];
let activeDumpPageId = null;
let activeHookId = null;
let currentTabInfo = { url: "", domain: "" };

document.addEventListener("DOMContentLoaded", async () => {
  allNotes = await loadNotes();
  await initCurrentTab();
  initTabs();
  initFilters();
  initDump();
  initHooks();
  renderAll();
});

async function initCurrentTab() {
  const tabsApi = typeof browser !== "undefined" ? browser.tabs : chrome.tabs;
  const [tab] = await tabsApi.query({ active: true, currentWindow: true });
  const url = tab?.url || "";
  currentTabInfo.url = url;
  currentTabInfo.domain = extractDomain(url);
  document.getElementById("currentUrl").textContent = url || "No URL";
}

function extractDomain(url) {
  try {
    const u = new URL(url);
    return u.hostname;
  } catch {
    return "";
  }
}

// tabs switching
function initTabs() {
  const tabs = document.querySelectorAll(".tab");
  tabs.forEach((btn) => {
    btn.addEventListener("click", () => {
      tabs.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      const name = btn.dataset.tab;
      document
        .querySelectorAll(".panel")
        .forEach((p) => p.classList.remove("active"));
      document
        .getElementById(name + "Tab")
        .classList.add("active");
    });
  });
}

// filters and search
function initFilters() {
  const search = document.getElementById("searchInput");
  const dateFrom = document.getElementById("dateFrom");
  const dateTo = document.getElementById("dateTo");
  const tagFilter = document.getElementById("tagFilter");

  [search, dateFrom, dateTo, tagFilter].forEach((el) => {
    el.addEventListener("input", () => renderAll());
  });
}

function getFilterState() {
  return {
    searchText: document.getElementById("searchInput").value.trim(),
    from: document.getElementById("dateFrom").value || null,
    to: document.getElementById("dateTo").value || null,
    tag: document.getElementById("tagFilter").value.trim()
  };
}

/* Dump logic */

function initDump() {
  document
    .getElementById("addDumpPageBtn")
    .addEventListener("click", () => {
      const now = new Date().toISOString();
      const newNote = {
        id: makeId(),
        type: "dump",
        title: "New dump page",
        content: "",
        tags: [],
        createdAt: now,
        updatedAt: now
      };
      allNotes.unshift(newNote);
      activeDumpPageId = newNote.id;
      persistAndRender();
    });

  document
    .getElementById("saveDumpBtn")
    .addEventListener("click", async () => {
      if (!activeDumpPageId) return;
      const note = allNotes.find((n) => n.id === activeDumpPageId);
      if (!note) return;
      const titleEl = document.getElementById("dumpTitle");
      const contentEl = document.getElementById("dumpContent");
      note.title = titleEl.value.trim() || "Untitled dump";
      note.content = contentEl.value;
      note.tags = extractTags(note.content);
      note.updatedAt = new Date().toISOString();
      await persistAndRender();
    });

  document
    .getElementById("deleteDumpBtn")
    .addEventListener("click", async () => {
      if (!activeDumpPageId) return;
      allNotes = allNotes.filter((n) => n.id !== activeDumpPageId);
      activeDumpPageId = null;
      await persistAndRender();
    });
}

function renderDumpList() {
  const listEl = document.getElementById("dumpPagesList");
  listEl.innerHTML = "";
  const filters = getFilterState();
  const dumps = filterNotes(
    allNotes.filter((n) => n.type === "dump"),
    filters
  );

  if (!activeDumpPageId && dumps.length > 0) {
    activeDumpPageId = dumps[0].id;
  }

  dumps.forEach((note) => {
    const li = document.createElement("li");
    li.className =
      "list-item" + (note.id === activeDumpPageId ? " active" : "");
    li.addEventListener("click", () => {
      activeDumpPageId = note.id;
      renderAll();
    });

    const title = document.createElement("div");
    title.className = "list-item-title";
    title.textContent = note.title || "Untitled dump";

    const snippet = document.createElement("div");
    snippet.className = "list-item-snippet";
    snippet.textContent = (note.content || "").slice(0, 80);

    const meta = document.createElement("div");
    meta.className = "list-item-meta";
    const created = note.createdAt
      ? new Date(note.createdAt).toLocaleString()
      : "";
    meta.textContent = `${created} · ${
      (note.tags || []).map((t) => "#" + t).join(" ")
    }`;

    li.appendChild(title);
    li.appendChild(snippet);
    li.appendChild(meta);
    listEl.appendChild(li);
  });

  renderActiveDumpEditor();
}

function renderActiveDumpEditor() {
  const titleEl = document.getElementById("dumpTitle");
  const contentEl = document.getElementById("dumpContent");
  const metaEl = document.getElementById("dumpMeta");

  const note = allNotes.find((n) => n.id === activeDumpPageId);
  if (!note) {
    titleEl.value = "";
    contentEl.value = "";
    metaEl.textContent = "No dump page selected";
    return;
  }

  titleEl.value = note.title || "";
  contentEl.value = note.content || "";
  metaEl.textContent = `${note.tags
    .map((t) => "#" + t)
    .join(" ")} · created ${new Date(
    note.createdAt
  ).toLocaleDateString()}`;
}

/* Hooks logic */

function initHooks() {
  document.getElementById("addHookBtn").addEventListener("click", () => {
    const now = new Date().toISOString();
    const newNote = {
      id: makeId(),
      type: "hook",
      title: "New hook",
      content: "",
      url: currentTabInfo.url,
      domain: currentTabInfo.domain,
      tags: [],
      createdAt: now,
      updatedAt: now
    };
    allNotes.unshift(newNote);
    activeHookId = newNote.id;
    persistAndRender();
  });

  document
    .getElementById("saveHookBtn")
    .addEventListener("click", async () => {
      if (!activeHookId) return;
      const note = allNotes.find((n) => n.id === activeHookId);
      if (!note) return;
      const titleEl = document.getElementById("hookTitle");
      const contentEl = document.getElementById("hookContent");
      note.title = titleEl.value.trim() || "Untitled hook";
      note.content = contentEl.value;
      note.tags = extractTags(note.content);
      note.updatedAt = new Date().toISOString();
      await persistAndRender();
    });

  document
    .getElementById("deleteHookBtn")
    .addEventListener("click", async () => {
      if (!activeHookId) return;
      allNotes = allNotes.filter((n) => n.id !== activeHookId);
      activeHookId = null;
      await persistAndRender();
    });
}

function renderHooksList() {
  const listEl = document.getElementById("hooksList");
  listEl.innerHTML = "";
  const filters = getFilterState();

  const hooksForSite = allNotes.filter(
    (n) =>
      n.type === "hook" &&
      (n.domain === currentTabInfo.domain || n.url === currentTabInfo.url)
  );

  const filtered = filterNotes(hooksForSite, filters);

  if (!activeHookId && filtered.length > 0) {
    activeHookId = filtered[0].id;
  }

  filtered.forEach((note) => {
    const li = document.createElement("li");
    li.className =
      "list-item" + (note.id === activeHookId ? " active" : "");
    li.addEventListener("click", () => {
      activeHookId = note.id;
      renderAll();
    });

    const title = document.createElement("div");
    title.className = "list-item-title";
    title.textContent = note.title || "Untitled hook";

    const snippet = document.createElement("div");
    snippet.className = "list-item-snippet";
    snippet.textContent = (note.content || "").slice(0, 80);

    const meta = document.createElement("div");
    meta.className = "list-item-meta";
    const created = note.createdAt
      ? new Date(note.createdAt).toLocaleString()
      : "";
    meta.textContent = `${created} · ${
      (note.tags || []).map((t) => "#" + t).join(" ")
    }`;

    li.appendChild(title);
    li.appendChild(snippet);
    li.appendChild(meta);
    listEl.appendChild(li);
  });

  renderActiveHookEditor();
}

function renderActiveHookEditor() {
  const titleEl = document.getElementById("hookTitle");
  const contentEl = document.getElementById("hookContent");
  const metaEl = document.getElementById("hookMeta");

  const note = allNotes.find((n) => n.id === activeHookId);
  if (!note) {
    titleEl.value = "";
    contentEl.value = "";
    metaEl.textContent = "No hook selected for this site";
    return;
  }

  titleEl.value = note.title || "";
  contentEl.value = note.content || "";
  metaEl.textContent = `${note.tags
    .map((t) => "#" + t)
    .join(" ")} · created ${new Date(
    note.createdAt
  ).toLocaleDateString()}`;
}

/* global render + persist */

async function persistAndRender() {
  await saveNotes(allNotes);
  renderAll();
}

function renderAll() {
  renderDumpList();
  renderHooksList();
}

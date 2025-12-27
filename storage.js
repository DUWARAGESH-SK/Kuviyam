// Wrapper around browser.storage.local (or chrome)
const storageArea =
  typeof browser !== "undefined"
    ? browser.storage.local
    : chrome.storage.local;

const NOTES_KEY = "missionPupilNotes";
const SETTINGS_KEY = "missionPupilSettings";

async function loadNotes() {
  const result = await storageArea.get(NOTES_KEY); // [web:7][web:60]
  return result[NOTES_KEY] || [];
}

async function saveNotes(notes) {
  await storageArea.set({ [NOTES_KEY]: notes });
}

async function loadSettings() {
  const result = await storageArea.get(SETTINGS_KEY);
  return (
    result[SETTINGS_KEY] || {
      backupMode: "local", // "local" | "drive"
      driveFolderId: ""
    }
  );
}

async function saveSettings(settings) {
  await storageArea.set({ [SETTINGS_KEY]: settings });
}

// Placeholder for future Google Drive integration
async function exportNotesAsTextFile(notes) {
  // Convert to a simple .txt representation
  let text = "";
  for (const note of notes) {
    text += `# ${note.title || "(untitled)"}\n`;
    text += `type: ${note.type} | created: ${note.createdAt} | url: ${
      note.url || "-"
    }\n`;
    text += (note.content || "") + "\n\n";
  }
  return text;
}

document.addEventListener("DOMContentLoaded", async () => {
  const modeEl = document.getElementById("backupMode");
  const driveEl = document.getElementById("driveFolder");
  const exportBtn = document.getElementById("exportBtn");
  const exportDriveBtn = document.getElementById("exportToDriveBtn");
  const clearBtn = document.getElementById("clearAllBtn");

  const settings = await loadSettings();
  modeEl.value = settings.backupMode || "local";
  driveEl.value = settings.driveFolderId || "";

  modeEl.addEventListener("change", async () => {
    const s = await loadSettings();
    s.backupMode = modeEl.value;
    await saveSettings(s);
  });

  driveEl.addEventListener("blur", async () => {
    const s = await loadSettings();
    s.driveFolderId = driveEl.value.trim();
    await saveSettings(s);
  });

  exportBtn.addEventListener("click", async () => {
    const notes = await loadNotes();
    const text = await exportNotesAsTextFile(notes);
    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "kuviyam-notes.txt";
    a.click();
    URL.revokeObjectURL(url);
  });

  // Placeholder for future Drive API integration
  exportDriveBtn.addEventListener("click", async () => {
    alert(
      "Wire Google Drive API (OAuth + folder upload) here in a later phase."
    );
  });

  clearBtn.addEventListener("click", async () => {
    if (!confirm("Clear all notes? This cannot be undone.")) return;
    await saveNotes([]);
    alert("All notes cleared.");
  });
});

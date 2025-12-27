// Simple ID generator
function makeId() {
  return (
    Date.now().toString(36) +
    "-" +
    Math.random().toString(36).substring(2, 8)
  );
}

// Parse tags from content (#tag)
function extractTags(text) {
  const tags = new Set();
  const regex = /(^|\s)#([^\s#]+)/g;
  let match;
  while ((match = regex.exec(text))) {
    tags.add(match[2].trim().toLowerCase());
  }
  return Array.from(tags);
}

// Filter notes by search, tags, and date
function filterNotes(notes, { searchText, tag, from, to }) {
  const s = (searchText || "").toLowerCase();
  const t = (tag || "").replace(/^#/, "").toLowerCase();
  const fromTime = from ? new Date(from).getTime() : null;
  const toTime = to ? new Date(to).getTime() : null;

  return notes.filter((note) => {
    const created = note.createdAt ? new Date(note.createdAt).getTime() : 0;

    // search
    if (s) {
      const hay =
        (note.title || "").toLowerCase() +
        " " +
        (note.content || "").toLowerCase();
      if (!hay.includes(s)) return false;
    }

    // tag
    if (t) {
      const tags = note.tags || [];
      if (!tags.includes(t)) return false;
    }

    // date range (by createdAt)
    if (fromTime && created < fromTime) return false;
    if (toTime && created > toTime) return false;

    return true;
  });
}

export const notesTemplate = () => `
  <div>
    <h2>Notes</h2>
    <div id="notes-list">
      Loading notes...
    </div>
    <form id="note-form" onsubmit="handleNoteSubmit(event)">
      <textarea name="text" required placeholder="Enter your note"></textarea>
      <button type="submit">Save Note</button>
    </form>
  </div>
  <script>
    async function loadNotes() {
      try {
        const response = await fetch('/notes.json'); // Fetch notes from the correct path
        if (!response.ok) throw new Error('Failed to load notes');
        const notes = await response.json();
        document.getElementById('notes-list').innerHTML = notes.length ? 
          notes.map(note => `<div class="note">${note.text}</div>`).join('') :
          '<p>No notes yet</p>';
      } catch (error) {
        console.error('Error loading notes:', error);
        document.getElementById('notes-list').innerHTML = '<p>Error loading notes</p>';
      }
    }

    async function handleNoteSubmit(event) {
      event.preventDefault();
      const form = event.target;
      try {
        const response = await fetch('/notes', { // Use the correct path for creating notes
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: form.text.value })
        });
        if (!response.ok) throw new Error('Failed to save note');
        form.reset();
        await loadNotes();
      } catch (error) {
        console.error('Error saving note:', error);
        alert('Failed to save note');
      }
    }

    loadNotes();
  </script>
`;
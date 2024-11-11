// src/components/NoteForm.ts
async function createNote() {
  const text = document.querySelector('textarea[name="text"]').value;
  const tags = document.querySelector('input[name="tags"]').value.split(',');

  try {
    const response = await fetch('/api/notes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, tags })
    });

    if (!response.ok) throw new Error('Failed to create note');

    window.location.href = '/notes';
  } catch (error) {
    console.error('Failed to create note:', error);
    alert('Failed to create note');
  }
}

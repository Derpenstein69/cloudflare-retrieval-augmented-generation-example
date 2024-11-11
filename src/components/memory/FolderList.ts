declare const htmx: any;
declare const showToast: (message: string, type?: string) => void;

export async function createFolder(): Promise<void> {
  const name = prompt('Enter folder name:');
  if (!name) return;

  try {
    const response = await fetch('/api/memory/folders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name })
    });

    if (!response.ok) throw new Error('Failed to create folder');

    htmx.trigger('#folders-container', 'folderChanged');
    showToast('Folder created successfully');
  } catch (error) {
    if (error instanceof Error) {
      showToast(error.message, 'error');
    }
  }
}

export async function deleteFolder(id: string): Promise<void> {
  if (!confirm('Are you sure you want to delete this folder?')) return;

  try {
    const response = await fetch(`/api/memory/folders/${id}`, {
      method: 'DELETE'
    });

    if (!response.ok) throw new Error('Failed to delete folder');

    htmx.trigger('#folders-container', 'folderChanged');
    showToast('Folder deleted successfully');
  } catch (error) {
    if (error instanceof Error) {
      showToast(error.message, 'error');
    }
  }
}

export async function editFolder(id: string): Promise<void> {
  const folder = document.querySelector(`[data-folder-id="${id}"]`) as HTMLElement;
  const name = prompt('Enter new folder name:', folder.dataset.name);
  if (!name) return;

  try {
    const response = await fetch(`/api/memory/folders/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name })
    });

    if (!response.ok) throw new Error('Failed to update folder');

    htmx.trigger('#folders-container', 'folderChanged');
    showToast('Folder updated successfully');
  } catch (error) {
    if (error instanceof Error) {
      showToast(error.message, 'error');
    }
  }
}

export const template = `
<div class="folder-list"
     hx-get="/api/memory/folders"
     hx-trigger="load, folderChanged from:body">
  <div class="folder-header">
    <h2>Memory Folders</h2>
    <button onclick="createFolder()" class="primary">New Folder</button>
  </div>
  <div class="folders-grid" id="folders-container">
    Loading folders...
  </div>
</div>
`;

export const styles = `
  .folder-list {
    padding: 1rem;
  }

  .folder-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1rem;
  }

  .folders-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    gap: 1rem;
  }

  .folder-card {
    background: var(--secondary-bg);
    padding: 1rem;
    border-radius: 8px;
    box-shadow: 0 2px 4px var(--shadow-color);
  }

  .folder-actions {
    display: flex;
    gap: 0.5rem;
    margin-top: 1rem;
  }
`;

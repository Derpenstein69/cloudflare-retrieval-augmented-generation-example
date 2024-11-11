import { Env, MemoryFolder } from '../types';
import { AppError } from '../shared';

export class MemoryService {
  constructor(private env: Env) {}

  async createFolder(userEmail: string, data: Partial<MemoryFolder>): Promise<MemoryFolder> {
    try {
      // Generate vector embedding for folder content
      const embedding = await this.env.AI.run('@cf/baai/bge-large-en-v1.5', {
        text: [data.description || data.name]
      });

      // Store vector embedding
      const vectorResponse = await this.env.VECTOR_INDEX.upsert([{
        id: crypto.randomUUID(),
        values: embedding.data[0],
        metadata: {
          type: 'folder',
          userEmail,
          created_at: new Date().toISOString()
        }
      }]);

      if (!vectorResponse || !Array.isArray(vectorResponse)) {
        throw new AppError('Failed to create vector embedding', 'VECTOR_ERROR');
      }

      const folder: MemoryFolder = {
        id: crypto.randomUUID(),
        name: data.name || 'Untitled Folder',
        userEmail,
        description: data.description,
        isPrivate: data.isPrivate ?? true,
        tags: data.tags || [],
        parentId: data.parentId,
        sharing: {
          isPublic: false,
          sharedWith: [],
          permissions: []
        },
        metadata: {
          noteCount: 0,
          lastAccessed: new Date(),
          vectorId: vectorResponse[0].id
        },
        version: 1,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // Store folder in D1
      await this.env.DATABASE.prepare(`
        INSERT INTO memory_folders (
          id, name, userEmail, description, isPrivate, tags,
          parentId, sharing, metadata, version, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
        folder.id,
        folder.name,
        folder.userEmail,
        folder.description,
        folder.isPrivate ? 1 : 0,
        JSON.stringify(folder.tags),
        folder.parentId,
        JSON.stringify(folder.sharing),
        JSON.stringify(folder.metadata),
        folder.version,
        folder.createdAt.toISOString(),
        folder.updatedAt.toISOString()
      ).run();

      return folder;
    } catch (error) {
      console.error('Failed to create memory folder:', error);
      throw new AppError(
        'Failed to create memory folder',
        'MEMORY_CREATE_ERROR',
        500,
        { error }
      );
    }
  }

  async getFolders(userEmail: string, parentId?: string): Promise<MemoryFolder[]> {
    try {
      const { results } = await this.env.DATABASE.prepare(`
        SELECT * FROM memory_folders
        WHERE userEmail = ? AND (parentId ${parentId ? '= ?' : 'IS NULL'})
        ORDER BY created_at DESC
      `).bind(
        userEmail,
        ...(parentId ? [parentId] : [])
      ).all();

      return results.map(this.mapFolderFromDb);
    } catch (error) {
      console.error('Failed to fetch memory folders:', error);
      throw new AppError(
        'Failed to fetch memory folders',
        'MEMORY_FETCH_ERROR',
        500,
        { error }
      );
    }
  }

  async updateFolder(id: string, userEmail: string, data: Partial<MemoryFolder>): Promise<MemoryFolder> {
    try {
      const folder = await this.getFolder(id, userEmail);
      if (!folder) {
        throw new AppError('Folder not found', 'MEMORY_NOT_FOUND', 404);
      }

      const updatedFolder = {
        ...folder,
        ...data,
        updatedAt: new Date(),
        version: folder.version + 1
      };

      await this.env.DATABASE.prepare(`
        UPDATE memory_folders SET
        name = ?, description = ?, isPrivate = ?, tags = ?,
        sharing = ?, metadata = ?, version = ?, updated_at = ?
        WHERE id = ? AND userEmail = ?
      `).bind(
        updatedFolder.name,
        updatedFolder.description,
        updatedFolder.isPrivate ? 1 : 0,
        JSON.stringify(updatedFolder.tags),
        JSON.stringify(updatedFolder.sharing),
        JSON.stringify(updatedFolder.metadata),
        updatedFolder.version,
        updatedFolder.updatedAt.toISOString(),
        id,
        userEmail
      ).run();

      return updatedFolder;
    } catch (error) {
      console.error('Failed to update memory folder:', error);
      throw new AppError(
        'Failed to update memory folder',
        'MEMORY_UPDATE_ERROR',
        500,
        { error }
      );
    }
  }

  async deleteFolder(id: string, userEmail: string): Promise<void> {
    try {
      const folder = await this.getFolder(id, userEmail);
      if (!folder) {
        throw new AppError('Folder not found', 'MEMORY_NOT_FOUND', 404);
      }

      // Delete vector embedding
      if (folder.metadata.vectorId) {
        await this.env.VECTOR_INDEX.deleteByIds([folder.metadata.vectorId]);
      }

      // Delete folder and all subfolders
      await this.env.DATABASE.prepare(`
        DELETE FROM memory_folders
        WHERE (id = ? OR parentId = ?) AND userEmail = ?
      `).bind(id, id, userEmail).run();
    } catch (error) {
      console.error('Failed to delete memory folder:', error);
      throw new AppError(
        'Failed to delete memory folder',
        'MEMORY_DELETE_ERROR',
        500,
        { error }
      );
    }
  }

  private async getFolder(id: string, userEmail: string): Promise<MemoryFolder | null> {
    const { results } = await this.env.DATABASE.prepare(`
      SELECT * FROM memory_folders WHERE id = ? AND userEmail = ?
    `).bind(id, userEmail).all();

    return results[0] ? this.mapFolderFromDb(results[0]) : null;
  }

  private mapFolderFromDb(row: any): MemoryFolder {
    return {
      id: row.id,
      name: row.name,
      userEmail: row.userEmail,
      description: row.description,
      isPrivate: Boolean(row.isPrivate),
      tags: JSON.parse(row.tags),
      parentId: row.parentId,
      sharing: JSON.parse(row.sharing),
      metadata: JSON.parse(row.metadata),
      version: row.version,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at)
    };
  }
}

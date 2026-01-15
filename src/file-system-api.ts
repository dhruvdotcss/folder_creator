import type { TreeNode } from './types';

interface FileSystemHandle {
  kind: 'file' | 'directory';
  name: string;
}

interface FileSystemDirectoryHandle extends FileSystemHandle {
  kind: 'directory';
  getDirectoryHandle(name: string, options?: { create?: boolean }): Promise<FileSystemDirectoryHandle>;
  getFileHandle(name: string, options?: { create?: boolean }): Promise<FileSystemFileHandle>;
}

interface FileSystemFileHandle extends FileSystemHandle {
  kind: 'file';
  createWritable(): Promise<FileSystemWritableFileStream>;
}

interface FileSystemWritableFileStream extends WritableStream {
  write(data: string | Blob | ArrayBuffer): Promise<void>;
  close(): Promise<void>;
}

declare global {
  interface Window {
    showDirectoryPicker?: (options?: { mode?: 'readwrite' }) => Promise<FileSystemDirectoryHandle>;
  }
}

export function isFileSystemAccessAPIAvailable(): boolean {
  return 'showDirectoryPicker' in window && 'FileSystemDirectoryHandle' in window;
}

export async function writeTreeToDirectory(
  rootHandle: FileSystemDirectoryHandle,
  tree: TreeNode,
  onProgress?: (current: number, total: number) => void
): Promise<void> {
  let current = 0;
  let total = 0;

  function countNodes(node: TreeNode): void {
    total++;
    node.children.forEach(countNodes);
  }
  countNodes(tree);

  async function writeNode(node: TreeNode, parentHandle: FileSystemDirectoryHandle): Promise<void> {
    if (node.path === '') {
      // Root - process children
      for (const child of node.children) {
        await writeNode(child, parentHandle);
      }
      return;
    }

    current++;
    if (onProgress) {
      onProgress(current, total);
    }

    try {
      if (node.isDirectory) {
        const dirHandle = await parentHandle.getDirectoryHandle(node.name, { create: true });
        for (const child of node.children) {
          await writeNode(child, dirHandle);
        }
      } else {
        const fileHandle = await parentHandle.getFileHandle(node.name, { create: true });
        const writable = await fileHandle.createWritable();
        await writable.write('');
        await writable.close();
      }
    } catch (error) {
      throw new Error(`Failed to create ${node.isDirectory ? 'directory' : 'file'} "${node.name}": ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  await writeNode(tree, rootHandle);
}

export async function selectDirectory(): Promise<FileSystemDirectoryHandle | null> {
  if (!isFileSystemAccessAPIAvailable()) {
    return null;
  }

  try {
    return await window.showDirectoryPicker!({ mode: 'readwrite' });
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      return null; // User cancelled
    }
    throw error;
  }
}

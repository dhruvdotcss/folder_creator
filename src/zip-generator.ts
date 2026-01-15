import JSZip from 'jszip';
import type { TreeNode } from './types';

export async function generateZip(tree: TreeNode, _filename: string = 'project-structure.zip'): Promise<Blob> {
  const zip = new JSZip();

  function addNode(node: TreeNode, zipPath: string = ''): void {
    if (node.path === '') {
      // Root - process children
      node.children.forEach(child => addNode(child, ''));
      return;
    }

    const currentPath = zipPath ? `${zipPath}/${node.name}` : node.name;

    if (node.isDirectory) {
      // Create directory (JSZip creates directories implicitly when files are added)
      node.children.forEach(child => addNode(child, currentPath));
    } else {
      // Add empty file
      zip.file(currentPath, '');
    }
  }

  addNode(tree);

  return zip.generateAsync({ type: 'blob', compression: 'DEFLATE' });
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

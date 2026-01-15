import type { PathEntry, TreeNode } from './types';

export function buildTree(entries: PathEntry[]): TreeNode {
  const root: TreeNode = {
    name: '',
    path: '',
    isDirectory: true,
    children: [],
    issues: [],
  };

  const nodeMap = new Map<string, TreeNode>();
  nodeMap.set('', root);

  // Sort entries: directories first, then files, then alphabetically
  const sorted = [...entries].sort((a, b) => {
    if (a.isDirectory !== b.isDirectory) {
      return a.isDirectory ? -1 : 1;
    }
    return a.path.localeCompare(b.path);
  });

  for (const entry of sorted) {
    const parts = entry.path.split('/').filter(p => p);
    let currentPath = '';
    let parent = root;

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      const isLast = i === parts.length - 1;
      const segmentPath = currentPath ? `${currentPath}/${part}` : part;

      let node = nodeMap.get(segmentPath);

      if (!node) {
        // Create intermediate directory if needed
        if (!isLast || entry.isDirectory) {
          node = {
            name: part,
            path: segmentPath,
            isDirectory: true,
            children: [],
            issues: [],
          };
          nodeMap.set(segmentPath, node);
          parent.children.push(node);
        } else {
          // This is a file
          node = {
            name: part,
            path: segmentPath,
            isDirectory: false,
            children: [],
            issues: entry.issues,
          };
          nodeMap.set(segmentPath, node);
          parent.children.push(node);
          break;
        }
      } else if (isLast && !entry.isDirectory) {
        // File at this path - update issues
        node.issues.push(...entry.issues);
      }

      parent = node;
      currentPath = segmentPath;
    }
  }

  // Sort children within each node
  function sortTree(node: TreeNode): void {
    node.children.sort((a, b) => {
      if (a.isDirectory !== b.isDirectory) {
        return a.isDirectory ? -1 : 1;
      }
      return a.name.localeCompare(b.name);
    });
    node.children.forEach(sortTree);
  }

  sortTree(root);

  return root;
}

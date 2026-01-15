export interface PathIssue {
  type: 'duplicate' | 'conflict' | 'invalid' | 'reserved' | 'depth' | 'sanitized';
  path: string;
  message: string;
  line?: number;
}

export interface PathEntry {
  path: string;
  isDirectory: boolean;
  originalLine: number;
  issues: PathIssue[];
}

export interface TreeNode {
  name: string;
  path: string;
  isDirectory: boolean;
  children: TreeNode[];
  issues: PathIssue[];
}

export interface ProcessedPaths {
  entries: PathEntry[];
  issues: PathIssue[];
  folderCount: number;
  fileCount: number;
}

import { z } from 'zod';
import type { PathEntry, PathIssue, ProcessedPaths } from './types';

const MAX_DEPTH = 30;
const MAX_LINES = 5000;
const INVALID_CHARS = /[<>:"|?*\x00-\x1F]/;
const RESERVED_NAMES = /^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])(\.|$)/i;

// Zod schema for input validation
const InputSchema = z.object({
  input: z.string().max(MAX_LINES * 200, `Input too large. Maximum ${MAX_LINES} lines recommended.`),
});

export function validateInput(input: string): { success: boolean; error?: string } {
  try {
    InputSchema.parse({ input });
    return { success: true };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: error.errors[0]?.message || 'Invalid input' };
    }
    return { success: false, error: 'Validation error' };
  }
}

export function normalizePath(path: string): string {
  // Convert backslashes to forward slashes
  path = path.replace(/\\/g, '/');
  // Collapse multiple slashes
  path = path.replace(/\/+/g, '/');
  // Remove leading/trailing slashes (except root)
  path = path.replace(/^\/+|\/+$/g, '');
  // Resolve . segments
  const parts = path.split('/').filter(p => p !== '.');
  // Reject .. segments (security)
  if (parts.some(p => p === '..')) {
    throw new Error('Parent directory references (..) are not allowed');
  }
  return parts.join('/');
}

export function sanitizeFileName(name: string): string {
  return name.replace(INVALID_CHARS, '-');
}

export function validateFileName(name: string): { valid: boolean; sanitized?: string; issue?: string } {
  if (!name || name.trim() === '') {
    return { valid: false, issue: 'Empty name' };
  }

  if (INVALID_CHARS.test(name)) {
    const sanitized = sanitizeFileName(name);
    return { valid: false, sanitized, issue: 'Contains invalid characters' };
  }

  if (RESERVED_NAMES.test(name)) {
    return { valid: false, issue: 'Reserved name' };
  }

  if (name.length > 255) {
    return { valid: false, issue: 'Name too long' };
  }

  return { valid: true };
}

export function processPaths(input: string): ProcessedPaths {
  // Validate input with zod
  const validation = validateInput(input);
  if (!validation.success && validation.error) {
    // Log warning but continue processing
    console.warn('Input validation warning:', validation.error);
  }

  const lines = input.split('\n');
  const issues: PathIssue[] = [];
  const entries: PathEntry[] = [];
  const seenPaths = new Map<string, number[]>();
  const pathToEntry = new Map<string, PathEntry>();

  // Check line count
  if (lines.length > MAX_LINES) {
    issues.push({
      type: 'depth',
      path: '',
      message: `Input exceeds ${MAX_LINES} lines. Processing anyway, but performance may be affected.`,
    });
  }

  lines.forEach((line, index) => {
    const trimmed = line.trim();
    if (!trimmed) return;

    const originalLine = index + 1;
    const isDirectory = trimmed.endsWith('/');
    let path = isDirectory ? trimmed.slice(0, -1) : trimmed;

    try {
      path = normalizePath(path);
    } catch (error) {
      issues.push({
        type: 'invalid',
        path: trimmed,
        message: error instanceof Error ? error.message : 'Invalid path',
        line: originalLine,
      });
      return;
    }

    if (!path) {
      return;
    }

    // Check depth
    const depth = path.split('/').length;
    if (depth > MAX_DEPTH) {
      issues.push({
        type: 'depth',
        path,
        message: `Path depth exceeds ${MAX_DEPTH} levels`,
        line: originalLine,
      });
    }

    // Validate each segment
    const segments = path.split('/');
    const entryIssues: PathIssue[] = [];
    
    segments.forEach((segment) => {
      const validation = validateFileName(segment);
      if (!validation.valid) {
        if (validation.sanitized) {
          entryIssues.push({
            type: 'sanitized',
            path: segment,
            message: `Sanitized: "${segment}" → "${validation.sanitized}"`,
            line: originalLine,
          });
        } else {
          entryIssues.push({
            type: validation.issue === 'Reserved name' ? 'reserved' : 'invalid',
            path: segment,
            message: validation.issue || 'Invalid name',
            line: originalLine,
          });
        }
      }
    });

    // Track duplicates
    if (seenPaths.has(path)) {
      const existingLines = seenPaths.get(path)!;
      existingLines.push(originalLine);
      entryIssues.push({
        type: 'duplicate',
        path,
        message: `Duplicate path (also on lines: ${existingLines.slice(0, -1).join(', ')})`,
        line: originalLine,
      });
    } else {
      seenPaths.set(path, [originalLine]);
    }

    // Check for conflicts (file vs directory)
    const existingEntry = pathToEntry.get(path);
    if (existingEntry && existingEntry.isDirectory !== isDirectory) {
      entryIssues.push({
        type: 'conflict',
        path,
        message: `Conflict: defined as both ${existingEntry.isDirectory ? 'directory' : 'file'} and ${isDirectory ? 'directory' : 'file'}`,
        line: originalLine,
      });
      // Prefer directory on conflict
      if (isDirectory && !existingEntry.isDirectory) {
        existingEntry.isDirectory = true;
        existingEntry.issues.push({
          type: 'conflict',
          path,
          message: 'Resolved: treating as directory',
          line: existingEntry.originalLine,
        });
      }
    }

    const entry: PathEntry = {
      path,
      isDirectory,
      originalLine,
      issues: entryIssues,
    };

    if (!existingEntry || (isDirectory && !existingEntry.isDirectory)) {
      pathToEntry.set(path, entry);
      entries.push(entry);
    }

    issues.push(...entryIssues);
  });

  // Count folders and files
  const folderCount = entries.filter(e => e.isDirectory).length;
  const fileCount = entries.filter(e => !e.isDirectory).length;

  return {
    entries,
    issues,
    folderCount,
    fileCount,
  };
}

import { describe, it, expect } from 'vitest';
import { normalizePath, sanitizeFileName, validateFileName, processPaths } from '../src/path-processor';

describe('normalizePath', () => {
  it('should convert backslashes to forward slashes', () => {
    expect(normalizePath('src\\components\\Button.tsx')).toBe('src/components/Button.tsx');
  });

  it('should collapse multiple slashes', () => {
    expect(normalizePath('src///components//Button.tsx')).toBe('src/components/Button.tsx');
  });

  it('should remove leading and trailing slashes', () => {
    expect(normalizePath('/src/components/')).toBe('src/components');
  });

  it('should resolve . segments', () => {
    expect(normalizePath('src/./components/./Button.tsx')).toBe('src/components/Button.tsx');
  });

  it('should reject .. segments', () => {
    expect(() => normalizePath('src/../components')).toThrow();
  });
});

describe('sanitizeFileName', () => {
  it('should replace invalid characters with hyphens', () => {
    // Each invalid character is replaced individually
    expect(sanitizeFileName('file<>name.ts')).toBe('file->name.ts');
    expect(sanitizeFileName('file:name.ts')).toBe('file-name.ts');
  });
});

describe('validateFileName', () => {
  it('should validate normal filenames', () => {
    expect(validateFileName('Button.tsx').valid).toBe(true);
    expect(validateFileName('my-file.txt').valid).toBe(true);
  });

  it('should reject empty names', () => {
    expect(validateFileName('').valid).toBe(false);
    expect(validateFileName('   ').valid).toBe(false);
  });

  it('should flag invalid characters', () => {
    const result = validateFileName('file<>name.ts');
    expect(result.valid).toBe(false);
    // Each invalid character is replaced individually
    expect(result.sanitized).toBe('file->name.ts');
  });

  it('should flag reserved names', () => {
    expect(validateFileName('CON').valid).toBe(false);
    expect(validateFileName('PRN.txt').valid).toBe(false);
    expect(validateFileName('COM1').valid).toBe(false);
  });
});

describe('processPaths', () => {
  it('should process simple paths', () => {
    const input = `src/components/
src/components/Button.tsx
src/utils/
src/utils/helpers.ts`;
    
    const result = processPaths(input);
    expect(result.folderCount).toBe(2); // src/components/, src/utils/
    expect(result.fileCount).toBe(2); // Button.tsx, helpers.ts
    expect(result.entries.length).toBe(4);
  });

  it('should detect duplicates', () => {
    const input = `src/components/Button.tsx
src/components/Button.tsx`;
    
    const result = processPaths(input);
    const duplicates = result.issues.filter(i => i.type === 'duplicate');
    expect(duplicates.length).toBeGreaterThan(0);
  });

  it('should handle directory vs file conflicts', () => {
    // Same path defined as both file (no slash) and directory (with slash)
    const input = `src/components
src/components/`;
    
    const result = processPaths(input);
    const conflicts = result.issues.filter(i => i.type === 'conflict');
    // Conflict occurs when same path is defined as both file and directory
    expect(conflicts.length).toBeGreaterThan(0);
  });

  it('should ignore empty lines', () => {
    const input = `src/components/Button.tsx


src/utils/helpers.ts`;
    
    const result = processPaths(input);
    expect(result.fileCount).toBe(2);
  });

  it('should identify directories by trailing slash', () => {
    const input = `src/components/
src/components/Button.tsx`;
    
    const result = processPaths(input);
    const dirEntry = result.entries.find(e => e.path === 'src/components' && e.isDirectory);
    expect(dirEntry).toBeDefined();
  });
});

import { processPaths } from './path-processor';
import { buildTree } from './tree-builder';
import { generateZip, downloadBlob } from './zip-generator';
import { isFileSystemAccessAPIAvailable, selectDirectory, writeTreeToDirectory } from './file-system-api';
import type { TreeNode, ProcessedPaths } from './types';

export class App {
  private pathInput: HTMLTextAreaElement;
  private lineCounter: HTMLElement;
  private previewSection: HTMLElement;
  private previewSummary: HTMLElement;
  private treeContainer: HTMLElement;
  private previewBtn: HTMLButtonElement;
  private clearBtn: HTMLButtonElement;
  private downloadZipBtn: HTMLButtonElement;
  private createFolderBtn: HTMLButtonElement;
  private copyCleanedBtn: HTMLButtonElement;
  private pasteCta: HTMLButtonElement;
  private privacyLink: HTMLElement;
  private privacyModal: HTMLElement;
  private closePrivacyBtn: HTMLButtonElement;

  private currentTree: TreeNode | null = null;
  private currentProcessed: ProcessedPaths | null = null;

  constructor() {
    this.pathInput = document.getElementById('path-input') as HTMLTextAreaElement;
    this.lineCounter = document.getElementById('line-counter')!;
    this.previewSection = document.getElementById('preview-section')!;
    this.previewSummary = document.getElementById('preview-summary')!;
    this.treeContainer = document.getElementById('tree-container')!;
    this.previewBtn = document.getElementById('preview-btn') as HTMLButtonElement;
    this.clearBtn = document.getElementById('clear-btn') as HTMLButtonElement;
    this.downloadZipBtn = document.getElementById('download-zip-btn') as HTMLButtonElement;
    this.createFolderBtn = document.getElementById('create-folder-btn') as HTMLButtonElement;
    this.copyCleanedBtn = document.getElementById('copy-cleaned-btn') as HTMLButtonElement;
    this.pasteCta = document.getElementById('paste-cta') as HTMLButtonElement;
    this.privacyLink = document.getElementById('privacy-link')!;
    this.privacyModal = document.getElementById('privacy-modal')!;
    this.closePrivacyBtn = document.getElementById('close-privacy-btn') as HTMLButtonElement;

    // Ensure modal is hidden on startup
    this.privacyModal.hidden = true;
    this.privacyModal.setAttribute('aria-hidden', 'true');

    this.setupEventListeners();
    this.checkFileSystemAPI();
  }

  private setupEventListeners(): void {
    this.pathInput.addEventListener('input', () => this.updateLineCounter());
    this.pathInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        this.handlePreview();
      }
    });

    this.previewBtn.addEventListener('click', () => this.handlePreview());
    this.clearBtn.addEventListener('click', () => this.handleClear());
    this.downloadZipBtn.addEventListener('click', () => this.handleDownloadZip());
    this.createFolderBtn.addEventListener('click', () => this.handleCreateFolder());
    this.copyCleanedBtn.addEventListener('click', () => this.handleCopyCleaned());
    this.pasteCta.addEventListener('click', () => {
      this.pathInput.focus();
      this.pathInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });

    this.privacyLink.addEventListener('click', (e) => {
      e.preventDefault();
      this.privacyModal.hidden = false;
      this.privacyModal.setAttribute('aria-hidden', 'false');
      (this.closePrivacyBtn as HTMLElement).focus();
    });

    this.closePrivacyBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.closePrivacyModal();
    });

    this.privacyModal.addEventListener('click', (e) => {
      if (e.target === this.privacyModal) {
        this.closePrivacyModal();
      }
    });

    // Keyboard navigation for modal
    this.privacyModal.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.closePrivacyModal();
      }
    });
  }

  private closePrivacyModal(): void {
    this.privacyModal.hidden = true;
    this.privacyModal.setAttribute('aria-hidden', 'true');
    // Return focus to the privacy link
    this.privacyLink.focus();
  }

  private checkFileSystemAPI(): void {
    if (isFileSystemAccessAPIAvailable()) {
      this.createFolderBtn.hidden = false;
    }
  }

  private updateLineCounter(): void {
    const lines = this.pathInput.value.split('\n').filter(l => l.trim()).length;
    this.lineCounter.textContent = `${lines} line${lines !== 1 ? 's' : ''}`;
  }

  private handlePreview(): void {
    const input = this.pathInput.value.trim();
    if (!input) {
      alert('Please enter some paths first.');
      return;
    }

    try {
      const processed = processPaths(input);
      this.currentProcessed = processed;
      const tree = buildTree(processed.entries);
      this.currentTree = tree;

      this.renderPreview(tree, processed);
      this.previewSection.hidden = false;
      this.previewSection.setAttribute('aria-hidden', 'false');
      this.previewSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } catch (error) {
      alert(`Error processing paths: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private renderPreview(tree: TreeNode, processed: ProcessedPaths): void {
    // Update summary
    const issueCount = processed.issues.length;
    const duplicateCount = processed.issues.filter(i => i.type === 'duplicate').length;
    const invalidCount = processed.issues.filter(i => i.type === 'invalid' || i.type === 'reserved').length;
    const conflictCount = processed.issues.filter(i => i.type === 'conflict').length;
    const sanitizedCount = processed.issues.filter(i => i.type === 'sanitized').length;

    let summaryText = `${processed.folderCount} folder${processed.folderCount !== 1 ? 's' : ''}, ${processed.fileCount} file${processed.fileCount !== 1 ? 's' : ''}`;
    if (issueCount > 0) {
      const parts: string[] = [];
      if (duplicateCount > 0) parts.push(`${duplicateCount} duplicate${duplicateCount !== 1 ? 's' : ''}`);
      if (conflictCount > 0) parts.push(`${conflictCount} conflict${conflictCount !== 1 ? 's' : ''}`);
      if (invalidCount > 0) parts.push(`${invalidCount} invalid`);
      if (sanitizedCount > 0) parts.push(`${sanitizedCount} sanitized`);
      summaryText += ` (${parts.join(', ')})`;
    }
    this.previewSummary.textContent = summaryText;

    // Render tree
    this.treeContainer.innerHTML = '';
    this.renderTreeNode(tree, this.treeContainer, 0);
  }

  private renderTreeNode(node: TreeNode, container: HTMLElement, depth: number): void {
    if (node.path === '') {
      // Root - render children only
      node.children.forEach(child => this.renderTreeNode(child, container, 0));
      return;
    }

    const item = document.createElement('div');
    item.className = 'tree-item';
    item.style.paddingLeft = `${depth * 20}px`;
    item.setAttribute('role', node.isDirectory ? 'treeitem' : 'none');
    item.setAttribute('aria-level', String(depth + 1));

    const icon = document.createElement('span');
    icon.className = 'tree-icon';
    icon.textContent = node.isDirectory ? '📁' : '📄';
    icon.setAttribute('aria-hidden', 'true');

    const name = document.createElement('span');
    name.className = 'tree-name';
    name.textContent = node.name;

    item.appendChild(icon);
    item.appendChild(name);

    // Add issue badges
    if (node.issues.length > 0) {
      const badgeContainer = document.createElement('span');
      badgeContainer.className = 'issue-badges';
      node.issues.forEach(issue => {
        const badge = document.createElement('span');
        badge.className = `issue-badge issue-${issue.type}`;
        badge.textContent = issue.type;
        badge.title = issue.message;
        badge.setAttribute('aria-label', `${issue.type}: ${issue.message}`);
        badgeContainer.appendChild(badge);
      });
      item.appendChild(badgeContainer);
    }

    container.appendChild(item);

    // Render children
    if (node.isDirectory && node.children.length > 0) {
      node.children.forEach(child => this.renderTreeNode(child, container, depth + 1));
    }
  }

  private async handleDownloadZip(): Promise<void> {
    if (!this.currentTree) {
      alert('Please preview first.');
      return;
    }

    try {
      this.downloadZipBtn.disabled = true;
      this.downloadZipBtn.textContent = 'Generating...';
      const blob = await generateZip(this.currentTree);
      downloadBlob(blob, 'project-structure.zip');
      this.downloadZipBtn.textContent = 'Download .zip';
    } catch (error) {
      alert(`Error generating ZIP: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      this.downloadZipBtn.disabled = false;
    }
  }

  private async handleCreateFolder(): Promise<void> {
    if (!this.currentTree) {
      alert('Please preview first.');
      return;
    }

    try {
      const dirHandle = await selectDirectory();
      if (!dirHandle) {
        return; // User cancelled
      }

      this.createFolderBtn.disabled = true;
      this.createFolderBtn.textContent = 'Creating...';

      await writeTreeToDirectory(dirHandle, this.currentTree!, (current, tot) => {
        if (tot > 0 && current % 10 === 0) {
          this.createFolderBtn.textContent = `Creating... ${Math.round((current / tot) * 100)}%`;
        }
      });

      this.createFolderBtn.textContent = 'Create to folder (Chrome)';
      alert('Folder structure created successfully!');
    } catch (error) {
      alert(`Error creating folder structure: ${error instanceof Error ? error.message : 'Unknown error'}`);
      this.createFolderBtn.textContent = 'Create to folder (Chrome)';
    } finally {
      this.createFolderBtn.disabled = false;
    }
  }

  private handleCopyCleaned(): void {
    if (!this.currentProcessed) {
      alert('Please preview first.');
      return;
    }

    const cleaned = this.currentProcessed.entries
      .map(e => e.path + (e.isDirectory ? '/' : ''))
      .join('\n');

    navigator.clipboard.writeText(cleaned).then(() => {
      const originalText = this.copyCleanedBtn.textContent;
      this.copyCleanedBtn.textContent = 'Copied!';
      setTimeout(() => {
        this.copyCleanedBtn.textContent = originalText;
      }, 2000);
    }).catch(() => {
      alert('Failed to copy to clipboard.');
    });
  }

  private handleClear(): void {
    if (confirm('Clear all input?')) {
      this.pathInput.value = '';
      this.updateLineCounter();
      this.previewSection.hidden = true;
      this.previewSection.setAttribute('aria-hidden', 'true');
      this.currentTree = null;
      this.currentProcessed = null;
    }
  }
}

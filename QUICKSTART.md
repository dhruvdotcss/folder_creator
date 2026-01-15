# Quick Start Guide

## First Time Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Start development server:**
   ```bash
   npm run dev
   ```

3. **Open in browser:**
   Navigate to http://localhost:3000

## Testing

```bash
# Run E2E tests (requires dev server running)
npm test

# Run unit tests
npm run test:unit
```

## Building for Production

```bash
npm run build
```

The built files will be in the `dist/` directory, ready to deploy to any static hosting service.

## Example Usage

1. Paste paths into the textarea:
   ```
   src/components/
   src/components/Button.tsx
   src/utils/helpers.ts
   README.md
   ```

2. Click **Preview** to see the structure

3. Click **Download .zip** to get the folder structure as a ZIP file

4. (Chrome only) Click **Create to folder** to write directly to your disk

## Project Structure

```
folder_creator/
├── src/
│   ├── app.ts              # Main app logic
│   ├── path-processor.ts   # Path validation & processing
│   ├── tree-builder.ts     # Tree structure building
│   ├── zip-generator.ts    # ZIP file generation
│   ├── file-system-api.ts  # File System Access API wrapper
│   ├── types.ts            # TypeScript type definitions
│   ├── main.ts             # Entry point
│   └── style.css           # Styles
├── tests/
│   ├── e2e.spec.ts         # Playwright E2E tests
│   └── path-processor.test.ts  # Unit tests
├── index.html
├── package.json
├── vite.config.ts
├── tsconfig.json
└── README.md
```

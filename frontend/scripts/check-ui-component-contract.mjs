#!/usr/bin/env node

// Copyright 2025, Command Line Inc.
// SPDX-License-Identifier: Apache-2.0

/**
 * UI Component Contract Checker
 * 
 * Validates that registered UI components conform to the four-file component convention:
 * - <Name>.style.scss
 * - <Name>.logic.ts
 * - <Name>.template.tsx
 * - <Name>.story.tsx
 * - index.ts
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..", "..");
const contractPath = path.join(repoRoot, "frontend", "ui", "component-contract.json");

const REQUIRED_FILES = ["style.scss", "logic.ts", "template.tsx", "story.tsx", "index.ts"];
const OLD_FILES = ["tsx", "scss"]; // Old convention files to flag

let hasErrors = false;

function error(msg) {
  console.error(`❌ ${msg}`);
  hasErrors = true;
}

function success(msg) {
  console.log(`✓ ${msg}`);
}

function warn(msg) {
  console.warn(`⚠ ${msg}`);
}

try {
  if (!fs.existsSync(contractPath)) {
    error(`Contract manifest not found: ${contractPath}`);
    process.exit(1);
  }

  const manifest = JSON.parse(fs.readFileSync(contractPath, "utf-8"));

  if (!manifest.components || !Array.isArray(manifest.components)) {
    error("Contract manifest must have a 'components' array");
    process.exit(1);
  }

  if (manifest.components.length === 0) {
    success("No components registered yet");
    process.exit(0);
  }

  for (const component of manifest.components) {
    const { name, layer, dir } = component;

    if (!name || !layer || !dir) {
      error(`Component entry missing required fields: ${JSON.stringify(component)}`);
      continue;
    }

    const componentDir = path.join(repoRoot, "frontend", dir);

    if (!fs.existsSync(componentDir)) {
      error(`Component directory not found: ${componentDir}`);
      continue;
    }

    // Check for required files
    const missingFiles = [];
    for (const file of REQUIRED_FILES) {
      // index.ts doesn't have component name prefix
      const fileName = file === "index.ts" ? file : `${name}.${file}`;
      const filePath = path.join(componentDir, fileName);
      if (!fs.existsSync(filePath)) {
        missingFiles.push(fileName);
      }
    }

    if (missingFiles.length > 0) {
      error(
        `${name} missing required files: ${missingFiles.join(", ")} ` +
        `(checked in ${componentDir})`
      );
    } else {
      success(`${name} has all required files`);
    }

    // Check for old-style files and fail for registered components
    for (const ext of OLD_FILES) {
      const oldFileName = `${name}.${ext}`;
      const oldFilePath = path.join(componentDir, oldFileName);
      if (fs.existsSync(oldFilePath)) {
        error(
          `${name} has old-style file: ${oldFileName} which violates the four-file convention. ` +
          `This file must be removed.`
        );
      }
    }

    // Check that template.tsx imports its local style file
    const templateFilePath = path.join(componentDir, `${name}.template.tsx`);
    if (fs.existsSync(templateFilePath)) {
      const templateContent = fs.readFileSync(templateFilePath, "utf-8");
      const styleImportPattern = new RegExp(`import\\s+["\']\\.\/${name}\\.style\\.scss["\']`);
      if (!styleImportPattern.test(templateContent)) {
        error(
          `[ui-contract] ${name}: template file must import "./${name}.style.scss" ` +
          `(missing from ${templateFilePath})`
        );
      }
    }
  }

  if (hasErrors) {
    process.exit(1);
  }
} catch (err) {
  error(`Failed to read contract manifest: ${err.message}`);
  process.exit(1);
}

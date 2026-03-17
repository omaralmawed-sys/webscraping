---
name: dev-booster
description: A comprehensive code audit and improvement workflow. Use /dev-booster to run sequential checks for code quality, simplification, UI/UX audit, testing, and documentation across the Chrome extension project.
---

# Dev Booster

The `dev-booster` command automates the review and enhancement of your Chrome extension's codebase. It coordinates multiple specialized sub-agents to ensure high engineering standards, clean UI, and robust logic.

## Workflow

When triggered, `dev-booster` performs the following steps sequentially. Use sub-agents (especially `generalist` and `codebase_investigator`) to execute each task.

### 1. Code Quality & Standards Audit
- **Goal**: Identify and fix issues like linting errors, insecure practices, or violations of project standards.
- **Actions**:
  - Scan `popup.js`, `background.js`, and `modules/*.js` for common JS anti-patterns (e.g., use of `var`, inconsistent naming, missing error handling).
  - Use `references/quality_standards.md` as the source of truth for standards.
  - Suggest or apply surgical fixes using `replace`.

### 2. Code Simplification & Refactoring
- **Goal**: Reduce cognitive load and improve maintainability by simplifying complex logic.
- **Actions**:
  - Identify bloated functions (especially in `popup.js` or scrapers).
  - Refactor long `if/else` chains or nested callbacks into cleaner abstractions.
  - Suggest modularization if logic is better suited for a file in `modules/`.

### 3. UI/UX Audit
- **Goal**: Ensure the extension's user interface is professional, responsive, and accessible.
- **Actions**:
  - Review `popup.html` for semantic HTML and accessibility.
  - Audit `style.css` for clean design, consistent spacing, and responsiveness within the Chrome side panel constraints.
  - Propose visual improvements to the `popup.html` structure.

### 4. Logic & Testing
- **Goal**: Verify core functionality and ensure robustness.
- **Actions**:
  - Analyze `modules/utils.js` and `modules/api.js` for edge cases.
  - Propose or create unit test cases (using a framework like Jest if applicable, or simple verification scripts).
  - Mock Chrome API calls where needed to ensure tests can run in a headless environment.

### 5. Documentation & Metadata
- **Goal**: Keep the project understandable for other developers.
- **Actions**:
  - Ensure all functions in `modules/` have valid JSDoc.
  - Update `README.md` if new features or technical changes were introduced.
  - Verify that `manifest.json` matches the current capabilities and permissions.

## Resources

- **references/quality_standards.md**: Project-specific coding and UI standards.
- **scripts/**: Future home for automated audit scripts (optional).

## Usage Examples

- `/dev-booster`: Runs the full sequential audit on the entire project.
- `/dev-booster on popup.js`: Runs the audit specifically for the popup logic.
- `/dev-booster simplify`: Skips to the simplification and refactoring phase.

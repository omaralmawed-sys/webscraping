# Code Quality Standards for Recruiting Tools

## JavaScript Standards
- **Naming**: Use camelCase for variables and functions. PascalCase for classes.
- **Modern JS**: Prefer `const` and `let` over `var`. Use arrow functions where appropriate.
- **Error Handling**: Use `try...catch` blocks for API calls and background communication.
- **Modularity**: Logic should be moved to the `modules/` directory when possible. Avoid bloated `popup.js`.
- **Async/Await**: Use `async/await` for asynchronous operations. Avoid callback hell.

## UI/UX Standards
- **Responsiveness**: The side panel should look good at various widths.
- **Accessibility**: Use semantic HTML tags. Ensure high contrast for text.
- **Feedback**: Provide loading states for all background operations.

## Documentation
- **JSDoc**: All functions in `modules/` should have JSDoc comments describing parameters and return values.
- **Comments**: Explain *why* something is done, not just *what* is being done.

## Testing
- **Unit Tests**: Pure logic in `modules/utils.js` and `modules/api.js` should be testable.
- **Chrome APIs**: Mock `chrome.tabs`, `chrome.storage`, and `chrome.runtime` where necessary.

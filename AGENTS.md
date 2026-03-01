# AGENTS.md

## Project overview
- This repository is a multi-project workspace for agent tooling, docs, and experiments.
- Top-level content includes Python, Node.js, and documentation-heavy subprojects.
- Treat this repository as a **monorepo**: inspect the local folder you are editing before choosing build/test commands.

## Working conventions for coding agents
- Prefer small, focused changes with clear commit messages.
- Before editing, quickly scan nearby files for existing patterns (naming, formatting, structure).
- Avoid broad refactors unless explicitly requested.
- When touching multiple subprojects, keep each change scoped and easy to review.

## Build and test commands
Use only the commands relevant to the area you changed.

### Repository-level verification
- `make verify` — runs fixture verification checks configured in the root `Makefile`.

### Python projects
- Create/use a local virtual environment when practical.
- Run tests/checks from the project directory you changed.
- Prefer:
  - `python -m pytest`
  - `python -m pip install -r requirements.txt` (if needed for local checks)

### Node.js projects
- Install dependencies in the target package directory:
  - `npm ci`
- Run package checks/tests when available:
  - `npm test`
  - `npm run lint`

## Code style guidelines

### General
- Follow existing style in each directory; do not introduce new formatting conventions without need.
- Keep functions small and readable.
- Add comments only when intent is non-obvious.

### Python
- Prefer type hints for new/changed code when the surrounding code uses them.
- Favor explicit, descriptive names over abbreviations.

### JavaScript/TypeScript
- Match the package’s module style and script conventions.
- Avoid adding new dependencies unless required.

### Docs
- Use concise headings and short sections.
- Keep examples runnable or clearly marked as pseudocode.

## Testing instructions
- Run the smallest meaningful test set first, then broader checks if needed.
- For bug fixes, add or update tests when a local test suite exists.
- Include the exact commands run and their outcomes in your final summary.
- If a command cannot run due to environment constraints, report the limitation clearly.

## Security considerations
- Never commit secrets, API keys, service account files, or `.env` contents.
- Avoid logging sensitive values in code or examples.
- Treat external input as untrusted; validate and sanitize where relevant.
- Minimize dependency changes and prefer pinned/explicit versions when adding new tooling.

## Commit and pull request guidelines
- Use imperative commit subjects (e.g., `Add root AGENTS guide for repository workflows`).
- Keep commit subject lines concise and descriptive.
- PR descriptions should include:
  - What changed
  - Why it changed
  - How it was validated (commands + results)
  - Any follow-up work or known limitations

## Monorepo guidance for nested AGENTS.md
- Add nested `AGENTS.md` files inside subprojects that need specialized instructions.
- The nearest `AGENTS.md` to a file takes precedence for that subtree.
- Keep nested files focused on local build/test/style expectations to reduce ambiguity.

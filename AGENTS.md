## Project Configuration

- **Language**: TypeScript
- **Package Manager**: npm
- **Add-ons**: prettier, eslint, tailwindcss, sveltekit-adapter, ai-tools

## Language

All language in this project is English: UI copy, docs, spec, comments, commit messages, identifiers that are words and error messages. Book content is an exception.

The v1 product spec is `SPEC.md`. Follow it when implementing. Do not expand v1 into listed non-goals.

## Git commits

These rules bind agents, not human commits.

Commit only when the user explicitly asks to create a git commit (for example: commit, git commit, check in, make a commit). Match that same intent if the user is not writing in English. Do not treat done, LGTM, looks good, ship it, or finish this as a commit request.

When committing:

- Stage only files from the work just done. Never `git add -A`.
- Make one commit per request unless the user asks to split.
- Do not amend, force-push, or skip hooks.
- If other dirty files are present, ask before staging them.
- Do not add trailers (Co-authored-by, Signed-off-by, Made-with, and similar) unless the user asks.

Subject form: `<emoji> <type>: <description>`

- `✨ feat: add zen pair view`
- Allowed types and emojis: feat ✨, fix 🐛, docs 📝, refactor ♻️, test ✅, chore 🔧
- No other types. No scopes.
- Description: imperative, lowercase first letter, no trailing period, 72 characters or fewer.
- User-visible data, schema, or behavior breaks: `✨ feat!: change pair storage shape` (same emoji, `!` after the type). No `BREAKING CHANGE` footer.
- If the user provides a message, rewrite it to this convention unless they ask to use that exact message.

Add a body only when the reason is not obvious from the subject. Separate it with a blank line. Explain why, not a list of files.

---

You are able to use the official Svelte AI tools: MCP server, skills, and the `svelte-file-editor` subagent. Use them whenever writing, editing, or reviewing Svelte 5 / SvelteKit code.

## Available Svelte MCP Tools

In Grok, discover these with `search_tool` (query: `svelte`) and call them with `use_tool`. Tool names are:

- `svelte__list-sections`
- `svelte__get-documentation`
- `svelte__svelte-autofixer`
- `svelte__playground-link`

If MCP is unavailable, use the `svelte-code-writer` skill (`npx -y @sveltejs/mcp`).

### 1. list-sections

Use this FIRST to discover all available documentation sections. Returns a structured list with titles, use_cases, and paths.
When asked about Svelte or SvelteKit topics, ALWAYS use this tool at the start of the chat to find relevant sections.

### 2. get-documentation

Retrieves full documentation content for specific sections. Accepts single or multiple sections.
After calling the list-sections tool, you MUST analyze the returned documentation sections (especially the use_cases field) and then use the get-documentation tool to fetch ALL documentation sections that are relevant for the user's task.

### 3. svelte-autofixer

Analyzes Svelte code and returns issues and suggestions.
You MUST use this tool whenever writing Svelte code before sending it to the user. Keep calling it until no issues or suggestions are returned.

### 4. playground-link

Generates a Svelte Playground link with the provided code.
After completing the code, ask the user if they want a playground link. Only call this tool after user confirmation and NEVER if code was written to files in their project.

## Skills

- `svelte-core-bestpractices` — load when writing or reviewing `.svelte` / `.svelte.ts` / `.svelte.js` files
- `svelte-code-writer` — CLI fallback for the same MCP tools via `npx -y @sveltejs/mcp`

## Subagent

When creating, editing, or reviewing Svelte files, prefer the `svelte-file-editor` subagent (`spawn_subagent` with `subagent_type: svelte-file-editor`).

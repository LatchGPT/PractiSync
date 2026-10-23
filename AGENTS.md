<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Notion tickets

- For explicit requests to create a project ticket, use the direct Notion API helper: `pnpm notion:ticket -- --title "..." --description "..."` (optional: `--priority "..." --requested-by "..."`).
- Do not use the Notion MCP for this ticket workflow. The helper reads `NOTION_API_KEY` and `NOTION_TICKETS_DATA_SOURCE_ID` from the teammate's local `.env.local`; never print, commit, or pass the API key as a command-line argument.
- Create a ticket only when the user asks. Include only project-relevant details; never include credentials or real student personal data.

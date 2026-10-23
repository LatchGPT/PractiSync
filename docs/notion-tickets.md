# Notion ticket creation for coding agents

PractiSync provides a small CLI that creates tickets through the Notion REST API. Codex and Gemini in Antigravity can both invoke it from the repository terminal. It does not use the Notion MCP.

## One-time Notion setup

1. Create or choose a Notion ticket database in the personal workspace.
2. Give the `PractiSync` integration access to that database/data source. It needs read-content and insert-content capabilities.
3. Copy the data source ID and provide the integration key to teammates through a secure secret-sharing channel.

Each teammate adds these values to their ignored local `.env.local` file:

```dotenv
NOTION_API_KEY=your-integration-secret
NOTION_TICKETS_DATA_SOURCE_ID=your-data-source-id
```

Never commit or paste the API key into prompts, source code, or command arguments. With a shared integration key, Notion records the integration bot as the creator; `--requested-by` adds the teammate's name to the ticket body for attribution.

The database needs a title property. A `Priority` select or status property is optional; if present, `--priority` must match one of its existing options.

## Create a ticket

```powershell
pnpm notion:ticket -- --title "Add practicum calendar export" --description "Allow coordinators to export the visible calendar as CSV." --priority "High" --requested-by "Teammate name"
```

`--title` is required. `--description`, `--priority`, and `--requested-by` are optional. The CLI prints the created Notion page link and never prints the API key.

The shared `AGENTS.md` tells Codex and Antigravity agents to use this command only when a teammate explicitly asks to create a ticket. Notion's API version is pinned in the script; see the [Notion create-page reference](https://developers.notion.com/reference/post-page) and [Antigravity workspace rules](https://www.antigravity.google/docs/rules/).

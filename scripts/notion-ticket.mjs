const apiVersion = '2026-03-11';
const apiBase = 'https://api.notion.com/v1';

function usage() {
  return [
    'Create a ticket in the configured Notion data source.',
    '',
    'Usage:',
    '  pnpm notion:ticket -- --title "Short title" --description "Context and acceptance criteria"',
    '    [--priority "High"] [--requested-by "Teammate name"]',
    '',
    'Requires NOTION_API_KEY and NOTION_TICKETS_DATA_SOURCE_ID in .env.local.',
  ].join('\n');
}

function parseArgs(argv) {
  const result = {};
  const options = new Set(['--title', '--description', '--priority', '--requested-by']);

  for (let index = 0; index < argv.length; index += 1) {
    const option = argv[index];
    if (option === '--help' || option === '-h') return { help: true };
    if (!options.has(option)) throw new Error(`Unknown option: ${option}\n\n${usage()}`);
    if (result[option]) throw new Error(`Option ${option} can only be supplied once.`);

    const value = argv[index + 1];
    if (!value || value.startsWith('--')) throw new Error(`Option ${option} needs a value.`);
    result[option] = value;
    index += 1;
  }

  if (!result['--title']?.trim()) throw new Error(`A non-empty --title is required.\n\n${usage()}`);
  if ((result['--title']?.length ?? 0) > 2000) throw new Error('The ticket title cannot exceed 2,000 characters.');
  if ((result['--description']?.length ?? 0) > 20000) throw new Error('The ticket description cannot exceed 20,000 characters.');
  return { title: result['--title'].trim(), description: result['--description']?.trim(), priority: result['--priority']?.trim(), requestedBy: result['--requested-by']?.trim() };
}

function richText(value) {
  const pieces = value.match(/[\s\S]{1,2000}/g) ?? [];
  return pieces.map(content => ({ type: 'text', text: { content } }));
}

async function notionRequest(path, { method = 'GET', body } = {}) {
  const response = await fetch(`${apiBase}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${process.env.NOTION_API_KEY}`,
      'Notion-Version': apiVersion,
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
    signal: AbortSignal.timeout(20000),
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    if (response.status === 404) {
      throw new Error('Notion could not find this data source or the integration cannot access it. Share the data source with the PractiSync integration and check NOTION_TICKETS_DATA_SOURCE_ID.');
    }
    if (response.status === 403) {
      throw new Error('The PractiSync integration needs read-content and insert-content access to the ticket data source.');
    }
    throw new Error(`Notion API error (${response.status}${payload.code ? `, ${payload.code}` : ''}): ${payload.message ?? 'Request failed.'}`);
  }
  return payload;
}

function buildPriorityProperty(properties, requestedPriority) {
  if (!requestedPriority) return;
  const entry = Object.entries(properties).find(([name]) => name.trim().toLowerCase() === 'priority');
  if (!entry) throw new Error('This data source has no Priority property. Omit --priority or add a Priority property in Notion.');

  const [name, schema] = entry;
  const kind = schema.type;
  if (kind !== 'select' && kind !== 'status') throw new Error(`The Notion Priority property must be a select or status property (currently ${kind}).`);

  const options = schema[kind]?.options ?? [];
  const option = options.find(candidate => candidate.name.toLowerCase() === requestedPriority.toLowerCase());
  if (!option) throw new Error(`Priority "${requestedPriority}" is not an option in Notion. Available options: ${options.map(candidate => candidate.name).join(', ') || 'none'}.`);

  return { name, value: { [kind]: { name: option.name } } };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    console.log(usage());
    return;
  }

  const token = process.env.NOTION_API_KEY;
  const dataSourceId = process.env.NOTION_TICKETS_DATA_SOURCE_ID?.trim();
  if (!token) throw new Error('NOTION_API_KEY is missing. Set it in your local .env.local file.');
  if (!dataSourceId) throw new Error('NOTION_TICKETS_DATA_SOURCE_ID is missing. Set it in your local .env.local file.');

  const source = await notionRequest(`/data_sources/${encodeURIComponent(dataSourceId)}`);
  const properties = source.properties ?? {};
  const titleEntry = Object.entries(properties).find(([, schema]) => schema.type === 'title');
  if (!titleEntry) throw new Error('The configured Notion data source has no title property.');

  const notionProperties = { [titleEntry[0]]: { title: richText(args.title) } };
  const priority = buildPriorityProperty(properties, args.priority);
  if (priority) notionProperties[priority.name] = priority.value;

  const children = [];
  if (args.description) {
    children.push({ object: 'block', type: 'heading_3', heading_3: { rich_text: richText('Description') } });
    children.push({ object: 'block', type: 'paragraph', paragraph: { rich_text: richText(args.description) } });
  }
  if (args.requestedBy) {
    children.push({ object: 'block', type: 'paragraph', paragraph: { rich_text: richText(`Requested by: ${args.requestedBy}`) } });
  }

  const page = await notionRequest('/pages', {
    method: 'POST',
    body: { parent: { data_source_id: dataSourceId }, properties: notionProperties, ...(children.length ? { children } : {}) },
  });

  console.log(`Ticket created: ${args.title}`);
  if (page.url) console.log(page.url);
}

main().catch(error => {
  console.error(error instanceof Error ? error.message : 'Could not create the Notion ticket.');
  process.exitCode = 1;
});

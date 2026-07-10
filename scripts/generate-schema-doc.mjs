// Generates docs/DATABASE_SCHEMA.md directly from the live Supabase project
// by reading the PostgREST-generated OpenAPI spec (GET /rest/v1/), which
// describes every table/view exposed in the `public` schema: columns, types,
// defaults, enums, primary keys and foreign keys.
//
// Usage:
//   node scripts/generate-schema-doc.mjs
//
// Requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY to be set
// (already present in .env.local).
import fs from "node:fs"
import path from "node:path"

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in the environment.")
  console.error("Run with: node -r dotenv/config scripts/generate-schema-doc.mjs, or export them first.")
  process.exit(1)
}

const SYSTEM_TABLES = new Set(["geography_columns", "geometry_columns", "spatial_ref_sys"])

function parseAnnotations(description) {
  if (!description) return { isPrimaryKey: false, fk: null }
  const isPrimaryKey = /<pk\/>/.test(description)
  const fkMatch = description.match(/<fk table='([^']+)' column='([^']+)'\/>/)
  const fk = fkMatch ? { table: fkMatch[1], column: fkMatch[2] } : null
  return { isPrimaryKey, fk }
}

function renderTable(name, def) {
  const required = new Set(def.required || [])
  const props = def.properties || {}

  let md = `## ${name}\n\n`
  md += `| Column | Type | Format | Nullable | Default | Notes |\n`
  md += `|---|---|---|---|---|---|\n`

  const fks = []
  for (const [col, spec] of Object.entries(props)) {
    const { isPrimaryKey, fk } = parseAnnotations(spec.description)
    const notes = []
    if (isPrimaryKey) notes.push("PK")
    if (fk) {
      notes.push(`FK → ${fk.table}.${fk.column}`)
      fks.push({ col, table: fk.table, column: fk.column })
    }
    if (spec.enum) notes.push(`enum: ${spec.enum.join(", ")}`)

    const nullable = required.has(col) ? "NOT NULL" : "nullable"
    md += `| ${col} | ${spec.type ?? ""} | ${spec.format ?? ""} | ${nullable} | ${spec.default ?? ""} | ${notes.join("; ")} |\n`
  }

  if (fks.length) {
    md += `\n**Foreign keys:**\n\n`
    for (const fk of fks) md += `- \`${fk.col}\` → \`${fk.table}.${fk.column}\`\n`
  }

  md += "\n---\n\n"
  return md
}

async function main() {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/`, {
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
    },
  })

  if (!res.ok) {
    console.error(`Request failed: ${res.status} ${res.statusText}`)
    process.exit(1)
  }

  const spec = await res.json()
  const defs = spec.definitions || spec.components?.schemas || {}
  const allNames = Object.keys(defs).sort()

  const tables = allNames.filter((n) => !SYSTEM_TABLES.has(n) && !n.startsWith("v_") && !n.startsWith("vw_"))
  const views = allNames.filter((n) => n.startsWith("v_") || n.startsWith("vw_"))

  let md = `# Database schema\n\n`
  md += `Generated directly from the live Supabase project via the PostgREST OpenAPI spec (\`${SUPABASE_URL}/rest/v1/\`).\n\n`
  md += `## Tables (${tables.length})\n\n`
  md += tables.map((n) => `- [${n}](#${n.toLowerCase().replace(/_/g, "-")})`).join("\n")
  md += `\n\n## Views (${views.length})\n\n`
  md += views.map((n) => `- [${n}](#${n.toLowerCase().replace(/_/g, "-")})`).join("\n")
  md += "\n\n---\n\n"

  for (const name of tables) md += renderTable(name, defs[name])
  if (views.length) {
    md += `# Views\n\n`
    for (const name of views) md += renderTable(name, defs[name])
  }

  const outDir = path.join(process.cwd(), "docs")
  fs.mkdirSync(outDir, { recursive: true })
  const outPath = path.join(outDir, "DATABASE_SCHEMA.md")
  fs.writeFileSync(outPath, md, "utf8")
  console.log(`Written ${outPath} (${tables.length} tables, ${views.length} views)`)
}

main()

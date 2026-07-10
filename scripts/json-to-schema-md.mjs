// Converts the JSON blob produced by the last query in
// scripts/99-schema-introspection.sql into docs/DATABASE_SCHEMA.md.
//
// Usage:
//   1. Run scripts/99-schema-introspection.sql in the Supabase SQL Editor.
//   2. Click the result cell of the final query (schema_json) and copy its
//      JSON value into a file, e.g. scratch/schema.json.
//   3. node scripts/json-to-schema-md.mjs scratch/schema.json
//
import fs from "node:fs"
import path from "node:path"

const inputPath = process.argv[2]
if (!inputPath) {
  console.error("Usage: node scripts/json-to-schema-md.mjs <schema.json>")
  process.exit(1)
}

const raw = fs.readFileSync(inputPath, "utf8")
const schema = JSON.parse(raw)

const tables = schema.tables ?? []
const foreignKeys = schema.foreign_keys ?? []
const rlsPolicies = schema.rls_policies ?? []

const fksByTable = new Map()
for (const fk of foreignKeys) {
  if (!fksByTable.has(fk.source_table)) fksByTable.set(fk.source_table, [])
  fksByTable.get(fk.source_table).push(fk)
}

const policiesByTable = new Map()
for (const p of rlsPolicies) {
  if (!policiesByTable.has(p.table_name)) policiesByTable.set(p.table_name, [])
  policiesByTable.get(p.table_name).push(p)
}

let md = `# Database schema\n\n`
md += `Generated from a live introspection of the Supabase Postgres database (\`public\` schema).\n\n`
md += `## Tables\n\n`
md += tables
  .map((t) => t.table_name)
  .sort()
  .map((name) => `- [${name}](#${name.toLowerCase().replace(/_/g, "-")})`)
  .join("\n")
md += "\n\n---\n\n"

for (const table of [...tables].sort((a, b) => a.table_name.localeCompare(b.table_name))) {
  md += `## ${table.table_name}\n\n`
  md += `| Column | Type | Nullable | Default |\n`
  md += `|---|---|---|---|\n`
  for (const col of table.columns ?? []) {
    md += `| ${col.column_name} | ${col.data_type} | ${col.is_nullable} | ${col.column_default ?? ""} |\n`
  }

  const fks = fksByTable.get(table.table_name)
  if (fks?.length) {
    md += `\n**Foreign keys:**\n\n`
    for (const fk of fks) {
      md += `- \`${fk.source_column}\` → \`${fk.referenced_table}.${fk.referenced_column}\`\n`
    }
  }

  const policies = policiesByTable.get(table.table_name)
  if (policies?.length) {
    md += `\n**RLS policies:**\n\n`
    for (const p of policies) {
      md += `- ${p.policy_name} (${p.cmd}, roles: ${Array.isArray(p.roles) ? p.roles.join(", ") : p.roles})\n`
    }
  }

  md += "\n---\n\n"
}

const outDir = path.join(process.cwd(), "docs")
fs.mkdirSync(outDir, { recursive: true })
const outPath = path.join(outDir, "DATABASE_SCHEMA.md")
fs.writeFileSync(outPath, md, "utf8")
console.log(`Written ${outPath}`)

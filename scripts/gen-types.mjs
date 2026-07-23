import fs from "node:fs";
import path from "node:path";

const migDir = path.join(process.cwd(), "supabase", "migrations");
const files = fs.readdirSync(migDir).filter((f) => f.endsWith(".sql")).sort();
let sql = files.map((f) => fs.readFileSync(path.join(migDir, f), "utf8")).join("\n");
sql = sql.replace(/--.*$/gm, "");

const enumMap = {};
const enumRegex = /create type public\.(\w+) as enum \(([^)]+)\)/gs;
let m;
while ((m = enumRegex.exec(sql))) {
  const name = m[1];
  const values = m[2].split(",").map((v) => v.trim().replace(/^'/, "").replace(/'$/, ""));
  enumMap[name] = values;
}

function sqlTypeToTs(colType) {
  colType = colType.toLowerCase();
  for (const enumName of Object.keys(enumMap)) {
    if (colType.startsWith(`public.${enumName}`) || colType === enumName) {
      return enumMap[enumName].map((v) => `"${v}"`).join(" | ");
    }
  }
  if (colType.includes("uuid[]") || colType.includes("text[]")) return "string[]";
  if (colType.includes("uuid")) return "string";
  if (colType.includes("timestamptz") || colType.includes("timestamp") || colType.includes("date")) return "string";
  if (colType.includes("text") || colType.includes("varchar")) return "string";
  if (colType.includes("jsonb") || colType.includes("json")) return "Json";
  if (colType.includes("bool")) return "boolean";
  if (colType.match(/int|numeric|float|real|double/)) return "number";
  if (colType.includes("vector")) return "number[]";
  return "unknown";
}

function toPascal(s) {
  return s.split("_").map((p) => p[0].toUpperCase() + p.slice(1)).join("");
}

const tableRegex = /create table (?:if not exists )?public\.(\w+) \(([\s\S]*?)\n\);/gi;
let out = `// AUTO-GENERATED (best-effort) from supabase/migrations/*.sql by scripts/gen-types.mjs.
// Regenerate with the Supabase CLI (\`supabase gen types typescript\`) once a
// live project is connected -- this file is a development stand-in.

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

`;

const tables = [];
const tableCols = {};

while ((m = tableRegex.exec(sql))) {
  const tableName = m[1].toLowerCase();
  const body = m[2];
  if (!tableCols[tableName]) {
    tables.push(tableName);
    tableCols[tableName] = [];
  }
  const lines = body.split(/,\s*\n/).map((l) => l.trim()).filter(Boolean);
  for (const line of lines) {
    if (/^(unique|check|primary key|foreign key|constraint)/i.test(line)) continue;
    const colMatch = line.match(/^"?(\w+)"?\s+([\w.]+(?:\([^)]*\))?(?:\[\])?)\s*([\s\S]*)$/);
    if (!colMatch) continue;
    const [, colName, colType, rest] = colMatch;
    if (!colName || !colType) continue;
    if (["unique", "primary", "check", "constraint", "foreign"].includes(colName.toLowerCase())) continue;
    const tsType = sqlTypeToTs(colType.trim());
    const isPk = /primary key/i.test(rest) || /primary key/i.test(colType);
    const notNull = /not null/i.test(rest) || isPk;
    const optional = !notNull;
    if (!tableCols[tableName].some((c) => c.colName === colName)) {
      tableCols[tableName].push({ colName, tsType, optional });
    }
  }
}

// ALTER TABLE public.X ADD COLUMN [IF NOT EXISTS] name type [constraints];
// Each ADD COLUMN clause is parsed independently; a single ALTER TABLE
// statement may add several columns separated by commas.
const alterRegex = /alter table (?:only )?public\.(\w+)\s+([\s\S]*?);/gi;
while ((m = alterRegex.exec(sql))) {
  const tableName = m[1].toLowerCase();
  if (!tableCols[tableName]) continue; // column added to a table this script doesn't otherwise know about
  const clauseBody = m[2];
  const addColRegex = /add column\s+(?:if not exists\s+)?"?(\w+)"?\s+([\w.]+(?:\([^)]*\))?(?:\[\])?)\s*([^,]*)/gi;
  let am;
  while ((am = addColRegex.exec(clauseBody))) {
    const [, colName, colType, rest] = am;
    if (tableCols[tableName].some((c) => c.colName === colName)) continue;
    const tsType = sqlTypeToTs(colType.trim());
    const notNull = /not null/i.test(rest);
    tableCols[tableName].push({ colName, tsType, optional: !notNull });
  }
}

for (const tableName of tables) {
  out += `export interface ${toPascal(tableName)}Row {\n`;
  for (const c of tableCols[tableName]) {
    out += `  ${c.colName}: ${c.tsType}${c.optional ? " | null" : ""};\n`;
  }
  out += `}\n\n`;
}

out += `export interface Database {\n  public: {\n    Tables: {\n`;
for (const t of tables) {
  out += `      ${t}: { Row: ${toPascal(t)}Row; Insert: Partial<${toPascal(t)}Row>; Update: Partial<${toPascal(t)}Row>; Relationships: [] };\n`;
}
out += `    };
    Views: Record<string, never>;
    Functions: {
      assign_role: {
        Args: { p_user_id: string; p_role: string; p_scope_department_id?: string | null; p_scope_division_id?: string | null };
        Returns: void;
      };
      increment_resource_view_count: { Args: { p_resource_id: string }; Returns: void };
      increment_resource_download_count: { Args: { p_resource_id: string }; Returns: void };
      match_document_chunks: {
        Args: { p_query_embedding: number[]; p_allowed_resource_ids: string[]; p_match_count?: number; p_min_similarity?: number };
        Returns: { chunk_id: string; resource_id: string; content: string; section_reference: string | null; similarity: number }[];
      };
      current_user_role: { Args: Record<string, never>; Returns: string };
      is_admin: { Args: Record<string, never>; Returns: boolean };
      is_faculty_or_admin: { Args: Record<string, never>; Returns: boolean };
      assign_class_representative: {
        Args: { p_student_id: string; p_class_scope: Json; p_slot_number: number };
        Returns: void;
      };
      revoke_class_representative: {
        Args: { p_assignment_id: string; p_reason: string };
        Returns: void;
      };
      finalize_resource_upload_batch: {
        Args: { p_batch_id: string; p_files: Json; p_class_scopes: Json };
        Returns: string[];
      };
    };
    Enums: Record<string, never>;
  };
}
`;

fs.mkdirSync(path.join(process.cwd(), "src", "types"), { recursive: true });
fs.writeFileSync(path.join(process.cwd(), "src", "types", "database.types.ts"), out);
console.log(`Generated database.types.ts with ${tables.length} tables.`);

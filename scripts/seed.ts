/**
 * DEVELOPMENT-ONLY seed script. Populates a Supabase project with realistic
 * demo data: departments, programmes, and academic structure.
 *
 * NEVER run this against a production project.
 * Usage: npm run seed   (requires .env.local with SUPABASE_SERVICE_ROLE_KEY)
 */
import dotenv from "dotenv";
import path from "path";
dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local."
  );
  process.exit(1);
}

const admin = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });

const DOMAIN = process.env.ALLOWED_EMAIL_DOMAIN || "tcetmumbai.in";
const DEFAULT_PASSWORD = "CampusLearn!2026"; // dev-only

async function createAuthUser(email: string, fullName: string, password = DEFAULT_PASSWORD) {
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName },
  });
  if (error) {
    if (error.message.includes("already been registered")) {
      const { data: list } = await admin.auth.admin.listUsers();
      const existing = list?.users.find((u) => u.email === email);
      if (existing) return existing.id;
    }
    throw error;
  }
  return data.user!.id;
}

async function main() {
  console.log(`Seeding CampusLearn demo data (domain: @${DOMAIN})…`);

  // ---- Institution / academic structure -----------------------------------
  let { data: institution } = await admin.from("institutions").select().limit(1).single();
  if (!institution) {
    const { data: newInst, error: instError } = await admin.from("institutions").insert({ name: "Thakur College of Engineering and Technology", short_name: "TCET" }).select().single();
    if (instError) throw new Error("Institution error: " + instError.message);
    institution = newInst;
  }

  const depts = [
    { code: "CMPN", name: "Computer Engineering", pCode: "BE-CMPN", pName: "B.E. Computer Engineering" },
    { code: "IT", name: "Information Technology", pCode: "BE-IT", pName: "B.E. Information Technology" },
    { code: "EXTC", name: "Electronics & Telecommunication Engg.", pCode: "BE-EXTC", pName: "B.E. Electronics & Telecommunication Engg." },
    { code: "MECH", name: "Mechanical Engineering", pCode: "BE-MECH", pName: "B.E. Mechanical Engineering" },
    { code: "CIVIL", name: "Civil Engineering", pCode: "BE-CIVIL", pName: "B.E. Civil Engineering" },
    { code: "ECS", name: "Electronics & Computer Science", pCode: "BE-ECS", pName: "B.E. Electronics & Computer Science" },
    { code: "AIML", name: "AI & Machine Learning", pCode: "BE-AIML", pName: "B.E. AI & Machine Learning" },
    { code: "AIDS", name: "AI & Data Science", pCode: "BE-AIDS", pName: "B.E. AI & Data Science" },
    { code: "CYSE", name: "Cyber Security", pCode: "BE-CYSE", pName: "B.E. Cyber Security" },
    { code: "IOT", name: "Internet of Things", pCode: "BE-IOT", pName: "B.E. Internet of Things" },
    { code: "MTRX", name: "Mechatronics Engineering", pCode: "BE-MTRX", pName: "B.E. Mechatronics Engineering" }
  ];

  const deptMap = new Map();
  const progMap = new Map();

  for (const d of depts) {
    const { data: dept, error: deptError } = await admin.from("departments")
      .upsert({ institution_id: institution!.id, name: d.name, code: d.code }, { onConflict: "institution_id,code" })
      .select().single();
    if (deptError) throw new Error("Dept error: " + deptError.message);
    deptMap.set(d.code, dept);

    const { data: prog, error: progError } = await admin.from("programmes")
      .upsert({ department_id: dept!.id, name: d.pName, code: d.pCode, duration_years: 4 }, { onConflict: "department_id,code" })
      .select().single();
    if (progError) throw new Error("Prog error: " + progError.message);
    progMap.set(d.code, prog);
  }

  const { data: session, error: sessionError } = await admin
    .from("academic_years")
    .upsert({ label: "2026-2027", is_current: true, start_date: "2026-07-01", end_date: "2027-06-30" }, { onConflict: "label" })
    .select()
    .single();
  if (sessionError) throw new Error("Session error: " + sessionError.message);

  const years = [
    { name: "First Year", level: 1 },
    { name: "Second Year", level: 2 },
    { name: "Third Year", level: 3 },
    { name: "Final Year", level: 4 }
  ];

  const yearMap = new Map();
  for (const y of years) {
    const { data: year } = await admin.from("years_of_study")
      .upsert({ name: y.name, level: y.level }, { onConflict: "level" })
      .select().single();
    yearMap.set(y.level, year);
  }

  const semPromises = [];
  for (const d of depts) {
    const prog = progMap.get(d.code);
    for (let s = 1; s <= 8; s++) {
      const yearLevel = Math.ceil(s / 2);
      const yearId = yearMap.get(yearLevel).id;
      
      semPromises.push(async () => {
        const { data: sem } = await admin.from("semesters")
          .upsert({ programme_id: prog.id, academic_year_id: session.id, year_of_study_id: yearId, number: s, name: `Semester ${s}` }, { onConflict: "programme_id,academic_year_id,number" })
          .select().single();
          
        const divPromises = ["A", "B", "C", "D"].map(divName => 
          admin.from("divisions").upsert({ semester_id: sem.id, name: divName }, { onConflict: "semester_id,name" })
        );
        await Promise.all(divPromises);
      });
    }
  }

  // Execute in batches of 10 to avoid overwhelming the connection
  for (let i = 0; i < semPromises.length; i += 10) {
    await Promise.all(semPromises.slice(i, i + 10).map(fn => fn()));
  }

  // Insert super admin
  const superAdminEmail = process.env.SEED_SUPER_ADMIN_EMAIL || `admin@${DOMAIN}`;
  const superAdminPassword = process.env.SEED_SUPER_ADMIN_PASSWORD || DEFAULT_PASSWORD;
  const superAdminId = await createAuthUser(superAdminEmail, "System Administrator", superAdminPassword);
  await admin.from("profiles").update({ role: "super_admin", department_id: deptMap.get("CMPN")!.id }).eq("id", superAdminId);

  // Insert Dept Admin
  const deptAdminEmail = `deptadmin.ce@${DOMAIN}`;
  const deptAdminId = await createAuthUser(deptAdminEmail, "CE Dept Admin", DEFAULT_PASSWORD);
  await admin.from("profiles").update({ role: "dept_admin", department_id: deptMap.get("CMPN")!.id }).eq("id", deptAdminId);

  // Insert Faculty
  const facultyEmail = `faculty.sharma@${DOMAIN}`;
  const facultyId = await createAuthUser(facultyEmail, "Dr. Sharma", DEFAULT_PASSWORD);
  await admin.from("profiles").update({ role: "faculty", department_id: deptMap.get("CMPN")!.id }).eq("id", facultyId);

  // Insert Class Rep
  const crEmail = `cr.patel@${DOMAIN}`;
  const crId = await createAuthUser(crEmail, "CR Patel", DEFAULT_PASSWORD);
  await admin.from("profiles").update({ role: "class_rep", department_id: deptMap.get("CMPN")!.id, student_id: "TCET001" }).eq("id", crId);

  // Insert Student
  const studentEmail = `student.desai@${DOMAIN}`;
  const studentId = await createAuthUser(studentEmail, "Student Desai", DEFAULT_PASSWORD);
  await admin.from("profiles").update({ role: "student", department_id: deptMap.get("CMPN")!.id, student_id: "TCET002" }).eq("id", studentId);

  console.log("\nSeed complete.\n");
  console.log("=".repeat(72));
  console.log("DEVELOPMENT-ONLY DEMO CREDENTIALS (never use in production)");
  console.log("=".repeat(72));
  console.log(`Super Admin   : ${superAdminEmail} / ${superAdminPassword}`);
  console.log(`Dept Admin    : ${deptAdminEmail} / ${DEFAULT_PASSWORD}`);
  console.log(`Faculty       : ${facultyEmail} / ${DEFAULT_PASSWORD}`);
  console.log(`Class Rep     : ${crEmail} / ${DEFAULT_PASSWORD}`);
  console.log(`Student       : ${studentEmail} / ${DEFAULT_PASSWORD}`);
  console.log("=".repeat(72));
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Seed failed:", err);
    process.exit(1);
  });

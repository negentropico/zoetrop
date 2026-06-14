/**
 * tests/lib/schema-integrity.test.ts — Schema column assertions (ONB-01, ONB-02)
 *
 * Asserts that the Drizzle schema objects expose the expected columns for
 * the subjects table (8 new intake fields) and the invites table (subjectId).
 *
 * Technique: Drizzle table objects carry a `._.columns` map (or direct property
 * access via the column key) — we introspect those keys, not a live DB query.
 * This runs without any DB connection (no hasDb guard needed).
 *
 * Goes GREEN after Task 1 of Plan 01-01 (schema.ts edits).
 * Downstream plans that implement subjects.server / checklist.server will not
 * affect this test — it is schema-only.
 */

import { describe, it, expect } from "vitest";
import { subjects, invites } from "../../db/schema";

describe("subjects table schema — intake columns (ONB-01)", () => {
  it("exposes the 8 new nullable intake columns as Drizzle column objects", () => {
    // Drizzle table columns are accessible directly as table properties
    const cols = subjects;
    expect(cols.dob).toBeDefined();
    expect(cols.biologicalSex).toBeDefined();
    expect(cols.contactEmail).toBeDefined();
    expect(cols.contactPhone).toBeDefined();
    expect(cols.goals).toBeDefined();
    expect(cols.intakeNotes).toBeDefined();
    expect(cols.programType).toBeDefined();
    expect(cols.programStartDate).toBeDefined();
  });

  it("dob column has DB name 'dob'", () => {
    expect(subjects.dob.name).toBe("dob");
  });

  it("biologicalSex column has DB name 'biological_sex'", () => {
    expect(subjects.biologicalSex.name).toBe("biological_sex");
  });

  it("contactEmail column has DB name 'contact_email'", () => {
    expect(subjects.contactEmail.name).toBe("contact_email");
  });

  it("contactPhone column has DB name 'contact_phone'", () => {
    expect(subjects.contactPhone.name).toBe("contact_phone");
  });

  it("intakeNotes column has DB name 'intake_notes'", () => {
    expect(subjects.intakeNotes.name).toBe("intake_notes");
  });

  it("programType column has DB name 'program_type'", () => {
    expect(subjects.programType.name).toBe("program_type");
  });

  it("programStartDate column has DB name 'program_start_date'", () => {
    expect(subjects.programStartDate.name).toBe("program_start_date");
  });

  it("none of the new intake columns are required (all nullable)", () => {
    // Drizzle column .notNull property is true when .notNull() is chained
    expect((subjects.dob as { notNull?: boolean }).notNull).toBeFalsy();
    expect((subjects.biologicalSex as { notNull?: boolean }).notNull).toBeFalsy();
    expect((subjects.contactEmail as { notNull?: boolean }).notNull).toBeFalsy();
    expect((subjects.contactPhone as { notNull?: boolean }).notNull).toBeFalsy();
    expect((subjects.goals as { notNull?: boolean }).notNull).toBeFalsy();
    expect((subjects.intakeNotes as { notNull?: boolean }).notNull).toBeFalsy();
    expect((subjects.programType as { notNull?: boolean }).notNull).toBeFalsy();
    expect((subjects.programStartDate as { notNull?: boolean }).notNull).toBeFalsy();
  });
});

describe("invites table schema — subjectId column (ONB-02)", () => {
  it("exposes a subjectId column", () => {
    expect(invites.subjectId).toBeDefined();
  });

  it("subjectId column has DB name 'subject_id'", () => {
    expect(invites.subjectId.name).toBe("subject_id");
  });

  it("subjectId is nullable (no .notNull() — owner-bootstrap invites have no subject)", () => {
    expect((invites.subjectId as { notNull?: boolean }).notNull).toBeFalsy();
  });
});

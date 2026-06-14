/**
 * clients/new.tsx — Create-client intake form (ONB-01 UI)
 *
 * Practitioner-operated surface for registering a new client subject.
 * All 8 D-07/D-08 intake fields are captured and persisted to the subjects
 * table via createSubject.
 *
 * Security contracts:
 *   - requireUser: unauthenticated → redirect to /login
 *   - requireRole(user, ["owner","practitioner"]): clients 403 (T-01-client-views-clients)
 *   - Server-side validation of all required fields (V5 — never trust client)
 *   - id = server-generated crypto.randomUUID() — client cannot supply id (T-01-intake-injection)
 *   - tenantId from session, never form input (T-01-intake-injection)
 *   - On success → redirect(/clients); active subject cookie unchanged (owner remains active)
 */

import { redirect } from "react-router";
import { Form, useActionData } from "react-router";
import type { Route } from "./+types/new";
import { Button } from "~/components/ui/Button";
import { PageHeader } from "~/components/ui/PageHeader";
import { Card } from "~/components/ui/Card";
import { requireUser, requireRole } from "~/lib/authz.server";
import { createSubject } from "~/lib/subjects.server";

// ── Meta ───────────────────────────────────────────────────────────────────────

export function meta({}: Route.MetaArgs) {
  return [
    { title: "New client - Zoetrop" },
    { name: "description", content: "Register a new client subject" },
  ];
}

// ── Loader ─────────────────────────────────────────────────────────────────────

export async function loader({ request }: Route.LoaderArgs) {
  const { user } = await requireUser(request);
  requireRole(user, ["owner", "practitioner"]);

  if (!user.tenantId) {
    throw new Response("No tenant assignment.", { status: 403 });
  }

  return { user };
}

// ── Action ─────────────────────────────────────────────────────────────────────

type FieldErrors = {
  displayName?: string;
  dob?: string;
  biologicalSex?: string;
  contactEmail?: string;
  programType?: string;
  _form?: string;
};

export async function action({ request }: Route.ActionArgs) {
  const { user } = await requireUser(request);
  requireRole(user, ["owner", "practitioner"]);

  if (!user.tenantId) {
    throw new Response("No tenant assignment.", { status: 403 });
  }

  const formData = await request.formData();

  const displayName = (formData.get("displayName") as string | null) ?? "";
  const dob = (formData.get("dob") as string | null) ?? "";
  const biologicalSex = (formData.get("biologicalSex") as string | null) ?? "";
  const contactEmail = (formData.get("contactEmail") as string | null) ?? "";
  const contactPhone = (formData.get("contactPhone") as string | null) ?? "";
  const goals = (formData.get("goals") as string | null) ?? "";
  const intakeNotes = (formData.get("intakeNotes") as string | null) ?? "";
  const programType = (formData.get("programType") as string | null) ?? "";
  const programStartDate = (formData.get("programStartDate") as string | null) ?? "";

  // ── Server-side validation (V5 — never trust client) ────────────────────────
  const errors: FieldErrors = {};

  if (!displayName.trim()) {
    errors.displayName = "Full name is required.";
  }

  if (!dob.trim()) {
    errors.dob = "Date of birth is required.";
  }

  if (!biologicalSex || !["male", "female", "intersex"].includes(biologicalSex)) {
    errors.biologicalSex = "Biological sex is required.";
  }

  if (
    contactEmail.trim() &&
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail.trim())
  ) {
    errors.contactEmail = "Enter a valid email address.";
  }

  if (
    !programType ||
    !["cessation", "substance_taper", "lifestyle_modification", "general"].includes(
      programType
    )
  ) {
    errors.programType = "Program type is required.";
  }

  if (Object.keys(errors).length > 0) {
    return {
      success: false as const,
      errors,
      values: {
        displayName,
        dob,
        biologicalSex,
        contactEmail,
        contactPhone,
        goals,
        intakeNotes,
        programType,
        programStartDate,
      },
    };
  }

  // ── Persist ─────────────────────────────────────────────────────────────────
  try {
    await createSubject({
      id: crypto.randomUUID(),                          // server-generated — T-01-intake-injection
      tenantId: user.tenantId,                          // from session — T-01-intake-injection
      displayName: displayName.trim(),
      dob: dob ? new Date(dob) : null,
      biologicalSex: biologicalSex as "male" | "female" | "intersex",
      contactEmail: contactEmail.trim() || null,
      contactPhone: contactPhone.trim() || null,
      goals: goals.trim() || null,
      intakeNotes: intakeNotes.trim() || null,
      programType: programType as
        | "cessation"
        | "substance_taper"
        | "lifestyle_modification"
        | "general",
      programStartDate: programStartDate ? new Date(programStartDate) : null,
    });
  } catch {
    return {
      success: false as const,
      errors: {
        _form: "Could not create client. Try again or refresh the page.",
      } satisfies FieldErrors,
      values: {
        displayName,
        dob,
        biologicalSex,
        contactEmail,
        contactPhone,
        goals,
        intakeNotes,
        programType,
        programStartDate,
      },
    };
  }

  // On success: redirect to /clients; active subject cookie unchanged (remains owner)
  return redirect("/clients");
}

// ── Shared select style (per assignments.tsx pattern) ─────────────────────────

const SELECT_STYLE: React.CSSProperties = {
  width: "100%",
  padding: "8px 12px",
  borderRadius: "var(--radius-md)",
  border: "1.5px solid var(--border-strong)",
  background: "var(--surface)",
  color: "var(--text)",
  fontSize: "var(--text-sm)",
  appearance: "none" as const,
  WebkitAppearance: "none" as const,
};

const LABEL_STYLE: React.CSSProperties = {
  display: "block",
  marginBottom: 6,
  fontSize: "var(--text-sm)",
  fontWeight: 500,
  color: "var(--text)",
};

const HELPER_STYLE: React.CSSProperties = {
  display: "block",
  marginTop: 4,
  fontSize: "var(--text-2xs)",
  fontFamily: "var(--font-mono)",
  color: "var(--text-muted)",
};

const ERROR_STYLE: React.CSSProperties = {
  display: "block",
  marginTop: 4,
  fontSize: "var(--text-sm)",
  color: "var(--danger)",
};

// ── Component ──────────────────────────────────────────────────────────────────

export default function NewClientPage() {
  const actionData = useActionData<typeof action>();

  // actionData is null on initial render (before any submission)
  const failedData = actionData && !actionData.success ? actionData : null;
  const errors = failedData?.errors ?? {};
  const values = failedData?.values ?? {
    displayName: "",
    dob: "",
    biologicalSex: "",
    contactEmail: "",
    contactPhone: "",
    goals: "",
    intakeNotes: "",
    programType: "",
    programStartDate: "",
  };

  return (
    <div>
      <PageHeader eyebrow="CLIENTS" title="New client" />

      <div
        style={{
          maxWidth: 560,
          display: "flex",
          flexDirection: "column",
          gap: "var(--gap-2xl)",
        }}
      >
        {/* Form-level error */}
        {errors._form && (
          <p style={{ margin: 0, color: "var(--danger)", fontSize: "var(--text-sm)" }}>
            {errors._form}
          </p>
        )}

        <Form method="post">
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--gap-2xl)" }}>

            {/* ── Section 1: CLIENT IDENTITY ────────────────────────────── */}
            <Card elevation="sm" padding="lg">
              <div className="zt-eyebrow" style={{ marginBottom: 16 }}>
                CLIENT IDENTITY
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "var(--gap-lg)" }}>

                {/* Full name */}
                <div>
                  <label htmlFor="displayName" style={LABEL_STYLE}>
                    Full name
                  </label>
                  <input
                    id="displayName"
                    name="displayName"
                    type="text"
                    placeholder="First Last"
                    defaultValue={values.displayName ?? ""}
                    style={{
                      width: "100%",
                      padding: "8px 12px",
                      borderRadius: "var(--radius-md)",
                      border: errors.displayName
                        ? "1.5px solid var(--danger)"
                        : "1.5px solid var(--border-strong)",
                      background: "var(--surface)",
                      color: "var(--text)",
                      fontSize: "var(--text-sm)",
                      boxSizing: "border-box",
                    }}
                  />
                  {errors.displayName && (
                    <span style={ERROR_STYLE}>{errors.displayName}</span>
                  )}
                </div>

                {/* Date of birth */}
                <div>
                  <label htmlFor="dob" style={LABEL_STYLE}>
                    Date of birth
                  </label>
                  <input
                    id="dob"
                    name="dob"
                    type="date"
                    defaultValue={values.dob ?? ""}
                    style={{
                      width: "100%",
                      padding: "8px 12px",
                      borderRadius: "var(--radius-md)",
                      border: errors.dob
                        ? "1.5px solid var(--danger)"
                        : "1.5px solid var(--border-strong)",
                      background: "var(--surface)",
                      color: "var(--text)",
                      fontSize: "var(--text-sm)",
                      boxSizing: "border-box",
                    }}
                  />
                  {errors.dob && (
                    <span style={ERROR_STYLE}>{errors.dob}</span>
                  )}
                </div>

                {/* Biological sex */}
                <div>
                  <label htmlFor="biologicalSex" style={LABEL_STYLE}>
                    Biological sex
                  </label>
                  <select
                    id="biologicalSex"
                    name="biologicalSex"
                    defaultValue={values.biologicalSex ?? ""}
                    style={{
                      ...SELECT_STYLE,
                      border: errors.biologicalSex
                        ? "1.5px solid var(--danger)"
                        : SELECT_STYLE.border,
                    }}
                  >
                    <option value="" disabled>
                      Select
                    </option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="intersex">Intersex</option>
                  </select>
                  <span style={HELPER_STYLE}>
                    Used for clinical reference range calculations
                  </span>
                  {errors.biologicalSex && (
                    <span style={ERROR_STYLE}>{errors.biologicalSex}</span>
                  )}
                </div>
              </div>
            </Card>

            {/* ── Section 2: CONTACT ────────────────────────────────────── */}
            <Card elevation="sm" padding="lg">
              <div className="zt-eyebrow" style={{ marginBottom: 16 }}>
                CONTACT
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "var(--gap-lg)" }}>

                {/* Email address */}
                <div>
                  <label htmlFor="contactEmail" style={LABEL_STYLE}>
                    Email address
                  </label>
                  <input
                    id="contactEmail"
                    name="contactEmail"
                    type="email"
                    placeholder="client@example.com"
                    defaultValue={values.contactEmail ?? ""}
                    style={{
                      width: "100%",
                      padding: "8px 12px",
                      borderRadius: "var(--radius-md)",
                      border: errors.contactEmail
                        ? "1.5px solid var(--danger)"
                        : "1.5px solid var(--border-strong)",
                      background: "var(--surface)",
                      color: "var(--text)",
                      fontSize: "var(--text-sm)",
                      boxSizing: "border-box",
                    }}
                  />
                  <span style={HELPER_STYLE}>
                    Optional — for invite delivery reference only
                  </span>
                  {errors.contactEmail && (
                    <span style={ERROR_STYLE}>{errors.contactEmail}</span>
                  )}
                </div>

                {/* Phone */}
                <div>
                  <label htmlFor="contactPhone" style={LABEL_STYLE}>
                    Phone (optional)
                  </label>
                  <input
                    id="contactPhone"
                    name="contactPhone"
                    type="tel"
                    defaultValue={values.contactPhone ?? ""}
                    style={{
                      width: "100%",
                      padding: "8px 12px",
                      borderRadius: "var(--radius-md)",
                      border: "1.5px solid var(--border-strong)",
                      background: "var(--surface)",
                      color: "var(--text)",
                      fontSize: "var(--text-sm)",
                      boxSizing: "border-box",
                    }}
                  />
                </div>
              </div>
            </Card>

            {/* ── Section 3: PROGRAM ───────────────────────────────────── */}
            <Card elevation="sm" padding="lg">
              <div className="zt-eyebrow" style={{ marginBottom: 16 }}>
                PROGRAM
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "var(--gap-lg)" }}>

                {/* Program type */}
                <div>
                  <label htmlFor="programType" style={LABEL_STYLE}>
                    Program type
                  </label>
                  <select
                    id="programType"
                    name="programType"
                    defaultValue={values.programType ?? ""}
                    style={{
                      ...SELECT_STYLE,
                      border: errors.programType
                        ? "1.5px solid var(--danger)"
                        : SELECT_STYLE.border,
                    }}
                  >
                    <option value="" disabled>
                      Select
                    </option>
                    <option value="cessation">Cessation</option>
                    <option value="substance_taper">Substance taper</option>
                    <option value="lifestyle_modification">
                      Lifestyle modification
                    </option>
                    <option value="general">General</option>
                  </select>
                  {errors.programType && (
                    <span style={ERROR_STYLE}>{errors.programType}</span>
                  )}
                </div>

                {/* Program start date */}
                <div>
                  <label htmlFor="programStartDate" style={LABEL_STYLE}>
                    Program start date
                  </label>
                  <input
                    id="programStartDate"
                    name="programStartDate"
                    type="date"
                    defaultValue={values.programStartDate ?? ""}
                    style={{
                      width: "100%",
                      padding: "8px 12px",
                      borderRadius: "var(--radius-md)",
                      border: "1.5px solid var(--border-strong)",
                      background: "var(--surface)",
                      color: "var(--text)",
                      fontSize: "var(--text-sm)",
                      boxSizing: "border-box",
                    }}
                  />
                </div>
              </div>
            </Card>

            {/* ── Section 4: INTAKE NOTES ───────────────────────────────── */}
            <Card elevation="sm" padding="lg">
              <div className="zt-eyebrow" style={{ marginBottom: 16 }}>
                INTAKE NOTES
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "var(--gap-lg)" }}>

                {/* Goals */}
                <div>
                  <label htmlFor="goals" style={LABEL_STYLE}>
                    Client goals
                  </label>
                  <textarea
                    id="goals"
                    name="goals"
                    rows={3}
                    placeholder="What is the client aiming to achieve?"
                    defaultValue={values.goals ?? ""}
                    style={{
                      width: "100%",
                      padding: "8px 12px",
                      borderRadius: "var(--radius-md)",
                      border: "1.5px solid var(--border-strong)",
                      background: "var(--surface)",
                      color: "var(--text)",
                      fontSize: "var(--text-sm)",
                      resize: "vertical",
                      fontFamily: "var(--font-text)",
                      boxSizing: "border-box",
                    }}
                  />
                </div>

                {/* Practitioner notes */}
                <div>
                  <label htmlFor="intakeNotes" style={LABEL_STYLE}>
                    Practitioner notes
                  </label>
                  <textarea
                    id="intakeNotes"
                    name="intakeNotes"
                    rows={3}
                    placeholder="Clinical context, history, flags for the protocol…"
                    defaultValue={values.intakeNotes ?? ""}
                    style={{
                      width: "100%",
                      padding: "8px 12px",
                      borderRadius: "var(--radius-md)",
                      border: "1.5px solid var(--border-strong)",
                      background: "var(--surface)",
                      color: "var(--text)",
                      fontSize: "var(--text-sm)",
                      resize: "vertical",
                      fontFamily: "var(--font-text)",
                      boxSizing: "border-box",
                    }}
                  />
                </div>
              </div>
            </Card>

            {/* ── Form actions ──────────────────────────────────────────── */}
            <div style={{ display: "flex", gap: "var(--gap-md)", alignItems: "center" }}>
              <Button variant="primary" type="submit">
                Create client
              </Button>
              <Button
                variant="ghost"
                type="button"
                onClick={() => history.back()}
              >
                Discard
              </Button>
            </div>

          </div>
        </Form>
      </div>
    </div>
  );
}

import { useEffect, useMemo, useState, type FormEvent } from "react";
import {
  listLegalNoticeVersions,
  addLegalNoticeVersion,
  type LegalNoticeVersionRow,
} from "../../lib/legalNoticeApi";
import { toDatetimeLocalValue } from "../../lib/datetimeLocal";
import { Card } from "../../components/ui/Card";
import { TextField, TextAreaField } from "../../components/ui/TextField";
import { Button } from "../../components/ui/Button";
import { Alert } from "../../components/ui/Alert";
import { Table } from "../../components/ui/Table";
import styles from "./AdminLegalNoticeManagementPage.module.css";

type FormStage = "editing" | "previewing";

interface FieldErrors {
  noticeText?: string;
  sourceReference?: string;
}

function errorMessage(err: unknown): string {
  return err instanceof Error
    ? err.message
    : "Failed to add legal notice version.";
}

// Admin-only, reachable only through AdminRouteGuard. Wired to the real
// add_legal_notice_version / list_legal_notice_versions RPCs (I5).
export function AdminLegalNoticeManagementPage() {
  const [versions, setVersions] = useState<LegalNoticeVersionRow[] | null>(
    null,
  );
  const [loadError, setLoadError] = useState<string | null>(null);

  const [noticeText, setNoticeText] = useState("");
  const [sourceReference, setSourceReference] = useState("");
  const [effectiveAt, setEffectiveAt] = useState(() =>
    toDatetimeLocalValue(new Date()),
  );
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [stage, setStage] = useState<FormStage>("editing");
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitBusy, setSubmitBusy] = useState(false);

  useEffect(() => {
    listLegalNoticeVersions()
      .then(setVersions)
      .catch((err) => setLoadError(errorMessage(err)));
  }, []);

  const currentVersion = useMemo(() => {
    if (!versions) return null;
    const now = Date.now();
    return (
      versions
        .filter((row) => new Date(row.effectiveAt).getTime() <= now)
        .sort((a, b) => b.effectiveAt.localeCompare(a.effectiveAt))[0] ?? null
    );
  }, [versions]);

  async function refresh() {
    setVersions(await listLegalNoticeVersions());
  }

  function handleReview(event: FormEvent) {
    event.preventDefault();

    const errors: FieldErrors = {};
    if (!noticeText.trim()) errors.noticeText = "Notice text is required.";
    if (!sourceReference.trim())
      errors.sourceReference = "Source reference is required.";

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setFieldErrors({});
    setStage("previewing");
  }

  async function handleConfirmPublish() {
    setSubmitBusy(true);
    setSubmitError(null);
    try {
      await addLegalNoticeVersion(
        noticeText,
        sourceReference,
        new Date(effectiveAt).toISOString(),
      );
      setNoticeText("");
      setSourceReference("");
      setEffectiveAt(toDatetimeLocalValue(new Date()));
      setStage("editing");
      await refresh();
    } catch (err) {
      setSubmitError(errorMessage(err));
    } finally {
      setSubmitBusy(false);
    }
  }

  if (loadError) {
    return (
      <main>
        <Alert severity="error">{loadError}</Alert>
      </main>
    );
  }

  if (!versions) {
    return (
      <main>
        <p role="status">Loading…</p>
      </main>
    );
  }

  return (
    <main>
      <h1 className={styles.title}>Legal Notice Management</h1>

      <h2 className={styles.sectionTitle}>Current Version</h2>

      <Card className={styles.currentVersion}>
        {currentVersion ? (
          <div>
            {currentVersion.noticeText}
            <div className={styles.meta}>
              Effective: {new Date(currentVersion.effectiveAt).toLocaleString()}{" "}
              · Source: {currentVersion.sourceReference}
            </div>
          </div>
        ) : (
          <p>No version is currently effective.</p>
        )}
      </Card>

      <h2 className={styles.sectionTitle}>Version History</h2>
      <Table>
        <thead>
          <tr>
            <th>Effective At</th>
            <th>Source Reference</th>
            <th>Notice Text</th>
            <th>Created By / At</th>
          </tr>
        </thead>
        <tbody>
          {versions.map((row) => (
            <tr key={row.versionId}>
              <td>{new Date(row.effectiveAt).toLocaleString()}</td>
              <td>{row.sourceReference}</td>
              <td className={styles.noticeTextCell} title={row.noticeText}>
                {row.noticeText}
              </td>
              <td>
                {row.createdBy} · {new Date(row.createdAt).toLocaleDateString()}
              </td>
            </tr>
          ))}
        </tbody>
      </Table>

      <h2 className={styles.sectionTitle}>Add New Version</h2>

      {stage === "editing" && (
        <Card>
          <form onSubmit={handleReview} noValidate className={styles.form}>
            <TextAreaField
              id="notice-text"
              label="Notice text"
              rows={6}
              value={noticeText}
              onChange={(event) => setNoticeText(event.target.value)}
              error={fieldErrors.noticeText}
            />

            <TextField
              id="source-reference"
              label="Source reference"
              type="text"
              value={sourceReference}
              onChange={(event) => setSourceReference(event.target.value)}
              placeholder="e.g. UCM Photo/Video/Statement Release Form, 2023-24 edition, confirmed with [contact] on [date]"
              error={fieldErrors.sourceReference}
            />

            <TextField
              id="effective-at"
              label="Effective at"
              type="datetime-local"
              value={effectiveAt}
              min={toDatetimeLocalValue(new Date())}
              onChange={(event) => setEffectiveAt(event.target.value)}
            />

            <Button type="submit">Review</Button>
          </form>
        </Card>
      )}

      {stage === "previewing" && (
        <Card>
          <p>This is exactly what will become the live legal notice:</p>
          <Card
            className={styles.previewBox}
            style={{
              boxShadow: "none",
              backgroundColor: "var(--md-background)",
            }}
          >
            {noticeText}
            <div className={styles.meta}>
              Effective: {new Date(effectiveAt).toLocaleString()} · Source:{" "}
              {sourceReference}
            </div>
          </Card>
          {submitError && <Alert severity="error">{submitError}</Alert>}
          <div className={styles.previewActions}>
            <Button
              type="button"
              onClick={handleConfirmPublish}
              disabled={submitBusy}
            >
              Confirm &amp; Publish
            </Button>
            <Button
              type="button"
              variant="outlined"
              onClick={() => setStage("editing")}
              disabled={submitBusy}
            >
              Edit
            </Button>
          </div>
        </Card>
      )}
    </main>
  );
}

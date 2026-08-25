import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import {
  searchPhotoReleases,
  type SearchResultRow,
} from "../lib/photoReleaseApi";
import { maskEmail, maskPhone } from "../lib/mask";
import { TextField } from "../components/ui/TextField";
import { Button } from "../components/ui/Button";
import { Alert } from "../components/ui/Alert";
import styles from "./SearchDashboardPage.module.css";

type SearchStatus = "idle" | "loading" | "done" | "error";

// Index route under DashboardLayout. Wired to the real get_photo_release
// RPC (I3) — every search writes one RECORD_SEARCH audit_log row server-side.
export function SearchDashboardPage() {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<SearchStatus>("idle");
  const [results, setResults] = useState<SearchResultRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  async function handleSearch(event: FormEvent) {
    event.preventDefault();
    const trimmed = query.trim();
    if (!trimmed) return;

    setStatus("loading");
    setError(null);
    try {
      const rows = await searchPhotoReleases(trimmed);
      setResults(rows);
      setStatus("done");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Search failed. Please try again.",
      );
      setStatus("error");
    }
  }

  return (
    <main>
      <h1 className={styles.title}>Search All Photo Releases</h1>

      <form onSubmit={handleSearch} className={styles.form}>
        <TextField
          id="search-query"
          label="Name, email, or phone"
          type="text"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        <Button type="submit" disabled={!query.trim() || status === "loading"}>
          Search
        </Button>
      </form>

      {status === "idle" && (
        <p className={styles.hint}>
          Enter a name, email, or phone number to search.
        </p>
      )}

      {status === "loading" && <p role="status">Searching…</p>}

      {status === "error" && <Alert severity="error">{error}</Alert>}

      {status === "done" && results.length === 0 && (
        <p className={styles.empty}>
          No records found for &quot;{query}&quot;.
        </p>
      )}

      {status === "done" && results.length > 0 && (
        <ul className={styles.results}>
          {results.map((row) => (
            <li key={row.id}>
              <button
                type="button"
                onClick={() => navigate(`/dashboard/records/${row.id}`)}
              >
                <span className={styles.name}>{row.fullName}</span>
                <span className={styles.contact}>
                  {maskPhone(row.phone)} · {maskEmail(row.email)}
                </span>
                <span className={styles.date}>
                  {new Date(row.submittedAt).toLocaleDateString()}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}

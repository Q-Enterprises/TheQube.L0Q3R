import React, { useEffect, useState } from "react";
import { MANIFEST_SCHEMA, detectRomFormat } from "./RomFormats";

const normalizePath = (path) => path?.split("/").pop()?.toLowerCase() ?? "";

const formatSha = (sha) => (sha ? sha.slice(0, 8) : "—");

const validateManifestShape = (manifest) => {
  if (!manifest || typeof manifest !== "object") {
    return ["Manifest is missing or invalid."];
  }

  const errors = [];
  MANIFEST_SCHEMA.requiredFields.forEach((field) => {
    if (!(field in manifest)) {
      errors.push(`Manifest missing required field: ${field}`);
    }
  });

  if (manifest.schema !== MANIFEST_SCHEMA.schema) {
    errors.push(`Unsupported schema: ${manifest.schema ?? "unknown"}`);
  }

  if (!Array.isArray(manifest.roms)) {
    errors.push("Manifest roms must be an array.");
  }

  if (Array.isArray(manifest.roms)) {
    manifest.roms.forEach((rom, index) => {
      MANIFEST_SCHEMA.romFields.forEach((field) => {
        if (!rom || !(field in rom)) {
          errors.push(`ROM entry ${index + 1} missing field: ${field}`);
        }
      });
    });
  }

  return errors;
};

const hashBuffer = async (buffer) => {
  const hash = await crypto.subtle.digest("SHA-256", buffer);
  return Array.from(new Uint8Array(hash))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
};

export default function RomManifestValidator({ manifest, romFiles, onValidation }) {
  const [errors, setErrors] = useState([]);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const validate = async () => {
      setLoading(true);
      const manifestErrors = validateManifestShape(manifest);
      if (manifestErrors.length > 0) {
        setErrors(manifestErrors);
        setResults([]);
        setLoading(false);
        onValidation?.({ valid: false, errors: manifestErrors, results: [] });
        return;
      }

      const filesByName = new Map(
        (romFiles ?? []).map((file) => [file.name.toLowerCase(), file]),
      );

      const validations = [];

      for (const rom of manifest.roms) {
        const romFilename = normalizePath(rom.path);
        const file = filesByName.get(romFilename);

        if (!file) {
          validations.push({
            id: rom.id,
            name: rom.name,
            status: "missing",
            expectedSha: rom.sha256,
            actualSha: null,
            format: null,
          });
          continue;
        }

        const buffer = new Uint8Array(await file.arrayBuffer());
        const format = detectRomFormat(file.name, buffer);
        const actualSha = await hashBuffer(buffer);
        const status = actualSha === rom.sha256 ? "valid" : "invalid";

        validations.push({
          id: rom.id,
          name: rom.name,
          status,
          expectedSha: rom.sha256,
          actualSha,
          format: format?.name ?? "Unknown",
        });
      }

      if (!cancelled) {
        setErrors([]);
        setResults(validations);
        setLoading(false);
        onValidation?.({
          valid: validations.every((item) => item.status === "valid"),
          errors: [],
          results: validations,
        });
      }
    };

    if (!manifest && (!romFiles || romFiles.length === 0)) {
      setErrors([]);
      setResults([]);
      setLoading(false);
      onValidation?.({ valid: false, errors: [], results: [] });
      return;
    }

    validate();

    return () => {
      cancelled = true;
    };
  }, [manifest, romFiles, onValidation]);

  return (
    <section style={{ border: "1px solid #ddd", padding: "1rem", borderRadius: 8 }}>
      <h2 style={{ marginTop: 0 }}>ROM Manifest Validation</h2>
      {loading && <p>Validating ROMs…</p>}
      {errors.length > 0 && (
        <div>
          <p>Manifest issues:</p>
          <ul>
            {errors.map((error) => (
              <li key={error} style={{ color: "#b42318" }}>
                {error}
              </li>
            ))}
          </ul>
        </div>
      )}
      {results.length > 0 && (
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th align="left">ROM</th>
              <th align="left">Format</th>
              <th align="left">Status</th>
              <th align="left">SHA (expected)</th>
              <th align="left">SHA (actual)</th>
            </tr>
          </thead>
          <tbody>
            {results.map((result) => (
              <tr key={result.id}>
                <td>{result.name}</td>
                <td>{result.format}</td>
                <td
                  style={{
                    color:
                      result.status === "valid"
                        ? "#027a48"
                        : result.status === "missing"
                          ? "#b54708"
                          : "#b42318",
                  }}
                >
                  {result.status}
                </td>
                <td>{formatSha(result.expectedSha)}</td>
                <td>{result.actualSha ? formatSha(result.actualSha) : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {results.length === 0 && errors.length === 0 && !loading && (
        <p>Select a manifest and ROMs to begin validation.</p>
      )}
    </section>
  );
}

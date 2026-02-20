import React, { useRef } from "react";
import { useRomValidator } from "./useRomValidator";

export function RomLauncher() {
  const manifestInputRef = useRef(null);
  const romInputRef = useRef(null);

  const {
    manifestError,
    validation,
    setManifestFile,
    setRomFiles,
    reset,
    Validator,
  } = useRomValidator();

  const handleManifestChange = async (event) => {
    const [file] = event.target.files;
    await setManifestFile(file ?? null);
  };

  const handleRomChange = (event) => {
    setRomFiles(event.target.files);
  };

  const handleReset = () => {
    if (manifestInputRef.current) {
      manifestInputRef.current.value = "";
    }
    if (romInputRef.current) {
      romInputRef.current.value = "";
    }
    reset();
  };

  return (
    <div style={{ display: "grid", gap: "1.5rem" }}>
      <header>
        <h1 style={{ marginBottom: "0.25rem" }}>ROM Launcher</h1>
        <p style={{ marginTop: 0 }}>
          Validate ROM capsules against the manifest before launching.
        </p>
      </header>

      <section style={{ display: "grid", gap: "1rem" }}>
        <label style={{ display: "grid", gap: "0.5rem" }}>
          Manifest (manifest.json)
          <input
            ref={manifestInputRef}
            type="file"
            accept="application/json"
            onChange={handleManifestChange}
          />
        </label>

        <label style={{ display: "grid", gap: "0.5rem" }}>
          ROM files
          <input
            ref={romInputRef}
            type="file"
            multiple
            accept=".nes,.gb,.gbc,.gba,.sfc,.smc"
            onChange={handleRomChange}
          />
        </label>

        {manifestError && <p style={{ color: "#b42318" }}>{manifestError}</p>}

        <button type="button" onClick={handleReset} style={{ width: "fit-content" }}>
          Reset
        </button>
      </section>

      {Validator}

      <section>
        <h3>Launch readiness</h3>
        <p>
          {validation.valid
            ? "All ROMs validated. Ready to launch."
            : "ROMs require validation before launch."}
        </p>
      </section>
    </div>
  );
}

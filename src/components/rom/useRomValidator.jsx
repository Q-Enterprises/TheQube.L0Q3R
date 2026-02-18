import { useCallback, useState } from "react";
import RomManifestValidator from "./RomManifestValidator";

export function useRomValidator() {
  const [manifest, setManifest] = useState(null);
  const [romFiles, setRomFiles] = useState([]);
  const [manifestError, setManifestError] = useState(null);
  const [validation, setValidation] = useState({ valid: false, errors: [], results: [] });

  const handleManifestFile = useCallback(async (file) => {
    if (!file) {
      setManifest(null);
      setManifestError(null);
      return;
    }

    try {
      const contents = await file.text();
      const parsed = JSON.parse(contents);
      setManifest(parsed);
      setManifestError(null);
    } catch (error) {
      setManifest(null);
      setManifestError((error && error.message) || "Manifest parsing failed.");
    }
  }, []);

  const handleRomFiles = useCallback((files) => {
    if (!files) {
      setRomFiles([]);
      return;
    }
    setRomFiles(Array.from(files));
  }, []);

  const reset = useCallback(() => {
    setManifest(null);
    setManifestError(null);
    setRomFiles([]);
    setValidation({ valid: false, errors: [], results: [] });
  }, []);

  const Validator = (
    <RomManifestValidator
      manifest={manifest}
      romFiles={romFiles}
      onValidation={setValidation}
    />
  );

  return {
    manifest,
    manifestError,
    romFiles,
    validation,
    setManifestFile: handleManifestFile,
    setRomFiles: handleRomFiles,
    reset,
    Validator,
  };
}

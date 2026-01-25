// ============================================================================
// ROM FORMAT SPECIFICATIONS
// ============================================================================

import React, { useCallback, useEffect, useState } from "react";

export const ROM_FORMATS = {
  NES: {
    name: "Nintendo Entertainment System",
    extensions: [".nes"],
    magic: [0x4e, 0x45, 0x53, 0x1a],
    headerSize: 16,
    validateHeader: (buffer: ArrayBuffer) => {
      const header = new Uint8Array(buffer.slice(0, 16));

      if (
        header[0] !== 0x4e ||
        header[1] !== 0x45 ||
        header[2] !== 0x53 ||
        header[3] !== 0x1a
      ) {
        return { valid: false, error: "Invalid NES header magic" };
      }

      const prgRomPages = header[4];
      const chrRomPages = header[5];
      const mapper = (header[6] >> 4) | (header[7] & 0xf0);

      return {
        valid: true,
        info: {
          prgRomPages,
          chrRomPages,
          mapper,
          prgRomSize: prgRomPages * 16384,
          chrRomSize: chrRomPages * 8192,
        },
      };
    },
  },

  GB: {
    name: "Game Boy",
    extensions: [".gb"],
    magic: null,
    headerSize: 0x150,
    validateHeader: (buffer: ArrayBuffer) => {
      const header = new Uint8Array(buffer.slice(0x100, 0x150));

      const nintendoLogo = [
        0xce,
        0xed,
        0x66,
        0x66,
        0xcc,
        0x0d,
        0x00,
        0x0b,
        0x03,
        0x73,
        0x00,
        0x83,
        0x00,
        0x0c,
        0x00,
        0x0d,
      ];

      for (let i = 0; i < 16; i += 1) {
        if (header[0x04 + i] !== nintendoLogo[i]) {
          return { valid: false, error: "Invalid Game Boy header logo" };
        }
      }

      const titleBytes = header.slice(0x34, 0x44);
      const title = String.fromCharCode(
        ...titleBytes.filter((byte) => byte !== 0),
      );

      const cartType = header[0x47];

      return {
        valid: true,
        info: {
          title,
          cartType,
          romSize: 32768 * (1 << header[0x48]),
        },
      };
    },
  },

  GBA: {
    name: "Game Boy Advance",
    extensions: [".gba"],
    magic: null,
    headerSize: 0xc0,
    validateHeader: (buffer: ArrayBuffer) => {
      const header = new Uint8Array(buffer.slice(0, 0xc0));

      if (header[0xb2] !== 0x96) {
        return { valid: false, error: "Invalid GBA header fixed value" };
      }

      const titleBytes = header.slice(0xa0, 0xac);
      const title = String.fromCharCode(
        ...titleBytes.filter((byte) => byte !== 0),
      );

      const gameCode = String.fromCharCode(...header.slice(0xac, 0xb0));

      return {
        valid: true,
        info: {
          title,
          gameCode,
          makerCode: String.fromCharCode(...header.slice(0xb0, 0xb2)),
        },
      };
    },
  },

  SNES: {
    name: "Super Nintendo Entertainment System",
    extensions: [".smc", ".sfc"],
    magic: null,
    headerSize: 512,
    validateHeader: (buffer: ArrayBuffer) => {
      const hasSmcHeader = buffer.byteLength % 1024 === 512;
      const offset = hasSmcHeader ? 512 : 0;

      let headerOffset = 0x7fc0 + offset;
      let header = new Uint8Array(buffer.slice(headerOffset, headerOffset + 64));

      const checksum = header[0x2c] | (header[0x2d] << 8);
      const complement = header[0x2e] | (header[0x2f] << 8);

      if ((checksum ^ complement) !== 0xffff) {
        headerOffset = 0xffc0 + offset;
        header = new Uint8Array(buffer.slice(headerOffset, headerOffset + 64));
      }

      const titleBytes = header.slice(0x00, 0x15);
      const title = String.fromCharCode(
        ...titleBytes.filter((byte) => byte >= 0x20 && byte <= 0x7e),
      );

      return {
        valid: true,
        info: {
          title: title.trim(),
          hasSMCHeader: hasSmcHeader,
          romType: headerOffset === 0x7fc0 + offset ? "LoROM" : "HiROM",
        },
      };
    },
  },
};

// ============================================================================
// ROM FORMAT DETECTOR
// ============================================================================

export function detectRomFormat(filename: string, buffer: ArrayBuffer) {
  const ext = filename.toLowerCase().match(/\.[^.]+$/)?.[0];

  for (const [format, spec] of Object.entries(ROM_FORMATS)) {
    if (spec.extensions.includes(ext ?? "")) {
      const validation = spec.validateHeader(buffer);
      if (validation.valid) {
        return { format, spec, info: validation.info };
      }
    }
  }

  for (const [format, spec] of Object.entries(ROM_FORMATS)) {
    try {
      const validation = spec.validateHeader(buffer);
      if (validation.valid) {
        return { format, spec, info: validation.info };
      }
    } catch (error) {
      // Continue trying other formats.
    }
  }

  return null;
}

// ============================================================================
// MANIFEST SCHEMA
// ============================================================================

export const MANIFEST_SCHEMA = {
  name: "string",
  format: "string",
  expectedSha256: "string",

  expectedSize: "number",
  expectedMd5: "string",
  region: "string",
  version: "string",
  verified: "boolean",

  metadata: {
    releaseDate: "string",
    publisher: "string",
    developer: "string",
    genre: "string[]",
    players: "number",
  },
};

// ============================================================================
// ENHANCED ROM MANIFEST VALIDATOR COMPONENT
// ============================================================================

type ManifestError = {
  type: string;
  message: string;
  severity: "error" | "warning" | "info";
  details?: string;
};

type ManifestResult = {
  isValid: boolean;
  errors: ManifestError[];
  warnings: ManifestError[];
  detectedFormat: string | null;
  romInfo: Record<string, string | number | boolean> | null;
};

type RomManifestValidatorProps = {
  romData: ArrayBuffer | Blob | null;
  manifest: Record<string, unknown> | null;
  onValidationComplete?: (result: ManifestResult) => void;
};

export default function RomManifestValidator({
  romData,
  manifest,
  onValidationComplete,
}: RomManifestValidatorProps) {
  const [validationStatus, setValidationStatus] = useState("pending");
  const [errors, setErrors] = useState<ManifestError[]>([]);
  const [warnings, setWarnings] = useState<ManifestError[]>([]);
  const [romInfo, setRomInfo] = useState<ManifestResult["romInfo"]>(null);
  const [detectedFormat, setDetectedFormat] = useState<string | null>(null);

  useEffect(() => {
    if (!romData || !manifest) {
      setValidationStatus("pending");
      return;
    }

    void validateRom();
  }, [romData, manifest]);

  const validateRom = async () => {
    setValidationStatus("validating");
    const newErrors: ManifestError[] = [];
    const newWarnings: ManifestError[] = [];

    try {
      let buffer: ArrayBuffer;
      if (romData instanceof ArrayBuffer) {
        buffer = romData;
      } else if (romData instanceof Blob) {
        buffer = await romData.arrayBuffer();
      } else {
        throw new Error("Invalid ROM data format");
      }

      if (
        typeof manifest?.expectedSize === "number" &&
        buffer.byteLength !== manifest.expectedSize
      ) {
        newErrors.push({
          type: "size_mismatch",
          message: `Size mismatch: expected ${manifest.expectedSize} bytes, got ${buffer.byteLength} bytes`,
          severity: "error",
        });
      }

      if (typeof manifest?.expectedSha256 === "string") {
        const computedHash = await computeSha256(buffer);
        if (
          computedHash.toLowerCase() !== manifest.expectedSha256.toLowerCase()
        ) {
          newErrors.push({
            type: "hash_mismatch",
            message: "SHA-256 mismatch",
            details: `Expected: ${manifest.expectedSha256}\nGot: ${computedHash}`,
            severity: "error",
          });
        }
      }

      if (typeof manifest?.expectedMd5 === "string") {
        const computedMd5 = await computeMd5(buffer);
        if (computedMd5.toLowerCase() !== manifest.expectedMd5.toLowerCase()) {
          newWarnings.push({
            type: "md5_mismatch",
            message: "MD5 mismatch (non-critical)",
            severity: "warning",
          });
        }
      }

      const filename =
        typeof (romData as Blob)?.name === "string"
          ? (romData as Blob).name
          : typeof manifest?.name === "string"
            ? manifest.name
            : "rom.bin";
      const detected = detectRomFormat(filename, buffer);

      if (!detected) {
        newErrors.push({
          type: "format_unknown",
          message: "Could not detect ROM format",
          severity: "error",
        });
      } else {
        setDetectedFormat(detected.format);
        setRomInfo(detected.info);

        if (
          typeof manifest?.format === "string" &&
          detected.format !== manifest.format
        ) {
          newErrors.push({
            type: "format_mismatch",
            message: `Format mismatch: expected ${manifest.format}, detected ${detected.format}`,
            severity: "error",
          });
        }

        if (detected.format === "SNES" && detected.info.hasSMCHeader) {
          newWarnings.push({
            type: "smc_header",
            message: "ROM contains SMC copier header (512 bytes)",
            severity: "info",
          });
        }
      }

      if (typeof manifest?.region === "string" && detected?.info) {
        newWarnings.push({
          type: "region_check",
          message: `Expected region: ${manifest.region}`,
          severity: "info",
        });
      }

      setErrors(newErrors);
      setWarnings(newWarnings);

      const isValid = newErrors.length === 0;
      setValidationStatus(isValid ? "valid" : "invalid");

      if (onValidationComplete) {
        onValidationComplete({
          isValid,
          errors: newErrors,
          warnings: newWarnings,
          detectedFormat: detected?.format ?? null,
          romInfo: detected?.info ?? null,
        });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      console.error("Validation error:", error);
      setErrors([
        {
          type: "validation_error",
          message: `Validation failed: ${message}`,
          severity: "error",
        },
      ]);
      setValidationStatus("error");

      if (onValidationComplete) {
        onValidationComplete({
          isValid: false,
          errors: [{ type: "validation_error", message }],
          warnings: [],
          detectedFormat: null,
          romInfo: null,
        });
      }
    }
  };

  const computeSha256 = async (buffer: ArrayBuffer) => {
    const hashBuffer = await crypto.subtle.digest("SHA-256", buffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((byte) => byte.toString(16).padStart(2, "0")).join("");
  };

  const computeMd5 = async (_buffer: ArrayBuffer) => {
    return "md5_not_implemented";
  };

  if (validationStatus === "pending") {
    return (
      <div className="p-4 bg-gray-100 rounded-lg border border-gray-300">
        <div className="flex items-center gap-3">
          <div className="text-gray-500">
            <svg
              className="w-6 h-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <p className="text-gray-600">Waiting for ROM data and manifest...</p>
        </div>
      </div>
    );
  }

  if (validationStatus === "validating") {
    return (
      <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
        <div className="flex items-center gap-3">
          <div className="animate-spin text-blue-600">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24">
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              ></circle>
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              ></path>
            </svg>
          </div>
          <p className="text-blue-800 font-medium">Validating ROM...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div
        className={`p-4 rounded-lg border-2 ${
          validationStatus === "valid"
            ? "bg-green-50 border-green-500"
            : validationStatus === "invalid"
              ? "bg-red-50 border-red-500"
              : "bg-yellow-50 border-yellow-500"
        }`}
      >
        <div className="flex items-center gap-3">
          {validationStatus === "valid" ? (
            <svg
              className="w-6 h-6 text-green-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          ) : validationStatus === "invalid" ? (
            <svg
              className="w-6 h-6 text-red-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          ) : (
            <svg
              className="w-6 h-6 text-yellow-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          )}
          <h3
            className={`font-bold text-lg ${
              validationStatus === "valid"
                ? "text-green-800"
                : validationStatus === "invalid"
                  ? "text-red-800"
                  : "text-yellow-800"
            }`}
          >
            {validationStatus === "valid"
              ? "✓ ROM is Valid"
              : validationStatus === "invalid"
                ? "✗ ROM is Invalid"
                : "⚠ Validation Error"}
          </h3>
        </div>
      </div>

      {romInfo && detectedFormat && (
        <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
          <h4 className="font-semibold text-slate-800 mb-3 flex items-center gap-2">
            <svg
              className="w-5 h-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            ROM Information
          </h4>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <span className="text-slate-600">Format:</span>
              <span className="ml-2 font-mono font-semibold">
                {ROM_FORMATS[detectedFormat]?.name}
              </span>
            </div>
            {Object.entries(romInfo).map(([key, value]) => (
              <div key={key}>
                <span className="text-slate-600 capitalize">
                  {key.replace(/([A-Z])/g, " $1").trim()}:
                </span>
                <span className="ml-2 font-mono">
                  {typeof value === "object"
                    ? JSON.stringify(value)
                    : value}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {errors.length > 0 && (
        <div className="p-4 bg-red-50 rounded-lg border border-red-200">
          <h4 className="font-semibold text-red-800 mb-3 flex items-center gap-2">
            <svg
              className="w-5 h-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 0 0118 0z"
              />
            </svg>
            Errors ({errors.length})
          </h4>
          <ul className="space-y-2">
            {errors.map((error, idx) => (
              <li key={idx} className="text-red-700 text-sm">
                <div className="font-medium">{error.message}</div>
                {error.details && (
                  <pre className="mt-1 text-xs bg-red-100 p-2 rounded font-mono overflow-x-auto">
                    {error.details}
                  </pre>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {warnings.length > 0 && (
        <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
          <h4 className="font-semibold text-yellow-800 mb-3 flex items-center gap-2">
            <svg
              className="w-5 h-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
            Warnings ({warnings.length})
          </h4>
          <ul className="list-disc list-inside space-y-1">
            {warnings.map((warning, idx) => (
              <li key={idx} className="text-yellow-700 text-sm">
                {warning.message}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// ENHANCED USE ROM VALIDATOR HOOK
// ============================================================================

export function useRomValidator() {
  const [romData, setRomData] = useState<ArrayBuffer | Blob | null>(null);
  const [manifest, setManifest] = useState<Record<string, unknown> | null>(null);
  const [result, setResult] = useState({
    isValid: null as boolean | null,
    errors: [] as ManifestError[],
    warnings: [] as ManifestError[],
    detectedFormat: null as string | null,
    romInfo: null as ManifestResult["romInfo"],
    status: "idle",
  });

  const onValidationComplete = useCallback((res: ManifestResult) => {
    setResult({
      isValid: res.isValid,
      errors: res.errors,
      warnings: res.warnings,
      detectedFormat: res.detectedFormat,
      romInfo: res.romInfo,
      status: res.isValid ? "valid" : "invalid",
    });
  }, []);

  const loadRom = useCallback((data: ArrayBuffer | Blob) => {
    setRomData(data);
    setResult((prev) => ({ ...prev, status: "validating" }));
  }, []);

  const loadManifest = useCallback((data: Record<string, unknown>) => {
    setManifest(data);
    setResult((prev) => ({ ...prev, status: "validating" }));
  }, []);

  const reset = useCallback(() => {
    setRomData(null);
    setManifest(null);
    setResult({
      isValid: null,
      errors: [],
      warnings: [],
      detectedFormat: null,
      romInfo: null,
      status: "idle",
    });
  }, []);

  const ValidatorView = useCallback(() => {
    return (
      <RomManifestValidator
        romData={romData}
        manifest={manifest}
        onValidationComplete={onValidationComplete}
      />
    );
  }, [romData, manifest, onValidationComplete]);

  return {
    romData,
    manifest,
    result,
    loadRom,
    loadManifest,
    reset,
    ValidatorView,
  };
}

// ============================================================================
// EXAMPLE USAGE COMPONENT
// ============================================================================

export function RomLauncher() {
  const { result, loadRom, loadManifest, reset, ValidatorView } =
    useRomValidator();

  const handleRomUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      loadRom(file);
    }
  };

  const handleManifestUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (readerEvent) => {
        try {
          const parsed = JSON.parse(String(readerEvent.target?.result));
          loadManifest(parsed);
        } catch (error) {
          alert("Invalid manifest JSON");
        }
      };
      reader.readAsText(file);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <h1 className="text-3xl font-bold">ROM Validator</h1>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-2">Upload ROM</label>
          <input
            type="file"
            accept=".nes,.gb,.gba,.smc,.sfc"
            onChange={handleRomUpload}
            className="w-full"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">
            Upload Manifest (JSON)
          </label>
          <input
            type="file"
            accept=".json"
            onChange={handleManifestUpload}
            className="w-full"
          />
        </div>
      </div>

      <button
        onClick={reset}
        className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
      >
        Reset
      </button>

      <ValidatorView />

      {result.isValid && (
        <div className="p-4 bg-green-100 rounded">
          <p className="font-semibold">Ready to launch!</p>
          <button className="mt-2 px-4 py-2 bg-green-600 text-white rounded">
            Launch ROM
          </button>
        </div>
      )}
    </div>
  );
}

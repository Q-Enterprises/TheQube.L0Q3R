export const ROM_FORMATS = {
  NES: {
    key: "NES",
    name: "Nintendo Entertainment System",
    extensions: [".nes"],
    magic: [0x4e, 0x45, 0x53, 0x1a],
  },
  GB: {
    key: "GB",
    name: "Game Boy / Game Boy Color",
    extensions: [".gb", ".gbc"],
    logoOffset: 0x104,
    logo: [
      0xce, 0xed, 0x66, 0x66, 0xcc, 0x0d, 0x00, 0x0b, 0x03, 0x73, 0x00,
      0x83, 0x00, 0x0c, 0x00, 0x0d, 0x00, 0x08, 0x11, 0x1f, 0x88,
      0x89, 0x00, 0x0e, 0xdc, 0xcc, 0x6e, 0xe6, 0xdd, 0xdd, 0xd9,
      0x99, 0xbb, 0xbb, 0x67, 0x63, 0x6e, 0x0e, 0xec, 0xcc, 0xdd,
      0xdc, 0x99, 0x9f, 0xbb, 0xb9, 0x33, 0x3e,
    ],
  },
  GBA: {
    key: "GBA",
    name: "Game Boy Advance",
    extensions: [".gba"],
    headerMarkerOffset: 0xb2,
    headerMarker: 0x96,
  },
  SNES: {
    key: "SNES",
    name: "Super Nintendo",
    extensions: [".sfc", ".smc"],
    headerOffsets: [0x7fc0, 0xffc0],
  },
};

const isPrintableAscii = (value) => value >= 0x20 && value <= 0x7e;

const readText = (buffer, offset, length) => {
  if (offset + length > buffer.length) {
    return "";
  }
  return String.fromCharCode(...buffer.slice(offset, offset + length));
};

const hasMagic = (buffer, magic) =>
  magic.every((byte, index) => buffer[index] === byte);

const hasGbLogo = (buffer) => {
  const { logoOffset, logo } = ROM_FORMATS.GB;
  if (buffer.length < logoOffset + logo.length) {
    return false;
  }
  return logo.every((byte, index) => buffer[logoOffset + index] === byte);
};

const hasGbaHeader = (buffer) => {
  const { headerMarkerOffset, headerMarker } = ROM_FORMATS.GBA;
  return buffer.length > headerMarkerOffset && buffer[headerMarkerOffset] === headerMarker;
};

const hasSnesHeader = (buffer, offset) => {
  const title = readText(buffer, offset, 21);
  const isTitleValid = [...title].every((char) => isPrintableAscii(char.charCodeAt(0)));
  if (!isTitleValid) {
    return false;
  }

  const checksumOffset = offset + 0x1c;
  const complementOffset = offset + 0x1e;
  if (complementOffset + 1 >= buffer.length) {
    return false;
  }

  const checksum = buffer[checksumOffset] | (buffer[checksumOffset + 1] << 8);
  const complement = buffer[complementOffset] | (buffer[complementOffset + 1] << 8);

  return ((checksum + complement) & 0xffff) === 0xffff;
};

const normalizeFilename = (filename) => filename?.toLowerCase() ?? "";

export function detectRomFormat(filename, buffer) {
  if (!buffer || buffer.length === 0) {
    return null;
  }

  const lowerName = normalizeFilename(filename);

  if (hasMagic(buffer, ROM_FORMATS.NES.magic)) {
    return ROM_FORMATS.NES;
  }

  if (hasGbLogo(buffer)) {
    return ROM_FORMATS.GB;
  }

  if (hasGbaHeader(buffer)) {
    return ROM_FORMATS.GBA;
  }

  if (ROM_FORMATS.SNES.headerOffsets.some((offset) => hasSnesHeader(buffer, offset))) {
    return ROM_FORMATS.SNES;
  }

  const extensionMatch = Object.values(ROM_FORMATS).find((format) =>
    format.extensions?.some((extension) => lowerName.endsWith(extension)),
  );

  return extensionMatch ?? null;
}

export const MANIFEST_SCHEMA = {
  schema: "RomManifest.v1",
  requiredFields: ["schema", "title", "roms"],
  romFields: ["id", "name", "path", "sha256", "start_address"],
};

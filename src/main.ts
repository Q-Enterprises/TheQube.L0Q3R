type RomManifest = {
  schema: string;
  title: string;
  roms: Array<{
    id: string;
    name: string;
    path: string;
    sha256: string;
    start_address: string;
  }>;
};

const checkpointLabel = document.getElementById('checkpoint-label');
const checkpointMeta = document.getElementById('checkpoint-meta');
const romList = document.getElementById('roms');

function setCheckpoint(status: string, meta?: string) {
  if (checkpointLabel) {
    checkpointLabel.textContent = status;
  }
  if (checkpointMeta) {
    checkpointMeta.textContent = meta ?? '';
  }
}

async function loadManifest() {
  const response = await fetch('/parkers-sandbox/roms/manifest.json');
  if (!response.ok) {
    throw new Error(`Manifest fetch failed: ${response.status}`);
  }
  return (await response.json()) as RomManifest;
}

function renderRoms(roms: RomManifest['roms']) {
  if (!romList) {
    return;
  }
  romList.innerHTML = '';
  roms.forEach((rom) => {
    const item = document.createElement('li');
    item.textContent = `${rom.name} (${rom.start_address})`;
    romList.appendChild(item);
  });
}

async function boot() {
  try {
    setCheckpoint('Checkpoint ready', 'Schema: RomManifest.v1');
    const manifest = await loadManifest();
    renderRoms(manifest.roms);
  } catch (error) {
    setCheckpoint('Checkpoint load failed', (error as Error).message);
  }
}

boot();

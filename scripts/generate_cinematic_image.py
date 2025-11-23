import math
import struct
import zlib

SCALE = 4
BASE_WIDTH = 1920
BASE_HEIGHT = 1080
WIDTH = BASE_WIDTH * SCALE
HEIGHT = BASE_HEIGHT * SCALE
ASPECT = WIDTH / HEIGHT

BACKGROUND_TINTS = {
    "deep_teal": (14, 38, 58),
    "amber": (211, 154, 96),
    "midnight": (8, 18, 28),
    "steel": (36, 64, 92),
}

LIGHT_PULSES = [
    {"center": (0.32, -0.18), "radius": 0.52, "intensity": 1.0, "warmth": 0.8},
    {"center": (-0.18, 0.24), "radius": 0.66, "intensity": 0.65, "warmth": 0.35},
    {"center": (0.45, 0.12), "radius": 0.38, "intensity": 0.75, "warmth": 0.55},
]

NODE_COORDINATES = [
    (0.0, 0.0, 1.0),
    (-0.28, 0.05, 0.8),
    (0.29, -0.08, 0.9),
    (-0.05, 0.23, 0.7),
    (0.12, -0.31, 0.6),
]

HEX_SPACING = 0.11
HEX_LINE_SOFTNESS = 0.07
HEX_HAZE = 0.18

SCANLINE_STRENGTH = 0.025

def lerp(a, b, t):
    return a + (b - a) * t


def mix(c1, c2, t):
    return tuple(lerp(a, b, t) for a, b in zip(c1, c2))


def smoothstep(edge0, edge1, x):
    t = max(0.0, min(1.0, (x - edge0) / (edge1 - edge0)))
    return t * t * (3 - 2 * t)


def highlight_mask(nx, ny, center, radius):
    dx = nx - center[0]
    dy = (ny - center[1]) * ASPECT
    dist = math.sqrt(dx * dx + dy * dy)
    return max(0.0, 1.0 - (dist / max(radius, 1e-6)) ** 2)


def hex_line_intensity(nx, ny):
    u = nx / HEX_SPACING
    v = (nx * 0.5 + ny * math.sqrt(3) / 2) / HEX_SPACING
    w = (nx * 0.5 - ny * math.sqrt(3) / 2) / HEX_SPACING

    def line_field(coord):
        frac = coord - math.floor(coord)
        distance = min(frac, 1.0 - frac)
        softness = HEX_LINE_SOFTNESS
        return math.exp(-(distance ** 2) / (softness * softness))

    intensity = max(line_field(u), line_field(v))
    intensity = max(intensity, line_field(w))
    haze = math.exp(-((nx * nx + ny * ny) / (HEX_HAZE * HEX_HAZE)))
    return intensity * haze


def base_color(nx, ny):
    base = mix(BACKGROUND_TINTS["midnight"], BACKGROUND_TINTS["deep_teal"], 0.6 - ny * 0.2)
    horizon_color = mix(BACKGROUND_TINTS["amber"], BACKGROUND_TINTS["steel"], ny + 0.5)
    sky_mix = smoothstep(-0.55, 0.25, ny)
    color = mix(base, horizon_color, sky_mix)

    for pulse in LIGHT_PULSES:
        mask = highlight_mask(nx, ny, pulse["center"], pulse["radius"])
        warm_color = mix(BACKGROUND_TINTS["amber"], BACKGROUND_TINTS["deep_teal"], 1.0 - pulse["warmth"])
        color = mix(color, warm_color, mask * pulse["intensity"] * 0.55)

    mesh = hex_line_intensity(nx, ny)
    color = mix(color, (245, 238, 210), mesh * 0.18)

    glow = 0.0
    for node_x, node_y, strength in NODE_COORDINATES:
        glow += highlight_mask(nx, ny, (node_x, node_y), 0.18) * strength * 0.45

    highlight = highlight_mask(nx, ny, (0.14, -0.04), 0.42)
    glow += highlight * 0.6

    vignette = smoothstep(0.55, 0.98, math.sqrt(nx * nx + ny * ny))
    cinematic = [
        color[0] * (1.1 + glow * 0.6) * (1.0 - 0.12 * vignette),
        color[1] * (1.05 + glow * 0.5) * (1.0 - 0.10 * vignette),
        color[2] * (1.08 + glow * 0.4) * (1.0 - 0.08 * vignette),
    ]

    cinematic[2] += mesh * 26.0
    cinematic[0] += glow * 32.0
    cinematic[1] += glow * 18.0

    return cinematic


def tone_map(value):
    return value / (1.0 + value)


def apply_final_grade(r, g, b):
    tone = [tone_map(max(0.0, component) / 255.0) for component in (r, g, b)]
    tone[0] = tone[0] ** 0.92
    tone[1] = tone[1] ** 0.95
    tone[2] = tone[2] ** 0.9
    return [int(max(0, min(255, t * 255.0))) for t in tone]


print("Precomputing base cinematic palette ({}x{})".format(BASE_WIDTH, BASE_HEIGHT))
base_palette = []
for by in range(BASE_HEIGHT):
    row = []
    ny = (by + 0.5) / BASE_HEIGHT - 0.5
    for bx in range(BASE_WIDTH):
        nx = (bx + 0.5) / BASE_WIDTH - 0.5
        r, g, b = base_color(nx, ny)
        rr, gg, bb = apply_final_grade(r, g, b)
        row.append((rr, gg, bb))
    base_palette.append(row)

compressor = zlib.compressobj()
compressed_parts = []

print("Rendering 8K cinematic frame")
for by, row_colors in enumerate(base_palette):
    for sy in range(SCALE):
        y_index = by * SCALE + sy
        scanline = math.sin((y_index / HEIGHT) * math.pi) * SCANLINE_STRENGTH
        row = bytearray([0])
        for r, g, b in row_colors:
            rr = r + int(scanline * 32)
            gg = g + int(scanline * 24)
            bb = b + int(scanline * 18)
            rr = max(0, min(255, rr))
            gg = max(0, min(255, gg))
            bb = max(0, min(255, bb))
            pixel = bytes((rr, gg, bb)) * SCALE
            row.extend(pixel)
        compressed_parts.append(compressor.compress(bytes(row)))

compressed_parts.append(compressor.flush())
compressed_data = b"".join(part for part in compressed_parts if part)


def png_chunk(chunk_type, data):
    chunk = struct.pack(">I", len(data))
    chunk += chunk_type
    chunk += data
    crc = zlib.crc32(chunk_type)
    crc = zlib.crc32(data, crc)
    chunk += struct.pack(">I", crc & 0xFFFFFFFF)
    return chunk


with open("assets/cinematic_8k.png", "wb") as f:
    header = b"\x89PNG\r\n\x1a\n"
    ihdr = struct.pack(">IIBBBBB", WIDTH, HEIGHT, 8, 2, 0, 0, 0)
    f.write(header)
    f.write(png_chunk(b"IHDR", ihdr))
    f.write(png_chunk(b"IDAT", compressed_data))
    f.write(png_chunk(b"IEND", b""))

print("Generated assets/cinematic_8k.png")

"""Generate branded BMP/ICO assets for the NSIS and WiX installers."""

from __future__ import annotations

import struct
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent
ICON_PATH = ROOT.parent / "icons" / "128x128.png"
OUT_DIR = ROOT / "installer"

BG = (8, 9, 11)
BG_ELEVATED = (16, 18, 22)
FG = (255, 255, 255)
MUTED = (154, 168, 164)
RULE = (86, 96, 109)

SEGOE = Path(r"C:\Windows\Fonts\segoeui.ttf")
SEGOE_BOLD = Path(r"C:\Windows\Fonts\segoeuib.ttf")


def font(path: Path, size: int) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    try:
        return ImageFont.truetype(str(path), size)
    except OSError:
        return ImageFont.load_default()


def load_mark(size: int) -> Image.Image:
    icon = Image.open(ICON_PATH).convert("RGBA")
    icon = icon.resize((size, size), Image.Resampling.LANCZOS)
    return icon


def paste_center(base: Image.Image, overlay: Image.Image, cy: int) -> None:
    x = (base.width - overlay.width) // 2
    y = cy - overlay.height // 2
    base.paste(overlay, (x, y), overlay)


def write_dib_ico(images: list[Image.Image], path: Path) -> None:
    """Write a classic BMP/DIB .ico. NSIS cannot embed PNG-compressed icons."""
    payloads: list[bytes] = []
    entries: list[tuple[int, int, int]] = []
    for image in images:
        im = image.convert("RGBA")
        width, height = im.size
        pixels = im.load()
        xor = bytearray()
        for y in range(height - 1, -1, -1):
            for x in range(width):
                red, green, blue, alpha = pixels[x, y]
                xor += bytes((blue, green, red, alpha))
        row_bytes = ((width + 31) // 32) * 4
        and_mask = bytearray()
        for y in range(height - 1, -1, -1):
            row = bytearray(row_bytes)
            for x in range(width):
                if pixels[x, y][3] < 128:
                    row[x // 8] |= 0x80 >> (x % 8)
            and_mask.extend(row)
        header = struct.pack(
            "<IIIHHIIIIII",
            40,
            width,
            height * 2,
            1,
            32,
            0,
            len(xor) + len(and_mask),
            0,
            0,
            0,
            0,
        )
        payloads.append(header + xor + and_mask)
        entries.append(
            (0 if width >= 256 else width, 0 if height >= 256 else height, len(payloads[-1]))
        )

    offset = 6 + 16 * len(entries)
    out = bytearray(struct.pack("<HHH", 0, 1, len(entries)))
    for width, height, size in entries:
        out += struct.pack("<BBBBHHII", width, height, 0, 0, 1, 32, size, offset)
        offset += size
    for payload in payloads:
        out += payload
    path.write_bytes(out)


def nsis_icon() -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    source = Image.open(ICON_PATH).convert("RGBA")
    # 32x32 first: Explorer and NSIS both prefer the first ICO entry.
    sizes = (32, 16, 24, 48, 64)
    frames = [
        source.resize((size, size), Image.Resampling.LANCZOS) for size in sizes
    ]
    path = OUT_DIR / "installer.ico"
    write_dib_ico(frames, path)
    print(f"wrote {path}")


def save_bmp(image: Image.Image, name: str) -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    path = OUT_DIR / name
    image.convert("RGB").save(path, format="BMP")
    print(f"wrote {path} ({image.width}x{image.height})")


def nsis_sidebar() -> None:
    img = Image.new("RGB", (164, 314), BG)
    draw = ImageDraw.Draw(img)
    draw.rectangle((0, 0, 5, 314), fill=RULE)
    paste_center(img, load_mark(92), 118)
    title = font(SEGOE_BOLD, 20)
    subtitle = font(SEGOE, 11)
    draw.text((82, 188), "Litetify", font=title, fill=FG, anchor="mm")
    draw.text((82, 214), "Setup", font=subtitle, fill=MUTED, anchor="mm")
    save_bmp(img, "nsis-sidebar.bmp")


def nsis_header() -> None:
    img = Image.new("RGB", (150, 57), BG)
    draw = ImageDraw.Draw(img)
    mark = load_mark(36)
    img.paste(mark, (10, 10), mark)
    title = font(SEGOE_BOLD, 16)
    draw.text((54, 28), "Litetify", font=title, fill=FG, anchor="lm")
    save_bmp(img, "nsis-header.bmp")


def wix_banner() -> None:
    img = Image.new("RGB", (493, 58), BG)
    draw = ImageDraw.Draw(img)
    mark = load_mark(36)
    img.paste(mark, (14, 11), mark)
    title = font(SEGOE_BOLD, 18)
    muted = font(SEGOE, 11)
    draw.text((60, 20), "Litetify", font=title, fill=FG, anchor="lm")
    draw.text((60, 40), "Setup", font=muted, fill=MUTED, anchor="lm")
    draw.rectangle((0, 56, 493, 58), fill=RULE)
    save_bmp(img, "wix-banner.bmp")


def wix_dialog() -> None:
    img = Image.new("RGB", (493, 312), (255, 255, 255))
    draw = ImageDraw.Draw(img)
    draw.rectangle((0, 0, 164, 312), fill=BG)
    draw.rectangle((164, 0, 169, 312), fill=BG_ELEVATED)
    sidebar = img.crop((0, 0, 164, 312))
    mark = load_mark(92)
    paste_center(sidebar, mark, 118)
    sdraw = ImageDraw.Draw(sidebar)
    title = font(SEGOE_BOLD, 20)
    subtitle = font(SEGOE, 11)
    sdraw.text((82, 188), "Litetify", font=title, fill=FG, anchor="mm")
    sdraw.text((82, 214), "Setup", font=subtitle, fill=MUTED, anchor="mm")
    sdraw.rectangle((0, 0, 5, 312), fill=RULE)
    img.paste(sidebar, (0, 0))
    save_bmp(img, "wix-dialog.bmp")


if __name__ == "__main__":
    nsis_icon()
    nsis_sidebar()
    nsis_header()
    wix_banner()
    wix_dialog()

"""Screen capture via grim (Wayland-native)."""

import io
import subprocess
from dataclasses import dataclass

from PIL import Image


@dataclass
class ScreenRegion:
    """A rectangular region on screen, in pixel coordinates."""
    x: int
    y: int
    width: int
    height: int

    def to_grim_geometry(self) -> str:
        return f"{self.x},{self.y} {self.width}x{self.height}"


def capture_region(region: ScreenRegion) -> Image.Image:
    """Capture a specific screen region using grim. Returns a PIL Image."""
    result = subprocess.run(
        ["grim", "-g", region.to_grim_geometry(), "-t", "ppm", "-"],
        capture_output=True,
        check=True,
    )
    return Image.open(io.BytesIO(result.stdout))


def capture_full_screen() -> Image.Image:
    """Capture the entire screen. Used during calibration."""
    result = subprocess.run(
        ["grim", "-t", "ppm", "-"],
        capture_output=True,
        check=True,
    )
    return Image.open(io.BytesIO(result.stdout))


def capture_all_regions(regions: dict[str, ScreenRegion]) -> dict[str, Image.Image]:
    """Capture a bounding box enclosing all regions, then crop each.

    More efficient than calling grim once per region.
    """
    if not regions:
        return {}

    # Compute bounding box
    min_x = min(r.x for r in regions.values())
    min_y = min(r.y for r in regions.values())
    max_x = max(r.x + r.width for r in regions.values())
    max_y = max(r.y + r.height for r in regions.values())

    bbox = ScreenRegion(min_x, min_y, max_x - min_x, max_y - min_y)
    full = capture_region(bbox)

    crops: dict[str, Image.Image] = {}
    for name, region in regions.items():
        left = region.x - min_x
        top = region.y - min_y
        crops[name] = full.crop((left, top, left + region.width, top + region.height))

    return crops

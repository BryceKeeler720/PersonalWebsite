#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
VENV_DIR="$SCRIPT_DIR/.venv"

# Create venv if it doesn't exist
if [ ! -d "$VENV_DIR" ]; then
    echo "[1/3] Creating Python virtual environment..."
    python3 -m venv "$VENV_DIR"
    echo "[2/3] Installing dependencies..."
    "$VENV_DIR/bin/pip" install -r "$SCRIPT_DIR/requirements.txt"
    echo "[3/3] Done!"
    echo ""
fi

# Check tesseract
if ! command -v tesseract &> /dev/null; then
    echo "ERROR: tesseract is not installed."
    echo "  Install with: sudo pacman -S tesseract tesseract-data-eng"
    exit 1
fi

# Check grim
if ! command -v grim &> /dev/null; then
    echo "ERROR: grim is not installed."
    echo "  Install with: sudo pacman -S grim"
    exit 1
fi

# Check slurp (needed for calibration)
if ! command -v slurp &> /dev/null; then
    echo "ERROR: slurp is not installed."
    echo "  Install with: sudo pacman -S slurp"
    exit 1
fi

# Run
"$VENV_DIR/bin/python" "$SCRIPT_DIR/main.py" "$@"

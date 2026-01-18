# Icon Setup Guide

This folder contains the icons used in the interactive room interface.

## Required Icons

You need to add two icon files to this directory:

### 1. Mouse Icon (`mouse.svg`)
- **File name**: `mouse.svg`
- **Description**: Icon showing a computer mouse
- **Size**: Recommended 24x24px (will be auto-sized)
- **Color**: Any color (will be converted to white automatically)

**Example sources:**
- Your image: Use the icon image you provided
- Heroicons: https://heroicons.com/
- Lucide: https://lucide.dev/icons/mouse
- Tabler Icons: https://tabler-icons.io/i/mouse

### 2. Pinch Icon (`pinch.svg`)
- **File name**: `pinch.svg`
- **Description**: Icon showing pinch-to-zoom gesture (hand with fingers)
- **Size**: Recommended 24x24px (will be auto-sized)
- **Color**: Any color (will be converted to white automatically)

**Example sources:**
- Your image: Use the icon image you provided
- Heroicons: https://heroicons.com/
- Lucide: https://lucide.dev/icons/hand
- Tabler Icons: https://tabler-icons.io/i/pinch

## How to Add Icons

### Option 1: Use Downloaded SVG Files
1. Download or save your icon files
2. Name them `mouse.svg` and `pinch.svg`
3. Place them in this folder (`public/icons/`)
4. The site will automatically use them

### Option 2: Use External URLs
Instead of local files, you can use external URLs:

1. Open `/src/components/room/InteractiveRoom.tsx`
2. Find these lines (around line 18-19):
   ```tsx
   const MOUSE_ICON_URL = '/icons/mouse.svg';
   const PINCH_ICON_URL = '/icons/pinch.svg';
   ```
3. Replace with your URLs:
   ```tsx
   const MOUSE_ICON_URL = 'https://example.com/your-mouse-icon.svg';
   const PINCH_ICON_URL = 'https://example.com/your-pinch-icon.svg';
   ```

## Icon Requirements

- **Format**: SVG preferred (PNG/JPG also work)
- **Size**: Any size (will be scaled to 24x24px)
- **Color**: Any color (CSS filter converts to white)
- **Background**: Transparent recommended

## Testing Your Icons

After adding the icons:
1. Run `npm run dev`
2. Open http://localhost:4321
3. Look at the bottom instruction pill
4. Desktop users will see the mouse icon
5. Mobile users will see the pinch icon

## Current Icon Locations

The icons are referenced in:
- **Component**: `/src/components/room/InteractiveRoom.tsx` (lines 18-19)
- **Styling**: `/src/components/room/InteractiveRoom.css` (lines 146-150)

## Fallback

If icons are not found, you'll see broken image icons. Make sure the file names match exactly:
- `mouse.svg` (lowercase, .svg extension)
- `pinch.svg` (lowercase, .svg extension)

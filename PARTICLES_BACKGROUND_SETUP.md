# Particles Background Setup Guide

Your portfolio now has a 3D particles background behind the Spline scene!

## How It Works

The particles are rendered on a canvas element that sits **behind** your Spline 3D scene. For the particles to be visible, you need to make your Spline scene background transparent.

## Step 1: Make Spline Background Transparent

1. **Open your Spline scene in the editor:**
   - Go to: https://my.spline.design/bryceroom-KjcUPsQuvlBdvkMWaGpfXyH7/

2. **Select the Scene:**
   - In the right panel, look for the **Scene** settings
   - Or click anywhere in empty space to select the scene

3. **Set Background to Transparent:**
   - Find the **Background** section in the right panel
   - Click on the background color/type selector
   - Choose **"Transparent"** or set the alpha/opacity to 0
   - Alternatively, you can set a very dark color with low opacity

4. **Save your changes:**
   - Spline auto-saves, so your changes will be reflected immediately
   - The website will pick up the changes (cache-busting is enabled)

## Step 2: Customize Particles (Optional)

The particles are configured in [InteractiveRoom.tsx:193-201](src/components/room/InteractiveRoom.tsx#L193-L201).

You can adjust these parameters:

```tsx
<ParticlesBackground
  particleCount={1000}          // Number of particles (default: 1000)
  particleSpread={50}            // How spread out particles are (default: 50)
  speed={0.03}                   // Movement speed (default: 0.03)
  particleColors={["#ffffff"]}   // Array of colors (default: white)
  particleBaseSize={100}         // Base size of particles (default: 100)
  sizeRandomness={3}             // Size variation (default: 3)
  cameraDistance={100}           // 3D perspective distance (default: 100)
/>
```

### Example Customizations:

**Slower, colorful particles:**
```tsx
<ParticlesBackground
  particleCount={500}
  speed={0.01}
  particleColors={["#6366f1", "#8b5cf6", "#ec4899"]}
/>
```

**Dense white stars:**
```tsx
<ParticlesBackground
  particleCount={2000}
  particleSpread={80}
  particleBaseSize={50}
  particleColors={["#ffffff"]}
/>
```

**Subtle blue atmosphere:**
```tsx
<ParticlesBackground
  particleCount={800}
  speed={0.02}
  particleColors={["#3b82f6", "#60a5fa", "#93c5fd"]}
/>
```

## Component Files

- **Component**: [ParticlesBackground.tsx](src/components/room/ParticlesBackground.tsx)
- **Styling**: [ParticlesBackground.css](src/components/room/ParticlesBackground.css)
- **Integration**: [InteractiveRoom.tsx:193-201](src/components/room/InteractiveRoom.tsx#L193-L201)

## How the Layering Works

```
┌─────────────────────────────────┐
│   Instructions (z-index: 10)    │
├─────────────────────────────────┤
│   Navigation (z-index: 1000)    │
├─────────────────────────────────┤
│   Content Panels (z-index: 100) │
├─────────────────────────────────┤
│   Spline Scene (z-index: 1)     │ ← Transparent background
├─────────────────────────────────┤
│   Particles Canvas (z-index: 0) │ ← Behind everything
└─────────────────────────────────┘
```

The particles canvas is positioned absolutely with `z-index: 0` and `pointer-events: none`, so it sits behind everything and doesn't interfere with interactions.

## Troubleshooting

### "I don't see the particles"

1. **Check if Spline background is transparent**
   - Open Spline editor and verify background is set to transparent
   - If it has a solid color, the particles will be hidden behind it

2. **Check browser console for errors**
   - Press F12 to open DevTools
   - Look for any JavaScript errors related to ParticlesBackground

3. **Refresh with cache clear**
   - Hard refresh: Ctrl+Shift+R (Windows/Linux) or Cmd+Shift+R (Mac)

### "Particles look choppy or slow"

- Reduce `particleCount` (try 500 or 300)
- Reduce `speed` slightly
- This depends on device performance

### "I want different particle behavior"

Edit [ParticlesBackground.tsx](src/components/room/ParticlesBackground.tsx) to customize:
- Line 56-60: Particle initialization
- Line 68-73: Movement logic
- Line 76-81: Edge wrapping behavior
- Line 84-87: 3D projection
- Line 93-96: Drawing style

## Performance Notes

- The canvas is set to `pointer-events: none` so it doesn't block clicks
- Animation uses `requestAnimationFrame` for smooth, efficient rendering
- Particles are calculated in 3D space and projected to 2D
- Alpha fading based on depth creates realistic depth perception

Enjoy your dynamic 3D particle background! 🎉

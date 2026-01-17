# Interactive Room - Spline Setup Guide

## Overview
Your portfolio now features an interactive 3D room where visitors can explore your workspace by moving their mouse (for parallax effects) and clicking on hotspots to learn more about your projects, infrastructure, and experience.

## Creating Your Spline Scene

### Step 1: Sign Up for Spline
1. Go to [spline.design](https://spline.design)
2. Create a free account (if you don't have one)

### Step 2: Create Your Room Scene
You need to create a 3D room with the following elements:

#### Required Elements for Hotspots:
1. **Computer/Monitor** - Left-center area (for projects)
2. **Server Rack** - Right side (for infrastructure)
3. **Desk** - Center-bottom (for about/bio)
4. **Bookshelf/Wall Decor** - Left wall (for achievements)

#### Design Tips:
- **Camera**: Use a fixed perspective camera positioned to show the full room
- **Lighting**: Add ambient and directional lights for depth
- **Style**: Modern/tech aesthetic matching your brand (blues, purples from your color scheme)
- **Details**: Add personal touches (monitors with glowing screens, cables, posters, etc.)
- **Scale**: Keep objects proportional and centered

### Step 3: Scene Settings
- **Background**: Dark blue or black to match your site theme
- **Camera**: Lock the camera - users will interact via mouse parallax, not camera controls
- **Export Quality**: High quality for professional appearance

### Step 4: Export and Get URL
1. Click **Export** in Spline
2. Choose **Share** or **Get Link**
3. Copy the scene URL (should look like: `https://prod.spline.design/XXXXX/scene.splinecode`)
4. Paste this URL into the component

### Step 5: Update the Component
Open `/src/components/room/InteractiveRoom.tsx` and replace the placeholder URL:

```tsx
<Spline
  scene="https://prod.spline.design/YOUR-NEW-SCENE-URL/scene.splinecode"
  onLoad={() => setIsLoaded(true)}
/>
```

Replace `YOUR-NEW-SCENE-URL` with your actual Spline scene URL.

## Adjusting Hotspot Positions

The hotspots are positioned using percentage-based coordinates. You may need to adjust these to align with your actual 3D scene elements.

In `/src/components/room/InteractiveRoom.tsx`, find the `hotspots` array:

```tsx
const hotspots: HotspotData[] = [
  {
    id: 'computer',
    label: 'Projects',
    position: { x: 35, y: 45 }, // Adjust these percentages
    icon: '💻'
  },
  // ... other hotspots
];
```

### How to Adjust:
- `x`: 0 = left edge, 50 = center, 100 = right edge
- `y`: 0 = top edge, 50 = center, 100 = bottom edge

**Tip**: Run the dev server (`npm run dev`) and adjust the values until the `+` indicators align with your 3D objects.

## Customizing Content

### Adding/Editing Projects
Edit the `contentData` object in `/src/components/room/InteractiveRoom.tsx`:

```tsx
computer: {
  title: 'Projects & Development',
  subtitle: 'What I build and create',
  items: [
    {
      title: 'Your Project Name',
      description: 'Project description',
      tags: ['Tech', 'Stack'],
      link: 'https://project-url.com' // Optional
    },
    // Add more projects...
  ]
}
```

### Customizing Other Hotspots
- **server-rack**: Update infrastructure details, services running
- **desk**: Modify your bio, skills, company info
- **bookshelf**: Add certifications, achievements, interests

## Advanced Customization

### Changing Hotspot Icons
Update the `icon` property for each hotspot with any emoji:
```tsx
icon: '🚀' // or any emoji you prefer
```

### Adjusting Parallax Intensity
In `/src/components/room/InteractiveRoom.tsx`, modify the parallax calculation:

```tsx
const parallaxTransform = {
  transform: `
    perspective(1000px)
    rotateX(${(mousePosition.y - 0.5) * -5}deg)  // Change -5 for vertical tilt
    rotateY(${(mousePosition.x - 0.5) * 5}deg)   // Change 5 for horizontal tilt
  `
};
```

Increase the numbers for more dramatic tilt, decrease for subtle effects.

### Disabling Parallax
If you prefer no mouse-tracking parallax effect, comment out the `style={parallaxTransform}` prop:

```tsx
<div className="spline-container" /* style={parallaxTransform} */>
```

## Testing Your Scene

1. Start the dev server:
   ```bash
   npm run dev
   ```

2. Navigate to `http://localhost:4321`

3. Test:
   - Mouse movement creates subtle parallax tilt
   - Hotspots appear with pulsing `+` indicators
   - Clicking hotspots opens content panels
   - Content panels slide from different directions based on hotspot location
   - Close button and overlay dismiss the panels

## Spline Scene Inspiration

### Recommended Elements:
- Gaming PC setup with RGB lighting
- Multiple monitors
- Server rack with blinking LEDs
- Mechanical keyboard
- Desk lamp
- Posters/wall art (tech/gaming themed)
- Cable management
- Plants for warmth
- Window with city view (optional)

### Example Scenes for Reference:
Search on Spline Community for:
- "Gaming Setup"
- "Workspace"
- "Tech Room"
- "Developer Desk"

## Performance Tips

- Keep polygon count reasonable (under 100k triangles)
- Optimize textures (use compressed formats)
- Use Spline's built-in optimization tools
- Test on mobile devices - parallax is disabled automatically on touch devices

## Need Help?

- Spline Documentation: https://docs.spline.design
- Spline Community: https://community.spline.design
- Your current scene URL: Update line 84 in `/src/components/room/InteractiveRoom.tsx`

## Current Hotspot Locations

| Hotspot | ID | Default Position | Content Type |
|---------|----|--------------------|--------------|
| Computer/Monitor | `computer` | x: 35%, y: 45% | Projects & GitHub repos |
| Server Rack | `server-rack` | x: 70%, y: 50% | Home lab infrastructure |
| Desk Area | `desk` | x: 50%, y: 65% | About me & skills |
| Bookshelf | `bookshelf` | x: 15%, y: 40% | Achievements & interests |

Adjust these positions after creating your scene to match your 3D layout!

# Spline Object Setup Guide - Interactive Room

Your portfolio now uses **Spline's native event system** where 3D objects in your scene are directly clickable! This is much better than overlay positioning.

## How It Works

When you load your site, the component will:
1. Load your Spline scene
2. Listen for clicks on any 3D object
3. Check the browser console to see all available object names
4. Match clicked object names to content panels

## Step 1: Check Your Object Names

1. **Run the dev server:**
   ```bash
   npm run dev
   ```

2. **Open the browser console** (F12 or Right-click → Inspect → Console)

3. **Look for this log message:**
   ```
   Spline loaded. Available objects: [list of all your object names]
   ```

4. **Find the names** of your clickable objects (computer, server rack, desk, bookshelf)

## Step 2: Update Object Mapping

In your Spline editor, check what you named these objects. Common examples:
- Computer might be named: "Computer", "PC", "Monitor", "iMac", etc.
- Server rack might be named: "ServerRack", "Server", "Rack", etc.
- Desk might be named: "Desk", "Table", "DeskArea", etc.
- Bookshelf might be named: "Bookshelf", "Shelf", "Books", etc.

**Edit** `/src/components/room/InteractiveRoom.tsx` around **line 18-29** and update the `objectMapping`:

```tsx
const objectMapping: Record<string, string> = {
  // Replace these with YOUR actual Spline object names
  'Computer': 'computer',        // ← Change 'Computer' to match your object name
  'Monitor': 'computer',         // You can map multiple objects to same content
  'PC': 'computer',

  'ServerRack': 'server-rack',   // ← Change 'ServerRack' to match your object name
  'Server': 'server-rack',

  'Desk': 'desk',                // ← Change 'Desk' to match your object name
  'DeskArea': 'desk',

  'Bookshelf': 'bookshelf',      // ← Change 'Bookshelf' to match your object name
  'Books': 'bookshelf',
  'Shelf': 'bookshelf'
};
```

### Example:
If in Spline you named your objects:
- "Gaming PC"
- "Server Tower"
- "Office Desk"
- "Wall Shelf"

Your mapping should be:
```tsx
const objectMapping: Record<string, string> = {
  'Gaming PC': 'computer',
  'Server Tower': 'server-rack',
  'Office Desk': 'desk',
  'Wall Shelf': 'bookshelf'
};
```

## Step 3: Make Objects Clickable in Spline (IMPORTANT!)

In your Spline editor, for each interactive object:

1. **Select the object** in the layers panel
2. **Enable interactions** in the properties panel (right side)
3. Make sure the object is **not locked** or in a locked group
4. Ensure the object has **events enabled**

**Tip:** Group related objects and name the parent group (e.g., a "Computer" group containing monitor, keyboard, mouse).

## Step 4: Test Click Detection

1. **Save your changes** to `InteractiveRoom.tsx`
2. **Refresh** your browser
3. **Click on objects** in your 3D scene
4. **Check the console** - you should see:
   ```
   Clicked on: [ObjectName] -> [hotspotId]
   ```

If you don't see this message, the object name doesn't match your mapping.

## Current Content Mapping

| Object Mapping Key | Hotspot ID | Content Title |
|-------------------|------------|---------------|
| Your computer object name → | `computer` | Projects & Development |
| Your server object name → | `server-rack` | Home Lab Infrastructure |
| Your desk object name → | `desk` | About Bryce Keeler |
| Your bookshelf object name → | `bookshelf` | Achievements & Interests |

## Troubleshooting

### "Nothing happens when I click"
1. Check the browser console for the list of object names
2. Make sure your object names in Spline match the `objectMapping`
3. Ensure objects are not locked in Spline
4. Try clicking directly on the object (not empty space)

### "Wrong content shows up"
Your object name is mapped to the wrong hotspot ID. Update the `objectMapping`.

### "Console shows empty array []"
Your Spline scene might not have any named objects. Name your objects in Spline's layers panel.

### "Hover doesn't work"
The `mouseHover` event in Spline can be temperamental. The main click functionality should still work.

## Updating Your Spline Scene

When you make changes in Spline:

1. **Export** your scene again (get new URL if it changed)
2. If the URL is the same, just **refresh** your browser (Spline auto-updates)
3. If the URL changed, update line 203 in `InteractiveRoom.tsx`
4. **Check object names** again in console (they might have changed)

## Current Scene URL
```
https://prod.spline.design/Q4QXKyGg8LbBaE8z/scene.splinecode
```

Located at: `/src/components/room/InteractiveRoom.tsx:203`

## Next Steps

1. Run `npm run dev` and check console for object names
2. Update the `objectMapping` with your actual Spline object names
3. Test clicking each object
4. Enjoy your fully integrated 3D interactive portfolio! 🎉

## Advanced: Adding More Interactive Objects

Want to add more clickable areas?

1. **Add new content** in the `contentData` object (line 32-120)
2. **Map the Spline object** name in `objectMapping`
3. **Update** the `ContentPanel.tsx` if you need custom panel positioning

That's it! The system will automatically handle the new objects.

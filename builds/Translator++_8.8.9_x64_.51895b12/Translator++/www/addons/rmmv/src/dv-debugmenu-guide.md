# Debug Menu User Guide

## Overview

The **Debug Menu** is a powerful development and testing tool designed for RPG Maker MV games running on NWjs. It provides comprehensive game manipulation, debugging, and quality-of-life features through an intuitive menu bar interface.

**Version:** 1.0.0  
**Author:** Dreamsavior  
**License:** Free for Non-Commercial Use  
**Contact:** dreamsavior@gmail.com  
**Discord:** https://discord.gg/QX37wqbfe2

---

## Table of Contents

1. [Installation & Requirements](#installation--requirements)
2. [Menu Overview](#menu-overview)
3. [Utility Menu](#utility-menu)
4. [Save Menu](#save-menu)
5. [Debug Menu](#debug-menu)
6. [Cheat Menu](#cheat-menu)
7. [Help Menu](#help-menu)
8. [Advanced Features](#advanced-features)
9. [Keyboard Shortcuts](#keyboard-shortcuts)
10. [Troubleshooting](#troubleshooting)

---

## Installation & Requirements

### Requirements
- RPG Maker MV game
- NWjs runtime environment
- The game must be running in a desktop environment (not web browser)

### Installation
1. Place the `dv-debugmenu.js` file in your addons directory
2. Ensure the file is loaded when the game starts
3. The debug menu will automatically appear in the menu bar when the game launches

### Configuration Storage
The debug menu stores its configuration in a `debug.json` file located in your game directory. This file preserves settings like:
- Mute state
- Previous volume levels
- Debug mode preference

---

## Menu Overview

The debug menu consists of five main menu categories, accessible from the top menu bar:

1. **Utility** - General game utilities and window controls
2. **Save** - Quick access to save/load functionality
3. **Debug** - Development and debugging tools
4. **Cheat** - Game state manipulation features
5. **Help** - Information and licensing

---

## Utility Menu

### Toggle Fullscreen
**Function:** Switches the game window between fullscreen and windowed mode.

**Usage:**
- Click `Utility > Toggle Fullscreen`
- Instantly toggles fullscreen state
- No confirmation required

---

### Reload Window
**Function:** Reloads the entire game window.

**Usage:**
- Click `Utility > Reload Window`
- Confirmation dialog appears
- Select "OK" to proceed or "Cancel" to abort

**⚠️ Warning:** All unsaved progress will be lost!

**Use Cases:**
- Testing plugin changes
- Recovering from game freezes
- Resetting the game state

---

### Back to Title Screen
**Function:** Returns to the game's title screen.

**Usage:**
- Click `Utility > Back to Title Screen`
- Confirmation dialog appears
- Select "OK" to return to title

**⚠️ Warning:** All unsaved progress will be lost!

**Requirements:**
- Game must be fully loaded
- `SceneManager` must be available

---

### Volume Control
**Function:** Opens a comprehensive volume control panel.

**Features:**
- **Mute All Sound** - Quick mute toggle with checkbox
- **Individual Volume Sliders:**
  - BGM Volume (Background Music)
  - BGS Volume (Background Sounds)
  - ME Volume (Music Effects)
  - SE Volume (Sound Effects)
  - Master Volume (Controls all at once)

**Usage:**
1. Click `Utility > Volume Control`
2. Adjust sliders as needed
3. Use "Mute All Sound" checkbox for quick muting
4. Click "Close" when done

**Special Features:**
- **Master Volume Slider:** Moving this slider adjusts all other volumes simultaneously
- **Mute Preservation:** When unmuting, previous volume levels are restored automatically
- **Real-time Updates:** Changes take effect immediately

---

### Mute Sound (Quick Toggle)
**Function:** Quick mute/unmute checkbox in the menu.

**Usage:**
- Click `Utility > Mute Sound` to toggle
- Checkmark indicates muted state
- Previous volumes are preserved and restored when unmuting

**Persistence:** Mute state is saved to `debug.json` and persists across game sessions.

---

## Save Menu

### Open Save Menu
**Function:** Opens the game's save screen.

**Usage:**
- Click `Save > Open Save Menu`
- Game save menu appears
- Use normal game controls to save

**Requirements:**
- Game must be fully loaded
- `Scene_Save` must be available
- Save points/restrictions may still apply

---

### Open Load Menu
**Function:** Opens the game's load screen.

**Usage:**
- Click `Save > Open Load Menu`
- Game load menu appears
- Select a save file to load

**Requirements:**
- Game must be fully loaded
- `Scene_Load` must be available

**Use Cases:**
- Quick testing of different save states
- Recovery from bugs
- Testing save/load functionality

---

## Debug Menu

### Open Debug Console
**Function:** Opens the Chrome DevTools developer console.

**Usage:**
- Click `Debug > Open Debug Console`
- Chrome DevTools window opens
- Access console, network, elements, etc.

**Use Cases:**
- Viewing console logs and errors
- Debugging JavaScript code
- Inspecting DOM elements
- Network traffic analysis
- Performance profiling

---

### Open RPG Maker Debugger
**Function:** Opens the built-in RPG Maker debug menu.

**Usage:**
- Click `Debug > Open RPG Maker Debugger`
- RPG Maker debug screen appears

**Requirements:**
- Game must be running in debug/test mode
- `Scene_Debug` must be available

**Alternative:** Press **F9** when in debug mode

**Features (RPG Maker Debugger):**
- View/edit switches and variables
- Built-in RPG Maker debugging interface

---

### Play in Debug Mode
**Function:** Enables or disables RPG Maker's debug mode.

**Usage:**
1. Click `Debug > Play in Debug Mode` (checkbox toggle)
2. A modal dialog appears with information
3. Confirm to reload the game in the selected mode

**Debug Mode Features:**
- **F9** - Open RPG Maker debug menu
- **F2** - Show/Hide FPS counter
- **Ctrl** (hold while moving) - Walk through walls (no-clip)

**Technical Details:**
- Adds `?test` parameter to URL when enabled
- Preference is saved to `debug.json`
- Game automatically reloads when preference changes

**⚠️ Warning:** Game will reload when changing modes. Save your progress first!

---

## Cheat Menu

The Cheat Menu provides powerful game state manipulation tools. Use responsibly for testing and debugging purposes.

---

### Heal All
**Function:** Fully restores HP and MP for all party members.

**Usage:**
- Click `Cheat > Heal All`
- All party members instantly recover to full HP/MP
- All status conditions are removed

**Requirements:**
- Game party must be initialized
- `$gameParty` must be available

**Use Cases:**
- Quick recovery during testing
- Preparing for boss battles
- Testing game mechanics without grinding

---

### Everyone Dying
**Function:** Sets all party members' HP to 1.

**Usage:**
- Click `Cheat > Everyone Dying`
- All party members' HP drops to 1
- MP remains unchanged

**Use Cases:**
- Testing low-health scenarios
- Testing resurrection mechanics
- Testing game over conditions

---

### Gain EXP
**Function:** Opens a modal to grant experience points to selected characters.

**Features:**
- Set custom EXP amount
- Select specific characters
- Multiple character selection

**Usage:**
1. Click `Cheat > Gain EXP`
2. Enter desired EXP amount in the input field
3. Check boxes next to characters to receive EXP
4. Click "Apply" to grant experience
5. Click "Close" to cancel

**Interface Details:**
- Shows current character levels
- Default value: 100 EXP
- Minimum value: 0

**Requirements:**
- Game party must be ready
- Characters must be in the active party

---

### Character Stats
**Function:** Comprehensive character editing interface.

**Features:**
- Edit basic stats (Level, HP, MP)
- Modify parameter bonuses
- Add/remove skills
- Add/remove states

**Usage:**
1. Click `Cheat > Character Stats`
2. Select a character from the list
3. Edit desired attributes in the character editor
4. Click "Save Changes" to apply
5. Click "Back" to return to character selection

#### Basic Stats Section
**Editable Attributes:**
- **Level** - Set character level (1 to max level)
- **HP** - Set current HP (0 to max HP)
- **MP** - Set current MP (0 to max MP)

**Visual Indicators:**
- Green header with ⚔ icon
- Current max values displayed
- Input validation prevents invalid values

#### Parameter Bonuses Section
**Plus Parameters (Added to Base Stats):**
- **ATK** - Attack bonus
- **DEF** - Defense bonus
- **MAT** - Magic Attack bonus
- **MDF** - Magic Defense bonus
- **AGI** - Agility bonus
- **LUK** - Luck bonus

**Features:**
- View current total stats
- Add positive or negative bonuses
- Bonuses stack with equipment and level stats
- Real-time total calculation display

#### Skills Section
**Add Skills:**
1. Click "+ Add Skill" button
2. Browse or search available skills
3. Click on a skill to learn it
4. Already-learned skills are dimmed and unclickable

**Remove Skills:**
- Click "✖" button next to any learned skill

**Features:**
- Filter skills by name (search box)
- Shows skill descriptions
- Prevents duplicate skill learning
- Empty state message when no skills learned

#### States Section
**Add States:**
1. Click "+ Add State" button
2. Browse or search available states
3. Click on a state to apply it
4. Already-active states are dimmed

**Remove States:**
- Click "✖" button next to any active state

**Features:**
- Filter states by name (search box)
- Shows state descriptions
- Death state is automatically excluded
- Empty state message when no states active

**Save Mechanism:**
- Changes are applied when "Save Changes" is clicked
- Actor stats are refreshed automatically
- Returns to character list after saving

---

### Gold
**Function:** Set the party's gold amount.

**Usage:**
1. Click `Cheat > Gold`
2. View current gold amount
3. Enter desired gold amount
4. Click "Apply" to set gold
5. Click "Close" to cancel

**Features:**
- Shows current gold before editing
- Minimum value: 0
- Instant application
- Automatically calculates gain/loss

**Technical Details:**
- Uses `$gameParty.gainGold()` for increases
- Uses `$gameParty.loseGold()` for decreases

---

### Walking Speed
**Function:** Adjust player movement speed.

**Usage:**
1. Click `Cheat > Walking Speed`
2. Adjust slider (1-10)
3. Movement speed changes in real-time
4. Click "Reset" to restore default (4)
5. Click "Close" when satisfied

**Speed Scale:**
- **1** - Very slow
- **4** - Normal walking speed (default)
- **10** - Very fast

**Info:**
- Normal walking speed is 4
- Changes apply immediately
- Visual slider with numeric display
- Reset button returns to default

---

### Teleport
**Function:** Teleport to any map location instantly.

**Features:**
- Map selection (dropdown and ID input)
- X/Y coordinate input
- Current location display
- Map name display

**Usage:**
1. Click `Cheat > Teleport`
2. View current location info
3. Select destination map (dropdown or enter map ID)
4. Enter X coordinate
5. Enter Y coordinate
6. Click "Teleport" to move
7. Click "Cancel" to abort

**Current Location Display:**
- Shows current map ID and name
- Shows current X, Y coordinates
- Color-coded (green) for easy reading

**Map Selection:**
- **Dropdown:** Browse all available maps by name
- **ID Input:** Direct numeric map ID entry
- Synchronized: Changing one updates the other
- Shows map IDs in [001] format

**Coordinate Input:**
- Separate numeric inputs for X and Y
- Minimum value: 0
- Displays current coordinates as defaults

**⚠️ Warning:**
- Invalid coordinates may cause errors
- Ensure coordinates exist on the target map
- Some maps may have events that trigger on entry

**Technical Details:**
- Uses `$gamePlayer.reserveTransfer()`
- Direction is retained (parameter: 2)
- No fade effect (parameter: 0)

---

### Item
**Function:** Comprehensive item inventory management.

**Features:**
- View all items in the game database
- Adjust quantity for any item
- Filter items by name
- Scrollable table interface

**Usage:**
1. Click `Cheat > Item`
2. View/search items in the table
3. Adjust item quantities in the "Amount" column
4. Changes apply automatically when you edit
5. Click "Close" when done

**Interface:**
- **Item Name Column:** Shows all available items
- **Amount Column:** Numeric input for quantity
- **Filter Box:** Search items by name (real-time)
- **Scrollable:** Handle large item lists easily

**Features:**
- Minimum quantity: 0
- Auto-saves on input change
- Filter is case-insensitive
- Sticky header for easy navigation

**Technical Details:**
- Excludes null items and placeholders
- Uses `$gameParty.numItems()` to get current amount
- Uses `gainItem()/loseItem()` to adjust inventory

---

### Switches
**Function:** View and toggle all game switches.

**Features:**
- View all switches defined in the game
- Toggle switches on/off with checkboxes
- Filter switches by name
- Shows switch IDs in [0001] format

**Usage:**
1. Click `Cheat > Switches`
2. Browse or search for switches
3. Click checkboxes to toggle switch states
4. Click switch names to toggle
5. Click "Close" when done

**Interface:**
- Checkbox for each switch
- Switch ID in [0001] format
- Switch name display
- Filter input for searching

**Features:**
- Real-time toggle (no apply button needed)
- Case-insensitive filter
- Automatic persistence
- Scrollable list for many switches

**Technical Details:**
- Uses `$gameSwitches.value()` to read state
- Uses `$gameSwitches.setValue()` to write state
- Changes saved automatically in game data

**Use Cases:**
- Testing conditional events
- Unlocking areas or features
- Debugging event logic
- Testing game progression

---

### Variables
**Function:** Advanced game variable editor with full data type support.

**Features:**
- View all game variables
- Edit variable values with type support
- Filter by name or ID
- Sort by ID or name
- Support for: null, number, string, object (JSON), boolean

**Usage:**
1. Click `Cheat > Variables`
2. Browse, filter, or sort variables
3. Click on a variable row to edit
4. Select value type and enter value
5. Click "Save" to apply changes

#### Main Interface
**Table Columns:**
- **ID** - Variable ID (0001 format)
- **Name** - Variable name from database
- **Value** - Current value with type-specific coloring
- **Type** - Data type indicator

**Value Coloring:**
- **Blue** - null/undefined
- **White** - Numbers
- **Green** - Strings
- **Red** - Objects (JSON)
- **Gold** - Booleans

**Filter & Sort:**
- **Filter Box:** Search by name or ID (case-insensitive)
- **Sort Options:**
  - ID (Ascending)
  - ID (Descending)
  - Name (A-Z)
  - Name (Z-A)
  - Type

#### Variable Editor Modal
**Type Selection:**
- **Null** - Sets variable to null
- **Number** - Numeric value (integers and decimals)
- **String** - Text value (supports long text)
- **Object (JSON)** - JSON object with syntax validation
- **Boolean** - true/false value

**Number Type:**
- Standard numeric input
- Supports integers and decimals
- Validation prevents invalid numbers

**String Type:**
- Large text area (200px height)
- Supports multiline text
- Monospace font for readability
- Green text color

**Object Type:**
- JSON editor with syntax highlighting
- Auto-formatting with 2-space indentation
- Real-time syntax validation
- Error messages with details
- Monospace font for code editing

**Boolean Type:**
- Dropdown selection
- Options: true / false

**Save Mechanism:**
1. Select appropriate type
2. Enter/edit value
3. Click "Save" to apply
4. Variables list refreshes automatically
5. Click "Cancel" to discard changes

**Error Handling:**
- Invalid JSON shows detailed error message
- Invalid numbers are prevented
- Type validation before saving

**Advanced Features:**
- **Large Text Support:** Strings are truncated with "..." in list view
- **Object Preview:** Shows [OBJECT] in list for JSON values
- **Full Value Editing:** Editor shows complete value regardless of length
- **Responsive Design:** Modal adapts to screen size (80% width/height)

**Use Cases:**
- Testing game logic
- Debugging variable issues
- Setting up test scenarios
- Manipulating game progression
- Storing complex data structures

---

## Help Menu

### About
**Function:** Displays version and author information.

**Information Shown:**
- Addon name and version
- Author information with link to website
- Discord community link
- NWjs version
- Chrome version
- Node.js version

**Usage:**
- Click `Help > About`
- View information
- Click links to open in browser
- Click "Close" to exit

---

### License
**Function:** Displays the complete license terms.

**License Type:** Free for Non-Commercial Use

**Key Terms:**
- ✅ **Allowed:** Personal use, non-commercial projects
- ✅ **Allowed:** Modification and distribution
- ❌ **Not Allowed:** Commercial use without license
- ⚠️ **Required:** Credit to "Dreamsavior"
- ⚠️ **Required:** License notice must be retained

**Commercial Licensing:**
- Contact: dreamsavior@gmail.com
- Prior written permission required
- Separate commercial license available

**Usage:**
- Click `Help > License`
- Review license terms
- Contact email link provided
- Click "Close" to exit

---

## Advanced Features

### Modal Popup System
The debug menu uses a custom modal system with the following features:

**Features:**
- Draggable windows (drag from title bar)
- Click overlay to keep focus
- Input blocking (prevents game input while modal is open)
- Multiple modals supported
- Responsive sizing
- Professional dark theme

**Input Blocking:**
- Touch input is blocked while modals are open
- Keyboard input is blocked except in input fields
- F12 (dev tools) and F5 (reload) still work
- Mouse clicks don't pass through to game

**Keyboard Support in Modals:**
- Typing in text fields works normally
- Backspace, arrows, etc. work in input fields
- Game input is completely blocked
- No accidental game actions while editing

---

### Configuration Persistence
Settings are saved in `debug.json` in the game directory.

**Saved Settings:**
- Mute state (on/off)
- Previous volume levels (BGM, BGS, ME, SE)
- Debug mode preference

**File Location:**
- Same directory as `index.html`
- Automatically created on first use
- JSON format for easy editing

**Example `debug.json`:**
```json
{
  "muteState": false,
  "prevVolumes": {
    "bgm": 100,
    "bgs": 100,
    "me": 100,
    "se": 100
  },
  "debugMode": true
}
```

---

### Auto-Reload in Debug Mode
The debug menu includes intelligent auto-reload functionality.

**How It Works:**
1. On game startup, checks `debug.json` for debug mode preference
2. If preference is enabled but URL doesn't have `?test`, reloads with it
3. If preference is disabled but URL has `?test`, reloads without it
4. Ensures game always matches user preference

**Benefits:**
- No need to manually add `?test` to URL
- Preference persists across restarts
- Seamless mode switching

---

### Input Blocker
Sophisticated input blocking system prevents accidental game actions.

**What's Blocked:**
- All touch input (TouchInput)
- All keyboard input (Input)
- All gamepad input
- Mouse clicks on game canvas

**What's NOT Blocked:**
- Input fields in modals
- Text areas in modals
- F12 (DevTools)
- F5 (Reload)
- F122 (other system keys)

**Technical Implementation:**
- Capture phase event listeners
- TouchInput.update() override
- Input.update() override
- Modal count tracking
- Smart event propagation control

---

## Keyboard Shortcuts

### Debug Mode Shortcuts
When "Play in Debug Mode" is enabled:

- **F9** - Open RPG Maker Debugger
- **F2** - Toggle FPS Display
- **Ctrl** (hold) - Walk through walls (no-clip)

### System Shortcuts
Available at all times:

- **F12** - Open Developer Console (Chrome DevTools)
- **F5** - Reload Page

### Modal Shortcuts
While modals are open:

- **ESC** - Not captured (close button or Cancel must be used)
- Typing works normally in input fields
- Tab navigation in modals works

---

## Troubleshooting

### Menu Not Appearing
**Problem:** Debug menu doesn't show in menu bar.

**Solutions:**
- Verify NWjs is running (not web browser)
- Check console for errors (F12)
- Ensure `nw` object is available
- Verify addon is loaded correctly

---

### "Game party not ready" Error
**Problem:** Cheat menu features show this error.

**Cause:** Game hasn't fully initialized yet.

**Solution:**
- Wait for game to finish loading
- Load a save file or start new game
- Some features require being in-game (not title screen)

---

### Variables/Switches Not Saving
**Problem:** Changes to variables/switches revert after reload.

**Cause:** Game data not saved to save file.

**Solution:**
- Use in-game save system to persist changes
- Or use for temporary testing only
- Changes only affect current session unless saved

---

### Teleport Causes Error
**Problem:** Game crashes or freezes after teleporting.

**Causes:**
- Invalid map ID
- Coordinates outside map boundaries
- Map not properly configured

**Solutions:**
- Verify map exists in database
- Check map dimensions
- Use valid coordinates
- Test with known-good locations first

---

### Volume Control Not Working
**Problem:** Sliders don't affect volume.

**Cause:** ConfigManager not available.

**Solution:**
- Wait for game to fully load
- Check if game uses custom audio system
- Try reloading the game

---

### Debug Mode Won't Enable
**Problem:** "Play in Debug Mode" doesn't work.

**Solutions:**
- Check file permissions for `debug.json`
- Verify game directory is writable
- Try manually adding `?test` to URL
- Check browser console for errors

---

### Skills/States Not Appearing
**Problem:** Add Skill/State popup shows empty list.

**Cause:** Game data not loaded yet.

**Solution:**
- Wait for game to fully load
- Load a save file
- Ensure `$dataSkills` and `$dataStates` are available

---

### Object Variables Not Saving
**Problem:** Error when saving object variables.

**Cause:** Invalid JSON syntax.

**Solution:**
- Verify JSON syntax is valid
- Use online JSON validator
- Check for:
  - Missing quotes around strings
  - Trailing commas
  - Unclosed brackets
  - Invalid escape sequences

**Valid JSON Example:**
```json
{
  "name": "Player",
  "level": 5,
  "items": ["sword", "shield"],
  "stats": {
    "hp": 100,
    "mp": 50
  }
}
```

---

## Tips & Best Practices

### Testing Recommendations
1. **Save Often:** Make manual saves before using cheat features
2. **Test Incrementally:** Change one thing at a time
3. **Use Debug Mode:** Enable debug mode for full testing features
4. **Check Console:** Monitor F12 console for errors
5. **Document Changes:** Keep notes on what you've modified

### Performance Tips
1. **Close Modals:** Don't leave multiple modals open
2. **Limit Variables:** Don't create thousands of test variables
3. **Use Filters:** Filter large lists instead of scrolling
4. **Clear Cache:** Reload game periodically during heavy testing

### Safety Tips
1. **Backup Saves:** Keep backup copies of save files
2. **Test in Debug Mode:** Use debug mode for testing, not production
3. **Validate Coordinates:** Double-check teleport destinations
4. **Verify JSON:** Always validate JSON before saving objects
5. **Check Permissions:** Ensure game can write to `debug.json`

---

## Credits & Support

**Developer:** Dreamsavior  
**Website:** https://dreamsavior.net  
**Email:** dreamsavior@gmail.com  
**Discord:** https://discord.gg/QX37wqbfe2

### Find Updates
- Check Discord for latest version
- Report bugs on Discord
- Request features on Discord
- Share feedback on Discord

### Commercial License
For commercial use, contact dreamsavior@gmail.com for licensing information.

---

## Version History

**Version 1.0.0** (Initial Release)
- Complete menu bar implementation
- Volume control with mute function
- Character stats editor
- Variable/switch editor with advanced types
- Item/gold/exp management
- Teleport system
- Debug mode integration
- Modal popup system
- Input blocking for modals
- Configuration persistence
- Auto-reload in debug mode

---

## Conclusion

The Debug Menu provides a comprehensive suite of tools for RPG Maker MV development and testing. Whether you're debugging game logic, testing game balance, or simply exploring game mechanics, these features will significantly improve your workflow.

Remember to use these tools responsibly and always maintain backups of your important save files. Happy game development!

For support, updates, and community discussion, visit the Discord server: https://discord.gg/QX37wqbfe2

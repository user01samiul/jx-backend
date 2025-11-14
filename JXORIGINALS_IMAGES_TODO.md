# JX Originals - Game Images TODO

## Current Status

Game image URLs have been updated in the database to point to:
- **Preview Image:** `/JxOriginalGames/{game_code}/preview.jpg`
- **Thumbnail Image:** `/JxOriginalGames/{game_code}/thumb.jpg`

## What Needs to be Done

### Create Game Preview Images

For each of the 16 games, create two images:

**1. Preview Image** (Large - for game details)
- Recommended size: 800x600px or 16:9 aspect ratio
- Format: JPG or PNG
- File naming: `preview.jpg`

**2. Thumbnail Image** (Small - for game grid)
- Recommended size: 300x200px or 16:9 aspect ratio
- Format: JPG or PNG (WebP for better compression)
- File naming: `thumb.jpg`

### Game List & Folders

| Game Name | Folder | Preview Path | Thumbnail Path |
|-----------|--------|--------------|----------------|
| Sweet Bonanza | SweetBonanza | /JxOriginalGames/sweet_bonanza/preview.jpg | /JxOriginalGames/sweet_bonanza/thumb.jpg |
| Gates of Olympus | GatesofOlympus | /JxOriginalGames/gates_olympus/preview.jpg | /JxOriginalGames/gates_olympus/thumb.jpg |
| Hercules Son of Zeus | HerculesonofZeus | /JxOriginalGames/hercules_zeus/preview.jpg | /JxOriginalGames/hercules_zeus/thumb.jpg |
| Sugar Rush | SugarRush | /JxOriginalGames/sugar_rush/preview.jpg | /JxOriginalGames/sugar_rush/thumb.jpg |
| Aztec Gold Megaways | AztecGoldMegawaysISB | /JxOriginalGames/aztec_gold_megaways/preview.jpg | /JxOriginalGames/aztec_gold_megaways/thumb.jpg |
| Fishing for Gold | FishingForGoldISB | /JxOriginalGames/fishing_gold/preview.jpg | /JxOriginalGames/fishing_gold/thumb.jpg |
| Ghosts n Gold | GhostsNGoldISB | /JxOriginalGames/ghosts_gold/preview.jpg | /JxOriginalGames/ghosts_gold/thumb.jpg |
| Hot Spin Deluxe | HotSpinDeluxeISB | /JxOriginalGames/hot_spin_deluxe/preview.jpg | /JxOriginalGames/hot_spin_deluxe/thumb.jpg |
| Lost Boys Loot | LostBoysLootISB | /JxOriginalGames/lost_boys_loot/preview.jpg | /JxOriginalGames/lost_boys_loot/thumb.jpg |
| Racetrack Riches | RacetrackRichesISB | /JxOriginalGames/racetrack_riches/preview.jpg | /JxOriginalGames/racetrack_riches/thumb.jpg |
| Sheriff of Nottingham | SheriffOfNotinghamISB | /JxOriginalGames/sheriff_nottingham/preview.jpg | /JxOriginalGames/sheriff_nottingham/thumb.jpg |
| Stacks O Gold | StacksOGoldISB | /JxOriginalGames/stacks_gold/preview.jpg | /JxOriginalGames/stacks_gold/thumb.jpg |
| The Golden City | TheGoldenCityISB | /JxOriginalGames/golden_city/preview.jpg | /JxOriginalGames/golden_city/thumb.jpg |
| Wild Ape | WildApeISB | /JxOriginalGames/wild_ape/preview.jpg | /JxOriginalGames/wild_ape/thumb.jpg |
| American Gigolo | AmericanGigoloCT | /JxOriginalGames/american_gigolo/preview.jpg | /JxOriginalGames/american_gigolo/thumb.jpg |
| Bavarian Forest | BavarianForestCT | /JxOriginalGames/bavarian_forest/preview.jpg | /JxOriginalGames/bavarian_forest/thumb.jpg |

## How to Create Images

### Option 1: Screenshot from Game (Recommended)
1. Launch each game via the backend
2. Take a screenshot of the main game screen
3. Crop and resize to required dimensions
4. Save as preview.jpg and thumb.jpg in the game folder

### Option 2: Use Existing Graphics
Some games may have promotional images in their folders:
```bash
find /var/www/html/backend.jackpotx.net/JxOriginalGames -name "*logo*" -o -name "*icon*" -o -name "*promo*"
```

### Option 3: Generate from Sprites
Extract game symbols/backgrounds from sprite sheets in:
- `/JxOriginalGames/{game}/graphicsSprite/`
- `/JxOriginalGames/{game}/pulse_{game}/graphicsSprite/`

## Quick Script to Create Placeholder Images

If you want to create temporary placeholder images:

```bash
#!/bin/bash
# Install ImageMagick if not installed: sudo apt install imagemagick

games=(
  "sweet_bonanza:SweetBonanza"
  "gates_olympus:GatesofOlympus"
  "hercules_zeus:HerculesonofZeus"
  "sugar_rush:SugarRush"
  "aztec_gold_megaways:AztecGoldMegawaysISB"
  "fishing_gold:FishingForGoldISB"
  "ghosts_gold:GhostsNGoldISB"
  "hot_spin_deluxe:HotSpinDeluxeISB"
  "lost_boys_loot:LostBoysLootISB"
  "racetrack_riches:RacetrackRichesISB"
  "sheriff_nottingham:SheriffOfNotinghamISB"
  "stacks_gold:StacksOGoldISB"
  "golden_city:TheGoldenCityISB"
  "wild_ape:WildApeISB"
  "american_gigolo:AmericanGigoloCT"
  "bavarian_forest:BavarianForestCT"
)

for game in "${games[@]}"; do
  code="${game%%:*}"
  folder="${game##*:}"

  # Create gradient placeholder
  convert -size 800x600 gradient:purple-pink \
    -gravity center -pointsize 48 -fill white \
    -annotate +0+0 "JX Originals\n${code//_/ }" \
    "/var/www/html/backend.jackpotx.net/JxOriginalGames/$folder/preview.jpg"

  convert -size 300x200 gradient:purple-pink \
    -gravity center -pointsize 24 -fill white \
    -annotate +0+0 "${code//_/ }" \
    "/var/www/html/backend.jackpotx.net/JxOriginalGames/$folder/thumb.jpg"

  echo "Created images for $code"
done
```

## Current Frontend Behavior

The frontend JX Originals page ([/category/jx-originals](file:///var/www/html/jackpotx.net/src/screens/games/jxoriginals.js)) will:
- ✅ Load games from API
- ⚠️ Try to display images from paths above
- ✅ Show fallback 🎰 emoji if image fails to load (onError handler)
- ✅ Still be functional even without images

## Priority

**Status:** Optional but recommended for better UX
**Impact:** Visual appeal, but doesn't affect functionality
**Effort:** ~1-2 hours for all 16 games

## Alternative: Use CDN Path

If you prefer to use a separate CDN directory:

```sql
UPDATE games SET
  image_url = '/cdn/games/jxoriginals/' || game_code || '.jpg',
  thumbnail_url = '/cdn/games/jxoriginals/' || game_code || '-thumb.jpg'
WHERE provider = 'JxOriginals';
```

Then create images in: `/var/www/html/jackpotx.net/public/cdn/games/jxoriginals/`

## Verification

After creating images, verify they're accessible:
```bash
curl -I https://backend.jackpotx.net/JxOriginalGames/sweet_bonanza/preview.jpg
curl -I https://backend.jackpotx.net/JxOriginalGames/sweet_bonanza/thumb.jpg
```

---

**Current Status:** Database updated with image paths
**Next Action:** Create actual image files (optional)
**Fallback:** Frontend shows 🎰 emoji placeholder

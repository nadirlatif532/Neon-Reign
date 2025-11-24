# Audio Optimization Guide

Your game currently loads **12.8 MB** of uncompressed WAV audio files. Here's how to reduce this to ~1.25 MB (90% reduction):

## Option 1: Use FFmpeg (Recommended - Best Quality)

1. **Install FFmpeg** (one of these methods):
   ```powershell
   # Using winget
   winget install ffmpeg
   
   # Using chocolatey
   choco install ffmpeg
   
   # Manual download
   # Visit: https://ffmpeg.org/download.html
   ```

2. **Run the conversion script**:
   ```powershell
   .\convert-audio.bat
   ```

The script will automatically convert all 3 WAV files to high-quality OGG format.

---

## Option 2: Online Converter (No Installation Required)

If you don't want to install FFmpeg, use an online converter:

### Steps:
1. Visit: **https://cloudconvert.com/** or **https://online-audio-converter.com/**

2. Upload these files from `public\assets\`:
   - `White Bat Audio - Casualty LOOP 1.wav`
   - `White Bat Audio - Casualty LOOP 2.wav`
   - `White Bat Audio - Casualty LOOP 3.wav`

3. Convert to **OGG** format with these settings:
   - Format: OGG Vorbis
   - Quality: 128 kbps (or "Good Quality")
   - Sample Rate: 44100 Hz

4. Download the converted files and rename them:
   - Save as: `casualty-loop-1.ogg`
   - Save as: `casualty-loop-2.ogg`  
   - Save as: `casualty-loop-3.ogg`

5. Place the new `.ogg` files in `public\assets\`

---

## Option 3: Use Audacity (Free Desktop App)

1. Download Audacity: https://www.audacityteam.org/download/
2. Open each WAV file
3. Export as OGG Vorbis (File → Export → Export as OGG)
4. Use quality setting 5-6 (good balance of size/quality)

---

## Verification

After conversion, you should see:
- Original: `White Bat Audio - Casualty LOOP 1.wav` (6.3 MB)
- Compressed: `casualty-loop-1.ogg` (~630 KB)

**The code has already been updated to use the OGG files!**

You can keep the original WAV files in the `public/assets` folder for backup - they won't be deployed since the code now references the OGG versions.

---

## What Was Already Done

✅ Updated `AudioManager.ts` to load OGG files  
✅ Updated `AssetManifest.ts` to reference OGG files  
✅ Created `convert-audio.bat` script for easy conversion

**Once you convert the files, just rebuild and deploy!**

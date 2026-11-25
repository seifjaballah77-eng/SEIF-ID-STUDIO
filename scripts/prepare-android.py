from pathlib import Path
manifest = Path("android/app/src/main/AndroidManifest.xml")
if not manifest.exists():
    raise SystemExit("AndroidManifest.xml was not generated")
text = manifest.read_text(encoding="utf-8")
permission = '<uses-permission android:name="android.permission.CAMERA" />'
if permission not in text:
    text = text.replace("<application", permission + "\\n    <application", 1)
manifest.write_text(text, encoding="utf-8")
print("Camera permission added to Android manifest")

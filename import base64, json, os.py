import base64, json, os
from pathlib import Path

folder = Path('primary')
results = {}

for img in folder.iterdir():
    if img.suffix.lower() in ['.png', '.jpg', '.jpeg']:
        with open(img, 'rb') as f:
            encoded = base64.b64encode(f.read()).decode()
        mime = 'image/jpeg' if img.suffix.lower() == '.jpg' else 'image/png'
        results[img.name] = f'data:{mime};base64,{encoded}'
        print(f'Converted: {img.name}')

with open('examples/converted_images.json', 'w') as f:
    json.dump(results, f, indent=2)

print(f'\nDone! Saved to examples/converted_images.json')
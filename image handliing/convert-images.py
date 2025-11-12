import base64
import os
import json
from pathlib import Path

def image_to_data_uri(image_path):
    """Convert an image file to a data URI"""
    with open(image_path, 'rb') as image_file:
        encoded = base64.b64encode(image_file.read()).decode()
        ext = os.path.splitext(image_path)[1][1:].lower()  # Get extension
        
        # Map extensions to MIME types
        mime_types = {
            'png': 'image/png',
            'jpg': 'image/jpeg',
            'jpeg': 'image/jpeg',
            'gif': 'image/gif',
            'webp': 'image/webp'
        }
        mime = mime_types.get(ext, 'image/png')
        
        return f'data:{mime};base64,{encoded}'

def convert_all_images_in_folder(folder_path):
    """Convert all images in a folder and print results"""
    folder = Path(folder_path)
    
    if not folder.exists():
        print(f"Error: Folder '{folder_path}' not found!")
        return
    
    # Supported image extensions
    extensions = ['.png', '.jpg', '.jpeg', '.gif', '.webp']
    
    results = {}
    
    for image_file in folder.iterdir():
        if image_file.suffix.lower() in extensions:
            print(f"Converting: {image_file.name}")
            data_uri = image_to_data_uri(image_file)
            results[image_file.name] = data_uri
    
    # Save to a JSON file for easy copy-paste
    output_file = folder / 'converted_images.json'
    with open(output_file, 'w') as f:
        json.dump(results, f, indent=2)
    
    print(f"\n✓ Converted {len(results)} images")
    print(f"✓ Results saved to: {output_file}")
    print("\nYou can now copy the data URIs from the JSON file!")

# Usage examples:
if __name__ == "__main__":
    # Option 1: Convert a single image
    print("=== Single Image Example ===")
    single_uri = image_to_data_uri('glyphs/m_00.png')
    print(f"Data URI preview: {single_uri[:100]}...\n")
    
    # Option 2: Convert all images in folders
    print("=== Batch Conversion ===")
    convert_all_images_in_folder('glyphs')
    convert_all_images_in_folder('examples')
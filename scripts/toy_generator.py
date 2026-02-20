import sys
import os
import json
import random
from pathlib import Path

# Add project root to path
# Assuming this script is run from project root or scripts/ folder
project_root = Path(__file__).parent.parent
sys.path.append(str(project_root))

try:
    from app.services.gemini_wrapper import generate_content_with_gemini
except ImportError:
    # If running in environment where app is not in python path, try simpler import or mock
    # This handles the case where the script is run standalone without package structure setup
    generate_content_with_gemini = None

# Default icons available in the frontend
ICONS = [
    "smart_toy", "rocket_launch", "shield", "pest_control",
    "bolt", "psychology", "visibility", "fingerprint",
    "memory", "precision_manufacturing", "build", "extension"
]

def _mock_part(prompt):
    # Deterministic-ish mock based on prompt
    random.seed(prompt)
    return {
        "name": f"{prompt.split()[-1].title()} Module",
        "type": random.choice(["Structure", "Texture", "Personality"]),
        "level": random.randint(1, 5),
        "icon": random.choice(ICONS),
        "description": f"A generated part for '{prompt}'"
    }

def main(prompt_text):
    print(f"Generating toy part for: '{prompt_text}'...")

    schema = {
        "type": "OBJECT",
        "properties": {
            "name": {"type": "STRING"},
            "type": {"type": "STRING", "enum": ["Structure", "Texture", "Personality"]},
            "level": {"type": "INTEGER", "minimum": 1, "maximum": 5},
            "icon": {"type": "STRING", "enum": ICONS},
            "description": {"type": "STRING"}
        },
        "required": ["name", "type", "level", "icon", "description"]
    }

    part = None

    if os.environ.get("GOOGLE_API_KEY") and generate_content_with_gemini:
        try:
            result = generate_content_with_gemini(
                prompt_text=f"Generate a toy part based on this description: {prompt_text}. Choose an icon from: {', '.join(ICONS)}",
                json_schema=schema
            )
            if result.get("error"):
                print(f"Gemini API Error: {result['error']}")
                part = _mock_part(prompt_text)
            else:
                part = result["json_output"]
        except Exception as e:
            print(f"Error calling Gemini: {e}")
            part = _mock_part(prompt_text)
    else:
        if not os.environ.get("GOOGLE_API_KEY"):
            print("GOOGLE_API_KEY not set. Using mock generation.")
        if not generate_content_with_gemini:
            print("Could not import generate_content_with_gemini. Using mock generation.")
        part = _mock_part(prompt_text)

    # Save to file
    # We want to write to qube-forensic-console/console/public/generated_toys.json
    # relative to the script location
    output_path = project_root / "qube-forensic-console/console/public/generated_toys.json"
    output_path.parent.mkdir(parents=True, exist_ok=True)

    parts = []
    if output_path.exists():
        try:
            content = output_path.read_text()
            if content.strip():
                parts = json.loads(content)
        except json.JSONDecodeError:
            parts = []

    # Add timestamp/id for uniqueness if needed, but simple list for now
    parts.insert(0, part) # Add to beginning
    # Keep only last 10
    parts = parts[:10]

    output_path.write_text(json.dumps(parts, indent=2))
    print(f"Successfully generated: {part['name']} (Lvl {part['level']})")
    print(f"Saved to {output_path}")

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python scripts/toy_generator.py <prompt>")
        sys.exit(1)

    main(sys.argv[1])

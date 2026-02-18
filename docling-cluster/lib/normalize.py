import re

def normalize_text(text: str) -> str:
    """
    Normalizes text for consistent embedding.
    - Lowercase
    - Strip whitespace
    - Normalize duplicate spaces
    """
    if not text:
        return ""
    
    text = text.lower().strip()
    text = re.sub(r'\s+', ' ', text)
    return text

"""Re-encode the file from a known-bad state."""
import codecs

# Read raw bytes
with open(r"e:\dashboard vital dental\frontend\src\App.jsx", "rb") as f:
    raw = f.read()

# Decode as latin-1 so we get the raw bytes as characters
try:
    text = raw.decode("utf-8")
    print(f"File decoded as UTF-8, {len(text)} chars")
except UnicodeDecodeError as e:
    print(f"Not pure UTF-8: {e}")
    text = raw.decode("latin-1")
    print(f"File decoded as latin-1, {len(text)} chars")

# Check for corrupted sequences
bad_sequences = [
    "\u00c2\u00b7",   # Â· -> ·
    "\u00e2\u0080\u00a6",  # â€¦ but these are latin-1 bytes of â€¦
    "\u00c3\u00af\u00c2\u00bf\u00c2\u00bd",  # BOM corruption
]

# Look for the obviously corrupted emoji patterns
import re
corrupted = re.findall(r'[\x80-\xFF]+', text)
if corrupted:
    unique_corr = set(corrupted)
    print(f"Found {len(unique_corr)} unique corrupted sequences")
    for c in list(unique_corr)[:10]:
        print(f"  {repr(c)}")

# Check if all chars are in BMP
non_ascii = [c for c in text if ord(c) > 127]
print(f"\nNon-ASCII chars: {len(non_ascii)} unique: {len(set(non_ascii))}")
print("Sample:", text[text.find('\u00c2'):text.find('\u00c2')+10] if '\u00c2' in text else "No Â found")

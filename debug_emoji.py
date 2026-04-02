"""Check what the actual broken emoji sequences look like in the file."""
with open(r"e:\dashboard vital dental\frontend\src\App.jsx", "r", encoding="utf-8") as f:
    content = f.read()

# Find instances of the broken bottom nav emoji
idx = content.find("Mobile Bottom Navigation")
chunk = content[idx:idx+2000]

# Find any char > U+0080
import re
# Find positions of all non-ASCII chars in the chunk
for i, c in enumerate(chunk):
    if ord(c) > 0x7F:
        # Show context
        ctx_start = max(0, i-5)
        ctx_end = min(len(chunk), i+10)
        ctx = chunk[ctx_start:ctx_end]
        safe_ctx = ''.join(f'\\u{ord(x):04X}' if ord(x) > 0x7F else x for x in ctx)
        print(f"  pos {i}: U+{ord(c):04X} '{c}' in context: {safe_ctx}")
        if i > 200:
            break

"""
Fix double-encoded UTF-8 in App.jsx.
The file was written by PowerShell Set-Content which used Windows-1252 encoding.
This caused UTF-8 multi-byte sequences to be split into individual Windows-1252 chars
and re-stored in UTF-8.

When Python reads it as UTF-8, what it sees as individual Unicode codepoints
are the WINDOWS-1252 equivalents of the original UTF-8 bytes:
  - bytes E2 94 80 (UTF-8 for U+2500 ─) get stored as Windows-1252 chars â, " (U+201D), € (U+20AC)
  - bytes F0 9F 93 85 (UTF-8 for U+1F4C5 📅) become ð, Ÿ, ", … 

So the fix is: encode each char through Windows-1252, collect the raw bytes,
then decode as UTF-8.
"""

def fix_win1252_mojibake(text):
    """Fix text where UTF-8 bytes got stored as Windows-1252 chars."""
    result = []
    i = 0
    chars = list(text)
    n = len(chars)
    
    cp1252_leaders = set()
    # Multi-byte UTF-8 leader bytes: 0xC2-0xF4
    # These map to Windows-1252 chars at those code points:
    cp1252_to_unicode = {}
    for b in range(0x80, 0x100):
        try:
            ch = bytes([b]).decode('cp1252')
            if ch:
                cp1252_to_unicode[ch] = b
        except:
            pass
    
    # Leader byte code points in cp1252 unicode space
    # C2-DF → 2-byte seq, E0-EF → 3-byte seq, F0-F7 → 4-byte seq
    leader_chars = {ch for ch, b in cp1252_to_unicode.items() if 0xC2 <= b <= 0xF4}
    cont_chars = {ch for ch, b in cp1252_to_unicode.items() if 0x80 <= b <= 0xBF}
    
    # Also add pure latin-1 range that maps directly
    for b in range(0xC0, 0x100):
        if chr(b) not in cp1252_to_unicode:
            cp1252_to_unicode[chr(b)] = b
    # Continuation bytes for latin-1:
    for b in range(0x80, 0xC0):
        if chr(b) not in cp1252_to_unicode:
            cp1252_to_unicode[chr(b)] = b
    
    leader_chars = {ch for ch, b in cp1252_to_unicode.items() if 0xC2 <= b <= 0xF4}
    cont_chars = {ch for ch, b in cp1252_to_unicode.items() if 0x80 <= b <= 0xBF}
    
    while i < n:
        c = chars[i]
        if c in leader_chars:
            b_lead = cp1252_to_unicode[c]
            # Determine expected continuation bytes
            if b_lead < 0xE0:    num_cont = 1
            elif b_lead < 0xF0:  num_cont = 2
            else:                num_cont = 3
            
            # Collect continuation chars
            byte_seq = [b_lead]
            j = i + 1
            consumed = 0
            while j < n and consumed < num_cont and chars[j] in cont_chars:
                byte_seq.append(cp1252_to_unicode[chars[j]])
                j += 1
                consumed += 1
            
            if consumed == num_cont:
                try:
                    decoded = bytes(byte_seq).decode('utf-8')
                    result.append(decoded)
                    i = j
                    continue
                except (UnicodeDecodeError, ValueError):
                    pass
        
        result.append(c)
        i += 1
    
    return ''.join(result)


with open(r"e:\dashboard vital dental\frontend\src\App.jsx", "r", encoding="utf-8") as f:
    content = f.read()

print(f"Original size: {len(content)} chars")

# Count non-ascii chars before
non_ascii_before = sum(1 for c in content if ord(c) > 0x7E)
print(f"Non-ASCII chars before: {non_ascii_before}")

fixed = fix_win1252_mojibake(content)

non_ascii_after = sum(1 for c in fixed if ord(c) > 0x7E)
print(f"Non-ASCII chars after: {non_ascii_after}")
print(f"Fixed size: {len(fixed)} chars")
print(f"Reduction: {non_ascii_before - non_ascii_after} chars fixed")

# Show sample of what changed
import re
emoji_found = sorted(set(c for c in fixed if ord(c) > 0x1000))
print(f"\nHigh-codepoint chars found: {len(emoji_found)}")
for e in emoji_found[:20]:
    print(f"  U+{ord(e):04X} = {e}")

# Verify key content
for key in ["isMobile", "mobileApptDate", "useIsMobile", "MOBILE appointments layout", "Mobile Bottom Navigation"]:
    print(f"{'✅' if key in fixed else '❌'} {key}")

with open(r"e:\dashboard vital dental\frontend\src\App.jsx", "w", encoding="utf-8") as f:
    f.write(fixed)

print("\n✅ Done!")

// ============================================
// DHOFARI UNICODE
// Map chart glyphs to Unicode text rendered with the Dhofari Hakli font
// (fonts/DhofariHakli-Regular.woff2).
//
// Encoding: Dhofari Script 1a has no Unicode block of its own, so each letter
// uses the Old North Arabian codepoint (U+10A80–U+10A9C) with the same sound
// value, following Al-Jallad (2025), Chart 1. The merged pairs share one glyph
// (ḏ/z, ṯ/s³, ẓ/ṣ). The font also has a Private Use mirror (U+E000+) and
// KMD 28-31 alternate forms (OpenType ss01). See fonts/mapping.json.
// ============================================

const DhofariUnicode = (() => {
    const ONA = {
        'h': 0x10A80, 'l': 0x10A81, 'ḥ': 0x10A82, 'm': 0x10A83, 'q': 0x10A84,
        'w': 0x10A85, 's²': 0x10A86, 'r': 0x10A87, 'b': 0x10A88, 't': 0x10A89,
        's¹': 0x10A8A, 'k': 0x10A8B, 'n': 0x10A8C, 'ḫ': 0x10A8D, 'f': 0x10A90,
        'ʾ': 0x10A91, 'ʿ': 0x10A92, 'ḍ': 0x10A93, 'g': 0x10A94, 'd': 0x10A95,
        'ġ': 0x10A96, 'ṭ': 0x10A97, 'ḏ': 0x10A99, 'y': 0x10A9A, 'ṯ': 0x10A9B,
        'ẓ': 0x10A9C
    };
    // Alternate spellings found in chart names / typed transliteration
    const ALIASES = {
        'H': 'ḥ', 's2': 's²', 'š': 's²', 's1': 's¹', 's': 's¹', 'x': 'ḫ', 'kh': 'ḫ',
        "'": 'ʾ', '’': 'ʾ', 'ˀ': 'ʾ', '`': 'ʿ', 'c': 'ʿ', '‘': 'ʿ', 'ˁ': 'ʿ',
        'D': 'ḍ', 'G': 'ġ', 'gh': 'ġ', 'T': 'ṭ', 'z': 'ḏ', 'dh': 'ḏ',
        'th': 'ṯ', 's3': 'ṯ', 's³': 'ṯ', 'Z': 'ẓ', 'ṣ': 'ẓ', 'S': 'ẓ'
    };

    const normalize = (key) => {
        if (key == null) return null;
        let k = String(key).normalize('NFC').trim();
        if (ONA[k]) return k;
        if (ALIASES[k]) return ALIASES[k];
        const lower = k.toLowerCase();
        if (ONA[lower]) return lower;
        return null;
    };

    // Returns the Unicode character for a chart glyph, or null if it has no letter value
    const fromGlyph = (glyph) => {
        if (!glyph) return null;
        for (const key of [glyph.name, glyph.transliteration]) {
            const n = normalize(key);
            if (n) return String.fromCodePoint(ONA[n]);
        }
        return null;
    };

    // Convert typed transliteration to Dhofari text (longest match; spaces/newlines kept)
    const fromTransliteration = (text) => {
        const keys = [...Object.keys(ONA), ...Object.keys(ALIASES)].sort((a, b) => b.length - a.length);
        const s = String(text || '').normalize('NFC');
        let out = '', i = 0;
        while (i < s.length) {
            const hit = keys.find(k => s.startsWith(k, i));
            if (hit) { out += String.fromCodePoint(ONA[normalize(hit)]); i += hit.length; }
            else { const c = s[i]; if (c === ' ' || c === '\n') out += c; i++; }
        }
        return out;
    };

    return {
        ONA,
        fromGlyph,
        fromTransliteration,
        fontFamily: '"Dhofari Hakli", "Noto Sans Old North Arabian", sans-serif'
    };
})();

if (typeof window !== 'undefined') window.DhofariUnicode = DhofariUnicode;

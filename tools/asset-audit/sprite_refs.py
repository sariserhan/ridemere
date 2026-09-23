#!/usr/bin/env python3
"""Inventory OpenRCT2's hard-coded sprite-index dependencies on RCT2's g1.dat.

The engine addresses sprites by a global ImageIndex.  Indices 0..29293 live in
the proprietary RCT2 base sprite file g1.dat (SPR_G1_END = 29294); everything
from SPR_G2_BEGIN (29357) upwards is OpenRCT2's own open data (g2.dat,
palettes.dat, fonts.dat, tracks.dat) or dynamically allocated (CSG = RCT1,
scrolling text, image list, temp sprites).

This script produces a machine-generated inventory of every g1 index the
engine source hard-codes, from two sources:

  1. Symbols in src/openrct2/SpriteIds.h.  The enum is evaluated to concrete
     integers, each symbol is classified by table (g1 / rctc / g2 / palettes /
     fonts / tracks / csg / scrolling / imagelist / temp) and by content
     category, and every file under src/ that references it is recorded.

  2. Raw integer literals in sprite contexts under selected source
     directories (default: src/openrct2/paint, src/openrct2/ride,
     src/openrct2/entity, src/openrct2/peep).  Per-file enums and constexpr
     constants are evaluated (including `BASE + n` forms), and literals found
     in enum entries, integer constexpr scalars, constexpr sprite arrays and
     WithIndex(...)/ImageId(...) call arguments are collected.  Values are
     grouped per file and per ride type (derived from the file name).

Outputs:
  tools/asset-audit/out/sprite_refs.json
  tools/asset-audit/out/sprite_summary.md

Usage:
  sprite_refs.py [--engine PATH] [--out DIR]

Python 3 stdlib only.  Nothing inside the engine checkout is modified.
"""
import argparse
import ast
import collections
import datetime
import json
import os
import re
import subprocess
import sys

HERE = os.path.abspath(os.path.dirname(__file__))
ROOT = os.path.abspath(os.path.join(HERE, "..", ".."))
DEFAULT_ENGINE = os.path.join(ROOT, "engine", "openrct2")
DEFAULT_OUT = os.path.join(HERE, "out")

SPRITE_IDS_REL = "src/openrct2/SpriteIds.h"

# Directories (relative to the engine root) scanned for raw integer literals.
LITERAL_SCAN_DIRS = [
    "src/openrct2/paint",
    "src/openrct2/ride",
    "src/openrct2/entity",
    "src/openrct2/peep",
]

SRC_EXTS = (".cpp", ".h", ".hpp")

# ---------------------------------------------------------------------------
# External constants referenced from SpriteIds.h.  Each is looked up in the
# header it comes from; the fallback value is used (and reported) only if the
# lookup fails.
# ---------------------------------------------------------------------------
EXTERNAL_CONSTANTS = {
    # name: (header relative to engine root, fallback)
    "kMaxLegacyEntries": ("src/openrct2/drawing/ScrollingText.h", 32),
    "kMaxEntries": ("src/openrct2/drawing/ScrollingText.h", 256),
    "kNumLLCsgEntries": ("src/openrct2/rct1/Limits.h", 69917),
    "kTempSpriteCount": ("src/openrct2/SpriteIds.h", 5),
}

G1_END_FALLBACK = 29294

# ---------------------------------------------------------------------------
# Comment / string stripping and expression evaluation
# ---------------------------------------------------------------------------
_COMMENT_RE = re.compile(
    r'//[^\n]*|/\*.*?\*/|"(?:\\.|[^"\\\n])*"|\'(?:\\.|[^\'\\\n])*\'',
    re.S,
)


def strip_comments_and_strings(text):
    """Replace comments and string/char literals with spaces (keeping newlines)."""

    def repl(m):
        s = m.group(0)
        if s.startswith(("//", "/*")):
            return re.sub(r"[^\n]", " ", s)
        return '""' if s.startswith('"') else "0"

    return _COMMENT_RE.sub(repl, text)


class EvalError(Exception):
    pass


_INT_SUFFIX_RE = re.compile(r"\b(0[xX][0-9a-fA-F]+|0[bB][01]+|[0-9]+)([uUlL]+)\b")
_QUALIFIED_RE = re.compile(r"(?:[A-Za-z_][A-Za-z_0-9]*::)+([A-Za-z_][A-Za-z_0-9]*)")
_CAST_RE = re.compile(r"\b(?:static_cast|uint32_t|uint16_t|int32_t|ImageIndex|size_t)\s*<?[^>()]*>?\s*\(")


def normalise_expr(expr):
    """Turn a C++ constant expression into something Python's ast can parse."""
    e = " ".join(expr.split())                   # collapse newlines / indentation
    e = _INT_SUFFIX_RE.sub(r"\1", e)             # 8192u -> 8192
    e = _QUALIFIED_RE.sub(r"\1", e)              # A::B::c -> c
    e = re.sub(r"\bstatic_cast\s*<[^>]*>\s*", "", e)
    e = re.sub(r"\b(?:uint32_t|uint16_t|int32_t|ImageIndex|size_t)\s*(?=\()", "", e)
    e = re.sub(r"\(\s*(?:uint32_t|uint16_t|int32_t|ImageIndex|size_t)\s*\)", "", e)
    return e


_ALLOWED_BINOPS = {
    ast.Add: lambda a, b: a + b,
    ast.Sub: lambda a, b: a - b,
    ast.Mult: lambda a, b: a * b,
    ast.FloorDiv: lambda a, b: a // b,
    ast.Div: lambda a, b: a // b,
    ast.Mod: lambda a, b: a % b,
    ast.LShift: lambda a, b: a << b,
    ast.RShift: lambda a, b: a >> b,
    ast.BitOr: lambda a, b: a | b,
    ast.BitAnd: lambda a, b: a & b,
    ast.BitXor: lambda a, b: a ^ b,
}


def eval_expr(expr, lookup):
    """Evaluate an integer constant expression.

    `lookup(name)` returns an int or raises KeyError.  Raises EvalError when the
    expression is not a pure integer constant expression.
    """
    try:
        tree = ast.parse(normalise_expr(expr), mode="eval")
    except SyntaxError as exc:
        raise EvalError("syntax: %s" % expr) from exc

    def ev(node):
        if isinstance(node, ast.Expression):
            return ev(node.body)
        if isinstance(node, ast.Constant) and isinstance(node.value, int) and not isinstance(node.value, bool):
            return node.value
        if isinstance(node, ast.Name):
            try:
                return lookup(node.id)
            except KeyError as exc:
                raise EvalError("unknown name %s" % node.id) from exc
        if isinstance(node, ast.BinOp) and type(node.op) in _ALLOWED_BINOPS:
            return _ALLOWED_BINOPS[type(node.op)](ev(node.left), ev(node.right))
        if isinstance(node, ast.UnaryOp):
            if isinstance(node.op, ast.USub):
                return -ev(node.operand)
            if isinstance(node.op, ast.UAdd):
                return ev(node.operand)
            if isinstance(node.op, ast.Invert):
                return ~ev(node.operand)
        raise EvalError("unsupported node %s in %s" % (type(node).__name__, expr))

    return ev(tree)


def expr_names(expr):
    """Identifiers used in an expression (after namespace stripping)."""
    try:
        tree = ast.parse(normalise_expr(expr), mode="eval")
    except SyntaxError:
        return set()
    return {n.id for n in ast.walk(tree) if isinstance(n, ast.Name)}


# ---------------------------------------------------------------------------
# Enum block parsing (shared between SpriteIds.h and per-file enums)
# ---------------------------------------------------------------------------
_ENUM_HEAD_RE = re.compile(
    r"\benum\b(?:\s+(?:class|struct))?(?:\s+[A-Za-z_][A-Za-z_0-9]*)?(?:\s*:\s*[A-Za-z_][A-Za-z_0-9:]*)?\s*\{"
)


def find_matching_brace(text, open_idx):
    depth = 0
    for i in range(open_idx, len(text)):
        c = text[i]
        if c == "{":
            depth += 1
        elif c == "}":
            depth -= 1
            if depth == 0:
                return i
    return -1


def split_top_level(body, sep=","):
    parts, depth, cur = [], 0, []
    for c in body:
        if c in "([{":
            depth += 1
        elif c in ")]}":
            depth -= 1
        if c == sep and depth == 0:
            parts.append("".join(cur))
            cur = []
        else:
            cur.append(c)
    parts.append("".join(cur))
    return [p.strip() for p in parts if p.strip()]


def iter_enum_blocks(clean_text):
    """Yield (header, body, start_offset) for every enum { ... } block."""
    for m in _ENUM_HEAD_RE.finditer(clean_text):
        open_idx = m.end() - 1
        close_idx = find_matching_brace(clean_text, open_idx)
        if close_idx < 0:
            continue
        yield m.group(0), clean_text[open_idx + 1:close_idx], open_idx


def parse_enum_entries(body):
    """Yield (name, expr_or_None) for each enum entry."""
    for entry in split_top_level(body):
        if "=" in entry:
            name, expr = entry.split("=", 1)
            name, expr = name.strip(), expr.strip()
        else:
            name, expr = entry.strip(), None
        if re.fullmatch(r"[A-Za-z_][A-Za-z_0-9]*", name or ""):
            yield name, expr


# ---------------------------------------------------------------------------
# SpriteIds.h
# ---------------------------------------------------------------------------
def read_text(path):
    with open(path, "r", encoding="utf-8", errors="replace") as fh:
        return fh.read()


def load_external_constants(engine):
    values, notes = {}, []
    for name, (rel, fallback) in EXTERNAL_CONSTANTS.items():
        path = os.path.join(engine, rel)
        val = None
        if os.path.exists(path):
            txt = strip_comments_and_strings(read_text(path))
            m = re.search(r"\b%s\s*=\s*([0-9]+(?:[uUlL]*)|0[xX][0-9a-fA-F]+)\s*;" % re.escape(name), txt)
            if m:
                val = int(normalise_expr(m.group(1)), 0)
        if val is None:
            notes.append("%s: not found in %s, using fallback %d" % (name, rel, fallback))
            val = fallback
        else:
            notes.append("%s = %d (from %s)" % (name, val, rel))
        values[name] = val
    return values, notes


def parse_sprite_ids(engine):
    """Return (symbols: OrderedDict name->{value, expr, line}, externals, notes)."""
    path = os.path.join(engine, SPRITE_IDS_REL)
    raw = read_text(path)
    clean = strip_comments_and_strings(raw)
    externals, notes = load_external_constants(engine)

    symbols = collections.OrderedDict()
    unresolved = []

    def lookup(name):
        if name in symbols and symbols[name]["value"] is not None:
            return symbols[name]["value"]
        if name in externals:
            return externals[name]
        raise KeyError(name)

    for header, body, start in iter_enum_blocks(clean):
        next_value = 0
        for name, expr in parse_enum_entries(body):
            line = clean.count("\n", 0, start + body.find(name)) + 1
            if expr is None:
                value = next_value
            else:
                try:
                    value = eval_expr(expr, lookup)
                except EvalError as exc:
                    unresolved.append("%s = %s (%s)" % (name, expr, exc))
                    value = None
            symbols[name] = {"value": value, "expr": expr, "line": line}
            if value is not None:
                next_value = value + 1

    # constexpr size_t kFoo = ...; entries outside the enum
    for m in re.finditer(r"constexpr\s+[A-Za-z_0-9:]+\s+([A-Za-z_][A-Za-z_0-9]*)\s*=\s*([^;]+);", clean):
        name, expr = m.group(1), m.group(2)
        if name in symbols or name in externals:
            continue
        try:
            symbols[name] = {"value": eval_expr(expr, lookup), "expr": expr.strip(),
                             "line": clean.count("\n", 0, m.start()) + 1, "constexpr": True}
        except EvalError as exc:
            unresolved.append("%s = %s (%s)" % (name, expr.strip(), exc))
    if unresolved:
        notes.append("unresolved SpriteIds.h entries: " + "; ".join(unresolved))
    return symbols, externals, notes


# ---------------------------------------------------------------------------
# Table classification
# ---------------------------------------------------------------------------
class Tables:
    """Boundaries of each sprite table, derived from SpriteIds.h symbols."""

    def __init__(self, symbols):
        def v(name, default=None):
            s = symbols.get(name)
            return s["value"] if s and s["value"] is not None else default

        self.g1_end = v("SPR_G1_END", G1_END_FALLBACK)
        self.rctc_end = v("SPR_RCTC_G1_END", 29357)
        self.g2_begin = v("SPR_G2_BEGIN", 29357)
        self.g2_end = v("SPR_G2_END")
        self.pal_begin = v("SPR_PALETTE_START")
        self.pal_end = v("SPR_PALETTE_END")
        self.fonts_begin = v("SPR_FONTS_BEGIN")
        self.fonts_end = v("SPR_FONTS_END")
        self.tracks_begin = v("SPR_TRACKS_BEGIN")
        self.tracks_end = v("SPR_TRACKS_END")
        self.csg_begin = v("SPR_CSG_BEGIN")
        self.csg_end = v("SPR_CSG_END")
        self.scroll_begin = v("SPR_SCROLLING_TEXT_START")
        self.scroll_end = v("SPR_SCROLLING_TEXT_END")
        self.imglist_begin = v("SPR_IMAGE_LIST_BEGIN")
        self.imglist_end = v("SPR_IMAGE_LIST_END")
        self.temp_begin = v("SPR_TEMP_BEGIN")
        self.temp_end = v("SPR_TEMP_END")

    def classify(self, value, name=""):
        if value is None:
            return "unknown"
        # SPR_TEMP_* numerically overlaps the image-list range; check it first.
        if name.startswith("SPR_TEMP_") or (
            self.temp_begin is not None and self.temp_end is not None and self.temp_begin <= value <= self.temp_end
        ):
            return "temp"
        if value < 0:
            return "invalid"
        if value < self.g1_end:
            return "g1"
        if value < self.rctc_end:
            return "rctc"
        ranges = [
            ("g2", self.g2_begin, self.g2_end),
            ("palettes", self.pal_begin, self.pal_end),
            ("fonts", self.fonts_begin, self.fonts_end),
            ("tracks", self.tracks_begin, self.tracks_end),
            ("csg", self.csg_begin, self.csg_end),
            ("scrolling", self.scroll_begin, self.scroll_end),
            ("imagelist", self.imglist_begin, self.imglist_end),
        ]
        for label, lo, hi in ranges:
            if lo is not None and hi is not None and lo <= value < hi:
                return label
            # *_END markers sit exactly on the boundary; attribute them to the table they close.
            if hi is not None and value == hi and name.endswith(("_END", "_END_", "_LENGTH")):
                return label
        if self.imglist_end is not None and value >= self.imglist_end:
            return "beyond"
        return "unknown"

    def as_dict(self):
        return {k: getattr(self, k) for k in vars(self)}


# ---------------------------------------------------------------------------
# Category heuristics
# ---------------------------------------------------------------------------
# Applied to the upper-cased symbol name, first match wins.  Order matters:
# more specific tokens come before generic ones (e.g. PATH_ADDITION before PATH,
# STAFF before anything that could match "GUEST").
NAME_RULES = [
    ("temp/misc", r"^SPR_TEMP_"),
    ("palette", r"PALETTE"),
    ("font", r"^SPR_CHAR_|^SPR_FONTS_|_FONT_|^SPR_TEXT_|GLYPH"),
    ("cursor", r"CURSOR"),
    ("staff", r"STAFF|HANDYMAN|MECHANIC|SECURITY|ENTERTAINER"),
    ("guest/peep", r"^PEEP_|_PEEP_|^SPR_PEEP|GUEST|KPEEPSPRITE|PEEPSPRITE"),
    ("path addition", r"PATH_ADDITION|PATH_BIT|BENCH|LAMP|LITTER_BIN|QUEUE_BANNER|JUMPING_FOUNTAIN|_BIN_"),
    ("path", r"PATH|FOOTPATH|QUEUE|RAILINGS"),
    ("park entrance", r"PARK_ENTRANCE|ENTRANCE|EXIT_"),
    ("shop/facility", r"SHOP|STALL|FACILITY|TOILET|KIOSK|FIRST_AID|CASH_MACHINE"),
    ("water", r"WATER|SPLASH|WAVE"),
    ("terrain", r"TERRAIN|^SPR_EDGE_|SURFACE|LAND_|GRASS|SAND|DIRT|ROCK|MARTIAN|CHECKERBOARD|GRID|^SPR_HEIGHT"),
    ("wall/fence", r"WALL|FENCE|DOOR|HEDGE"),
    ("scenery", r"SCENERY|TREE|FLOWER|BANNER"),
    ("support", r"SUPPORT"),
    ("ride vehicle", r"VEHICLE|_CAR_|CARS_|TRAIN|BOAT|GOLF_BALL|GOKART|SWING|PENDULUM|GONDOLA|FREEFALL_CAR|OBSERVATION_TOWER_CAR"),
    ("track", r"^SPR_TRACKS_|^SPR_TRACK_|_RC_|COASTER|MONORAIL|RAILWAY|CHAIRLIFT|LIFT_|STATION|TOWER|FLOOR|FLUME|RAPIDS|SLIDE|_LOOP|BRAKE|BOOSTER|HELIX|DIAG|TURN|_UP_|_DOWN_|FLAT_|SLOPE|MAZE|CIRCUS|CINEMA|DODGEMS|SAUCERS|CARPET|ENTERPRISE|TOP_SPIN|TWIST|MERRY|FERRIS|HAUNTED|CROOKED|SPACE_RINGS|SPIRAL|MOTION_SIM|GHOST|CARRIDE|SUBMARINE|RIVER|LOG_"),
    ("UI", r"^SPR_G2_|^SPR_RIDE_DESIGN_PREVIEW|^SPR_TAB_|TAB_|BUTTON|WINDOW|ICON|MENU|TOOLBAR|RESIZE|CHECKBOX|ARROW|SCROLL|^SPR_SPEED|LAND_TOOL|WATER_TOOL|LOGO|TITLE|^SPR_NEXT|^SPR_PREVIOUS|CLOSEBOX|BLANK_TAB|^SPR_MAP|^SPR_RATING|AWARD|CHART|^SPR_NEWS|^SPR_HEARING|^SPR_SPEED|^SPR_DOWN|^SPR_UP_|^SPR_TOP|^SPR_BOTTOM|^SPR_SHOWFLAGS|^SPR_SIGN|^SPR_THUMBS|^SPR_ZOOM|^SPR_ROTATE|^SPR_VIEW|^SPR_CONSTRUCTION|^SPR_SCENARIO|^SPR_PARK_|^SPR_OBJECTIVE|^SPR_FINANCE|^SPR_RESEARCH|^SPR_HEIGHT|^SPR_PICKUP|^SPR_TERRAIN_SELECTION|^SPR_DEMOLISH|^SPR_RENAME|^SPR_LOCATE|^SPR_OPEN|^SPR_CLOSED|^SPR_TESTING|^SPR_MUSIC|^SPR_SOUND|^SPR_PAINT|^SPR_BUY|^SPR_ROOM|^SPR_RIDE_|^SPR_GUESTS|^SPR_PEEP_LARGE|^SPR_G1_"),
    ("misc", r"LITTER|BALLOON|DUCK|MONEY|EXPLOSION|STEAM|CRASH|FOUNTAIN|EFFECT|PARTICLE|SMOKE|SNOW|RAIN|CLOUD"),
]
_NAME_RULES_COMPILED = [(cat, re.compile(rx)) for cat, rx in NAME_RULES]

# Applied to the referencing file path (relative to engine root), first match wins.
PATH_RULES = [
    ("guest/peep", r"paint/entity/Paint\.Guest|paint/entity/Paint\.Peep|/peep/|entity/Guest|entity/Peep|windows/Guest"),
    ("staff", r"paint/entity/Paint\.Staff|entity/Staff|windows/Staff"),
    ("ride vehicle", r"paint/vehicle/|paint/entity/Paint\.Vehicle|ride/Vehicle|ride/CarEntry|VehiclePaint"),
    ("support", r"paint/support/"),
    ("track", r"paint/track/|paint/track_pieces/|ride/TrackPaint|ride/Track"),
    ("terrain", r"tile_element/Paint\.Surface|tile_element/Paint\.Tunnel|world/Surface|world/Map"),
    ("water", r"world/Water|object/WaterObject"),
    ("path addition", r"tile_element/Paint\.PathAddition|object/FootpathAdditionObject|world/FootpathAddition"),
    ("path", r"tile_element/Paint\.Path|world/Footpath|object/Footpath|windows/Footpath"),
    ("wall/fence", r"tile_element/Paint\.Wall|world/Wall|object/WallObject"),
    ("scenery", r"tile_element/Paint\.SmallScenery|tile_element/Paint\.LargeScenery|tile_element/Paint\.Banner|world/Scenery|object/.*SceneryObject|windows/Scenery|world/Banner|object/BannerObject"),
    ("shop/facility", r"paint/track/shops/|ride/ShopItem|windows/ShopItem"),
    ("park entrance", r"tile_element/Paint\.Entrance|world/Entrance|object/EntranceObject|windows/ParkEntrance"),
    ("font", r"drawing/Font|drawing/TTF|drawing/Text|localisation/"),
    ("cursor", r"Cursors|interface/Cursor"),
    ("UI", r"openrct2-ui/|interface/|scripting/IconNames|windows/|title/|drawing/Drawing\.(?:Rect|Line)"),
    ("misc", r"paint/entity/|entity/|drawing/"),
]
_PATH_RULES_COMPILED = [(cat, re.compile(rx)) for cat, rx in PATH_RULES]


def category_from_name(name):
    up = name.upper()
    for cat, rx in _NAME_RULES_COMPILED:
        if rx.search(up):
            return cat
    return None


def category_from_path(rel):
    for cat, rx in _PATH_RULES_COMPILED:
        if rx.search(rel):
            return cat
    return None


def classify_category(name, files):
    """Category from the symbol name; if that fails, majority vote over referencing file paths."""
    cat = category_from_name(name)
    if cat:
        return cat, "name"
    votes = collections.Counter(category_from_path(f) for f in files)
    votes.pop(None, None)
    if votes:
        return votes.most_common(1)[0][0], "path"
    return "misc", "default"


# ---------------------------------------------------------------------------
# Source walking and symbol references
# ---------------------------------------------------------------------------
def iter_source_files(engine, rel_root="src"):
    base = os.path.join(engine, rel_root)
    for dirpath, dirnames, filenames in os.walk(base):
        dirnames.sort()
        for fn in sorted(filenames):
            if fn.endswith(SRC_EXTS):
                full = os.path.join(dirpath, fn)
                yield os.path.relpath(full, engine).replace(os.sep, "/"), full


_IDENT_RE = re.compile(r"\b[A-Za-z_][A-Za-z_0-9]*\b")


def find_symbol_references(engine, symbol_names, file_cache):
    """Map symbol -> sorted list of relative file paths that reference it (excluding SpriteIds.h)."""
    refs = collections.defaultdict(set)
    for rel, clean in file_cache.items():
        if rel == SPRITE_IDS_REL:
            continue
        idents = set(_IDENT_RE.findall(clean))
        for name in idents & symbol_names:
            refs[name].add(rel)
    return {k: sorted(v) for k, v in refs.items()}


# ---------------------------------------------------------------------------
# Raw literal scan
# ---------------------------------------------------------------------------
# Literals below this value are never treated as sprite indices by the literal
# scan (they are overwhelmingly flags, small enums, coordinates and heights);
# g1 indices 0..999 still enter the inventory through SpriteIds.h symbols.
LITERAL_FLOOR = 1000

INT_TYPES = {"uint32_t", "uint16_t", "int32_t", "ImageIndex", "auto", "size_t", "uint8_t", "int16_t", "int"}
# Array element types that never hold sprite indices.
NON_SPRITE_ARRAY_TYPE_RE = re.compile(
    r"Coords|BoundBox|Rating|Sound|^u?int8_t$|^int16_t$|Segment|SubType|Colour|Price|Cost|Money|Offset|Yaw|Pitch|Roll",
    re.I,
)
# Files whose integer tables are known not to be sprite indices (ratings, string ids, ride data).
NON_SPRITE_FILE_RE = re.compile(r"/rtd/|RideRatings|StringIds|/RideData\.cpp$|/ted/|TrackData|VehicleGeometry|Subposition")
SPRITEISH_NAME_RE = re.compile(r"spr|sprite|image|img", re.I)
_LOCAL_ASSIGN_RE = re.compile(r"\b(?:ImageIndex|uint32_t|auto)\s+[A-Za-z_][A-Za-z_0-9]*\s*=\s*(?P<expr>[^;{]+);")

_DECL_RE = re.compile(
    r"(?:static\s+)?(?:inline\s+)?constexpr\s+(?:const\s+)?"
    r"(?P<type>[A-Za-z_][A-Za-z_0-9:]*(?:\s*<[^;{=]*?>)?)\s+"
    r"(?P<name>[A-Za-z_][A-Za-z_0-9]*)\s*"
    r"(?P<dims>(?:\[[^\]]*\]\s*)*)"
    r"=\s*"
)
_ARRAY_DECL_RE = re.compile(
    r"(?:static\s+)?(?:inline\s+)?(?:constexpr|const)\s+(?:const\s+)?"
    r"(?P<type>[A-Za-z_][A-Za-z_0-9:]*(?:\s*<[^;{=]*?>)?)\s+"
    r"(?P<name>[A-Za-z_][A-Za-z_0-9]*)\s*"
    r"(?P<dims>(?:\[[^\]]*\]\s*)+|)"
    r"=\s*(?=\{)"
)
_CALL_RE = re.compile(r"\b(?P<fn>WithIndex|ImageId|ImageIndex)\s*\(")
_DEC_LITERAL_RE = re.compile(r"(?<![A-Za-z_0-9.])(?P<n>[1-9][0-9]{3,4})(?![0-9A-Za-z_.])")
_OFFSET_RE = re.compile(r"\b(?P<base>[A-Za-z_][A-Za-z_0-9]*)\s*\+\s*(?P<off>[0-9]+)\b")


def base_type(t):
    t = t.strip()
    t = re.sub(r"^const\s+", "", t)
    m = re.match(r"std::array\s*<\s*([A-Za-z_0-9:]+)", t)
    if m:
        return m.group(1).split("::")[-1]
    return t.split("<")[0].strip().split("::")[-1]


def extract_balanced_paren(text, open_idx):
    depth = 0
    for i in range(open_idx, len(text)):
        c = text[i]
        if c == "(":
            depth += 1
        elif c == ")":
            depth -= 1
            if depth == 0:
                return i
    return -1


def ride_type_for_file(rel):
    """(ride_type, group) derived from the file path, or (None, None)."""
    m = re.match(r"src/openrct2/paint/track/(coaster|gentle|shops|thrill|transport|water)/([A-Za-z0-9]+)\.(?:cpp|h|hpp)$", rel)
    if m:
        return m.group(2), m.group(1)
    m = re.match(r"src/openrct2/paint/vehicle/Vehicle\.([A-Za-z0-9]+)\.(?:cpp|h)$", rel)
    if m:
        return m.group(1), "vehicle"
    if rel.startswith("src/openrct2/paint/vehicle/"):
        return "VehiclePaint (generic)", "vehicle"
    if rel.startswith("src/openrct2/paint/support/"):
        return "Supports (shared)", "shared"
    if rel in ("src/openrct2/ride/TrackPaint.h", "src/openrct2/ride/TrackPaint.cpp") or rel.startswith(
        ("src/openrct2/paint/track/TrackPaintGeneric", "src/openrct2/paint/track_pieces/")
    ):
        return "TrackPaint (shared)", "shared"
    return None, None


class FileScan:
    """Result of scanning one file for sprite-context literals."""

    def __init__(self, rel):
        self.rel = rel
        self.local_symbols = collections.OrderedDict()  # name -> value
        self.literal_values = collections.defaultdict(set)  # kind -> set(values) for raw decimal literals
        self.resolved_values = collections.defaultdict(set)  # kind -> set(values) via symbols/offsets
        self.offset_bases = set()      # names used as BASE + n
        self.dynamic_exprs = 0         # WithIndex/ImageId args the scanner cannot evaluate
        self.dynamic_bases = set()     # symbol bases with runtime offsets (SPR_X + direction)
        self.uncontexted_literals = set()  # in-range literals outside recognised sprite contexts
        self.unresolved_names = set()


def collect_local_definitions(clean, lookup_global):
    """Evaluate enum entries and constexpr scalars in one file. Returns (symbols, enum_literal_hits, scalar_hits, unresolved)."""
    symbols = collections.OrderedDict()
    enum_hits = []       # (name, value, is_literal, offset_base)
    scalar_hits = []     # (name, value, type, is_literal, offset_base)
    unresolved = set()

    def lookup(name):
        if name in symbols:
            return symbols[name]
        return lookup_global(name)

    for header, body, start in iter_enum_blocks(clean):
        is_scoped = re.search(r"\benum\s+(class|struct)\b", header) is not None
        has_shift = "<<" in body
        next_value = 0
        block_hits = []
        n_explicit = n_in_range = 0
        for name, expr in parse_enum_entries(body):
            if expr is None:
                value = next_value
                is_literal = False
                offset_base = None
            else:
                try:
                    value = eval_expr(expr, lookup)
                except EvalError:
                    unresolved.update(n for n in expr_names(expr) if n not in symbols)
                    value = None
                is_literal = re.fullmatch(r"\s*[0-9]+[uUlL]*\s*", expr) is not None
                m = _OFFSET_RE.fullmatch(expr.strip())
                offset_base = m.group("base") if m else None
                n_explicit += 1
                if value is not None and value >= LITERAL_FLOOR:
                    n_in_range += 1
            if value is not None:
                symbols[name] = value
                next_value = value + 1
                if (not is_scoped or is_literal) and not name.startswith("STR_"):
                    block_hits.append((name, value, is_literal, offset_base))
        # A block counts as a sprite enum only if it is not a flag enum and at
        # least half of its explicit values are plausible sprite indices.
        if not has_shift and n_in_range * 2 >= max(n_explicit, 1):
            enum_hits.extend(block_hits)

    for m in _DECL_RE.finditer(clean):
        if m.group("dims").strip():
            continue
        after = clean[m.end():m.end() + 1]
        if after == "{":
            continue
        end = clean.find(";", m.end())
        if end < 0:
            continue
        expr = clean[m.end():end].strip()
        btype = base_type(m.group("type"))
        if btype not in INT_TYPES or "<<" in expr:
            continue
        try:
            value = eval_expr(expr, lookup)
        except EvalError:
            unresolved.update(n for n in expr_names(expr) if n not in symbols)
            continue
        symbols[m.group("name")] = value
        is_literal = re.fullmatch(r"[0-9]+[uUlL]*", expr) is not None
        om = _OFFSET_RE.fullmatch(expr)
        scalar_hits.append((m.group("name"), value, btype, is_literal, om.group("base") if om else None))
    return symbols, enum_hits, scalar_hits, unresolved


def scan_file_literals(rel, clean, global_lookup, aux_lookup, tables, in_paint_dir, aux_sprite_symbols=None):
    fs = FileScan(rel)
    non_sprite_file = NON_SPRITE_FILE_RE.search(rel) is not None

    def lookup_global(name):
        try:
            return global_lookup(name)
        except KeyError:
            return aux_lookup(name)

    symbols, enum_hits, scalar_hits, unresolved = collect_local_definitions(clean, lookup_global)
    fs.local_symbols = symbols
    fs.unresolved_names |= unresolved

    def lookup(name):
        if name in symbols:
            return symbols[name]
        return lookup_global(name)

    def record(kind, value, is_literal, base=None):
        if value is None or value < LITERAL_FLOOR:
            return
        if is_literal:
            fs.literal_values[kind].add(value)
        else:
            fs.resolved_values[kind].add(value)
        if base:
            fs.offset_bases.add(base)

    for name, value, is_literal, base in enum_hits:
        if non_sprite_file and not SPRITEISH_NAME_RE.search(name):
            continue
        record("enum", value, is_literal, base)

    for name, value, btype, is_literal, base in scalar_hits:
        if non_sprite_file and not SPRITEISH_NAME_RE.search(name):
            continue
        sprite_typed = btype in ("uint32_t", "uint16_t", "ImageIndex")
        if sprite_typed or SPRITEISH_NAME_RE.search(name) or (in_paint_dir and btype in ("int32_t", "auto")):
            record("constexpr", value, is_literal, base)

    # constexpr / const arrays with brace initialisers
    consumed = []
    for m in _ARRAY_DECL_RE.finditer(clean):
        btype = base_type(m.group("type"))
        name = m.group("name")
        if non_sprite_file and not SPRITEISH_NAME_RE.search(name):
            continue
        if NON_SPRITE_ARRAY_TYPE_RE.search(btype) and not SPRITEISH_NAME_RE.search(name):
            continue
        close = find_matching_brace(clean, m.end())
        if close < 0:
            continue
        body = clean[m.end():close + 1]
        consumed.append((m.end(), close + 1))
        for om in _OFFSET_RE.finditer(body):
            try:
                base_val = lookup(om.group("base"))
            except KeyError:
                fs.unresolved_names.add(om.group("base"))
                continue
            record("array", base_val + int(om.group("off")), False, om.group("base"))
        body_no_offsets = _OFFSET_RE.sub(" ", body)
        for lm in _DEC_LITERAL_RE.finditer(body_no_offsets):
            record("array", int(lm.group("n")), True)
        for im in _IDENT_RE.finditer(body_no_offsets):
            ident = im.group(0)
            if ident in symbols:
                record("array", symbols[ident], False)
            else:
                try:
                    val = global_lookup(ident)
                except KeyError:
                    continue
                record("array", val, False)

    # local variable initialisers:  ImageIndex imageIndex = cond ? 20390 : 20362;
    if in_paint_dir:
        for m in _LOCAL_ASSIGN_RE.finditer(clean):
            expr = m.group("expr")
            if "<<" in expr:
                continue
            found = False
            for lm in _DEC_LITERAL_RE.finditer(_OFFSET_RE.sub(" ", expr)):
                record("local", int(lm.group("n")), True)
                found = True
            for om in _OFFSET_RE.finditer(expr):
                try:
                    record("local", lookup(om.group("base")) + int(om.group("off")), False, om.group("base"))
                    found = True
                except KeyError:
                    pass
            for im in _IDENT_RE.finditer(_OFFSET_RE.sub(" ", expr)):
                try:
                    v = lookup(im.group(0))
                except KeyError:
                    continue
                if isinstance(v, int) and v >= LITERAL_FLOOR:
                    record("local", v, False)
                    found = True
            if found:
                consumed.append((m.start(), m.end()))

    # bare references to sprite constants defined in other scanned files (per-file
    # enums in shared headers such as TrackPaint.h, Paint.Surface.h, PeepSpriteIds.h)
    if aux_sprite_symbols:
        for ident in set(_IDENT_RE.findall(clean)):
            if ident in aux_sprite_symbols and ident not in symbols:
                record("ident", aux_sprite_symbols[ident], False)

    # WithIndex(...) / ImageId(...) call arguments
    for m in _CALL_RE.finditer(clean):
        open_idx = m.end() - 1
        close = extract_balanced_paren(clean, open_idx)
        if close < 0:
            continue
        args = split_top_level(clean[open_idx + 1:close])
        if not args:
            continue
        arg = args[0]
        consumed.append((open_idx, close + 1))
        if re.fullmatch(r"[0-9]+[uUlL]*", arg):
            record("call", int(normalise_expr(arg)), True)
            continue
        try:
            value = eval_expr(arg, lookup)
            base_m = _OFFSET_RE.fullmatch(arg.strip())
            record("call", value, False, base_m.group("base") if base_m else None)
        except EvalError:
            fs.dynamic_exprs += 1
            names = expr_names(arg)
            # base + runtime offset:  SPR_FOO + direction
            for n in names:
                try:
                    v = lookup(n)
                except KeyError:
                    continue
                if isinstance(v, int) and v >= 1000:
                    fs.dynamic_bases.add(n)
                    record("call_base", v, False)
            for lm in _DEC_LITERAL_RE.finditer(arg):
                record("call", int(lm.group("n")), True)

    # Everything else in range: report as uncontexted (not counted)
    mask = bytearray(len(clean))
    for a, b in consumed:
        for i in range(a, b):
            mask[i] = 1
    for header, body, start in iter_enum_blocks(clean):
        for i in range(start, start + len(body) + 2):
            if i < len(mask):
                mask[i] = 1
    for m in _DECL_RE.finditer(clean):
        if m.group("dims").strip() or clean[m.end():m.end() + 1] == "{":
            continue
        end = clean.find(";", m.end())
        for i in range(m.start(), end + 1):
            mask[i] = 1
    for lm in _DEC_LITERAL_RE.finditer(clean):
        if mask[lm.start()]:
            continue
        v = int(lm.group("n"))
        if 1000 <= v < tables.g1_end:
            fs.uncontexted_literals.add(v)
    return fs


# ---------------------------------------------------------------------------
# Helpers for ranges and reporting
# ---------------------------------------------------------------------------
def to_ranges(values):
    vals = sorted(set(values))
    out = []
    for v in vals:
        if out and out[-1][1] == v - 1:
            out[-1][1] = v
        else:
            out.append([v, v])
    return [(a, b) for a, b in out]


def fmt_ranges(ranges, limit=None):
    parts = ["%d" % a if a == b else "%d-%d" % (a, b) for a, b in ranges]
    if limit and len(parts) > limit:
        return ", ".join(parts[:limit]) + ", ... (+%d more)" % (len(parts) - limit)
    return ", ".join(parts)


def git_commit(engine):
    try:
        out = subprocess.run(["git", "-C", engine, "rev-parse", "--short", "HEAD"], capture_output=True, text=True, timeout=10)
        return out.stdout.strip() or None
    except Exception:
        return None


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------
def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--engine", default=DEFAULT_ENGINE, help="OpenRCT2 checkout (default: %(default)s)")
    ap.add_argument("--out", default=DEFAULT_OUT, help="output directory (default: %(default)s)")
    args = ap.parse_args(argv)
    engine = os.path.abspath(args.engine)
    out_dir = os.path.abspath(args.out)
    os.makedirs(out_dir, exist_ok=True)

    if not os.path.exists(os.path.join(engine, SPRITE_IDS_REL)):
        sys.exit("SpriteIds.h not found under %s" % engine)

    # -- 1. SpriteIds.h -----------------------------------------------------
    symbols, externals, notes = parse_sprite_ids(engine)
    tables = Tables(symbols)
    symbol_names = set(symbols)

    # -- 2. Read all sources once ------------------------------------------
    file_cache = collections.OrderedDict()
    for rel, full in iter_source_files(engine):
        file_cache[rel] = strip_comments_and_strings(read_text(full))

    refs = find_symbol_references(engine, symbol_names, file_cache)

    def global_lookup(name):
        s = symbols.get(name)
        if s and s["value"] is not None:
            return s["value"]
        if name in externals:
            return externals[name]
        raise KeyError(name)

    # -- 3. Literal scan -----------------------------------------------------
    scan_files = [rel for rel in file_cache if any(rel.startswith(d + "/") for d in LITERAL_SCAN_DIRS)]

    # pass 1: per-file local definitions, pooled so headers' enums resolve from .cpp files
    aux_symbols = {}
    aux_sprite_symbols = {}
    for rel in scan_files:
        syms, enum_hits, scalar_hits, _ = collect_local_definitions(file_cache[rel], global_lookup)
        for k, v in syms.items():
            aux_symbols.setdefault(k, v)
        if NON_SPRITE_FILE_RE.search(rel):
            continue
        for name, value, _, _ in enum_hits:
            if LITERAL_FLOOR <= value < tables.g1_end:
                aux_sprite_symbols.setdefault(name, value)
        for name, value, btype, _, _ in scalar_hits:
            if btype in ("uint32_t", "uint16_t", "ImageIndex") and LITERAL_FLOOR <= value < tables.g1_end:
                aux_sprite_symbols.setdefault(name, value)

    def aux_lookup(name):
        if name in aux_symbols:
            return aux_symbols[name]
        raise KeyError(name)

    scans = {}
    for rel in scan_files:
        scans[rel] = scan_file_literals(
            rel, file_cache[rel], global_lookup, aux_lookup, tables, rel.startswith("src/openrct2/paint/"),
            aux_sprite_symbols,
        )

    # -- 4. Symbol records ----------------------------------------------------
    marker_re = re.compile(r"(_END|_COUNT|_LENGTH|Count)$")
    symbol_records = []
    for name, info in symbols.items():
        value = info["value"]
        table = tables.classify(value, name)
        files = refs.get(name, [])
        cat, cat_source = classify_category(name, files)
        symbol_records.append({
            "symbol": name,
            "value": value,
            "expr": info.get("expr"),
            "line": info.get("line"),
            "table": table,
            "category": cat,
            "category_source": cat_source,
            "is_marker": bool(marker_re.search(name)),
            "referenced": bool(files),
            "files": files,
        })

    # -- 5. Aggregates ----------------------------------------------------------
    g1_by_symbol_all = set()       # every g1-valued symbol defined (excl. markers)
    g1_by_symbol_ref = set()       # ... that is referenced outside SpriteIds.h
    per_cat_symbols = collections.Counter()
    per_cat_indices = collections.defaultdict(set)
    per_table_symbols = collections.Counter()
    per_file_g1 = collections.defaultdict(set)
    for r in symbol_records:
        per_table_symbols[r["table"]] += 1
        if r["table"] != "g1" or r["is_marker"]:
            continue
        g1_by_symbol_all.add(r["value"])
        if r["referenced"]:
            g1_by_symbol_ref.add(r["value"])
            per_cat_symbols[r["category"]] += 1
            per_cat_indices[r["category"]].add(r["value"])
            for f in r["files"]:
                per_file_g1[f].add(r["value"])

    g1_by_literal = set()
    g1_by_literal_resolved = set()
    per_file_literal = {}
    literal_file_records = []
    per_cat_literal_indices = collections.defaultdict(set)
    for rel, fs in scans.items():
        lit = {v for vs in fs.literal_values.values() for v in vs if v < tables.g1_end}
        res = {v for vs in fs.resolved_values.values() for v in vs if v < tables.g1_end}
        allv = lit | res
        other_tables = collections.Counter()
        for vs in list(fs.literal_values.values()) + list(fs.resolved_values.values()):
            for v in vs:
                t = tables.classify(v)
                if t != "g1":
                    other_tables[t] += 1
        if not allv and not fs.uncontexted_literals and not fs.dynamic_exprs and not other_tables:
            continue
        g1_by_literal |= lit
        g1_by_literal_resolved |= res
        per_file_literal[rel] = allv
        per_file_g1[rel] |= allv
        ride_type, group = ride_type_for_file(rel)
        cat = category_from_path(rel) or "misc"
        per_cat_literal_indices[cat] |= allv
        literal_file_records.append({
            "file": rel,
            "ride_type": ride_type,
            "ride_group": group,
            "category": cat,
            "g1_distinct": len(allv),
            "g1_min": min(allv) if allv else None,
            "g1_max": max(allv) if allv else None,
            "g1_ranges": to_ranges(allv),
            "g1_via_raw_literal": len(lit),
            "g1_via_local_symbol_or_offset": len(res),
            "by_kind": {k: len([v for v in vs if v < tables.g1_end]) for k, vs in
                        {**{k + ":literal": s for k, s in fs.literal_values.items()},
                         **{k + ":resolved": s for k, s in fs.resolved_values.items()}}.items()},
            "non_g1_values_by_table": dict(other_tables),
            "local_sprite_symbols": len(fs.local_symbols),
            "offset_bases": sorted(fs.offset_bases),
            "dynamic_call_args": fs.dynamic_exprs,
            "dynamic_bases": sorted(fs.dynamic_bases),
            "uncontexted_in_range_literals": sorted(fs.uncontexted_literals),
            "unresolved_names": sorted(fs.unresolved_names)[:40],
        })

    union = g1_by_symbol_ref | g1_by_literal | g1_by_literal_resolved
    union_defined = g1_by_symbol_all | g1_by_literal | g1_by_literal_resolved

    # per ride type
    per_ride = collections.OrderedDict()
    for rec in literal_file_records:
        if not rec["ride_type"]:
            continue
        key = rec["ride_type"]
        entry = per_ride.setdefault(key, {"ride_type": key, "group": rec["ride_group"], "files": [], "values": set()})
        entry["files"].append(rec["file"])
        entry["values"] |= set(per_file_literal.get(rec["file"], set()))
        # add SpriteIds.h g1 symbols referenced from the same file
        for r in symbol_records:
            pass
    for rel, vals in per_file_g1.items():
        rt, grp = ride_type_for_file(rel)
        if rt and rt in per_ride:
            per_ride[rt]["values"] |= {v for v in vals if v < tables.g1_end}
        elif rt:
            per_ride[rt] = {"ride_type": rt, "group": grp, "files": [rel], "values": {v for v in vals if v < tables.g1_end}}
    per_ride_records = []
    for key, e in per_ride.items():
        vals = e["values"]
        per_ride_records.append({
            "ride_type": key, "group": e["group"], "files": sorted(set(e["files"])),
            "g1_distinct": len(vals), "g1_min": min(vals) if vals else None, "g1_max": max(vals) if vals else None,
            "g1_ranges": to_ranges(vals),
        })
    per_ride_records.sort(key=lambda r: (-r["g1_distinct"], r["ride_type"]))

    top_files = sorted(per_file_g1.items(), key=lambda kv: (-len(kv[1]), kv[0]))[:25]

    # combined per-category (symbol indices + literal indices)
    all_cats = sorted(set(per_cat_indices) | set(per_cat_literal_indices) | {c for c, _ in NAME_RULES})
    per_cat_rows = []
    for c in all_cats:
        s = per_cat_indices.get(c, set())
        l = per_cat_literal_indices.get(c, set())
        if not s and not l and per_cat_symbols.get(c, 0) == 0:
            continue
        per_cat_rows.append({"category": c, "symbols_referenced": per_cat_symbols.get(c, 0),
                             "g1_indices_via_symbols": len(s), "g1_indices_via_literals": len(l),
                             "g1_indices_union": len(s | l)})
    per_cat_rows.sort(key=lambda r: -r["g1_indices_union"])

    commit = git_commit(engine)
    generated = datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%d %H:%M:%SZ")

    unreferenced_g1 = [r["symbol"] for r in symbol_records if r["table"] == "g1" and not r["referenced"] and not r["is_marker"]]

    limitations = [
        "Runtime base+offset arithmetic (e.g. `SPR_TERRAIN_GRASS + slope`, `imageIds[direction]`, "
        "`baseImage + frame * 4`) is only followed when the offset is a compile-time constant; a "
        "referenced base symbol therefore stands for a whole block of sprites whose extent the scanner "
        "does not know. Counts are lower bounds on the number of g1 images actually drawn.",
        "Symbols are only counted as `referenced` when the identifier appears in a file under src/ other "
        "than SpriteIds.h (comments and string literals stripped). Symbols that exist only as arithmetic "
        "bases inside SpriteIds.h itself are reported separately as unreferenced.",
        "The raw-literal scan is limited to LITERAL_SCAN_DIRS (%s), to values >= %d, and to recognised "
        "sprite contexts: unscoped enum blocks where at least half of the explicit values are plausible "
        "sprite indices (flag enums using << and STR_ entries are skipped), integer constexpr scalars "
        "(uint32_t/uint16_t/ImageIndex anywhere; int32_t/auto only under paint/), const/constexpr "
        "brace-initialised arrays whose element type is not a known non-sprite type, ImageIndex/uint32_t "
        "local initialisers under paint/, and the first argument of WithIndex()/ImageId(). Files matching "
        "%s are treated as non-sprite data. In-range decimal literals found outside these contexts are "
        "listed per file as `uncontexted_in_range_literals` but not counted."
        % (", ".join(LITERAL_SCAN_DIRS), LITERAL_FLOOR, NON_SPRITE_FILE_RE.pattern),
        "Images supplied by loaded objects (ride vehicles, scenery, walls, paths, park entrances, peep "
        "animations, terrain surfaces/edges in the JSON object system) are addressed through object "
        "image tables at runtime and are invisible to this scan; those objects may in turn point at g1 "
        "ranges via `$G1[...]` sources, which object_refs.py covers.",
        "Category assignment is heuristic (symbol-name regex first, then referencing-path vote); "
        "the rules are in NAME_RULES/PATH_RULES in the script and each record carries `category_source`.",
        "RCTC-only indices 29294..29356 are classified as `rctc`; `SPR_G1_END`-relative markers "
        "(*_END, *_COUNT, *_LENGTH) are excluded from index counts.",
        "Values are only as accurate as the enum evaluation: external constants were resolved as: %s." % "; ".join(notes),
    ]

    result = {
        "generated": generated,
        "engine": engine,
        "engine_commit": commit,
        "sprite_ids_header": SPRITE_IDS_REL,
        "literal_scan_dirs": LITERAL_SCAN_DIRS,
        "tables": tables.as_dict(),
        "external_constants": externals,
        "notes": notes,
        "limitations": limitations,
        "category_rules": {"name_rules": NAME_RULES, "path_rules": PATH_RULES},
        "summary": {
            "symbols_total": len(symbol_records),
            "symbols_per_table": dict(per_table_symbols),
            "g1_symbols_defined_excl_markers": len([r for r in symbol_records if r["table"] == "g1" and not r["is_marker"]]),
            "g1_symbols_referenced": len([r for r in symbol_records if r["table"] == "g1" and not r["is_marker"] and r["referenced"]]),
            "g1_indices_via_symbols_referenced": len(g1_by_symbol_ref),
            "g1_indices_via_symbols_defined": len(g1_by_symbol_all),
            "g1_indices_via_literals_raw": len(g1_by_literal),
            "g1_indices_via_literals_resolved": len(g1_by_literal_resolved),
            "g1_indices_via_literals_total": len(g1_by_literal | g1_by_literal_resolved),
            "g1_indices_union_referenced": len(union),
            "g1_indices_union_incl_unreferenced_symbols": len(union_defined),
            "g1_indices_union_ranges": to_ranges(union),
            "g1_total_in_g1_dat": tables.g1_end,
            "files_scanned_for_symbols": len(file_cache),
            "files_scanned_for_literals": len(scan_files),
            "files_with_literal_hits": len(literal_file_records),
            "unreferenced_g1_symbols": unreferenced_g1,
        },
        "per_category": per_cat_rows,
        "top_files": [{"file": f, "g1_distinct": len(v), "g1_ranges": to_ranges(v)} for f, v in top_files],
        "per_ride_type": per_ride_records,
        "symbols": symbol_records,
        "literal_files": literal_file_records,
    }

    json_path = os.path.join(out_dir, "sprite_refs.json")
    with open(json_path, "w", encoding="utf-8") as fh:
        json.dump(result, fh, indent=1)

    # -- 6. Markdown summary ---------------------------------------------------
    s = result["summary"]
    md = []
    md.append("# OpenRCT2 hard-coded g1.dat sprite dependencies\n")
    md.append("Generated %s by `tools/asset-audit/sprite_refs.py` from `%s` (commit %s). Do not hand-edit.\n"
              % (generated, engine, commit or "unknown"))
    md.append("g1.dat holds indices 0..%d. Anything below %d that the engine addresses by number is a proprietary "
              "RCT2 dependency unless replaced.\n" % (tables.g1_end - 1, tables.g1_end))

    md.append("## Headline numbers\n")
    md.append("| Metric | Value |\n|---|---:|")
    md.append("| SpriteIds.h symbols parsed | %d |" % s["symbols_total"])
    md.append("| g1-valued symbols defined (excl. *_END/_COUNT markers) | %d |" % s["g1_symbols_defined_excl_markers"])
    md.append("| g1-valued symbols referenced outside SpriteIds.h | %d |" % s["g1_symbols_referenced"])
    md.append("| Distinct g1 indices via referenced symbols | %d |" % s["g1_indices_via_symbols_referenced"])
    md.append("| Distinct g1 indices via raw decimal literals (sprite contexts) | %d |" % s["g1_indices_via_literals_raw"])
    md.append("| Distinct g1 indices via per-file symbols / BASE+n offsets | %d |" % s["g1_indices_via_literals_resolved"])
    md.append("| Distinct g1 indices via literals (raw + resolved) | %d |" % s["g1_indices_via_literals_total"])
    md.append("| **Union of distinct g1 indices referenced** | **%d** (%.1f%% of %d) |"
              % (s["g1_indices_union_referenced"], 100.0 * s["g1_indices_union_referenced"] / tables.g1_end, tables.g1_end))
    md.append("| Union incl. unreferenced g1 symbols | %d |" % s["g1_indices_union_incl_unreferenced_symbols"])
    md.append("| Files scanned for symbol references | %d |" % s["files_scanned_for_symbols"])
    md.append("| Files scanned for literals / with hits | %d / %d |" % (s["files_scanned_for_literals"], s["files_with_literal_hits"]))
    md.append("")
    md.append("Union of referenced g1 indices as ranges (%d ranges):\n" % len(s["g1_indices_union_ranges"]))
    md.append("```\n%s\n```\n" % fmt_ranges(s["g1_indices_union_ranges"]))

    md.append("## Symbols per table\n")
    md.append("| Table | Symbols | Range |\n|---|---:|---|")
    table_ranges = {
        "g1": (0, tables.g1_end - 1), "rctc": (tables.g1_end, tables.rctc_end - 1),
        "g2": (tables.g2_begin, (tables.g2_end or 0) - 1), "palettes": (tables.pal_begin, (tables.pal_end or 0) - 1),
        "fonts": (tables.fonts_begin, (tables.fonts_end or 0) - 1), "tracks": (tables.tracks_begin, (tables.tracks_end or 0) - 1),
        "csg": (tables.csg_begin, (tables.csg_end or 0) - 1), "scrolling": (tables.scroll_begin, (tables.scroll_end or 0) - 1),
        "imagelist": (tables.imglist_begin, (tables.imglist_end or 0) - 1), "temp": (tables.temp_begin, tables.temp_end),
    }
    for t in ["g1", "rctc", "g2", "palettes", "fonts", "tracks", "csg", "scrolling", "imagelist", "temp", "unknown", "beyond"]:
        if per_table_symbols.get(t):
            rng = table_ranges.get(t)
            md.append("| %s | %d | %s |" % (t, per_table_symbols[t], "%s..%s" % rng if rng else ""))
    md.append("")

    md.append("## g1 indices per category\n")
    md.append("Category comes from the symbol name (NAME_RULES) or, failing that, a vote over the referencing file paths "
              "(PATH_RULES); literal-scan files are categorised by path only. Heuristics are listed at the end.\n")
    md.append("| Category | g1 symbols referenced | g1 indices via symbols | g1 indices via literals | union |\n|---|---:|---:|---:|---:|")
    for r in per_cat_rows:
        md.append("| %s | %d | %d | %d | %d |" % (r["category"], r["symbols_referenced"], r["g1_indices_via_symbols"],
                                                  r["g1_indices_via_literals"], r["g1_indices_union"]))
    md.append("")

    md.append("## Top 25 files by distinct g1 indices\n")
    md.append("Counts combine SpriteIds.h g1 symbols referenced by the file and (for scanned directories) literal-derived indices.\n")
    md.append("| # | File | Distinct g1 indices | Ranges |\n|---:|---|---:|---|")
    for i, (f, v) in enumerate(top_files, 1):
        md.append("| %d | `%s` | %d | %s |" % (i, f, len(v), fmt_ranges(to_ranges(v), limit=6)))
    md.append("")

    md.append("## Per ride type (track / vehicle paint)\n")
    md.append("Ride type derived from the file name under paint/track/<group>/ and paint/vehicle/Vehicle.<Name>.cpp. "
              "Only compile-time-resolvable indices are counted (see limitations).\n")
    md.append("| Ride type | Group | Distinct g1 indices | Min | Max | Files |\n|---|---|---:|---:|---:|---|")
    for r in per_ride_records:
        md.append("| %s | %s | %d | %s | %s | %s |" % (
            r["ride_type"], r["group"], r["g1_distinct"],
            r["g1_min"] if r["g1_min"] is not None else "-", r["g1_max"] if r["g1_max"] is not None else "-",
            ", ".join("`%s`" % os.path.basename(f) for f in r["files"])))
    md.append("")

    md.append("## Files with dynamic (runtime-computed) sprite indices\n")
    dyn = sorted(((rec["dynamic_call_args"], rec["file"], rec["dynamic_bases"]) for rec in literal_file_records if rec["dynamic_call_args"]), reverse=True)
    md.append("`WithIndex()/ImageId()` arguments the scanner could not evaluate (e.g. `kFoo[direction]`, `base + frame`). "
              "Top 20 of %d files:\n" % len(dyn))
    md.append("| Dynamic args | File | Bases with runtime offsets |\n|---:|---|---|")
    for n, f, bases in dyn[:20]:
        md.append("| %d | `%s` | %s |" % (n, f, ", ".join(bases[:6]) + (" ..." if len(bases) > 6 else "")))
    md.append("")

    md.append("## Unreferenced g1 symbols\n")
    md.append("%d g1-valued SpriteIds.h symbols are not referenced by any other file under src/ (documentation-only or "
              "arithmetic bases). They are excluded from the referenced union.\n" % len(unreferenced_g1))
    md.append("")

    md.append("## Limitations\n")
    for l in limitations:
        md.append("- %s" % l)
    md.append("")

    md.append("## Category heuristics\n")
    md.append("Symbol-name rules (regex on upper-cased name, first match wins):\n")
    md.append("| Category | Regex |\n|---|---|")
    for cat, rx in NAME_RULES:
        md.append("| %s | `%s` |" % (cat, rx.replace("|", "\\|")))
    md.append("\nPath rules (regex on referencing file path, first match wins; used when no name rule matched, by majority vote):\n")
    md.append("| Category | Regex |\n|---|---|")
    for cat, rx in PATH_RULES:
        md.append("| %s | `%s` |" % (cat, rx.replace("|", "\\|")))
    md.append("")

    md_path = os.path.join(out_dir, "sprite_summary.md")
    with open(md_path, "w", encoding="utf-8") as fh:
        fh.write("\n".join(md))

    print("wrote %s" % json_path)
    print("wrote %s" % md_path)
    print("g1 via symbols: %d, via literals: %d, union: %d" % (
        s["g1_indices_via_symbols_referenced"], s["g1_indices_via_literals_total"], s["g1_indices_union_referenced"]))
    return 0


if __name__ == "__main__":
    sys.exit(main())

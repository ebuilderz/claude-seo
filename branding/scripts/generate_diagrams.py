#!/usr/bin/env python3
"""
Generate banner.svg + 15 diagram variants for claude-seo
(5 diagrams x 3 variants each), all using the teal / sea-green palette.

All SVGs share the same brand palette and styling derived from the v2.0.0
terminal banner system. Each emitted SVG is self-contained (inline <style>).

Mirrors claude-ads/branding/scripts/generate_diagrams.py with three deltas:
  1. Palette swapped from orange to teal/sea-green ("ops console")
  2. Content updated for claude-seo (25 sub-skills, 7 categories, 271 tests)
  3. Diagram 04 = 10-principle thinking framework (replaces scoring weights)

Usage:
    python3 generate_diagrams.py
    # outputs banner.svg to ../../assets/
    # outputs diagrams to ../../assets/diagrams/
"""

import math
from pathlib import Path
from textwrap import dedent

ROOT = Path(__file__).resolve().parent.parent.parent
ASSETS = ROOT / "assets"
DIAG_DIR = ASSETS / "diagrams"
ASSETS.mkdir(parents=True, exist_ok=True)
DIAG_DIR.mkdir(parents=True, exist_ok=True)


# ============================================================================
# TEAL / SEA-GREEN PALETTE  (claude-seo "ops console")
# ============================================================================
ACCENT         = "#4F7B6E"
ACCENT_BRIGHT  = "#8BC0A8"
ACCENT_MID     = "#6FA38F"
ACCENT_DEEP    = "#2B4A41"
ACCENT_DARKER  = "#1B302A"
ACCENT_LIGHT   = "#A4D4BD"
ACCENT_FAINT   = "#3A615A"


# ============================================================================
# SHARED STYLE — minimalist, flat bg, no neon shadows
# ============================================================================
STYLE = dedent(f"""
<defs>
  <style type="text/css"><![CDATA[
    @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@500;600;700&family=Inter:wght@400;500;600&display=swap');
    .bg            {{ fill: #16130F; }}
    .bg-soft       {{ fill: #1A1612; }}
    .box           {{ fill: #1E1B16; stroke: #3A332C; stroke-width: 1; }}
    .box-focal     {{ fill: #232019; stroke: {ACCENT}; stroke-width: 1.4; }}
    .box-future    {{ fill: #1A1612; stroke: #2F2A24; stroke-width: 1; stroke-dasharray: 4 3; }}
    .box-soft      {{ fill: #1C1915; stroke: #2F2A24; stroke-width: 1; }}
    .label-h       {{ font-family: 'JetBrains Mono', monospace; fill: #F0EDE5; font-size: 16px; font-weight: 700; letter-spacing: 0.3px; }}
    .label         {{ font-family: 'JetBrains Mono', monospace; fill: #F0EDE5; font-size: 14px; font-weight: 600; }}
    .label-sub     {{ font-family: 'JetBrains Mono', monospace; fill: #8FA89E; font-size: 11px; letter-spacing: 1.4px; text-transform: uppercase; }}
    .label-tiny    {{ font-family: 'JetBrains Mono', monospace; fill: #6A8077; font-size: 10px; letter-spacing: 1px; text-transform: uppercase; }}
    .label-radial  {{ font-family: 'JetBrains Mono', monospace; fill: #D8E5DE; font-size: 13px; font-weight: 600; letter-spacing: 0.6px; }}
    .label-accent  {{ font-family: 'JetBrains Mono', monospace; fill: {ACCENT_BRIGHT}; font-size: 12px; font-weight: 600; letter-spacing: 1px; text-transform: uppercase; }}
    .label-inter   {{ font-family: 'Inter', system-ui, sans-serif; fill: #F0EDE5; font-size: 14px; font-weight: 500; }}
    .conn          {{ stroke: #6A8077; stroke-width: 1; fill: none; }}
    .conn-soft     {{ stroke: #3A615A; stroke-width: 1; fill: none; }}
    .conn-dashed   {{ stroke: #3A615A; stroke-width: 1; fill: none; stroke-dasharray: 4 3; }}
    .accent-fill   {{ fill: {ACCENT}; }}
    .accent-bright {{ fill: {ACCENT_BRIGHT}; }}
    .corner-mark   {{ font-family: 'JetBrains Mono', monospace; fill: #5F7770; font-size: 10px; letter-spacing: 1.4px; text-transform: uppercase; }}
  ]]></style>
  <marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
    <path d="M 0 0 L 10 5 L 0 10 z" fill="#6A8077"/>
  </marker>
  <marker id="arrow-soft" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="4" markerHeight="4" orient="auto-start-reverse">
    <path d="M 0 0 L 10 5 L 0 10 z" fill="#3A615A"/>
  </marker>
</defs>
""").strip()


# ============================================================================
# OS WINDOW CHROME (matches claude-ads visual identity)
# ============================================================================
TITLE_H = 48
WIN_RADIUS = 10
WIN_BORDER = "#a89968"
WIN_BAR_BG = "#f5f1e8"
WIN_BAR_FG = "#3D3933"
TL_YELLOW = "#fbbf24"
TL_GREEN  = "#10b981"
TL_RED    = "#ef4444"
TL_RADIUS = 9
TL_SPACING = 28


def window_chrome(w, title):
    """OS window title bar rendered at y=0..TITLE_H."""
    cy = TITLE_H / 2
    tl_x_close = w - 28
    tl_x_max   = tl_x_close - TL_SPACING
    tl_x_min   = tl_x_max - TL_SPACING
    return f'''
  <!-- OS window title bar -->
  <path d="M 0 {WIN_RADIUS} Q 0 0 {WIN_RADIUS} 0 L {w-WIN_RADIUS} 0 Q {w} 0 {w} {WIN_RADIUS} L {w} {TITLE_H} L 0 {TITLE_H} Z" fill="{WIN_BAR_BG}"/>
  <line x1="0" y1="{TITLE_H}" x2="{w}" y2="{TITLE_H}" stroke="{WIN_BORDER}" stroke-width="1"/>
  <text x="20" y="{cy + 5}" font-family="JetBrains Mono, monospace" font-size="15" fill="{WIN_BAR_FG}" font-weight="600">{title}</text>
  <!-- Traffic lights (right-aligned) -->
  <circle cx="{tl_x_min}"   cy="{cy}" r="{TL_RADIUS}" fill="{TL_YELLOW}" stroke="{WIN_BORDER}" stroke-width="0.7"/>
  <circle cx="{tl_x_max}"   cy="{cy}" r="{TL_RADIUS}" fill="{TL_GREEN}"  stroke="{WIN_BORDER}" stroke-width="0.7"/>
  <circle cx="{tl_x_close}" cy="{cy}" r="{TL_RADIUS}" fill="{TL_RED}"    stroke="{WIN_BORDER}" stroke-width="0.7"/>
'''


def svg(viewbox_w, viewbox_h, body, corner="claude-seo · v2.0.0", win_title=None):
    """Emit an SVG with OS-window chrome wrapping the diagram content."""
    if win_title is None:
        win_title = f"claude-seo.app — {corner}"
    total_h = viewbox_h + TITLE_H
    chrome = window_chrome(viewbox_w, win_title)
    inner_corner = (
        f'<text x="{viewbox_w-20}" y="{viewbox_h-12}" class="corner-mark" text-anchor="end">{corner}</text>'
    )
    return dedent(f"""<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {viewbox_w} {total_h}"
     preserveAspectRatio="xMidYMid meet" width="100%" font-family="JetBrains Mono, monospace">
{STYLE}
<!-- Window outer border + bg -->
<rect x="0.5" y="0.5" width="{viewbox_w-1}" height="{total_h-1}" rx="{WIN_RADIUS}" fill="#FFFFFF" stroke="{WIN_BORDER}" stroke-width="1"/>
{chrome}
<!-- Content area: dark canvas, shifted down by TITLE_H -->
<g transform="translate(0, {TITLE_H})">
  <rect class="bg" width="{viewbox_w}" height="{viewbox_h}"/>
  {body}
  {inner_corner}
</g>
</svg>
""")


# ============================================================================
# GEOMETRY HELPERS
# ============================================================================
def box(x, y, w, h, klass="box", rx=4, animate=False):
    anim = ""
    if animate:
        anim = '<animate attributeName="opacity" values="0.85;1;0.85" dur="4.2s" repeatCount="indefinite"/>'
    return f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="{rx}" class="{klass}">{anim}</rect>'


def text(x, y, content, klass="label", anchor="middle"):
    return f'<text x="{x}" y="{y}" class="{klass}" text-anchor="{anchor}">{content}</text>'


def label_box(cx, cy, w, h, lines, klass="box", focal=False):
    """A box with centered multi-line label inside. Focal boxes pulse subtly."""
    if focal:
        klass = "box-focal"
    x = cx - w / 2
    y = cy - h / 2
    line_h = 20
    total_h = (len(lines) - 1) * line_h
    start_y = cy - total_h / 2 + 5
    out = [box(x, y, w, h, klass, animate=focal)]
    for i, ln in enumerate(lines):
        cls = "label-accent" if (i == 0 and len(lines) > 1) else "label"
        out.append(text(cx, start_y + i * line_h, ln, cls))
    return "\n".join(out)


def conn(x1, y1, x2, y2, klass="conn", arrow="arrow", curve=False):
    if curve:
        midy = (y1 + y2) / 2
        d = f"M {x1} {y1} C {x1} {midy}, {x2} {midy}, {x2} {y2}"
    else:
        d = f"M {x1} {y1} L {x2} {y2}"
    return f'<path d="{d}" class="{klass}" marker-end="url(#{arrow})"/>'


def line_only(x1, y1, x2, y2, klass="conn-soft"):
    return f'<path d="M {x1} {y1} L {x2} {y2}" class="{klass}"/>'


# ============================================================================
# ICONS — Google brand + custom SEO category glyphs
# ============================================================================
GOOGLE_PATH = (
    'M3.9998 22.9291C1.7908 22.9291 0 21.1383 0 18.9293s1.7908-3.9998 3.9998-3.9998 '
    '3.9998 1.7908 3.9998 3.9998-1.7908 3.9998-3.9998 3.9998zm19.4643-6.0004L15.4632 '
    '3.072C14.3586 1.1587 11.9121.5028 9.9988 1.6074S7.4295 5.1585 8.5341 7.0718l8.0009 '
    '13.8567c1.1046 1.9133 3.5511 2.5679 5.4644 1.4646 1.9134-1.1046 2.568-3.5511 '
    '1.4647-5.4644zM7.5137 4.8438L1.5645 15.1484A4.5 4.5 0 0 1 4 14.4297c2.5597-.0075 '
    '4.6248 2.1585 4.4941 4.7148l3.2168-5.5723-3.6094-6.25c-.4499-.7793-.6322-1.6394-.5878-2.4784z'
)

def icon(key, x, y, size=18, color="#8FA89E"):
    """Inline category icon at (x,y) — top-left anchored, 24-grid native."""
    scale = size / 24
    g_open = f'<g transform="translate({x},{y}) scale({scale})"'

    if key == "google":
        return f'{g_open} fill="{color}"><path d="{GOOGLE_PATH}"/></g>'
    if key == "search":  # magnifying glass — AI search / GEO
        return (f'{g_open} fill="none" stroke="{color}" stroke-width="2.2" stroke-linecap="round">'
                f'<circle cx="10.5" cy="10.5" r="6.5"/><path d="M15.5 15.5 L20 20"/></g>')
    if key == "schema":  # nested squares — schema / structured data
        return (f'{g_open} fill="none" stroke="{color}" stroke-width="2" stroke-linejoin="round">'
                f'<rect x="2" y="2" width="20" height="20" rx="2"/>'
                f'<rect x="7" y="7" width="10" height="10" rx="1"/></g>')
    if key == "globe":  # globe — international / hreflang
        return (f'{g_open} fill="none" stroke="{color}" stroke-width="2" stroke-linecap="round">'
                f'<circle cx="12" cy="12" r="9"/><path d="M3 12 L21 12"/>'
                f'<path d="M12 3 C 8 8, 8 16, 12 21"/><path d="M12 3 C 16 8, 16 16, 12 21"/></g>')
    if key == "cart":  # cart — e-commerce
        return (f'{g_open} fill="none" stroke="{color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">'
                f'<path d="M2 4 L5 4 L7 16 L19 16 L21 8 L7 8"/>'
                f'<circle cx="9" cy="20" r="1.5" fill="{color}"/>'
                f'<circle cx="17" cy="20" r="1.5" fill="{color}"/></g>')
    if key == "pin":  # map pin — local / maps
        return (f'{g_open} fill="{color}"><path d="M12 2 C 7.5 2, 4 5.5, 4 10 C 4 16, 12 22, 12 22 '
                f'S 20 16, 20 10 C 20 5.5, 16.5 2, 12 2 Z M 12 12.5 A 2.5 2.5 0 1 1 12 7.5 A 2.5 2.5 0 0 1 12 12.5 Z"/></g>')
    if key == "image":  # image / camera — images
        return (f'{g_open} fill="none" stroke="{color}" stroke-width="2" stroke-linejoin="round">'
                f'<rect x="3" y="5" width="18" height="14" rx="2"/>'
                f'<circle cx="9" cy="10.5" r="2"/>'
                f'<path d="M3 17 L9 12 L13 16 L17 12 L21 16"/></g>')
    if key == "spark":  # AI sparkle — GEO / AI search
        return (f'{g_open} fill="{color}"><path d="M12 2 L13.5 9 L21 10.5 L13.5 12 L12 19.5 L10.5 12 L3 10.5 L10.5 9 Z"/>'
                f'<path d="M19 3 L19.7 5 L21.5 5.5 L19.7 6 L19 8 L18.3 6 L16.5 5.5 L18.3 5 Z"/></g>')
    if key == "graph":  # bar chart — backlinks / data
        return (f'{g_open} fill="none" stroke="{color}" stroke-width="2" stroke-linecap="round">'
                f'<path d="M4 20 L4 4"/><path d="M4 20 L20 20"/>'
                f'<rect x="7" y="13" width="3" height="7" fill="{color}" stroke="none"/>'
                f'<rect x="12" y="9" width="3" height="11" fill="{color}" stroke="none"/>'
                f'<rect x="17" y="5" width="3" height="15" fill="{color}" stroke="none"/></g>')
    if key == "wand":  # magic wand — image-gen
        return (f'{g_open} fill="none" stroke="{color}" stroke-width="2" stroke-linecap="round">'
                f'<path d="M5 19 L19 5"/><path d="M16 2 L16 6"/><path d="M14 4 L18 4"/>'
                f'<path d="M20 8 L20 11"/><path d="M19 9.5 L21 9.5"/></g>')
    if key == "doc":  # document — content / brief
        return (f'{g_open} fill="none" stroke="{color}" stroke-width="2" stroke-linejoin="round">'
                f'<path d="M6 3 L15 3 L19 7 L19 21 L6 21 Z"/>'
                f'<path d="M15 3 L15 7 L19 7"/><path d="M9 12 L16 12"/><path d="M9 16 L14 16"/></g>')
    if key == "branch":  # tree / cluster
        return (f'{g_open} fill="none" stroke="{color}" stroke-width="2" stroke-linecap="round">'
                f'<circle cx="6" cy="6" r="2.5"/><circle cx="18" cy="6" r="2.5"/><circle cx="12" cy="18" r="2.5"/>'
                f'<path d="M6 8.5 L 6 12 L 12 12 L 12 15.5"/><path d="M18 8.5 L 18 12 L 12 12"/></g>')
    if key == "gauge":  # speedometer — performance / drift
        return (f'{g_open} fill="none" stroke="{color}" stroke-width="2" stroke-linecap="round">'
                f'<path d="M3 16 A 9 9 0 0 1 21 16"/><path d="M12 16 L 17 8"/>'
                f'<circle cx="12" cy="16" r="1.5" fill="{color}"/></g>')
    if key == "shield":  # technical / security
        return (f'{g_open} fill="none" stroke="{color}" stroke-width="2" stroke-linejoin="round">'
                f'<path d="M12 2 L20 5 L20 11 C 20 16, 16 20, 12 22 C 8 20, 4 16, 4 11 L 4 5 Z"/>'
                f'<path d="M8 12 L11 15 L16 9"/></g>')
    if key == "data":  # database cylinder
        return (f'{g_open} fill="none" stroke="{color}" stroke-width="2">'
                f'<ellipse cx="12" cy="5" rx="8" ry="3"/>'
                f'<path d="M4 5 L 4 19 C 4 20.7, 7.6 22, 12 22 C 16.4 22, 20 20.7, 20 19 L 20 5"/>'
                f'<path d="M4 12 C 4 13.7, 7.6 15, 12 15 C 16.4 15, 20 13.7, 20 12"/></g>')
    if key == "sitemap":  # tree / hierarchy
        return (f'{g_open} fill="none" stroke="{color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">'
                f'<rect x="9" y="2" width="6" height="4"/><rect x="2" y="18" width="6" height="4"/>'
                f'<rect x="9" y="18" width="6" height="4"/><rect x="16" y="18" width="6" height="4"/>'
                f'<path d="M12 6 L 12 14 M 5 14 L 5 18 M 12 14 L 19 14 L 19 18 M 5 14 L 12 14 M 12 14 L 12 18"/></g>')
    if key == "pulse":  # heartbeat — drift / SXO
        return (f'{g_open} fill="none" stroke="{color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">'
                f'<path d="M2 12 L7 12 L9 6 L12 18 L15 9 L17 12 L22 12"/></g>')
    return ""


# Sub-skill → icon mapping
SUBSKILL_ICON = {
    # Audit
    "seo-audit":            "shield",
    "seo-page":             "doc",
    "seo-flow":             "branch",
    # Content
    "seo-content":          "doc",
    "seo-content-brief":    "doc",
    "seo-cluster":          "branch",
    # Schema / Structure
    "seo-schema":           "schema",
    "seo-sitemap":          "sitemap",
    "seo-images":           "image",
    # Technical / Performance
    "seo-technical":        "shield",
    "seo-google":           "google",
    "seo-backlinks":        "graph",
    # AI Search
    "seo-geo":              "spark",
    "seo-sxo":              "pulse",
    "seo-drift":            "gauge",
    # Local
    "seo-local":            "pin",
    "seo-maps":             "pin",
    # Commerce + Intl
    "seo-ecommerce":        "cart",
    "seo-hreflang":         "globe",
    "seo-plan":             "doc",
    "seo-programmatic":     "data",
    "seo-competitor-pages": "search",
    # Extensions
    "seo-dataforseo":       "data",
    "seo-image-gen":        "wand",
}


# ============================================================================
# BANNER  (1680 x 720 OS-window-wrapped terminal)
# ============================================================================
BANNER_SVG = f"""<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"
     viewBox="0 0 1680 768" width="100%"
     preserveAspectRatio="xMidYMid meet" role="img"
     aria-label="Claude SEO — AI Search SEO Console"
     font-family="JetBrains Mono, monospace">
<title>Claude SEO — AI Search SEO Console for Claude Code</title>
<desc>OS-window-style banner. Cream title bar with traffic lights, dark CRT terminal inside with CLAUDE SEO figlet logo + command palette. Animated breathing gradient on the logo and blinking cursor on /seo geo.</desc>

<defs>
  <style type="text/css"><![CDATA[
    @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@500;600;700&family=Inter:wght@400;500;600&display=swap');

    .ascii      {{ font-family: 'JetBrains Mono', 'Cascadia Mono', 'Menlo', monospace; font-size: 22px; font-weight: 700; fill: url(#tealGrad); }}
    .tagline    {{ font-family: 'Inter', system-ui, sans-serif; font-size: 28px; font-weight: 500; fill: #F0EDE5; letter-spacing: -0.3px; }}
    .sysline    {{ font-family: 'JetBrains Mono', monospace; font-size: 11px; fill: {ACCENT_DEEP}; letter-spacing: 1.8px; }}
    .sysline-accent {{ fill: {ACCENT}; }}
    .hud        {{ font-family: 'JetBrains Mono', monospace; font-size: 10px; fill: {ACCENT_DEEP}; letter-spacing: 1.6px; }}
    .hud-muted  {{ font-family: 'JetBrains Mono', monospace; font-size: 10px; fill: #5A5750; letter-spacing: 1.6px; }}
    .cmd        {{ font-family: 'JetBrains Mono', monospace; font-size: 30px; fill: #5A5750; letter-spacing: 0.5px; }}
    .cmd-active {{ fill: #F0EDE5; }}
    .cmd-slash  {{ fill: {ACCENT_DEEP}; }}
    .cmd-arg    {{ fill: {ACCENT_DEEP}; opacity: 0.7; }}
    .cmd-head   {{ font-family: 'JetBrains Mono', monospace; font-size: 11px; fill: {ACCENT}; letter-spacing: 2px; opacity: 0.65; }}
    .cmd-head-b {{ fill: {ACCENT_DEEP}; }}
    .accent-line{{ fill: {ACCENT}; }}
    .live-dot   {{ fill: {ACCENT}; }}
    .win-title  {{ font-family: 'JetBrains Mono', monospace; font-size: 15px; fill: #3D3933; font-weight: 600; }}
  ]]></style>

  <!-- Vertical teal gradient (animated below) -->
  <linearGradient id="tealGrad" x1="0" y1="-0.3" x2="0" y2="1.3" gradientUnits="objectBoundingBox">
    <stop offset="0%"   stop-color="{ACCENT_LIGHT}"/>
    <stop offset="25%"  stop-color="{ACCENT_BRIGHT}"/>
    <stop offset="50%"  stop-color="{ACCENT_MID}"/>
    <stop offset="75%"  stop-color="{ACCENT}"/>
    <stop offset="100%" stop-color="{ACCENT_DEEP}"/>

    <!-- BREATHING GRADIENT -->
    <animate attributeName="y1" values="-0.3;0.3;-0.3" dur="4.2s" repeatCount="indefinite"/>
    <animate attributeName="y2" values="0.7;1.3;0.7"   dur="4.2s" repeatCount="indefinite"/>
  </linearGradient>

  <pattern id="scanlines" x="0" y="0" width="3" height="3" patternUnits="userSpaceOnUse">
    <rect width="3" height="2" fill="transparent"/>
    <rect x="0" y="2" width="3" height="1" fill="rgba(0,0,0,0.18)"/>
  </pattern>
</defs>

<!-- ═══════════ OS WINDOW SHELL ═══════════ -->
<rect x="0.5" y="0.5" width="1679" height="767" rx="10" fill="#FFFFFF" stroke="#a89968" stroke-width="1"/>
<path d="M 0 10 Q 0 0 10 0 L 1670 0 Q 1680 0 1680 10 L 1680 48 L 0 48 Z" fill="#f5f1e8"/>
<line x1="0" y1="48" x2="1680" y2="48" stroke="#a89968" stroke-width="1"/>
<text x="20" y="29" class="win-title">claude-seo.app — Terminal · /seo audit</text>
<circle cx="1596" cy="24" r="9" fill="#fbbf24" stroke="#a89968" stroke-width="0.7"/>
<circle cx="1624" cy="24" r="9" fill="#10b981" stroke="#a89968" stroke-width="0.7"/>
<circle cx="1652" cy="24" r="9" fill="#ef4444" stroke="#a89968" stroke-width="0.7"/>

<!-- ═══════════ TERMINAL CONTENT (dark canvas) ═══════════ -->
<g transform="translate(0, 48)">
  <rect width="1680" height="720" fill="#16130F"/>
  <rect width="1680" height="720" fill="url(#scanlines)" opacity="0.45"/>

  <!-- Inner terminal HUD bar (top) -->
  <rect x="0" y="0" width="1680" height="26" fill="#0A0807"/>
  <line x1="0" y1="26" x2="1680" y2="26" stroke="rgba(79,123,110,0.22)" stroke-width="1"/>
  <circle cx="26" cy="13" r="3" class="live-dot">
    <animate attributeName="opacity" values="0.4;1;0.4" dur="1.6s" repeatCount="indefinite"/>
  </circle>
  <text x="38"   y="17" class="hud">SYS · CLAUDE-SEO</text>
  <text x="220"  y="17" class="hud">NODE 0x2F · ACTIVE</text>
  <text x="1660" y="17" class="hud-muted" text-anchor="end">UPTIME 04:12:08</text>

  <!-- Inner terminal status bar (bottom) -->
  <rect x="0" y="694" width="1680" height="26" fill="#0A0807"/>
  <line x1="0" y1="694" x2="1680" y2="694" stroke="rgba(79,123,110,0.22)" stroke-width="1"/>
  <text x="20"   y="711" class="hud">● LINK · STABLE</text>
  <text x="180"  y="711" class="hud">BUF 1024K</text>
  <text x="290"  y="711" class="hud">V2.0.0</text>
  <text x="1450" y="711" class="hud-muted" text-anchor="end">208.140.MAINFRAME.AGRICIDANIEL</text>
  <text x="1660" y="711" class="hud-muted" text-anchor="end">12:08:20 UTC</text>

  <!-- ASCII logo — CLAUDE -->
  <text x="120" y="155" class="ascii" xml:space="preserve">
    <tspan x="120" dy="0">  ██████╗██╗      █████╗ ██╗   ██╗██████╗ ███████╗</tspan>
    <tspan x="120" dy="26">██╔════╝██║     ██╔══██╗██║   ██║██╔══██╗██╔════╝</tspan>
    <tspan x="120" dy="26">██║     ██║     ███████║██║   ██║██║  ██║█████╗  </tspan>
    <tspan x="120" dy="26">██║     ██║     ██╔══██║██║   ██║██║  ██║██╔══╝  </tspan>
    <tspan x="120" dy="26">╚██████╗███████╗██║  ██║╚██████╔╝██████╔╝███████╗</tspan>
    <tspan x="120" dy="26"> ╚═════╝╚══════╝╚═╝  ╚═╝ ╚═════╝ ╚═════╝ ╚══════╝</tspan>
  </text>

  <!-- ASCII logo — SEO -->
  <text x="120" y="335" class="ascii" xml:space="preserve">
    <tspan x="120" dy="0">███████╗███████╗ ██████╗</tspan>
    <tspan x="120" dy="26">██╔════╝██╔════╝██╔═══██╗</tspan>
    <tspan x="120" dy="26">███████╗█████╗  ██║   ██║</tspan>
    <tspan x="120" dy="26">╚════██║██╔══╝  ██║   ██║</tspan>
    <tspan x="120" dy="26">███████║███████╗╚██████╔╝</tspan>
    <tspan x="120" dy="26">╚══════╝╚══════╝ ╚═════╝</tspan>
  </text>

  <!-- Divider -->
  <rect x="120" y="500" width="540" height="3" rx="2" class="accent-line">
    <animate attributeName="opacity" values="0.7;1;0.7" dur="4.2s" repeatCount="indefinite"/>
  </rect>

  <!-- Tagline -->
  <text x="120" y="545" class="tagline">AI Search SEO Console</text>
  <text x="120" y="580" class="sysline">
    <tspan class="sysline-accent">›</tspan> RUNTIME READY · 25 SUB-SKILLS · 271 TESTS · 8 MCP SERVERS
  </text>

  <!-- Command palette -->
  <g transform="translate(1660, 100)">
    <text class="cmd-head" text-anchor="end" y="0">
      <tspan class="cmd-head-b">┌─ </tspan>COMMAND PALETTE<tspan class="cmd-head-b"> ─┐</tspan>
    </text>
    <text class="cmd" text-anchor="end" y="55"><tspan class="cmd-slash">/</tspan>seo audit</text>
    <text class="cmd" text-anchor="end" y="105"><tspan class="cmd-slash">/</tspan>seo schema</text>
    <text class="cmd cmd-active" text-anchor="end" y="155"><tspan class="cmd-slash">/</tspan>seo geo</text>
    <!-- Blinking cursor block on /seo geo -->
    <rect x="-3" y="135" width="18" height="26" fill="#F0EDE5">
      <animate attributeName="opacity" values="1;1;0;0;1" keyTimes="0;0.5;0.5;1;1" dur="1s" repeatCount="indefinite"/>
    </rect>
    <text class="cmd" text-anchor="end" y="205"><tspan class="cmd-slash">/</tspan>seo sitemap</text>
    <text class="cmd" text-anchor="end" y="255"><tspan class="cmd-slash">/</tspan>seo plan <tspan class="cmd-arg">&lt;type&gt;</tspan></text>
    <text class="cmd" text-anchor="end" y="305"><tspan class="cmd-slash">/</tspan>seo hreflang</text>
    <text class="cmd" text-anchor="end" y="355"><tspan class="cmd-slash">/</tspan>seo competitor-pages</text>
  </g>
</g>

</svg>
"""


# ============================================================================
# DIAGRAM 1 — SYSTEM ARCHITECTURE
# ============================================================================
def diag_01_a():
    """A: Top-down hierarchical flow."""
    body = []
    W, H = 1200, 950
    cx = W / 2

    body.append(label_box(cx, 100, 360, 80, ["entry", "/seo audit"], focal=True))
    body.append(label_box(cx, 240, 360, 80, ["orchestrator", "seo/SKILL.md"]))
    body.append(label_box(280, 430, 280, 130, ["sub-skills", "25 modules", "7 categories"]))
    body.append(label_box(cx,  430, 280, 130, ["audit agents", "up to 15 parallel", "technical · content · schema", "performance · geo · local"]))
    body.append(label_box(920, 430, 280, 130, ["extensions", "8 MCP servers", "dataforseo · firecrawl", "ahrefs · banana"]))
    body.append(label_box(cx, 660, 480, 100, ["thinking framework", "perceive · analyze · validate · act"]))
    body.append(label_box(cx, 830, 480, 100, ["audit report", "score 0-100 · action plan · pdf"]))

    body.append(conn(cx, 140, cx, 200))
    body.append(line_only(cx, 280, cx, 350))
    body.append(line_only(cx, 350, 280, 365))
    body.append(line_only(cx, 350, cx,  365))
    body.append(line_only(cx, 350, 920, 365))
    body.append(line_only(280, 495, 280, 590))
    body.append(line_only(cx,  495, cx,  590))
    body.append(line_only(920, 495, 920, 590))
    body.append(line_only(280, 590, 920, 590))
    body.append(conn(cx, 590, cx, 610))
    body.append(conn(cx, 710, cx, 780))

    return svg(W, H, "\n".join(body), corner="01 · system architecture · A")


def diag_01_b():
    """B: Left-to-right horizontal pipeline."""
    body = []
    W, H = 1600, 700
    cy = H / 2

    x_entry, x_orch, x_branch, x_join, x_score, x_report = 150, 430, 800, 1080, 1200, 1430

    body.append(label_box(x_entry,  cy,  220, 100, ["entry", "/seo audit"], focal=True))
    body.append(label_box(x_orch,   cy,  220, 100, ["orchestrator", "seo/SKILL.md"]))
    body.append(label_box(x_branch, 200, 240, 90,  ["sub-skills", "25 modules"]))
    body.append(label_box(x_branch, cy,  240, 90,  ["audit agents", "up to 15 parallel"]))
    body.append(label_box(x_branch, 500, 240, 90,  ["MCP extensions", "8 servers"]))
    body.append(label_box(x_score,  cy,  220, 100, ["synthesis", "271 tests · framework"]))
    body.append(label_box(x_report, cy,  220, 100, ["report", "score · plan"]))

    body.append(conn(x_entry + 110, cy, x_orch - 110, cy))
    body.append(line_only(x_orch + 110, cy, x_orch + 165, cy))
    body.append(line_only(x_orch + 165, 200, x_orch + 165, 500))
    body.append(conn(x_orch + 165, 200, x_branch - 120, 200))
    body.append(conn(x_orch + 165, cy,  x_branch - 120, cy))
    body.append(conn(x_orch + 165, 500, x_branch - 120, 500))
    body.append(line_only(x_branch + 120, 200, x_join - 60, 200))
    body.append(line_only(x_branch + 120, cy,  x_join - 60, cy))
    body.append(line_only(x_branch + 120, 500, x_join - 60, 500))
    body.append(line_only(x_join - 60, 200, x_join - 60, 500))
    body.append(conn(x_join - 60, cy, x_score - 110, cy))
    body.append(conn(x_score + 110, cy, x_report - 110, cy))

    return svg(W, H, "\n".join(body), corner="01 · system architecture · B")


def diag_01_c():
    """C: Radial hub-and-spoke."""
    body = []
    W, H = 1200, 1000
    cx, cy = W / 2, H / 2

    body.append(label_box(cx, cy, 280, 100, ["orchestrator", "seo/SKILL.md"], focal=True))

    angles = [-90, -30, 30, 90, 150, 210]
    labels = [
        (["audit report", "score · plan"], False),
        (["sub-skills", "25 modules"], False),
        (["audit agents", "15 parallel"], False),
        (["thinking framework", "perceive → act"], False),
        (["MCP extensions", "8 servers"], False),
        (["entry", "/seo audit"], True),
    ]
    R = 340
    body_top = []
    for ang_deg, (lns, focal) in zip(angles, labels):
        ang = math.radians(ang_deg)
        nx = cx + R * math.cos(ang)
        ny = cy + R * math.sin(ang)
        body_top.append(label_box(nx, ny, 240, 80, lns, focal=focal))
        e_x = cx + (140 * math.cos(ang))
        e_y = cy + (50 * math.sin(ang))
        n_x = nx - (120 * math.cos(ang))
        n_y = ny - (40 * math.sin(ang))
        body_top.insert(0, f'<path d="M {e_x} {e_y} L {n_x} {n_y}" class="conn-soft"/>')

    body.extend(body_top)
    return svg(W, H, "\n".join(body), corner="01 · system architecture · C")


# ============================================================================
# DIAGRAM 2 — AUDIT PIPELINE
# ============================================================================
def diag_02_a():
    """A: Linear horizontal flow."""
    body = []
    W, H = 1600, 480
    cy = H / 2
    stages = [
        ("input", "/seo audit", True),
        ("detect", "industry\n+ tech stack", False),
        ("dispatch", "15 agents\nin parallel", False),
        ("synthesize", "scores\n+ framework", False),
        ("report", "score · plan\n· pdf", False),
    ]
    box_w, box_h = 220, 130
    gap = (W - 5 * box_w) / 6
    for i, (eyebrow, body_text, focal) in enumerate(stages):
        x = gap + i * (box_w + gap) + box_w / 2
        lines = [eyebrow] + body_text.split("\n")
        body.append(label_box(x, cy, box_w, box_h, lines, focal=focal))
        if i < len(stages) - 1:
            x_next = gap + (i + 1) * (box_w + gap) + box_w / 2
            body.append(conn(x + box_w / 2 + 4, cy, x_next - box_w / 2 - 4, cy))

    return svg(W, H, "\n".join(body), corner="02 · audit pipeline · A")


def diag_02_b():
    """B: Swimlanes (parallel tracks)."""
    body = []
    W, H = 1600, 720
    body.append(label_box(150, 100, 220, 80, ["input", "/seo audit"], focal=True))

    lanes = [
        ("technical lane", 220, ["technical", "google", "backlinks", "schema", "sitemap", "images"]),
        ("content lane",   400, ["content", "brief", "cluster", "geo", "sxo"]),
        ("commerce lane",  580, ["ecommerce", "hreflang", "local", "maps", "drift"]),
    ]
    for label, y, items in lanes:
        body.append(text(80, y + 30, label, "label-sub", anchor="start"))
        items_per_row = 6
        item_w, item_h, igap = 140, 50, 20
        for i, it in enumerate(items):
            row = i // items_per_row
            col = i % items_per_row
            x = 320 + col * (item_w + igap)
            ypos = y + row * (item_h + 10)
            body.append(label_box(x + item_w/2, ypos + item_h/2, item_w, item_h, [it]))

    body.append(label_box(W - 180, H / 2, 280, 100, ["synthesis · report", "score + plan + framework"], focal=False))
    body.append(line_only(280, 100, 280, H / 2))
    body.append(conn(280, H / 2, W - 320, H / 2))

    return svg(W, H, "\n".join(body), corner="02 · audit pipeline · B")


def diag_02_c():
    """C: Vertical compact with side annotations."""
    body = []
    W, H = 900, 1100
    cx = W / 2
    stages = [
        ("input · /seo audit",   "from prompt",                    True),
        ("detect industry",      "saas · ecom · local · publisher", False),
        ("dispatch agents",      "15 parallel · context fork",      False),
        ("run sub-skills",       "25 modules · 271 tests",          False),
        ("apply framework",      "perceive · analyze · validate · act", False),
        ("emit report",          "md + pdf + action plan",          False),
    ]
    for i, (label, annot, focal) in enumerate(stages):
        y = 100 + i * 160
        body.append(label_box(cx, y, 480, 90, [label]))
        body.append(text(cx + 280, y - 5, annot, "label-tiny", anchor="start"))
        body.append(text(cx + 280, y + 15, f"step {i+1:02d}", "label-accent", anchor="start"))
        if i < len(stages) - 1:
            body.append(conn(cx, y + 45, cx, y + 115))

    return svg(W, H, "\n".join(body), corner="02 · audit pipeline · C")


# ============================================================================
# DIAGRAM 3 — SUB-SKILL ECOSYSTEM (25 modules · 7 categories)
# ============================================================================
SUB_SKILLS = {
    "audit":          ["seo-audit", "seo-page", "seo-flow"],
    "content":        ["seo-content", "seo-content-brief", "seo-cluster"],
    "schema":         ["seo-schema", "seo-sitemap", "seo-images"],
    "technical":      ["seo-technical", "seo-google", "seo-backlinks"],
    "ai search":      ["seo-geo", "seo-sxo", "seo-drift"],
    "local + maps":   ["seo-local", "seo-maps"],
    "commerce + intl":["seo-ecommerce", "seo-hreflang", "seo-plan", "seo-programmatic", "seo-competitor-pages"],
    "extensions":     ["seo-dataforseo", "seo-image-gen"],
}


def diag_03_a():
    """A: Grid grouped by category with icons."""
    body = []
    W, H = 1500, 1100
    body.append(text(W/2, 60, "25 sub-skills · 7 + 1 categories", "label-sub"))

    cats = list(SUB_SKILLS.items())
    cols = 4
    col_w = (W - 100) / cols
    row_h_base = 160

    for idx, (title, items) in enumerate(cats):
        col = idx % cols
        row = idx // cols
        gx = 50 + col * col_w
        gy = 130 + row * (row_h_base + 60 + max(0, (len(items) - 3)) * 52)
        # group header
        body.append(text(gx + 20, gy + 28, title.upper(), "label-accent", anchor="start"))
        body.append(text(gx + col_w - 30, gy + 28, f"{len(items):02d}", "label-tiny", anchor="end"))
        body.append(box(gx + 10, gy + 45, col_w - 30, len(items) * 52 + 14, "box-soft", rx=6))
        # items
        for j, item in enumerate(items):
            yy = gy + 60 + j * 52
            ix = gx + 30
            iw = col_w - 70
            body.append(label_box(ix + iw/2, yy + 22, iw, 42, [item]))
            ik = SUBSKILL_ICON.get(item)
            if ik:
                body.append(icon(ik, ix + 12, yy + 13, size=18, color=ACCENT_LIGHT))

    return svg(W, H, "\n".join(body), corner="03 · sub-skill ecosystem · A")


def diag_03_b():
    """B: Two concentric rings — core (12) inner, specialized (13) outer."""
    body = []
    W, H = 1400, 1400
    cx, cy = W / 2, H / 2

    body.append(f'<circle cx="{cx}" cy="{cy}" r="220" fill="none" stroke="{ACCENT_FAINT}" stroke-width="1" stroke-dasharray="3 3" opacity="0.4"/>')
    body.append(f'<circle cx="{cx}" cy="{cy}" r="460" fill="none" stroke="{ACCENT_FAINT}" stroke-width="1" stroke-dasharray="3 3" opacity="0.3"/>')

    body.append(label_box(cx, cy, 260, 110, ["orchestrator", "seo/SKILL.md"], focal=True))

    # Inner ring: core foundation (audit + content + schema + technical) = 12
    inner = (SUB_SKILLS["audit"] + SUB_SKILLS["content"]
             + SUB_SKILLS["schema"] + SUB_SKILLS["technical"])
    n_inner = len(inner)
    R_inner = 340
    for i, name in enumerate(inner):
        ang = -math.pi / 2 + (i / n_inner) * 2 * math.pi
        x = cx + R_inner * math.cos(ang)
        y = cy + R_inner * math.sin(ang)
        body.append(label_box(x, y, 180, 44, [name]))
        ik = SUBSKILL_ICON.get(name)
        if ik:
            body.append(icon(ik, x - 80, y - 9, size=18, color=ACCENT_LIGHT))
        cx_edge = cx + 130 * math.cos(ang)
        cy_edge = cy + 55 * math.sin(ang)
        body.append(f'<path d="M {cx_edge} {cy_edge} L {x - 90 * math.cos(ang)} {y - 22 * math.sin(ang)}" class="conn-soft"/>')

    # Outer ring: specialized (AI search + local + commerce + extensions) = 12
    outer = (SUB_SKILLS["ai search"] + SUB_SKILLS["local + maps"]
             + SUB_SKILLS["commerce + intl"] + SUB_SKILLS["extensions"])
    n_outer = len(outer)
    R_outer = 580
    for i, name in enumerate(outer):
        ang = -math.pi / 2 + (i / n_outer) * 2 * math.pi
        x = cx + R_outer * math.cos(ang)
        y = cy + R_outer * math.sin(ang)
        body.append(label_box(x, y, 200, 44, [name]))
        ik = SUBSKILL_ICON.get(name)
        if ik:
            body.append(icon(ik, x - 90, y - 9, size=18, color=ACCENT_LIGHT))
        ix = cx + (R_inner + 25) * math.cos(ang)
        iy = cy + (R_inner + 25) * math.sin(ang)
        body.append(f'<path d="M {ix} {iy} L {x - 100 * math.cos(ang)} {y - 22 * math.sin(ang)}" class="conn-soft" opacity="0.5"/>')

    body.append(text(cx, cy - 220 - 18, "CORE FOUNDATION", "label-sub"))
    body.append(text(cx, cy - 460 - 18, "AI SEARCH · LOCAL · COMMERCE · EXT", "label-sub"))

    return svg(W, H, "\n".join(body), corner="03 · sub-skill ecosystem · B")


def diag_03_c():
    """C: Cluster cards — 8 grouped panels."""
    body = []
    W, H = 1500, 1100

    body.append(text(W/2, 60, "25 sub-skills · clustered by domain", "label-sub"))

    # Layout: 4 columns x 2 rows for 8 categories
    groups = [
        ("audit",            80,  120, 340, 280, SUB_SKILLS["audit"]),
        ("content",          440, 120, 340, 280, SUB_SKILLS["content"]),
        ("schema",           800, 120, 340, 280, SUB_SKILLS["schema"]),
        ("technical",       1160, 120, 320, 280, SUB_SKILLS["technical"]),
        ("ai search",        80,  430, 340, 280, SUB_SKILLS["ai search"]),
        ("local + maps",     440, 430, 340, 220, SUB_SKILLS["local + maps"]),
        ("commerce + intl",  800, 430, 340, 380, SUB_SKILLS["commerce + intl"]),
        ("extensions",      1160, 430, 320, 220, SUB_SKILLS["extensions"]),
    ]
    for title, gx, gy, gw, gh, items in groups:
        body.append(box(gx, gy, gw, gh, "box-soft", rx=8))
        body.append(text(gx + 18, gy + 28, title.upper(), "label-accent", anchor="start"))
        body.append(text(gx + gw - 18, gy + 28, f"{len(items):02d}", "label-tiny", anchor="end"))
        item_w = gw - 40
        item_h = 42
        for i, item in enumerate(items):
            ix = gx + 20
            iy = gy + 50 + i * (item_h + 10)
            body.append(label_box(ix + item_w/2, iy + item_h/2, item_w, item_h, [item]))
            ik = SUBSKILL_ICON.get(item)
            if ik:
                body.append(icon(ik, ix + 12, iy + item_h/2 - 9, size=18, color=ACCENT_LIGHT))

    return svg(W, H, "\n".join(body), corner="03 · sub-skill ecosystem · C")


# ============================================================================
# DIAGRAM 4 — 10-PRINCIPLE THINKING FRAMEWORK
# ============================================================================
# Stage → principles  (10 principles in 4 stages)
FRAMEWORK = [
    ("perceive", "gather signals",       ["observe-external", "observe-internal", "listen"]),
    ("analyze",  "make sense of them",   ["think", "connect-lateral", "connect-system"]),
    ("validate", "test the read",        ["feel", "accept"]),
    ("act",      "ship the response",    ["create", "grow"]),
]
STAGE_NOTES = {
    "perceive": "external · internal · linguistic signal capture",
    "analyze":  "first-principles + lateral + systemic reasoning",
    "validate": "gut-check + truth-acceptance before commit",
    "act":      "build the deliverable + leave it healthier",
}


def diag_04_a():
    """A: Horizontal flow — 4 stages left-to-right, principles stacked below each."""
    body = []
    W, H = 1700, 720
    body.append(text(W/2, 60, "10-principle thinking framework · perceive → act", "label-sub"))

    stage_w = (W - 200) / 4
    cy = 200
    for i, (stage, subtitle, principles) in enumerate(FRAMEWORK):
        cx = 100 + stage_w * i + stage_w / 2
        # stage header card
        focal = (i == 0)
        body.append(label_box(cx, cy, stage_w - 60, 110,
                              [f"phase {i+1:02d}", stage, subtitle], focal=focal))
        # arrow to next
        if i < 3:
            nx = 100 + stage_w * (i + 1) + stage_w / 2
            body.append(conn(cx + (stage_w - 60)/2 + 4, cy, nx - (stage_w - 60)/2 - 4, cy))
        # principle boxes stacked below
        for j, p in enumerate(principles):
            py = cy + 130 + j * 70
            body.append(label_box(cx, py, stage_w - 90, 56, [p]))
        # corner number per stage
        body.append(text(cx, cy + 130 + len(principles) * 70 + 10, f"{len(principles)} principle{'s' if len(principles) > 1 else ''}", "label-tiny"))

    return svg(W, H, "\n".join(body), corner="04 · thinking framework · A")


def diag_04_b():
    """B: Radial wheel — 4 quadrants (stages), 10 outer slices (principles)."""
    body = []
    W, H = 1200, 1200
    cx, cy = W / 2, H / 2

    # Outer guide rings
    body.append(f'<circle cx="{cx}" cy="{cy}" r="540" fill="none" stroke="{ACCENT_FAINT}" stroke-width="1" stroke-dasharray="3 3" opacity="0.35"/>')
    body.append(f'<circle cx="{cx}" cy="{cy}" r="330" fill="none" stroke="{ACCENT_FAINT}" stroke-width="1" stroke-dasharray="3 3" opacity="0.45"/>')

    # Core
    body.append(label_box(cx, cy, 280, 110, ["thinking framework", "10 principles · 4 phases"], focal=True))

    # Stage labels at quadrant midpoints (each stage occupies 90°)
    # Order: perceive (top), analyze (right), validate (bottom), act (left)
    quadrant_angles = [-90, 0, 90, 180]  # degrees, mid of each quadrant
    R_stage = 230
    for (stage, subtitle, principles), ang_deg in zip(FRAMEWORK, quadrant_angles):
        ang = math.radians(ang_deg)
        sx = cx + R_stage * math.cos(ang)
        sy = cy + R_stage * math.sin(ang)
        body.append(label_box(sx, sy, 200, 64, [stage, subtitle]))

    # Outer principle slices — each principle gets its own angular position
    # Build flat list with stage indices for color/grouping
    flat = []
    for stage_i, (_, _, principles) in enumerate(FRAMEWORK):
        for p in principles:
            flat.append((stage_i, p))
    n = len(flat)  # 10
    R_principle = 450
    for k, (stage_i, p) in enumerate(flat):
        ang_deg = -90 + (k / n) * 360 + (360 / n) / 2  # offset so first sits between top-right
        ang = math.radians(ang_deg)
        px = cx + R_principle * math.cos(ang)
        py = cy + R_principle * math.sin(ang)
        body.append(label_box(px, py, 200, 50, [p]))
        # Connector from stage to principle
        # (Use a soft line straight from origin direction)
        sx = cx + (R_stage + 35) * math.cos(ang)
        sy = cy + (R_stage + 35) * math.sin(ang)
        ex = px - 100 * math.cos(ang)
        ey = py - 25 * math.sin(ang)
        body.append(f'<path d="M {sx} {sy} L {ex} {ey}" class="conn-soft" opacity="0.6"/>')

    # Quadrant separator dashed lines
    for q_ang_deg in [-45, 45, 135, 225]:
        a = math.radians(q_ang_deg)
        x1 = cx + 170 * math.cos(a)
        y1 = cy + 170 * math.sin(a)
        x2 = cx + 540 * math.cos(a)
        y2 = cy + 540 * math.sin(a)
        body.append(f'<path d="M {x1} {y1} L {x2} {y2}" class="conn-dashed" opacity="0.35"/>')

    return svg(W, H, "\n".join(body), corner="04 · thinking framework · B")


def diag_04_c():
    """C: Swim-lane — 4 horizontal lanes, one per stage."""
    body = []
    W, H = 1500, 820
    body.append(text(W/2, 60, "10-principle framework · 4 phases, 10 principles", "label-sub"))

    lane_h = 150
    lane_gap = 20
    start_y = 110
    label_x = 30
    content_x = 240

    for i, (stage, subtitle, principles) in enumerate(FRAMEWORK):
        ly = start_y + i * (lane_h + lane_gap)
        # lane background
        focal = (i == 0)
        klass = "box-focal" if focal else "box-soft"
        body.append(box(label_x, ly, W - 60, lane_h, klass, rx=8))
        # stage label
        body.append(text(label_x + 30, ly + 50, f"phase {i+1:02d}", "label-accent", anchor="start"))
        body.append(text(label_x + 30, ly + 78, stage, "label", anchor="start"))
        body.append(text(label_x + 30, ly + 100, subtitle, "label-tiny", anchor="start"))
        body.append(text(label_x + 30, ly + 125, STAGE_NOTES[stage], "label-tiny", anchor="start"))

        # principle pills, spaced horizontally
        n = len(principles)
        avail = W - content_x - 60
        pill_w = min(280, (avail - (n - 1) * 24) / max(n, 1))
        for j, p in enumerate(principles):
            px = content_x + j * (pill_w + 24) + pill_w / 2
            body.append(label_box(px, ly + lane_h / 2, pill_w, 70, [p]))

    return svg(W, H, "\n".join(body), corner="04 · thinking framework · C")


# ============================================================================
# DIAGRAM 5 — WAVE ROADMAP (v1.7 → v3.0)
# ============================================================================
WAVES = [
    ("v1.7.0", "mar 2026", "google APIs",            "GSC · PSI · CrUX\nIndexing · GA4",         False),
    ("v1.8.0", "mar 2026", "free backlinks",         "moz · bing · common-crawl\n3-tier cascade",  False),
    ("v1.9.0", "apr 2026", "community challenge",    "cluster · sxo · drift\necommerce · hreflang", False),
    ("v2.0.0", "may 2026", "AI search + framework",  "GEO · UCP · IPTC AI\n10-principle thinking",  True),
    ("v2.5.0", "q3 2026",  "auto-fix engine",        "patch generation\nweb-vitals lab",            False),
    ("v3.0.0", "q4 2026",  "audit-as-code",          "CI integration\nrolling baselines",            False),
]


def diag_05_a():
    """A: Horizontal timeline with alternating cards."""
    body = []
    W, H = 1700, 600
    cy = 310
    n = len(WAVES)
    x_start, x_end = 120, W - 120
    step = (x_end - x_start) / (n - 1)

    body.append(f'<line x1="{x_start}" y1="{cy}" x2="{x_end}" y2="{cy}" class="conn-soft" stroke-width="2"/>')

    for i, (v, dt, title, items, focal) in enumerate(WAVES):
        x = x_start + i * step
        r = 14 if focal else 10
        fill = ACCENT_BRIGHT if focal else ACCENT
        body.append(f'<circle cx="{x}" cy="{cy}" r="{r}" fill="{fill}" stroke="#0A0807" stroke-width="2"/>')

        above = (i % 2 == 0)
        by = cy - 160 if above else cy + 30
        body.append(label_box(x, by + 60, 280, 130, [v + " · " + dt, title, ""], focal=focal))
        for k, ln in enumerate(items.split("\n")):
            body.append(text(x, by + 90 + k * 16, ln, "label-tiny"))
        if above:
            body.append(line_only(x, cy - r, x, by + 60 + 65))
        else:
            body.append(line_only(x, cy + r, x, by + 60 - 65))

    return svg(W, H, "\n".join(body), corner="05 · roadmap · A")


def diag_05_b():
    """B: Vertical timeline (top-down chronological)."""
    body = []
    W, H = 900, 1250
    cx = W / 2
    n = len(WAVES)
    y_start, y_end = 100, H - 100
    step = (y_end - y_start) / (n - 1)

    body.append(f'<line x1="{cx}" y1="{y_start}" x2="{cx}" y2="{y_end}" class="conn-soft" stroke-width="2"/>')

    for i, (v, dt, title, items, focal) in enumerate(WAVES):
        y = y_start + i * step
        r = 16 if focal else 12
        fill = ACCENT_BRIGHT if focal else ACCENT
        body.append(f'<circle cx="{cx}" cy="{y}" r="{r}" fill="{fill}" stroke="#0A0807" stroke-width="2"/>')

        left = (i % 2 == 0)
        side = -1 if left else 1
        bx = cx + side * 260
        body.append(label_box(bx, y, 360, 110, [v + " · " + dt, title], focal=focal))
        for k, ln in enumerate(items.split("\n")):
            body.append(text(bx, y + 70 + k * 14, ln, "label-tiny"))
        body.append(line_only(cx + side * r, y, bx - side * 180, y))

    return svg(W, H, "\n".join(body), corner="05 · roadmap · B")


def diag_05_c():
    """C: Kanban (shipped / next / future)."""
    body = []
    W, H = 1500, 900

    cols = [
        ("shipped", ["v1.7.0", "v1.8.0", "v1.9.0", "v2.0.0"], True),
        ("next",    ["v2.5.0"], False),
        ("future",  ["v3.0.0"], False),
    ]
    col_w = 440
    col_gap = 40
    start_x = (W - 3 * col_w - 2 * col_gap) / 2

    for ci, (cname, versions, focal) in enumerate(cols):
        cx = start_x + ci * (col_w + col_gap)
        body.append(box(cx, 100, col_w, H - 180, "box-soft", rx=8))
        body.append(text(cx + 20, 130, cname.upper(), "label-accent", anchor="start"))
        body.append(text(cx + col_w - 20, 130, f"{len(versions):02d}", "label-tiny", anchor="end"))
        for vi, v in enumerate(versions):
            wave = next((w for w in WAVES if w[0] == v), None)
            if not wave:
                continue
            _, dt, title, items, fc = wave
            wy = 170 + vi * 160
            body.append(label_box(cx + col_w/2, wy + 50, col_w - 40, 100, [v + " · " + dt, title], focal=fc))
            for k, ln in enumerate(items.split("\n")):
                body.append(text(cx + col_w/2, wy + 85 + k * 14, ln, "label-tiny"))

    return svg(W, H, "\n".join(body), corner="05 · roadmap · C")


# ============================================================================
# MAIN
# ============================================================================
DIAGRAMS = {
    "01-architecture-A.svg":   diag_01_a,
    "01-architecture-B.svg":   diag_01_b,
    "01-architecture-C.svg":   diag_01_c,
    "02-pipeline-A.svg":       diag_02_a,
    "02-pipeline-B.svg":       diag_02_b,
    "02-pipeline-C.svg":       diag_02_c,
    "03-sub-skill-map-A.svg":  diag_03_a,
    "03-sub-skill-map-B.svg":  diag_03_b,
    "03-sub-skill-map-C.svg":  diag_03_c,
    "04-framework-A.svg":      diag_04_a,
    "04-framework-B.svg":      diag_04_b,
    "04-framework-C.svg":      diag_04_c,
    "05-roadmap-A.svg":        diag_05_a,
    "05-roadmap-B.svg":        diag_05_b,
    "05-roadmap-C.svg":        diag_05_c,
}


def main():
    banner_path = ASSETS / "banner.svg"
    banner_path.write_text(BANNER_SVG)
    print(f"  ✓ banner.svg")

    for fname, fn in DIAGRAMS.items():
        out = DIAG_DIR / fname
        out.write_text(fn())
        print(f"  ✓ {fname}")

    print(f"\n1 banner + {len(DIAGRAMS)} diagrams emitted to {ASSETS}")


if __name__ == "__main__":
    main()

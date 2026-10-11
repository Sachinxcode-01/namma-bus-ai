# UI/UX Pro Max 2026 Design Workflow & Taste Specification
**Theme:** Vercel Obsidian / Precision Minimalist (inspired by 21st.dev @serafimcloud/themes/vercel)

## Core Philosophy
1. **Taste & Restraint**: Avoid generic AI slop, neon overuse, or amateur rainbow colors.
2. **Deep Obsidian Foundation**: Pure `#000000` deep true black canvas with micro-ambient top lighting (`rgba(0, 112, 243, 0.08)` to `transparent`).
3. **Subtle Surface Layers**:
   - Level 0 (Canvas): `#000000`
   - Level 1 (Card / Sidebar): `#0a0a0a`
   - Level 2 (Elevated / Popovers / Inputs): `#121212`
   - Level 3 (Active / Hover / Focused): `#1c1c1c`
4. **Borders & Top Highlights**:
   - All cards use 1px border `rgba(255, 255, 255, 0.08)` with a 1px top highlight `rgba(255, 255, 255, 0.16)`.
   - Subtle inner bevel for depth without heavy blur.
5. **Button Architecture (Vercel Precision)**:
   - **Primary**: Solid high-contrast crisp white (`#FFFFFF`) with pure black text (`#000000`), micro-bevel, 600 weight.
   - **Secondary**: Obsidian `#121212` with `1px solid #27272a`, hover `#1c1c1c` with border `#3f3f46`.
   - **Outline / Ghost**: Transparent with `1px solid rgba(255,255,255,0.12)`, hover `rgba(255,255,255,0.06)`.
   - **Electric CTA**: Linear gradient `linear-gradient(90deg, #0070F3, #7928CA)` with bright white text.
6. **Typography**:
   - Primary: Geist / Inter / Plus Jakarta Sans with `-0.025em` tracking for headings, `-0.01em` for body.
   - Telemetry / Monospace: JetBrains Mono / SF Mono with clear tabular numerals (`font-variant-numeric: tabular-nums`).
7. **Motion**:
   - 120 FPS hardware-accelerated transitions: `cubic-bezier(0.16, 1, 0.3, 1)`.
   - Micro-pulsing indicators: Green (`#00E599`), Amber (`#F5A623`), Danger (`#FF0080` / `#EF4444`).

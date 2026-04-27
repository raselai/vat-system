# Design System Strategy: The Sovereign Ledger

## 1. Overview & Creative North Star
This design system is built upon the Creative North Star of **"The Sovereign Ledger."** 

In the context of VAT compliance in Bangladesh, we are not merely building a data-entry tool; we are constructing a digital bastion of fiscal truth. The "Sovereign Ledger" aesthetic moves away from the cluttered, line-heavy density of traditional financial software. Instead, it adopts an **Editorial High-End** approach. This is characterized by generous white space, bold typographic contrasts, and a "layered paper" philosophy. 

By utilizing intentional asymmetry—such as offsetting large display metrics against tight, disciplined data grids—we create a rhythm that guides the user through complex compliance workflows with an air of effortless authority.

---

## 2. Colors & Tonal Architecture
The palette is anchored in deep, authoritative blues and high-stability neutrals, punctuated by "Compliance Green" for success states.

### The "No-Line" Rule
To achieve a premium feel, **1px solid borders are strictly prohibited** for sectioning or layout containment. Contrast and boundaries must be achieved through:
- **Tonal Shifts:** Placing a `surface_container_lowest` card atop a `surface_container_low` background.
- **Negative Space:** Using the Spacing Scale to define logical groupings.

### Surface Hierarchy & Nesting
The UI is a series of physical layers. Use the surface-container tiers to define importance:
1.  **Base Layer:** `surface` (#f7f9fb) – The canvas of the application.
2.  **Sectional Layer:** `surface_container_low` (#f2f4f6) – Used for sidebars or secondary content areas.
3.  **Active Component Layer:** `surface_container_lowest` (#ffffff) – Reserved for primary cards and data tables to make them "pop" against the canvas.

### The "Glass & Gradient" Rule
For floating elements (modals, popovers, or navigation overlays), utilize **Glassmorphism**. Apply a semi-transparent `surface_container_lowest` with a 20px-40px backdrop-blur. 
- **Signature Texture:** Primary CTAs should not be flat. Apply a subtle linear gradient from `primary` (#001d52) to `primary_container` (#00307e) at a 135-degree angle to provide a "metallic" depth that signifies security.

---

## 3. Typography: The Editorial Voice
We employ a dual-typeface system to balance character with utility.

*   **The Authority (Manrope):** Used for `display`, `headline`, and `title` scales. Manrope’s geometric precision provides a modern, institutional feel that communicates "Trust."
*   **The Utility (Inter):** Used for `body` and `label` scales. Inter is optimized for the dense alphanumeric data inherent in VAT filings, ensuring legibility even at the smallest `label-sm` (0.6875rem) size.

**Typographic Hierarchy:**
- **High-Contrast Scale:** Don't be afraid to use `display-lg` (3.5rem) for singular, impactful numbers (e.g., total VAT liability). Surround it with ample `surface` space to ensure it feels like a statement, not just a data point.

---

## 4. Elevation & Depth
Depth is communicated through **Tonal Layering** rather than traditional structural lines.

- **The Layering Principle:** Avoid shadows for static elements. A `surface_container_lowest` card sitting on a `surface_container_high` background provides sufficient visual separation for the eye to perceive depth.
- **Ambient Shadows:** When an element must float (e.g., a dropdown or a dragged item), use a "tinted shadow." Use the `on_surface` color at 6% opacity with a 32px blur and 16px Y-offset. This mimics natural light passing through a high-end office environment.
- **The "Ghost Border" Fallback:** In high-density data scenarios where containment is legally required or visually necessary, use a "Ghost Border": the `outline_variant` (#c4c6cf) at **15% opacity**. It should be felt, not seen.

---

## 5. Components

### Buttons
- **Primary:** Gradient fill (`primary` to `primary_container`), `xl` roundedness (1.5rem), and `on_primary` text. No border.
- **Secondary:** `surface_container_high` fill with `on_surface` text. 
- **Tertiary/Ghost:** Transparent background, `primary` text. Use only for low-priority actions to avoid visual clutter.

### Cards & Data Lists
- **Forbid Dividers:** Do not use horizontal lines to separate list items. Use a 12px vertical gap and a 4px background shift (`surface_container_low` on hover) to indicate rows.
- **Header Treatment:** Card titles should use `title-md` in Manrope.

### Input Fields
- **Default State:** `surface_container_lowest` background with a Ghost Border (15% `outline_variant`). 
- **Focus State:** Transition the border to 100% `primary` with a 2px thickness. This provides a clear "active" signal for the user’s focus.

### Compliance Status Chips
- **Success:** `tertiary_container` (#003e28) background with `on_tertiary_fixed` (#002113) text. The deep green-on-green provides a sophisticated, readable alternative to bright "neon" greens.

---

## 6. Do’s and Don’ts

### Do:
- **Do** use `surface_bright` to highlight the most critical action area on a page.
- **Do** utilize the `xl` (1.5rem) roundedness for large containers and `sm` (0.25rem) for internal elements like checkboxes to create a "nested" aesthetic.
- **Do** treat "Empty States" as editorial opportunities. Use abstract, high-end imagery and `headline-sm` typography to guide the user.

### Don't:
- **Don't** use 100% black text. Always use `on_surface` (#191c1e) to maintain a soft, premium contrast.
- **Don't** use standard 1px grey dividers between navigation items. Use 24px of whitespace instead.
- **Don't** use drop shadows on primary action buttons; use the signature gradient to provide weight.
- **Don't** crowd the "Sovereign Ledger." If a screen feels busy, increase the background padding by one step in the spacing scale rather than adding borders.
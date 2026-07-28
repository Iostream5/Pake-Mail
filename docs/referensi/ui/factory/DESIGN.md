---
name: Factory
colors:
  surface: '#141313'
  surface-dim: '#141313'
  surface-bright: '#3a3939'
  surface-container-lowest: '#0e0e0e'
  surface-container-low: '#1c1b1b'
  surface-container: '#201f1f'
  surface-container-high: '#2b2a2a'
  surface-container-highest: '#353434'
  on-surface: '#e5e2e1'
  on-surface-variant: '#c4c7c7'
  inverse-surface: '#e5e2e1'
  inverse-on-surface: '#313030'
  outline: '#8e9192'
  outline-variant: '#444748'
  surface-tint: '#c8c6c5'
  primary: '#c8c6c5'
  on-primary: '#313030'
  primary-container: '#101010'
  on-primary-container: '#7d7c7b'
  inverse-primary: '#5f5e5e'
  secondary: '#c6c6c7'
  on-secondary: '#2f3131'
  secondary-container: '#454747'
  on-secondary-container: '#b4b5b5'
  tertiary: '#cac6c3'
  on-tertiary: '#32302f'
  tertiary-container: '#11100f'
  on-tertiary-container: '#7f7c7a'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#e5e2e1'
  primary-fixed-dim: '#c8c6c5'
  on-primary-fixed: '#1c1b1b'
  on-primary-fixed-variant: '#474646'
  secondary-fixed: '#e2e2e2'
  secondary-fixed-dim: '#c6c6c7'
  on-secondary-fixed: '#1a1c1c'
  on-secondary-fixed-variant: '#454747'
  tertiary-fixed: '#e6e1df'
  tertiary-fixed-dim: '#cac6c3'
  on-tertiary-fixed: '#1d1b1a'
  on-tertiary-fixed-variant: '#484645'
  background: '#141313'
  on-background: '#e5e2e1'
  surface-variant: '#353434'
  obsidian-canvas: '#101010'
  carbon-lift: '#1d1a18'
  ash-stroke: '#3d3a39'
  graphite-mid: '#4d4947'
  warm-granite: '#8a8380'
  pale-stone: '#b8b3b0'
  bone: '#eeeeee'
  chalk: '#fafafa'
  signal-orange: '#ee6018'
  metric-green: '#a0ca92'
  ink-black: '#060505'
typography:
  display:
    fontFamily: Geist
    fontSize: 72px
    fontWeight: '400'
    lineHeight: 72px
    letterSpacing: -2.88px
  headline-lg:
    fontFamily: Geist
    fontSize: 44px
    fontWeight: '400'
    lineHeight: 49px
    letterSpacing: -1.1px
  headline-lg-mobile:
    fontFamily: Geist
    fontSize: 32px
    fontWeight: '400'
    lineHeight: 36px
    letterSpacing: -0.8px
  headline-md:
    fontFamily: Geist
    fontSize: 36px
    fontWeight: '400'
    lineHeight: 40px
    letterSpacing: -1.12px
  body:
    fontFamily: Geist
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
    letterSpacing: 0px
  body-sm:
    fontFamily: Geist
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
    letterSpacing: 0px
  label-mono:
    fontFamily: JetBrains Mono
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 12px
    letterSpacing: -0.24px
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  base: 8px
  xs: 8px
  sm: 16px
  md: 24px
  lg: 40px
  xl: 80px
  section-gap: 96px
  max-width: 1200px
---

## Brand & Style

The design system is a "terminal war room" for high-stakes information management. It rejects decorative trends in favor of an **Anti-Decorative Functionalist** aesthetic, drawing heavily from **Modern Minimalism** and **Technical Brutalism**. The personality is authoritative, precise, and uncompromisingly technical.

The user experience should feel like operating a high-performance developer tool or a mission control dashboard. Reliability is conveyed through extreme figure-ground contrast, disciplined typography, and the absence of non-functional embellishments like shadows or gradients. The interface is a void—the "Obsidian Canvas"—where data is illuminated on sharp, "Bone" colored surfaces.

## Colors

The palette is strictly monochromatic with functional chromatic anchors. **Obsidian Canvas** serves as the infinite base layer. **Bone** is the primary surface for high-priority content, creating a stark, paper-on-desk contrast.

- **Primary (Obsidian):** The foundation of the war room.
- **Secondary (Bone):** Reserved for containers that require maximum focus and readability.
- **Functional Accents:** **Signal Orange** and **Metric Green** are used exclusively for status signaling, data trends, and system alerts. They must never be used for purely aesthetic decoration.
- **Inverted Contrast:** When placing text on a **Bone** surface, use **Ink Black** to maintain the "ink on paper" technical legibility.

## Typography

This design system relies on the **Geist** family to communicate technical sophistication. Authority is achieved through extreme scale and negative tracking (tightening the letters) rather than bold weights. 

Use **Geist Mono** (represented here by JetBrains Mono for system compatibility) for all "eyebrow" text, technical labels, and metrics to reinforce the terminal aesthetic. All weights should remain at **400 (Regular)**; visual hierarchy is managed through font size and color (e.g., using **Warm Granite** for secondary info) rather than thickness.

## Layout & Spacing

The layout is built on a rigorous **8px grid**. The philosophy is "Concentrated Data, Expansive Void." Content areas (cards/panels) should feel dense and efficient, while the space between major sections should be vast (96px+) to create a sense of focus and calm.

- **Grid:** Use a 12-column fixed grid for desktop (1200px max-width) with 24px gutters.
- **Margins:** Desktop margins should be dynamic, but never less than 40px. On mobile, use 16px margins.
- **Reflow:** On mobile, complex dashboard grids should collapse into a single-column vertical stack, prioritizing metric cards first.

## Elevation & Depth

Depth in this system is strictly binary and achieved through **Figure/Ground Contrast** rather than physical simulation. 

- **Level 0 (Floor):** Obsidian Canvas (#101010). The void.
- **Level 1 (Raised):** Carbon Lift (#1d1a18). Used for subtle grouping and navigation wells.
- **Level 2 (Active Surface):** Bone (#eeeeee). Used for primary content cards. This creates the highest level of visual "pop."
- **Level 3 (Interactive):** Chalk (#fafafa). Reserved for high-emphasis call-to-action buttons.

Avoid all dropshadows, blurs, and transparency. A 1px **Ash Stroke** (#3d3a39) should be used to define boundaries on dark-on-dark surfaces.

## Shapes

The shape language is "Softened Industrial." Elements are mostly sharp to maintain a technical feel, with specific radii used to distinguish between interactive components and structural containers.

- **Interactive Elements (Buttons/Inputs/Tags):** 3px radius. Sharp and precise.
- **Content Containers (Cards):** 10px radius (rounded-lg). Softened to make dense data feel more approachable.
- **Hero Panels:** 20px radius (rounded-xl). Used for large-scale screenshots or primary window frames.

## Components

- **Buttons:** 
    - **Primary:** Chalk fill with Ink Black text. 3px radius.
    - **Ghost:** Ash Stroke hairline border, no fill, Bone text. 
    - **Functional:** Use Signal Orange or Metric Green text only for specific destructive or success actions.
- **Cards:** 
    - **The Bone Card:** Bone fill, 10px radius. Use a subtle film-grain texture overlay. Text inside must be Ink Black.
    - **The Dark Panel:** Carbon Lift fill or simple Ash Stroke outline. Text is Bone or Warm Granite.
- **Input Fields:** Flat Carbon Lift fill with a 1px Ash Stroke. 3px radius. Focus state is signaled by a 1px Bone border.
- **Chips/Labels:** Always monospaced. 3px radius. Usually Warm Granite text on a Carbon Lift background.
- **Status Pulses:** 6px circles using Signal Orange. Use a simple "breathe" animation for active system states.
- **Lists:** Clean rows separated by 1px Ash Stroke hairline borders. No alternating row colors; use hover states (Carbon Lift fill) for interactivity.
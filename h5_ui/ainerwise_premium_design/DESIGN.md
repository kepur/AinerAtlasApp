---
name: AinerWise Premium Design
colors:
  surface: '#faf8ff'
  surface-dim: '#d2d9f4'
  surface-bright: '#faf8ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f2f3ff'
  surface-container: '#eaedff'
  surface-container-high: '#e2e7ff'
  surface-container-highest: '#dae2fd'
  on-surface: '#131b2e'
  on-surface-variant: '#4a4455'
  inverse-surface: '#283044'
  inverse-on-surface: '#eef0ff'
  outline: '#7b7487'
  outline-variant: '#ccc3d8'
  surface-tint: '#732ee4'
  primary: '#630ed4'
  on-primary: '#ffffff'
  primary-container: '#7c3aed'
  on-primary-container: '#ede0ff'
  inverse-primary: '#d2bbff'
  secondary: '#0058be'
  on-secondary: '#ffffff'
  secondary-container: '#2170e4'
  on-secondary-container: '#fefcff'
  tertiary: '#005b3d'
  on-tertiary: '#ffffff'
  tertiary-container: '#007650'
  on-tertiary-container: '#76ffc2'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#eaddff'
  primary-fixed-dim: '#d2bbff'
  on-primary-fixed: '#25005a'
  on-primary-fixed-variant: '#5a00c6'
  secondary-fixed: '#d8e2ff'
  secondary-fixed-dim: '#adc6ff'
  on-secondary-fixed: '#001a42'
  on-secondary-fixed-variant: '#004395'
  tertiary-fixed: '#6ffbbe'
  tertiary-fixed-dim: '#4edea3'
  on-tertiary-fixed: '#002113'
  on-tertiary-fixed-variant: '#005236'
  background: '#faf8ff'
  on-background: '#131b2e'
  surface-variant: '#dae2fd'
typography:
  headline-xl:
    fontFamily: Plus Jakarta Sans
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  headline-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
  body-lg:
    fontFamily: beVietnamPro
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: beVietnamPro
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  label-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0.05em
  headline-xl-mobile:
    fontFamily: Plus Jakarta Sans
    fontSize: 28px
    fontWeight: '700'
    lineHeight: 36px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  base: 8px
  margin-mobile: 20px
  margin-desktop: 32px
  gutter: 16px
  touch-target-min: 44px
---

## Brand & Style
The design system is centered on the philosophy of **Expression-Driven Learning**. It balances the functional utility of a knowledge-management tool with the emotional connectivity of a social platform. The brand personality is professional, empowering, and sophisticated—tailored for adults who view language as a vehicle for their identity rather than a chore.

The visual style is **Premium Modern AI-Native**. It utilizes a "Soft White" foundation to reduce cognitive load while employing **Glassmorphism** and subtle background blurs to signify AI presence. The interface should feel like a high-end digital atelier: clean, airy, and responsive to the user's creative thoughts. 

Key attributes:
- **Calm & Focused:** Heavy use of whitespace and soft transitions.
- **Intelligent:** Data is presented in structured, Notion-like blocks.
- **Supportive:** Success states and AI suggestions use gentle gradients rather than harsh solid colors.

## Colors
The palette is built to feel vibrant yet mature. The primary **Amethyst Purple** drives action and brand recognition, while **Azure Blue** and **Mint Green** provide secondary support for categorizing "Thought Assets" versus "Community Actions."

- **Primary (#7C3AED):** Used for main CTAs, progress indicators, and active AI states.
- **Secondary (#3B82F6):** Used for grammatical corrections and translation links.
- **Mint (#10B981):** Represents mastery, "completed" status, and positive feedback.
- **Orange (#F59E0B):** Reserved for learning alerts, pronunciation warnings, or "needs review" flags.
- **Gradients:** Use linear 135-degree gradients blending Primary to Secondary at 10% opacity for card backgrounds to create a "glass" effect without compromising legibility.

## Typography
This design system prioritizes a bilingual hierarchy. **Plus Jakarta Sans** provides a friendly, geometric feel for headlines that remains legible in both English and Latin-character contexts. For body text, **Be Vietnam Pro** is selected for its contemporary warmth and excellent pairing with simplified Chinese system fonts (PingFang SC).

**Hierarchy Rules:**
- **Primary Language (Chinese):** Uses a standard weight for body text.
- **Secondary Language (English):** Often used for labels or transliterations; these should be set in **Inter** at a smaller scale or with increased letter spacing to differentiate them from the main thought content.
- **Line Height:** generous leading (1.5x+) is maintained to ensure that multi-language "thought blocks" do not feel cluttered.

## Layout & Spacing
The layout follows a **Fluid Grid** model optimized for the iPhone 15 Pro aesthetic. It emphasizes verticality and thumb-reachability.

- **Grid:** A 4-column grid for mobile, scaling to 12 columns for tablet/desktop.
- **Rhythm:** An 8px base unit governs all dimensions.
- **Safe Zones:** 20px horizontal margins ensure content breathes on curved edge-to-edge displays.
- **Vertical Spacing:** Use `32px` or `48px` to separate distinct "Thought Assets" to maintain the premium, uncluttered feel. 
- **Touch Targets:** Every interactive element—buttons, chips, or list items—must have a minimum hit area of 44px.

## Elevation & Depth
Depth is created through **Tonal Layering** and **Ambient Shadows** rather than stark borders.

1.  **Base Layer:** Soft White (#FDFDFF).
2.  **Surface Layer (Cards):** Pure White with a 12% opacity shadow (Blur: 20px, Y: 8px) tinted with the Primary color (#7C3AED).
3.  **AI Layer (Glass):** Backdrop blur of 15px with a 40% transparent white fill and a 1px inner border (white, 20% opacity). This is used for overlays, pronunciation feedback, and floating AI assistance.

Avoid pure black shadows; use deep navy (#0F172A) at very low opacities to keep the interface feeling light and "airy."

## Shapes
The shape language is consistently **Rounded**, reflecting an approachable and organic personality. 

- **Standard Elements:** 0.5rem (8px) for input fields and small buttons.
- **Cards & Containers:** 1rem (16px) for the primary "Thought Asset" cards.
- **Featured Elements:** 1.5rem (24px) for large banners or bottom sheets to emphasize a "cushioned," premium feel.
- **Avatars:** Strictly circular to distinguish people from content (cards).

## Components
Consistent component styling ensures the app feels like a cohesive "Thought Asset" ecosystem.

- **Buttons:** Primary buttons use a solid #7C3AED fill with white text and a height of 48px or 56px. Secondary buttons use a ghost style with a 1.5px primary-colored border.
- **Thought Cards:** These are the core atoms. They should feature a "Source Language" section (Top) and a "Target Language" section (Bottom) divided by a subtle 1px divider or a light gradient shift.
- **AI Input Field:** An expandable text area that feels more like a notepad than a search bar. It should utilize a soft mint or blue glow when active to indicate "AI Listening/Processing" mode.
- **Progress Chips:** Small, pill-shaped indicators for "Mastered" (Mint) or "Review Needed" (Orange).
- **Interactive List Items:** 64px minimum height to allow for a primary title (User's Thought) and a secondary subtitle (Translation).
- **Glass Bottom Sheet:** Used for grammar explanations, triggered by tapping highlighted text within a Thought Card.
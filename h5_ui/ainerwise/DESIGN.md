---
name: AinerWise
colors:
  surface: '#fef7ff'
  surface-dim: '#dfd7e6'
  surface-bright: '#fef7ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f9f1ff'
  surface-container: '#f3ebfa'
  surface-container-high: '#ede5f4'
  surface-container-highest: '#e8dfee'
  on-surface: '#1d1a24'
  on-surface-variant: '#4a4455'
  inverse-surface: '#332f39'
  inverse-on-surface: '#f6eefc'
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
  background: '#fef7ff'
  on-background: '#1d1a24'
  surface-variant: '#e8dfee'
typography:
  display-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: -0.02em
  display-lg-mobile:
    fontFamily: Plus Jakarta Sans
    fontSize: 28px
    fontWeight: '700'
    lineHeight: 36px
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  headline-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
  body-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  label-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 14px
    fontWeight: '500'
    lineHeight: 20px
  label-sm-english:
    fontFamily: Plus Jakarta Sans
    fontSize: 11px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.05em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  base: 8px
  container-padding-mobile: 20px
  container-padding-desktop: 40px
  stack-gap-sm: 12px
  stack-gap-md: 24px
  stack-gap-lg: 40px
  grid-gutter: 16px
---

## Brand & Style
The design system for this application is built on the philosophy of "Intelligent Serenity." It targets an adult audience seeking a premium, focused environment for language mastery and personal expression. The aesthetic blends the functional clarity of a productivity tool with the fluid, ethereal nature of modern AI.

The visual style is a hybrid of **Minimalism** and **Glassmorphism**. It utilizes vast amounts of "breathing room" (whitespace) punctuated by translucent, frosted layers that signify AI-driven insights. The interface feels weightless yet structured, evoking a sense of calm authority and technological sophistication.

## Colors
The palette is rooted in a soft, off-white lavender base to reduce eye strain during long study sessions.

- **Primary (Purple):** Used for core actions, progress indicators, and brand-defining moments.
- **Secondary (Blue/Mint):** Used for supplementary AI features and linguistic category differentiation.
- **Functional Colors:** Orange is reserved for high-priority alerts and corrections; Green signifies mastery and completion.
- **Gradients:** Use soft, multi-stop linear gradients (Primary to Secondary) for high-impact surfaces like premium cards and primary buttons to create a sense of depth and "energy."

## Typography
The system uses **Plus Jakarta Sans** for its modern, friendly, yet professional geometric construction. 

- **Language Hierarchy:** Primary content is in Chinese. English translations or labels must use the `label-sm-english` style, positioned immediately above or below the primary Chinese text with a lower opacity (60%) to maintain clear visual hierarchy.
- **Readability:** For long-form text, use `body-lg` with generous line height to ensure a premium, unhurried reading experience.
- **Emphasis:** Use semibold weights for key vocabulary words within body text.

## Layout & Spacing
This is a **mobile-first fluid grid** system. 

- **Margins:** Mobile views use a 20px side margin. Desktop views transition to a max-width container (1200px) centered with 40px margins.
- **Rhythm:** All vertical spacing follows an 8px base unit. 
- **Grouping:** Use `stack-gap-md` (24px) to separate logical sections within a page and `stack-gap-sm` (12px) for elements within a card.
- **Content Flow:** On mobile, content is primarily a single-column stack of cards. On tablet/desktop, secondary information (like dictionary definitions or AI chat) reflows into a side panel.

## Elevation & Depth
Depth is created through "Soft Layering" rather than traditional heavy shadows.

- **Surface 1 (Base):** The #FAF8FF background.
- **Surface 2 (Cards):** Pure white (#FFFFFF) with a very soft, diffused shadow (0px 4px 20px rgba(124, 58, 237, 0.06)).
- **Surface 3 (Overlays):** Glassmorphic panels with `backdrop-filter: blur(12px)` and a white 20% opacity tint. These are used for navigation bars and sticky headers.
- **Outlines:** Use a 1px solid border (#F1EEFE) on cards to define edges without adding visual weight.

## Shapes
The shape language is defined by the **ROUND_EIGHT** principle (8px base radius).

- **Standard Elements:** Buttons and input fields use a 0.5rem (8px) radius.
- **Containers:** Large cards and modal sheets use `rounded-lg` (16px) to appear more welcoming and "organic."
- **Interactive Indicators:** Small chips or status tags use `rounded-xl` (24px) or full pills for distinctiveness.

## Components

- **Buttons:** Primary buttons use a linear gradient (Purple to Blue) with white text. Ghost buttons use a purple border and text. All buttons have a minimum height of 48px for touch accessibility.
- **AI Expression Cards:** These are the centerpiece. Use a 1px subtle purple glow/outline and a glassmorphic icon in the top right to indicate AI-generated content.
- **Chips:** Used for "Mastered" tags or word categories. "Mastered" chips use a soft green background (10% opacity) with dark green text.
- **Input Fields:** Minimalist design with a bottom border that transforms into a full primary-colored stroke on focus. Include a small English label above the Chinese placeholder.
- **Progress Rings:** Use a thin, elegant stroke for progress. For "Mastery" levels, use a gradient stroke.
- **Navigation:** A bottom navigation bar with glassmorphism and subtle haptic-feedback-ready icons.
- **Instructional Labels:** Small English labels in `label-sm-english` should accompany all major icons and section headers to reinforce the learning context.
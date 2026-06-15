---
name: Lumina Forge
colors:
  surface: '#f7f9fb'
  surface-dim: '#d8dadc'
  surface-bright: '#f7f9fb'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f2f4f6'
  surface-container: '#eceef0'
  surface-container-high: '#e6e8ea'
  surface-container-highest: '#e0e3e5'
  on-surface: '#191c1e'
  on-surface-variant: '#464554'
  inverse-surface: '#2d3133'
  inverse-on-surface: '#eff1f3'
  outline: '#767586'
  outline-variant: '#c7c4d7'
  surface-tint: '#494bd6'
  primary: '#4648d4'
  on-primary: '#ffffff'
  primary-container: '#6063ee'
  on-primary-container: '#fffbff'
  inverse-primary: '#c0c1ff'
  secondary: '#0058be'
  on-secondary: '#ffffff'
  secondary-container: '#2170e4'
  on-secondary-container: '#fefcff'
  tertiary: '#006c49'
  on-tertiary: '#ffffff'
  tertiary-container: '#00885d'
  on-tertiary-container: '#000703'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#e1e0ff'
  primary-fixed-dim: '#c0c1ff'
  on-primary-fixed: '#07006c'
  on-primary-fixed-variant: '#2f2ebe'
  secondary-fixed: '#d8e2ff'
  secondary-fixed-dim: '#adc6ff'
  on-secondary-fixed: '#001a42'
  on-secondary-fixed-variant: '#004395'
  tertiary-fixed: '#6ffbbe'
  tertiary-fixed-dim: '#4edea3'
  on-tertiary-fixed: '#002113'
  on-tertiary-fixed-variant: '#005236'
  background: '#f7f9fb'
  on-background: '#191c1e'
  surface-variant: '#e0e3e5'
  ai-logic: '#3B82F6'
  mastery-mint: '#10B981'
  alert-amber: '#F59E0B'
  risk-red: '#EF4444'
  bg-gradient-purple: '#EEF2FF'
  bg-gradient-mint: '#ECFDF5'
typography:
  display-lg:
    fontFamily: Manrope
    fontSize: 48px
    fontWeight: '800'
    lineHeight: 56px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Manrope
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: -0.01em
  headline-lg-mobile:
    fontFamily: Manrope
    fontSize: 24px
    fontWeight: '700'
    lineHeight: 32px
  headline-md:
    fontFamily: Manrope
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  body-lg:
    fontFamily: Manrope
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: Manrope
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  label-lg:
    fontFamily: Manrope
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 20px
    letterSpacing: 0.02em
  label-sm:
    fontFamily: Manrope
    fontSize: 12px
    fontWeight: '500'
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
  unit: 4px
  gutter: 16px
  margin-mobile: 20px
  margin-desktop: 40px
  touch-target-min: 44px
---

## Brand & Style

The design system is engineered for a premium, AI-native language learning experience that balances the engagement of a high-end visual novel with the utility of a sophisticated productivity tool. It targets an adult audience, eschewing "gamification" tropes in favor of deep immersion and intellectual mastery.

The visual style is a refined **Glassmorphism**, utilizing translucent layers and vibrant background blurs to create a sense of depth and infinite canvas. This is paired with a **Corporate Modern** structural discipline to ensure the "Learning HUD" feels reliable and professional. The interface should evoke a sense of calm focus, as if the user is interacting with a highly advanced, empathetic AI tutor within a dreamlike digital space.

## Colors

The palette is rooted in "Lumina Indigo," serving as the primary brand anchor. To achieve the immersive depth required for a story-driven experience, the background is not flat white but a composition of soft gradients using `bg-gradient-purple` and `bg-gradient-mint`.

- **Primary (Indigo):** Used for brand identity and core interactive paths.
- **AI Logic (Blue):** Dedicated to AI-generated content, processing states, and interactive logic puzzles.
- **Mastery (Mint):** Reserved for successful completions, correct answers, and progress milestones.
- **Alert (Orange):** Used sparingly for hints, nudges, and non-critical warnings.
- **Risk (Red):** High-contrast color used exclusively for destructive actions or critical narrative failures.

Surface colors should prioritize transparency (80-90% opacity) to allow the background gradients to bleed through, reinforcing the glassmorphic aesthetic.

## Typography

This design system utilizes **Manrope** exclusively to maintain a modern, tech-forward, yet approachable atmosphere. 

- **Hierarchy:** Dramatic scale differences between `display-lg` (used for story titles or chapter headings) and `body-md` (used for narrative prose) create clear visual interest.
- **Readability:** Body text uses a generous `lineHeight` to ensure long-form narrative content is comfortable for language learners who may be processing unfamiliar vocabulary.
- **HUD Elements:** Labels and utility text use slightly increased letter spacing and medium/semibold weights to differentiate interface controls from the immersive story content.

## Layout & Spacing

The layout employs a **Fluid Grid** system that adapts to the cinematic nature of story-driven content. On desktop, content is often centered or organized in wide, horizontal spans to mimic a visual novel's aspect ratio.

- **Rhythm:** A 4px baseline grid governs all spacing.
- **Safe Zones:** Generous margins are maintained at the screen edges to prevent the UI from feeling cramped.
- **Horizontal Flow:** This design system leans heavily on horizontal scrolling for story cards, character selections, and vocabulary galleries, creating a "browsing" experience similar to streaming platforms.
- **Touch Targets:** All interactive elements maintain a minimum size of 44px to ensure accessibility on mobile devices and ease of use during high-immersion "game" moments.

## Elevation & Depth

Visual hierarchy is primarily achieved through **Glassmorphism** and tonal layering. 

- **Level 1 (Base):** The dynamic background with soft color blurs.
- **Level 2 (Surface):** Premium glass cards. These use a semi-transparent white fill (`rgba(255, 255, 255, 0.7)`), a 1px white border with 20% opacity to define the edge, and a `backdrop-filter: blur(12px)`.
- **Level 3 (Overlay):** Active elements or modals. These use a slightly more opaque fill and a soft, wide-spread ambient shadow (`shadow-color: rgba(99, 102, 241, 0.15)`) to suggest they are floating closer to the user.

Shadows should never be pure black; they are always tinted with the primary Indigo or the specific accent color of the component to maintain the "Lumina" feel.

## Shapes

The shape language is "Rounded" to reflect a friendly, modern AI persona. 

- **Standard Elements:** Buttons and input fields follow the `rounded-md` (0.5rem) standard.
- **Story Cards:** Immersive cards and containers use `rounded-xl` (1.5rem) to create a distinct, premium look that separates content from the system HUD.
- **Avatars & Chips:** Elements representing people or status states utilize a full pill shape for quick visual categorization.

## Components

- **Immersive Story Cards:** Large-format cards featuring 1.5rem rounded corners, glassmorphic backgrounds, and high-quality imagery. Content should bleed to the edges where possible.
- **Buttons:** 
  - *Primary:* Solid Lumina Indigo with a subtle white inner glow on the top edge.
  - *Secondary:* Glassmorphic (blurred background) with a 1px border.
- **Learning HUD:** A persistent, low-profile layer at the top or bottom of the screen. It should use a darker glass effect (`rgba(0,0,0,0.05)`) to remain legible without breaking story immersion.
- **Input Fields:** Clean, minimal underlines or soft-filled glass boxes. Focus states should trigger a subtle Indigo "glow" (outer shadow).
- **Chips/Badges:** Used for grammar categories or difficulty levels. They should be semi-transparent with icons for quick recognition.
- **AI Interaction Bubble:** Distinct from standard cards, these should use a subtle Blue (#3B82F6) tint in the glass effect to signify the AI's "voice."
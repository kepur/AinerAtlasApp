---
name: AinerWise Lumina
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
  deep-purple: '#4F46E5'
  soft-mint: '#D1FAE5'
  glass-bg: rgba(255, 255, 255, 0.7)
  ai-gradient-start: '#EEF2FF'
  ai-gradient-end: '#E0E7FF'
typography:
  headline-lg:
    fontFamily: Manrope
    fontSize: 30px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: -0.02em
  headline-lg-mobile:
    fontFamily: Manrope
    fontSize: 26px
    fontWeight: '700'
    lineHeight: 34px
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Manrope
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
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
  label-en-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0.02em
  label-zh-sm:
    fontFamily: Manrope
    fontSize: 13px
    fontWeight: '500'
    lineHeight: 18px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  base: 4px
  margin-mobile: 20px
  gutter-md: 16px
  touch-target-min: 44px
  stack-sm: 8px
  stack-md: 16px
  stack-lg: 32px
---

## Brand & Style

The design system is engineered for the "Sophisticated Practitioner"—adult learners who view language acquisition as an intellectual expansion rather than a repetitive chore. The brand personality is **Empowering, Intellectual, and Ethereal**, sitting at the intersection of a high-end productivity tool and a responsive AI companion.

The visual style is **Soft-Minimalist Glassmorphism**. It leverages a "Lumina" effect—where surfaces appear as semi-translucent frosted glass, catching subtle purple and blue light from the background. This avoids the heavy, static nature of traditional corporate UIs in favor of a dynamic, "living" interface that reflects the fluid nature of AI. High-quality whitespace is used as a structural element to ensure focus, while large, high-contrast typography conveys a sense of authority and clarity.

## Colors

The color strategy centers on a **Deep Purple (Primary)** that represents wisdom and the "Thought Asset" concept. **Blue (Secondary)** and **Mint (Tertiary)** are used as functional accents for interactivity and success states.

The background is never flat; it utilizes a "Soft White" base (`#FFFFFF` to `#F8FAFC`) with barely-perceptible radial gradients of purple and blue in the corners to give the screen depth and an "AI-native" glow. 

**Color Usage Rules:**
- **Primary Purple:** Used for the most critical actions, active navigation states, and the AI's "core."
- **Secondary Blue:** Used for secondary interactive elements like English label highlights or link text.
- **Mint:** Reserved for "Mastery" states, progress bars, and positive feedback loops.
- **Glass Surfaces:** Semi-transparent white layers are used for cards to allow the background gradients to bleed through softly.

## Typography

The typography system follows an **Information Gradualism** approach. We use **Manrope** for its modern, geometric-yet-warm character, which excels in both Chinese and English rendering. 

**Dual-Language Hierarchy:**
The interface primarily uses Chinese text for navigation and instructions. Underneath or adjacent to these, small English labels (`label-en-sm`) provide pedagogical context. 
- **The Main Task:** Large headline sizes are used for the "Thought" or "Expression" currently being focused on.
- **Legibility:** Paragraphs are never dense; line heights are generous (1.5x+) to ensure the "Notion-style" clarity.
- **Emphasis:** Target language (English) sentences should use a slightly heavier weight or the Primary color to distinguish them from interface text.

## Layout & Spacing

This design system is **mobile-first**, optimized for the aspect ratio and reachability of the iPhone 15 Pro. The layout philosophy is "One Screen, One Intention."

**Layout Rules:**
- **Grid:** A 4-column fluid grid for mobile with 20px side margins and 16px gutters.
- **Safe Areas:** Adhere strictly to the iOS Dynamic Island and Home Indicator safe zones.
- **Vertical Rhythm:** Content is stacked in "Card Modules." Spacing between unrelated cards should be `stack-lg`, while related elements within a card use `stack-sm`.
- **Interactivity:** All buttons and selectable chips must maintain a minimum height of `44px` to ensure accessibility during on-the-go learning.

## Elevation & Depth

Depth is created through **Tonal Layering** and **Glassmorphism** rather than traditional drop shadows.

1.  **Level 0 (Background):** The "Lumina" gradient canvas.
2.  **Level 1 (Cards):** Soft White cards with a 70-80% opacity and a 20px backdrop blur. They feature a very subtle, 1px white inner-border (stroke) to simulate the edge of glass.
3.  **Level 2 (Active States/AI Orb):** These elements use "Ambient Shadows"—diffused, low-opacity shadows tinted with the Primary Purple color (`rgba(99, 102, 241, 0.15)`) to make them feel like they are emitting light.
4.  **Floating Action Elements:** The AI Voice Orb and primary bottom tabs sit on the highest Z-index with a more pronounced backdrop blur to maintain legibility over scrolling content.

## Shapes

The shape language is **Rounded and Organic**, echoing the friendly nature of a personal coach. 

- **Cards:** Use a `16px` (rounded-lg) radius to feel substantial yet soft.
- **Interactive Chips/Buttons:** Use a `pill-shaped` (full radius) approach for "Pattern Chips" and "Mode Selectors" to distinguish them from informational cards.
- **Input Fields:** Follow the card radius (`16px`) to maintain a cohesive container language.
- **Icons:** Should feature rounded terminals and a consistent 2px stroke weight.

## Components

**Buttons:**
- **Primary:** Deep Purple fill, white text, pill-shaped. On tap, a subtle scale-down effect (0.98).
- **Secondary (Glass):** Semi-transparent white with a thin purple border. Used for "Learn More" or secondary options.

**Chips (Knowledge Assets):**
- Used for grammar points or vocabulary. These are semi-transparent with a `Mint` or `Blue` tint depending on the mastery state. When "Mastered," the chip gains a subtle checkmark icon.

**The "AI Orb":**
- A central component for voice interaction. It should be a perfect circle with a multi-layered purple/blue gradient and a soft pulse animation. When listening, it expands slightly with a blurred "aura."

**Input Fields (The "Thought" Box):**
- Large, multi-line text areas with a glass background. The placeholder text should be styled in `body-lg` to encourage long-form thought expression.

**Navigation Bar:**
- A fixed 5-tab bottom bar with a high backdrop blur (Glassmorphism). Active icons use the Deep Purple color with a small dot indicator underneath, while inactive icons remain a soft neutral grey.

**Cards:**
- All main content must be encapsulated in cards. Avoid "naked" text on the background gradient. Cards should have a `20px` internal padding for a premium, spacious feel.
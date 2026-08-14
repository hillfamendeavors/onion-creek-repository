# Design Specification: Ambient Austin Sunset Drone Background

## Overview
Implement an ambient Austin sunset drone video background on the Trusted Neighbors landing page hero section. The background enhances visual prestige while maintaining 100% text contrast and adhering to mobile performance and accessibility standards.

## Architecture & Layout
- **Hero Background Container**: `.hero-bg-wrapper` occupying `inset: 0` with `position: absolute; z-index: 1; overflow: hidden; pointer-events: none;`.
- **Media Element**: `<video class="hero-video" autoplay loop muted playsinline poster="/assets/austin_skyline_overview.jpg">` with smooth scale/pan animation fallback.
- **Color Overlay**: `.hero-overlay` using a rich forest green vignette (`linear-gradient(180deg, rgba(15,46,34,0.88) 0%, rgba(15,46,34,0.60) 45%, rgba(15,46,34,0.95) 100%)`) ensuring crisp readability for white & gold typography.

## Accessibility & Performance
- `prefers-reduced-motion: reduce` disables animated transforms.
- Hardware-accelerated transitions via CSS `transform` / `will-change`.
- High-resolution poster frame ensures zero layout shift (CLS: 0).

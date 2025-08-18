# ScrollToFooter Component

## Overview
The ScrollToFooter component is a floating action button that provides users with a quick way to navigate to the footer section of the website. It features attractive animations and appears when users scroll down the page.

## Features

### Visual Design
- **Floating Button**: Fixed position at bottom-right corner of the screen
- **Round Design**: 64x64px circular button with accent color theme
- **Responsive**: Adapts to different screen sizes
- **High Z-Index**: Ensures visibility above other content

### Animations
- **Float Animation**: Gentle up-and-down floating motion
- **Glow Effect**: Pulsing glow animation around the button
- **Bounce Icon**: Arrow icon with bouncing animation
- **Multiple Pulse Rings**: Layered pulse animations with different delays
- **Hover Effects**: Scale and shadow transitions on hover

### Functionality
- **Smart Visibility**: Only appears when user scrolls down (after 300px)
- **Smooth Scrolling**: Smooth scroll animation to footer
- **Tooltip**: Hover tooltip with rocket emoji and "Go to Footer" text
- **Accessibility**: Proper ARIA labels and keyboard support

## Technical Details

### Animation Classes
- `animate-float`: Custom floating animation (3s duration)
- `animate-glow`: Custom glow effect (2s duration)
- `animate-pulse-ring`: Custom pulse ring animation (2s duration)
- `animate-bounce`: Tailwind's bounce animation for the arrow
- `animate-ping`: Tailwind's ping animation for pulse rings
- `animate-pulse`: Tailwind's pulse animation for glow effect

### Custom CSS Animations
```css
@keyframes float {
  0%, 100% { transform: translateY(0px); }
  50% { transform: translateY(-8px); }
}

@keyframes glow {
  0%, 100% { box-shadow: 0 0 20px rgba(255, 193, 7, 0.4); }
  50% { box-shadow: 0 0 30px rgba(255, 193, 7, 0.6), 0 0 40px rgba(255, 193, 7, 0.3); }
}

@keyframes pulse-ring {
  0% { transform: scale(0.8); opacity: 1; }
  100% { transform: scale(2.4); opacity: 0; }
}
```

### Scroll Behavior
- **Trigger Point**: Button appears after scrolling 300px down
- **Scroll Method**: Uses `scrollIntoView` with smooth behavior
- **Target**: Automatically finds and scrolls to the footer element

## Usage

The ScrollToFooter component is automatically included in the AppShell layout and will appear on all pages when users scroll down. No additional configuration is required.

## Customization

### Position
To change the button position, modify these classes:
```tsx
className="fixed bottom-6 right-6" // Change bottom-6 and right-6
```

### Size
To change the button size, modify the width and height:
```tsx
className="w-16 h-16" // Change to w-14 h-14 for smaller, w-20 h-20 for larger
```

### Colors
The button uses the accent color from your theme. To change colors, modify the CSS variables in `theme.css`.

### Animation Timing
To adjust animation speeds, modify the CSS keyframes in `theme.css`:
```css
.animate-float { animation: float 3s ease-in-out infinite; } // Change 3s
.animate-glow { animation: glow 2s ease-in-out infinite; }   // Change 2s
```

## Dependencies
- React (useState, useEffect)
- Tailwind CSS
- Custom CSS animations (defined in theme.css)

## Browser Support
- Modern browsers with CSS animations support
- Smooth scrolling behavior requires modern browsers
- Gracefully degrades on older browsers

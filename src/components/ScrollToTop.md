# ScrollToTop Component

## Overview
The ScrollToTop component is a floating action button that appears when users scroll near the footer, providing a quick way to return to the top of the page. It complements the ScrollToFooter component for complete navigation control.

## Features

### Visual Design
- **Floating Button**: Fixed position at bottom-left corner of the screen
- **Round Design**: 56x56px circular button with surface background and accent border
- **Responsive**: Adapts to different screen sizes
- **High Z-Index**: Ensures visibility above other content

### Animations
- **Float Animation**: Gentle up-and-down floating motion
- **Bounce Icon**: Arrow up icon with bouncing animation
- **Pulse Ring**: Border pulse animation
- **Glow Effect**: Subtle background pulse animation
- **Hover Effects**: Scale and shadow transitions on hover

### Functionality
- **Smart Visibility**: Only appears when user is in the last 30% of the page
- **Smooth Scrolling**: Smooth scroll animation to top of page
- **Tooltip**: Hover tooltip with up arrow emoji and "Back to Top" text
- **Accessibility**: Proper ARIA labels and keyboard support

## Technical Details

### Visibility Logic
The button appears when:
```typescript
scrollPosition + windowHeight > documentHeight * 0.7
```
This means it shows when the user is in the last 30% of the page content.

### Scroll Behavior
- **Target**: Scrolls to top of page (y = 0)
- **Method**: Uses `window.scrollTo` with smooth behavior
- **Position**: Always returns to the very top

### Animation Classes
- `animate-float`: Custom floating animation (3s duration)
- `animate-bounce`: Tailwind's bounce animation for the arrow
- `animate-ping`: Tailwind's ping animation for pulse ring
- `animate-pulse`: Tailwind's pulse animation for glow effect

## Usage

The ScrollToTop component is automatically included in the AppShell layout and will appear on all pages when users scroll near the footer. No additional configuration is required.

## Positioning Strategy

### Button Layout
- **ScrollToFooter**: Bottom-right corner (for going down)
- **ScrollToTop**: Bottom-left corner (for going up)

This creates a balanced navigation experience where users can easily access both directions.

### Responsive Behavior
- Both buttons maintain their positions on all screen sizes
- Touch-friendly sizing for mobile devices
- Proper spacing to avoid overlapping with other UI elements

## Customization

### Position
To change the button position, modify these classes:
```tsx
className="fixed bottom-6 left-6" // Change bottom-6 and left-6
```

### Size
To change the button size, modify the width and height:
```tsx
className="w-14 h-14" // Change to w-12 h-12 for smaller, w-16 h-16 for larger
```

### Colors
The button uses the surface background with accent border. To change colors:
- Background: Modify `bg-surface` class
- Border: Modify `border-accent` class
- Text: Modify `text-accent` class

### Visibility Threshold
To change when the button appears, modify the calculation in the useEffect:
```typescript
// Change 0.7 to adjust the threshold (0.5 = middle of page, 0.8 = last 20%)
if (scrollPosition + windowHeight > documentHeight * 0.7) {
  setIsVisible(true);
}
```

## Dependencies
- React (useState, useEffect)
- Tailwind CSS
- Custom CSS animations (defined in theme.css)

## Browser Support
- Modern browsers with CSS animations support
- Smooth scrolling behavior requires modern browsers
- Gracefully degrades on older browsers

## Performance Considerations
- Uses `useEffect` with proper cleanup to prevent memory leaks
- Scroll event listener is throttled by the browser
- Minimal DOM manipulation for optimal performance

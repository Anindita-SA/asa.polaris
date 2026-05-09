# Galaxy WebGL Shader Animation Reference

This folder contains a premium, highly interactive WebGL starfield/galaxy animation designed by the user, utilizing the high-performance `ogl` library.

---

## Files:
- [Galaxy.jsx](file:///e:/Academic%20files/Competiton%20and%20Project%20files/Polaris/asa.polaris/dev%20guides/animations/galaxy/Galaxy.jsx): The core WebGL React component with custom vertex/fragment shader.
- [Galaxy.css](file:///e:/Academic%20files/Competiton%20and%20Project%20files/Polaris/asa.polaris/dev%20guides/animations/galaxy/Galaxy.css): Container styling.

---

## Installation:
To use this component in the future, first install the lightweight WebGL library `ogl`:
```bash
npm install ogl
```

---

## Basic Usage:
```jsx
import Galaxy from './dev guides/animations/galaxy/Galaxy';

function App() {
  return (
    <div style={{ width: '100%', height: '600px', position: 'relative' }}>
      <Galaxy />
    </div>
  );
}
```

---

## Advanced Usage (Custom Props):
```jsx
<Galaxy 
  mouseRepulsion={false}
  mouseInteraction={false}
  density={2.5}
  glowIntensity={0.5}
  saturation={0.7}
  hueShift={150}
  twinkleIntensity={0.2}
  rotationSpeed={0}
  repulsionStrength={1.5}
  autoCenterRepulsion={0}
  starSpeed={0.4}
  speed={0.1}
/>
```

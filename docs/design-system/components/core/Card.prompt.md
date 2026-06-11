The base surface for every Zoetrop module — soft warm shadow, large radius, optional metric accent.

```jsx
<Card accent="vital" elevation="md">
  <h3>Resting heart rate</h3>
  <span className="zt-readout">58</span>
</Card>
<Card tone="focus" interactive onClick={open}>Sleep summary →</Card>
```

`accent` paints a 3px metric hairline at the top; `tone` washes the whole surface with a metric-50 tint; `interactive` adds a hover lift.

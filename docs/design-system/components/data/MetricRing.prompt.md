The signature Zoetrope component — an animated progress ring that sweeps from empty on mount. Use for any goal/completion metric.

```jsx
<MetricRing value={6418} max={8000} tone="energy" label="80%" sublabel="Move" />
<MetricRing value={0.62} tone="vital" size={88} thickness={9} label="62" sublabel="Recover" />
```

`tone`: energy / vital / focus. Pass `value` 0..1, or `value` + `max`. Override the center with `children` for custom content.

Pill-shaped action button — use for any primary or secondary action; periwinkle "Focus" accent is the default brand action color.

```jsx
<Button variant="primary" size="md" onClick={save}>Save entry</Button>
<Button variant="secondary" iconLeft={<MoonIcon/>}>Log sleep</Button>
<Button variant="ghost" size="sm">Skip</Button>
```

Variants: `primary` (periwinkle, white text), `secondary` (white, bordered), `ghost` (transparent), `ink` (charcoal), `danger`. Sizes `sm`/`md`/`lg`. Hover lifts the fill a step; press scales to 0.97. Pass icons via `iconLeft`/`iconRight`, not children.

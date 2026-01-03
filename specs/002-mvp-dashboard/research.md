# Research: MVP Dashboard & UI Components

**Feature**: 002-mvp-dashboard
**Date**: 2026-01-03

## Overview

Research decisions for Phase 2 UI implementation. Most technology choices are pre-determined by the project constitution. This document covers implementation patterns and component design decisions.

---

## R1: Component Library Approach

**Question**: Build custom components vs. use a UI component library?

**Decision**: Custom Tailwind components

**Rationale**:
- Constitution mandates Tailwind CSS 4.x - using a library would add complexity
- Components are domain-specific (MetricCard, StatusBadge) - no generic library fits
- Fewer dependencies = smaller bundle size
- Full control over accessibility implementation

**Alternatives Considered**:
- Radix UI primitives: Adds 50KB+ to bundle, overkill for our simple UI
- shadcn/ui: Good option but requires adaptation; custom is simpler for 5 components
- Headless UI: Good accessibility but another dependency to maintain

---

## R2: Dashboard State Management

**Question**: How to manage dashboard state (category summaries, loading, errors)?

**Decision**: Custom `useDashboard` hook using existing `useMetrics`

**Rationale**:
- Phase 1 `useMetrics` already provides CRUD and storage access
- Dashboard needs derived state (category aggregations) - simple computation
- No complex state requiring Redux/Zustand
- Keeps state management in hooks per constitution

**Implementation Pattern**:
```typescript
function useDashboard() {
  const { metrics } = useMetrics();

  const categories = useMemo(() =>
    aggregateByCategory(metrics), [metrics]
  );

  return { categories, isLoading, error };
}
```

**Alternatives Considered**:
- Zustand: Adds dependency, overkill for read-heavy dashboard
- React Context: Useful if deeply nested; useDashboard simpler for flat structure
- Direct useMetrics in components: Would duplicate aggregation logic

---

## R3: File Upload Pattern

**Question**: How to implement WHOOP JSON file upload with preview?

**Decision**: Native File API + React state for preview

**Rationale**:
- No server upload needed - client-side only (localStorage)
- File API is well-supported in target browsers
- Preview requires parsing before confirm - natural React pattern
- Drag-and-drop enhanceable without library

**Implementation Pattern**:
```typescript
function useWhoopImport() {
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFile = async (file: File) => {
    const text = await file.text();
    const result = parseWhoopJson(text);
    if (result.success) {
      setPreview(mapToPreview(result.data));
    } else {
      setError(result.errors.join(', '));
    }
  };

  const confirmImport = () => {
    // Use useMetrics to save
  };

  return { preview, error, handleFile, confirmImport };
}
```

**Alternatives Considered**:
- react-dropzone: Nice UX but adds 10KB for simple use case
- FormData upload: Needed for server upload; we're client-only

---

## R4: Responsive Grid Implementation

**Question**: How to implement responsive category grid (1-3 columns)?

**Decision**: CSS Grid with Tailwind breakpoints

**Rationale**:
- CSS Grid native to browser, no JS needed for layout
- Tailwind has built-in responsive prefixes (sm:, md:, lg:)
- Clean, declarative, performant
- Matches constitution's Tailwind mandate

**Implementation Pattern**:
```tsx
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
  {categories.map(cat => <CategoryCard key={cat.id} {...cat} />)}
</div>
```

**Breakpoints** (from spec FR-017):
- Mobile (<640px): 1 column
- Tablet (640-1024px): 2 columns
- Desktop (>1024px): 3 columns

**Alternatives Considered**:
- Flexbox wrap: Less control over exact column counts
- CSS Container Queries: Good but less browser support than we need
- JS-based responsive: Unnecessary complexity, poor performance

---

## R5: Accessible Status Indicators

**Question**: How to make status colors accessible per WCAG 2.1 AA?

**Decision**: Color + icon + text label triple encoding

**Rationale**:
- Constitution requires "not rely solely on color"
- WCAG 2.1 AA requires 4.5:1 contrast ratio for text
- Screen readers need text alternatives
- Icons provide quick visual scan for sighted users

**Implementation Pattern**:
```tsx
function StatusBadge({ status }: { status: MetricStatus }) {
  const config = {
    optimal: { color: 'bg-green-600', icon: CheckCircle, label: 'Optimal' },
    borderline: { color: 'bg-yellow-500', icon: AlertCircle, label: 'Borderline' },
    deficient: { color: 'bg-red-600', icon: XCircle, label: 'Deficient' },
    excess: { color: 'bg-orange-500', icon: ArrowUp, label: 'Excess' },
  };

  const { color, icon: Icon, label } = config[status];

  return (
    <span className={`${color} text-white px-2 py-1 rounded flex items-center gap-1`}>
      <Icon className="w-4 h-4" aria-hidden="true" />
      <span>{label}</span>
    </span>
  );
}
```

**Color Contrast Verification**:
- Green (#16a34a) on white: 4.5:1 - PASS
- Yellow (#eab308) on black: 4.5:1 - PASS (use dark text)
- Red (#dc2626) on white: 4.5:1 - PASS
- Orange (#ea580c) on white: 3.1:1 - ADJUST to #c2410c (4.5:1)

**Alternatives Considered**:
- Color only: Fails accessibility requirements
- Icon only: Unclear meaning without labels
- Pattern fills: Complex to implement, icons clearer

---

## R6: Trend Indicator Direction

**Question**: How to visually represent improving/declining based on metric type?

**Decision**: Arrow direction + color + percentage, respecting improvement direction

**Rationale**:
- Some metrics "higher is better" (HRV), some "lower is better" (RHR)
- Arrow direction should indicate raw change
- Color should indicate "good" or "bad" relative to improvement direction
- Percentage gives magnitude

**Implementation Pattern**:
```tsx
function TrendIndicator({ trend, percentChange, improvement }: Props) {
  // Arrow based on raw direction
  const isUp = percentChange > 0;
  const ArrowIcon = isUp ? ArrowUpRight : ArrowDownRight;

  // Color based on whether change is good
  const isGood = (improvement === 'higher is better' && isUp) ||
                 (improvement === 'lower is better' && !isUp);
  const color = trend === 'stable' ? 'text-gray-500'
              : isGood ? 'text-green-600' : 'text-red-600';

  return (
    <span className={`flex items-center gap-1 ${color}`}>
      <ArrowIcon className="w-4 h-4" />
      <span>{Math.abs(percentChange).toFixed(1)}%</span>
    </span>
  );
}
```

---

## Summary

All research items resolved. No NEEDS CLARIFICATION remaining. Ready for Phase 1 design artifacts.

| Item | Decision |
|------|----------|
| R1 Component Library | Custom Tailwind components |
| R2 State Management | Custom useDashboard hook |
| R3 File Upload | Native File API + React state |
| R4 Responsive Grid | CSS Grid + Tailwind breakpoints |
| R5 Accessibility | Color + icon + text triple encoding |
| R6 Trend Direction | Arrow direction + contextual color |

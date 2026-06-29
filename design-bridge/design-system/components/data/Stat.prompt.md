Metric readout block — mono eyebrow, big tabular display value, optional trend arrow. The workhorse for dashboards.

```jsx
<Stat label="Resting HR" value="58" unit="bpm" tone="vital" trend={{dir:'down', value:'3 bpm'}} />
<Stat label="Steps" value="6,418" size="lg" align="center" />
```

`tone` colors the value; up-trend is teal, down-trend is red.

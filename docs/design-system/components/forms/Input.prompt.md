Labelled text field — focus ring is the periwinkle accent; `error` turns the border red and shows the message.

```jsx
<Input label="Weight" type="number" iconLeft={<i data-lucide="scale"/>} placeholder="kg" />
<Input label="Email" error="Enter a valid email" />
```

Sizes `sm`/`md`/`lg`. Pass `hint` for helper text.

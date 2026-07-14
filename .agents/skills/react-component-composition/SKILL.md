---
name: react-component-composition
description: Build and refactor React components using compound component patterns and context providers instead of boolean prop monoliths. Use when creating complex UI elements, refactoring large components with many conditional renders, or when the user mentions component composition, compound components, or Radix-style APIs.
---

# React Component Composition

## Core Principles

When building complex UIs (forms, composers, modals, complex cards), avoid the "monolith" anti-pattern. Prioritize flexibility and separation of concerns over single-component configurations with endless props.

1. **Ditch Boolean Props** — Never use boolean props (`isUpdate`, `hideHeader`, `isEditingMessage`) to determine which component tree gets rendered from a parent. If a boolean prop controls which subtree renders, composition is missing.
2. **Use JSX for UI Variations** — Instead of passing configuration arrays (e.g., `actions={['text', 'emoji']}`) to a child, use distinct JSX child components. JSX is the best abstraction for UI — always come back to it.
3. **Lift State via Context Providers** — Decouple state from the UI frame. The Provider defines the common interface (state + actions). The implementation (ephemeral `useState`, globally synced hook, etc.) lives at the root and can be swapped without touching children.
4. **Lift State Higher in the Tree** — When actions outside the visual frame need access to state (e.g., a submit button rendered below a composer box), pull the Provider up so it wraps both the frame and the external actions. This eliminates `onFormStateDidChange` callbacks, `useImperativeHandle`, and prop-drilling state back up.

## Implementation Workflow

1. **Create the Context Provider** — Define a context with the common interface: state, actions, and optionally a `meta` object for non-state values (e.g., an input ref any child can focus without prop drilling).
2. **Build the Structural Blocks** — Small, isolated components that consume context. They don't know about variants.
3. **Create Reusable Wrappers (optional)** — When multiple compositions share the same set of blocks (e.g., `CommonActions`), wrap them in a convenience component. But never pass variant booleans to it — if a composition needs different actions, render individual blocks directly.
4. **Compose for the Specific Use Case** — Assemble blocks via JSX. Features are included or excluded by rendering or omitting blocks, not by passing boolean flags.

## Anti-Pattern vs. Preferred Pattern

### Anti-Pattern (The Monolith)

```tsx
export function Composer({
  isThread, isEditing, hidePlusIcon, onCancel,
}: ComposerProps) {
  return (
    <div className="composer">
      {!isEditing && <Header />}
      <Input />
      <Footer
        showPlus={!hidePlusIcon}
        actions={isEditing ? ["format", "emoji"] : ["plus", "format", "emoji"]}
      />
    </div>
  );
}
```

### Preferred Pattern (Composition)

```tsx
// 1. Provider — defines common interface, implementation is swappable
function ComposerProvider({ children, onSubmit }: ComposerProviderProps) {
  const [text, setText] = useState("");
  return (
    <ComposerContext.Provider value={{ text, setText, onSubmit }}>
      {children}
    </ComposerContext.Provider>
  );
}

// 2. Structural blocks — agnostic to which composer renders them
function ComposerFrame({ children }: PropsWithChildren) { /* ... */ }
function ComposerInput() {
  const { text, setText } = useComposerContext();
  /* renders from context, agnostic to state implementation */
}
function ComposerFooter({ children }: PropsWithChildren) { /* ... */ }

// 3. Composed for specific use case — no boolean flags
function EditMessageComposer() {
  return (
    <ComposerProvider onSubmit={updateMessage}>
      <ComposerFrame>
        <ComposerInput />
        <ComposerFooter>
          <FormatAction />
          <EmojiAction />
          <CancelButton />
          <SaveButton />
        </ComposerFooter>
      </ComposerFrame>
    </ComposerProvider>
  );
}
```

## Swappable State Management

The Provider defines the interface; the implementation is plugged in at the root.

```tsx
// Ephemeral state — forward message modal, dismissed on close
function ForwardMessageProvider({ children }: PropsWithChildren) {
  const [text, setText] = useState("");
  const submit = () => forwardMessage(text);
  return (
    <ComposerContext.Provider value={{ text, setText, submit }}>
      {children}
    </ComposerContext.Provider>
  );
}

// Globally synced state — channel composer, synced across devices
function ChannelComposerProvider({ channelId, children }: ChannelProviderProps) {
  const { text, setText, submit } = useGlobalChannel(channelId);
  return (
    <ComposerContext.Provider value={{ text, setText, submit }}>
      {children}
    </ComposerContext.Provider>
  );
}
```

Children are identical in both cases. Only the root provider changes.

## Lifting State: The Key Pattern

When a component outside the visual frame needs context access, lift the provider:

```tsx
// The forward button is OUTSIDE the composer frame but needs submit access
function ForwardMessageModal() {
  return (
    <ForwardMessageProvider>
      <ForwardMessageComposer />   {/* frame, input, footer */}
      <MessagePreview />            {/* unrelated component */}
      <ForwardButton />             {/* uses submit from context — works because it's inside the provider */}
    </ForwardMessageProvider>
  );
}
```

No callbacks, no `useImperativeHandle`, no `onFormStateDidChange`. Just move the provider boundary.

## Decision Guide

| Signal | Action |
|--------|--------|
| Boolean prop determines which subtree renders | Refactor into compound components |
| `actions` or `items` config arrays control child rendering | Replace with JSX children |
| Same component used in 3+ visually distinct contexts | Extract a Provider + composable blocks |
| Prop drilling deeper than 2 levels | Introduce a context provider |
| Adding a new variant requires touching the base component | Composition is missing |
| Actions outside the frame need state/submit access | Lift the provider higher in the tree |

## Notes

- **React Compiler**: Context-based composition pairs well with React Compiler, which auto-memoizes components based on the specific context values they access.
- **AI-friendliness**: Composed component trees are harder for AI to hallucinate incorrectly. Each variant is a distinct, self-contained JSX tree with no conditional branching to get wrong.
- **`meta` on context**: For values that live outside internal state (e.g., an input ref), add a `meta` property to the context value. Any child can focus the input or read layout info without prop drilling.

## Additional Resources

- For the full Slack Composer walkthrough and more examples, see [examples.md](examples.md)

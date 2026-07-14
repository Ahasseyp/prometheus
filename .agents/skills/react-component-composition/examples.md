# React Component Composition — Examples

## Example 1: The User Form (Opening Anti-Pattern)

The classic escalation: you build a form for creating a user, then need one for updating, then one for editing just the name...

### Anti-Pattern

```tsx
<UserForm
  isUpdateUser
  hideWelcomeMessage
  hideTermsAndConditions
  onlyEditName
  isSlugRequired={false}
  onSuccess={/* don't redirect to onboarding */}
/>
```

Every new variant adds another boolean. Peeking inside `UserForm` reveals a mess of ternaries.

### Preferred Pattern

```tsx
// Provider owns validation + submission — implementation is swappable
function UserFormProvider({ children, initialValues, onSubmit }: UserFormProviderProps) {
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState<Record<string, string>>({});
  return (
    <UserFormContext.Provider value={{ values, setValues, errors, setErrors, onSubmit }}>
      {children}
    </UserFormContext.Provider>
  );
}

// Structural blocks
function NameField() { /* consumes context */ }
function EmailField() { /* consumes context */ }
function PasswordField() { /* consumes context */ }
function SlugField({ required = true }: { required?: boolean }) { /* consumes context */ }
function SubmitButton({ children }: PropsWithChildren) { /* consumes context */ }
```

```tsx
// Create user — full form with welcome message and terms
function CreateUserForm() {
  return (
    <UserFormProvider initialValues={{}} onSubmit={createAndRedirectToOnboarding}>
      <WelcomeMessage />
      <NameField />
      <EmailField />
      <PasswordField />
      <SlugField />
      <TermsAndConditions />
      <SubmitButton>Create Account</SubmitButton>
    </UserFormProvider>
  );
}

// Update user — no welcome, no terms, no redirect
function UpdateUserForm({ user }: { user: User }) {
  return (
    <UserFormProvider initialValues={user} onSubmit={updateUser}>
      <NameField />
      <EmailField />
      <SlugField />
      <SubmitButton>Save</SubmitButton>
    </UserFormProvider>
  );
}

// Update name only — just the one field
function UpdateUserNameForm({ user }: { user: User }) {
  return (
    <UserFormProvider initialValues={user} onSubmit={updateUserName}>
      <NameField />
      <SubmitButton>Save Name</SubmitButton>
    </UserFormProvider>
  );
}
```

No booleans. Each variant is a self-contained JSX tree.

---

## Example 2: The Slack Composer (Full Progressive Walkthrough)

This is the flagship example. A composer component used across channels, threads, DM threads, edit message, and forward message — each with subtle differences in UI, actions, and state management.

### Step 1: Build the Shared Primitives

```tsx
// The context interface — all composers share this contract
type ComposerContextValue = {
  text: string;
  setText: (text: string) => void;
  submit: () => void;
  meta?: { inputRef?: RefObject<HTMLTextAreaElement> };
};

const ComposerContext = createContext<ComposerContextValue | null>(null);

function useComposerContext() {
  const ctx = useContext(ComposerContext);
  if (!ctx) throw new Error("Must be used within a ComposerProvider");
  return ctx;
}

// Structural blocks — agnostic to which composer renders them
function ComposerFrame({ children }: PropsWithChildren) {
  return <div className="flex flex-col rounded-lg border border-gray-300">{children}</div>;
}

function ComposerHeader() {
  return <div className="border-b border-gray-200 px-3 py-2">/* formatting toolbar */</div>;
}

function ComposerInput() {
  const { text, setText, meta } = useComposerContext();
  return (
    <textarea
      ref={meta?.inputRef}
      value={text}
      onChange={(e) => setText(e.target.value)}
      className="min-h-[80px] w-full resize-none px-3 py-2 focus:outline-none"
    />
  );
}

function ComposerFooter({ children }: PropsWithChildren) {
  return <div className="flex items-center justify-between border-t border-gray-200 px-3 py-2">{children}</div>;
}

function ComposerDropZone({ children }: PropsWithChildren) {
  return <div onDrop={handleFileDrop} onDragOver={handleDragOver}>{children}</div>;
}

// Individual action components — each is a distinct component, not a config entry
function PlusMenuAction() { return <IconButton icon={<Plus />} onClick={openAttachMenu} />; }
function EmojiAction() { return <IconButton icon={<Smile />} onClick={openEmojiPicker} />; }
function FormatAction() { return <IconButton icon={<Type />} onClick={toggleFormatting} />; }
function MentionAction() { return <IconButton icon={<AtSign />} onClick={openMentionPicker} />; }
function SubmitAction() {
  const { submit } = useComposerContext();
  return <IconButton icon={<Send />} onClick={submit} />;
}
```

### Step 2: CommonActions Wrapper (Optional Convenience)

Many composers share the same set of footer actions. Wrap them for reuse — but never pass variant booleans to this wrapper.

```tsx
function CommonActions() {
  return (
    <>
      <PlusMenuAction />
      <FormatAction />
      <EmojiAction />
      <MentionAction />
    </>
  );
}
```

If a specific composer needs different actions, render individual blocks directly instead of passing `hideX` flags to `CommonActions`.

### Step 3: Channel Composer

```tsx
function ChannelComposerProvider({ channelId, children }: PropsWithChildren<{ channelId: string }>) {
  const { text, setText, submit } = useGlobalChannel(channelId);
  return (
    <ComposerContext.Provider value={{ text, setText, submit }}>
      {children}
    </ComposerContext.Provider>
  );
}

function ChannelComposer({ channelId }: { channelId: string }) {
  return (
    <ChannelComposerProvider channelId={channelId}>
      <ComposerDropZone>
        <ComposerFrame>
          <ComposerHeader />
          <ComposerInput />
          <ComposerFooter>
            <CommonActions />
            <SubmitAction />
          </ComposerFooter>
        </ComposerFrame>
      </ComposerDropZone>
    </ChannelComposerProvider>
  );
}
```

State is globally synced across devices via `useGlobalChannel`. The children don't know or care.

### Step 4: Thread Composer

The only difference from channel: an "Also send to #channel" checkbox.

```tsx
function ThreadComposer({ channelId, threadId }: ThreadComposerProps) {
  return (
    <ChannelComposerProvider channelId={channelId}>
      <ComposerDropZone>
        <ComposerFrame>
          <ComposerHeader />
          <ComposerInput />
          <AlsoSendToChannel channelId={channelId} />
          <ComposerFooter>
            <CommonActions />
            <SubmitAction />
          </ComposerFooter>
        </ComposerFrame>
      </ComposerDropZone>
    </ChannelComposerProvider>
  );
}
```

No `isThread` boolean. No `channelId` prop threaded through the monolith. Just render the extra component or don't.

### Step 5: DM Thread Composer

Almost the same as thread, but the checkbox says "Also send as direct message."

```tsx
function DMThreadComposer({ dmId, threadId }: DMThreadComposerProps) {
  return (
    <ChannelComposerProvider channelId={dmId}>
      <ComposerDropZone>
        <ComposerFrame>
          <ComposerHeader />
          <ComposerInput />
          <AlsoSendAsDirectMessage dmId={dmId} />
          <ComposerFooter>
            <CommonActions />
            <SubmitAction />
          </ComposerFooter>
        </ComposerFrame>
      </ComposerDropZone>
    </ChannelComposerProvider>
  );
}
```

No `isDMThread` flag. A different component handles the different label.

### Step 6: Edit Message Composer

This is where monoliths fall apart. Editing has major differences:
- No DropZone (no attachments)
- No PlusMenuAction, no MentionAction
- Footer has Cancel + Save buttons instead of the send icon

```tsx
function EditMessageComposer({ messageId, onCancel }: EditMessageComposerProps) {
  const handleSave = useUpdateMessage(messageId);
  return (
    <ComposerProvider text={existingText} onSubmit={handleSave}>
      <ComposerFrame>
        <ComposerInput />
        <ComposerFooter>
          <FormatAction />
          <EmojiAction />
          <div className="ml-auto flex gap-2">
            <Button variant="ghost" size="sm" onClick={onCancel}>Cancel</Button>
            <SaveButton />
          </div>
        </ComposerFooter>
      </ComposerFrame>
    </ComposerProvider>
  );
}

function SaveButton() {
  const { submit } = useComposerContext();
  return <Button size="sm" onClick={submit}>Save</Button>;
}
```

No `isEditing` boolean anywhere. No `hideDropZone`. No `showCancelButton`. We just don't render DropZone. We just render Cancel and Save. The component tree is completely distinct.

### Step 7: Forward Message Composer (Lifted State)

This is the key example. Forwarding a message renders a composer inside a modal, but the Forward button is **outside** the composer frame. The state is ephemeral (dismissed with the modal).

**The problem**: The Forward button needs access to the composer's submit action, but it lives outside the composer frame.

**The solution**: Lift the provider.

```tsx
// Ephemeral provider — state is local, discarded on modal close
function ForwardMessageProvider({ children }: PropsWithChildren) {
  const [text, setText] = useState("");
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const submit = () => forwardMessage(text);
  return (
    <ComposerContext.Provider value={{ text, setText, submit, meta: { inputRef } }}>
      {children}
    </ComposerContext.Provider>
  );
}

// The composer itself — just the visual frame
function ForwardMessageComposer() {
  return (
    <ComposerFrame>
      <ComposerHeader />
      <ComposerInput />
      <ComposerFooter>
        <FormatAction />
        <EmojiAction />
        <MentionAction />
      </ComposerFooter>
    </ComposerFrame>
  );
}

// The modal — provider wraps EVERYTHING, not just the composer
function ForwardMessageModal({ message, onClose }: ForwardMessageModalProps) {
  return (
    <Modal open onClose={onClose}>
      <ForwardMessageProvider>
        <ForwardMessageComposer />
        <MessagePreview message={message} />
        <ModalFooter>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <ForwardButton />
        </ModalFooter>
      </ForwardMessageProvider>
    </Modal>
  );
}

// ForwardButton is outside the composer frame but inside the provider
function ForwardButton() {
  const { submit } = useComposerContext();
  return <Button onClick={submit}>Forward</Button>;
}
```

The Forward button accesses `submit` from context. No callbacks. No `useImperativeHandle`. No `onFormStateDidChange`. The provider boundary was simply moved higher.

### What We Built

| Composer | Provider | DropZone | Footer Actions | Submit | State |
|----------|----------|----------|----------------|--------|-------|
| Channel | `ChannelComposerProvider` | Yes | CommonActions + Send icon | Inside frame | Global sync |
| Thread | `ChannelComposerProvider` | Yes | CommonActions + Send icon + AlsoSendToChannel | Inside frame | Global sync |
| DM Thread | `ChannelComposerProvider` | Yes | CommonActions + Send icon + AlsoSendAsDM | Inside frame | Global sync |
| Edit | `ComposerProvider` | No | Format + Emoji + Cancel + Save | Inside frame | Local |
| Forward | `ForwardMessageProvider` | No | Format + Emoji + Mention | Outside frame (lifted) | Ephemeral |

Five visually distinct composers. Zero boolean props. Each is a self-contained JSX tree that reuses shared primitives. A new variant never requires touching the base components.

---

## Example 3: Modal Dialog

A modal that can appear as a confirmation dialog, a form dialog, or an info panel.

### Anti-Pattern

```tsx
function Modal({
  isConfirm, isForm, title, description, onConfirm, onCancel,
  hideCloseButton, formFields, submitLabel, cancelLabel, showFooter,
}: ModalProps) {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/50">
      <div className="rounded-lg bg-white p-6">
        {!hideCloseButton && <button onClick={onCancel}>x</button>}
        <h2>{title}</h2>
        {description && <p>{description}</p>}
        {isForm && formFields?.map((field) => <Input key={field.name} {...field} />)}
        {showFooter && (
          <div className="flex gap-2">
            {!isConfirm && <button onClick={onCancel}>{cancelLabel}</button>}
            <button onClick={onConfirm}>{submitLabel}</button>
          </div>
        )}
      </div>
    </div>
  );
}
```

### Preferred Pattern

```tsx
type ModalContextValue = { open: boolean; onClose: () => void };
const ModalContext = createContext<ModalContextValue | null>(null);

function Root({ children, open, onClose }: PropsWithChildren<{ open: boolean; onClose: () => void }>) {
  if (!open) return null;
  return (
    <ModalContext.Provider value={{ open, onClose }}>
      <div className="fixed inset-0 flex items-center justify-center bg-black/50">
        <div className="rounded-lg bg-white p-6">{children}</div>
      </div>
    </ModalContext.Provider>
  );
}

function CloseButton() {
  const { onClose } = useContext(ModalContext)!;
  return <button onClick={onClose} className="absolute right-4 top-4">x</button>;
}

function Title({ children }: PropsWithChildren) {
  return <h2 className="text-lg font-semibold">{children}</h2>;
}

function Description({ children }: PropsWithChildren) {
  return <p className="mt-2 text-sm text-gray-600">{children}</p>;
}

function Body({ children }: PropsWithChildren) {
  return <div className="mt-4">{children}</div>;
}

function Footer({ children }: PropsWithChildren) {
  return <div className="mt-6 flex justify-end gap-2">{children}</div>;
}

export const Modal = { Root, CloseButton, Title, Description, Body, Footer };
```

```tsx
// Confirmation dialog
function DeleteConfirmation({ open, onClose, onDelete }: DeleteConfirmationProps) {
  return (
    <Modal.Root open={open} onClose={onClose}>
      <Modal.Title>Delete this item?</Modal.Title>
      <Modal.Description>This action cannot be undone.</Modal.Description>
      <Modal.Footer>
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button variant="destructive" onClick={onDelete}>Delete</Button>
      </Modal.Footer>
    </Modal.Root>
  );
}

// Form dialog — same primitives, completely different layout
function EditProfileDialog({ open, onClose }: EditProfileDialogProps) {
  return (
    <Modal.Root open={open} onClose={onClose}>
      <Modal.CloseButton />
      <Modal.Title>Edit Profile</Modal.Title>
      <Modal.Body>
        <Input label="Name" />
        <Input label="Email" />
        <Textarea label="Bio" />
      </Modal.Body>
      <Modal.Footer>
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button>Save</Button>
      </Modal.Footer>
    </Modal.Root>
  );
}
```

---

## Example 4: Card / List Item (No Provider Needed)

Not every compound component needs a context provider. When there's no shared state, just build structural blocks.

### Anti-Pattern

```tsx
<Card
  layout="detailed"
  title={project.name}
  subtitle={project.description}
  image={project.thumbnail}
  showBadge badgeText="Active"
  showActions actions={["edit", "delete", "share"]}
  showMetadata metadata={[{ label: "Created", value: project.createdAt }]}
  compact={false}
/>
```

### Preferred Pattern

```tsx
function Root({ children, className, onClick }: PropsWithChildren<{ className?: string; onClick?: () => void }>) {
  const Component = onClick ? "button" : "div";
  return (
    <Component onClick={onClick} className={cn("rounded-lg border border-gray-200 bg-white", className)}>
      {children}
    </Component>
  );
}

function Thumbnail({ src, alt }: { src: string; alt: string }) {
  return <img src={src} alt={alt} className="h-40 w-full rounded-t-lg object-cover" />;
}

function Header({ children }: PropsWithChildren) {
  return <div className="flex items-center justify-between px-4 pt-4">{children}</div>;
}

function Title({ children }: PropsWithChildren) {
  return <h3 className="text-sm font-semibold">{children}</h3>;
}

function Badge({ children, variant = "default" }: PropsWithChildren<{ variant?: string }>) {
  return <span className={cn("rounded-full px-2 py-0.5 text-xs", variantStyles[variant])}>{children}</span>;
}

function Actions({ children }: PropsWithChildren) {
  return <div className="flex gap-1 border-t border-gray-100 px-4 py-2">{children}</div>;
}

export const Card = { Root, Thumbnail, Header, Title, Badge, Actions };
```

```tsx
// Full card with thumbnail and actions
function ProjectCard({ project }: { project: Project }) {
  return (
    <Card.Root onClick={() => navigate(`/projects/${project.id}`)}>
      <Card.Thumbnail src={project.thumbnail} alt={project.name} />
      <Card.Header>
        <Card.Title>{project.name}</Card.Title>
        <Card.Badge variant="success">Active</Card.Badge>
      </Card.Header>
      <Card.Actions>
        <IconButton icon={<Pencil />} onClick={edit} />
        <IconButton icon={<Share />} onClick={share} />
        <IconButton icon={<Trash />} onClick={remove} />
      </Card.Actions>
    </Card.Root>
  );
}

// Compact list item — same primitives, completely different shape
function ProjectListItem({ project }: { project: Project }) {
  return (
    <Card.Root className="flex items-center gap-4 px-4 py-3">
      <Card.Title>{project.name}</Card.Title>
      <Card.Badge variant="success">Active</Card.Badge>
      <span className="ml-auto text-xs text-gray-400">{formatDate(project.createdAt)}</span>
    </Card.Root>
  );
}
```

---

## Key Takeaways

Across all examples, the pattern is the same:

1. **Provider** — Owns state and actions. Defines the common interface. The implementation (ephemeral vs. synced) is swapped at the root.
2. **Structural Blocks** — Small components that consume context or are purely presentational. They don't know about variants.
3. **Reusable Wrappers** — Optional convenience components (`CommonActions`) that group blocks for repeated compositions. Never pass variant booleans to them — escape to individual blocks when the composition diverges.
4. **Composed Implementations** — Each variant is a self-contained JSX tree. Differences are expressed by including or omitting blocks, not by boolean props.
5. **Lifted State** — When actions outside the frame need context access, move the provider boundary higher. This is the single most impactful refactoring move.

A new variant never requires modifying the base components — only writing a new composition.

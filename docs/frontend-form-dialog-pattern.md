# Form dialog pattern

How to build create/edit forms that open in a dialog on desktop and a bottom
sheet on mobile. Canonical examples:

- `apps/web/src/features/accounts/components/AccountFormDialog/` + `AccountForm/`
- `apps/web/src/features/transactions/components/TransactionFormDialog/` + `TransactionForm/`

## Structure

Two components, always:

1. **`<Thing>FormDialog`** — the shell. Owns nothing but presentation:
   - Props: `open`, `onOpenChange`, and the optional entity being edited
     (`account?`, `transaction?`). Its absence means "create".
   - Chooses `Dialog` (desktop) or `Sheet` (mobile) via `useIsMobile()`.
   - Derives title/description from create vs edit.
   - `handleSuccess()` closes the dialog (`onOpenChange(false)`).
   - Renders `<ThingForm entity={entity} onSuccess={handleSuccess} />`.
2. **`<Thing>Form`** — the form. All behavior lives here:
   - TanStack Form (`useForm`) with a **zod schema in `validators.onSubmit`**.
   - Form values are strings (or enums) — convert to domain types (Date,
     trimmed strings, `undefined` for empty optionals) only in the submit
     handler, right before calling the mutation.
   - Layout: `<form className="flex flex-col gap-5" noValidate>` with
     `handleFormSubmit` calling `event.preventDefault()`, `stopPropagation()`,
     and `form.handleSubmit()`.

## Field wiring

- Every field goes through the shared `FormField` component
  (`src/components/form/FormField.tsx`), which wires TanStack Field state to
  the shadcn `Field` primitives (label, error, `data-invalid`). All fields sit
  inside a single `<Field.Group>`.
- Control-specific adapters wrap the field's `onChange` so any user edit also
  clears the mutation-level form error (`withClearedError`,
  `handleSelectChange`, `handleComboboxChange`, `handleDateChange`). Copy them
  from an existing form rather than reinventing — they encode the exact Base UI
  callback signatures (`string | null` for Select, `{ value } | null` for
  Combobox, `Date | undefined` for the pickers).
- Selects show the selected option's **label**, not its raw value
  (`Select.Value` children with a lookup). Comboboxes receive `{ value, label }`
  option objects plus `itemToStringLabel`/`itemToStringValue`.
- Option sets of 2–5 choices use `ToggleGroup` (see the transaction type
  field). Note: Base UI's `ToggleGroup` uses **array values**
  (`value={[v]}`, `onValueChange` receives `string[]`) — take the last element.
- Dates cross the form as `yyyy-MM-dd` strings; convert at the boundary with
  `date-fns` (`new Date(`${value}T00:00:00`)` keeps it local time).
- Money amounts use the `AmountInput` molecule
  (`src/components/molecules/AmountInput/`), an `InputGroup` with the currency
  symbol/code framing the value; pass the currency of the account the amount
  belongs to (read the account field reactively with `useStore` when the
  currency depends on another field).

## Mutation and errors

- Gateway hooks live in `features/<domain>/gateways/` (`useQuery` wrappers
  around the tRPC proxy client; query key `['<domain>', 'list']`; mutations
  invalidate it in `onSuccess`).
- The form keeps a single `formError` string state for mutation failures,
  rendered with the shared `FormError` component above the field group.
- Map tRPC errors through a per-domain lib (`lib/<domain>-errors.ts`,
  `get<Domain>MutationErrorMessage`) — same pattern as `account-errors.ts`.
- Pending state: `disabled` on every field, `Spinner data-icon="inline-start"`
  on the submit button, and submit text that distinguishes
  "Adding…"/"Save changes" (see `getSubmitButtonText`).

## Cross-field reactivity

When one field filters another (transaction type filters the category list),
read the driving field with `useStore(form.store, (s) => s.values.<field>)`
and reset the dependent field when it changes
(`void form.setFieldValue('<field>', '')`). Give filtered Comboboxes a
`key={drivingValue}` so a stale selection can't linger in the input.

## Tests

- Colocated `<Thing>Form.test.tsx`, rendered with
  `createQueryClientWrapper()`.
- Mock the network with MSW helpers from `src/test/` (`<domain>-helpers.ts`);
  assert the mutation request payload by spying on `window.fetch`.
- Cover: happy path (payload + `onSuccess`), filtered options, cross-field
  reset, and the mutation-error path.

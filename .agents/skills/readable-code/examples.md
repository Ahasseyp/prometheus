# Readable Code Examples

Before/after examples demonstrating how to refactor clever code into readable code.

---

## 1. Naming conditions instead of inlining them

**Before** (compact, hard to reason about):

```typescript
if (user.role === 'admin' || (user.role === 'editor' && user.permissions.includes('publish') && !user.suspended)) {
  publishArticle(article);
}
```

**After** (each rule is named):

```typescript
const isAdmin = user.role === 'admin';
const isEditorWithPublishAccess =
  user.role === 'editor' &&
  user.permissions.includes('publish') &&
  !user.suspended;

if (isAdmin || isEditorWithPublishAccess) {
  publishArticle(article);
}
```

---

## 2. Breaking method chains into named steps

**Before** (dense chain):

```typescript
const result = orders
  .filter(o => o.status === 'completed' && o.items.some(i => i.category === 'electronics' && i.price > 100))
  .map(o => ({ ...o, total: o.items.reduce((sum, i) => sum + i.price * i.quantity, 0) }))
  .sort((a, b) => b.total - a.total);
```

**After** (named steps):

```typescript
const completedElectronicsOrders = orders.filter((order) => {
  const isCompleted = order.status === 'completed';
  const hasExpensiveElectronics = order.items.some(
    (item) => item.category === 'electronics' && item.price > 100,
  );
  return isCompleted && hasExpensiveElectronics;
});

const ordersWithTotals = completedElectronicsOrders.map((order) => {
  const total = order.items.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0,
  );
  return { ...order, total };
});

const sortedByTotal = ordersWithTotals.sort((a, b) => b.total - a.total);
```

---

## 3. Replacing nested ternaries with guard clauses

**Before** (nested ternary):

```typescript
const label = user.isAdmin
  ? 'Administrator'
  : user.isEditor
    ? user.canPublish
      ? 'Senior Editor'
      : 'Editor'
    : 'Viewer';
```

**After** (early returns in a function):

```typescript
function getUserLabel(user: User): string {
  if (user.isAdmin) return 'Administrator';
  if (user.isEditor && user.canPublish) return 'Senior Editor';
  if (user.isEditor) return 'Editor';
  return 'Viewer';
}
```

---

## 4. Decomposing dense destructuring

**Before** (all-at-once destructure with defaults and renames):

```typescript
const { data: { user: { name: displayName = 'Anonymous', preferences: { theme = 'light', notifications: { email: emailEnabled = true } = {} } = {} } = {} } = {} } = response;
```

**After** (step-by-step extraction):

```typescript
const userData = response.data?.user;
const displayName = userData?.name ?? 'Anonymous';
const preferences = userData?.preferences ?? {};
const theme = preferences.theme ?? 'light';
const emailEnabled = preferences.notifications?.email ?? true;
```

---

## 5. Separating data transformation from side effects

**Before** (mixed logic):

```typescript
async function processOrders(orders: Order[]) {
  await Promise.all(orders.filter(o => o.status === 'pending' && Date.now() - o.createdAt > 86400000).map(async o => {
    o.status = 'expired';
    await db.orders.update(o.id, { status: 'expired' });
    await notify(o.userId, `Order ${o.id} expired`);
  }));
}
```

**After** (named steps, separated concerns):

```typescript
async function processOrders(orders: Order[]) {
  const oneDayMs = 24 * 60 * 60 * 1000;
  const staleOrders = orders.filter((order) => {
    const isPending = order.status === 'pending';
    const isOlderThanOneDay = Date.now() - order.createdAt > oneDayMs;
    return isPending && isOlderThanOneDay;
  });

  for (const order of staleOrders) {
    await expireOrder(order);
  }
}

async function expireOrder(order: Order) {
  order.status = 'expired';
  await db.orders.update(order.id, { status: 'expired' });
  await notify(order.userId, `Order ${order.id} expired`);
}
```

---

## 6. General pattern: "clever becomes unreadable when requirements change"

Initial clever one-liner:

```typescript
const discount = qty > 100 ? 0.2 : qty > 50 ? 0.1 : 0;
```

After a new requirement (loyalty customers get +5%, sale items get +3%):

**Bad** (patching the clever code):

```typescript
const discount = (qty > 100 ? 0.2 : qty > 50 ? 0.1 : 0) + (user.isLoyal ? 0.05 : 0) + (item.onSale ? 0.03 : 0);
```

**Good** (readable from the start):

```typescript
function calculateDiscount(qty: number, user: User, item: Item): number {
  let discount = 0;

  if (qty > 100) discount = 0.2;
  else if (qty > 50) discount = 0.1;

  if (user.isLoyal) discount += 0.05;
  if (item.onSale) discount += 0.03;

  return discount;
}
```

---

## 7. Splitting a long chain into named pipeline steps

**Before** (single chain, hard to inspect intermediate values):

```typescript
const result = users
  .filter((u) => !u.deleted && u.age > 18 && u.name)
  .map((u) => ({ ...u, name: u.name.trim().toLowerCase() }))
  .sort((a, b) => a.name.localeCompare(b.name))
  .slice(0, 10);
```

**After** (each step named, easy to log or breakpoint):

```typescript
const activeAdults = users.filter((u) => !u.deleted && u.age > 18 && u.name);
const normalized = activeAdults.map((u) => ({
  ...u,
  name: u.name.trim().toLowerCase(),
}));
const sorted = normalized.sort((a, b) => a.name.localeCompare(b.name));
const topTen = sorted.slice(0, 10);
```

---

## 8. Extracting complex filter logic into named functions

**Before** (dense boolean expression buried in a callback):

```typescript
const visibleUsers = users.filter(
  (u) =>
    u.isAdmin ||
    ((u.active || (u.gracePeriodEnds && u.gracePeriodEnds > Date.now())) &&
      u.verified &&
      !u.banned),
);
```

**After** (each rule named, guard clauses flatten the logic):

```typescript
function isInGracePeriod(user: User): boolean {
  return user.gracePeriodEnds && user.gracePeriodEnds > Date.now();
}

function canAccess(user: User): boolean {
  if (user.isAdmin) return true;
  if (user.banned) return false;
  if (!user.verified) return false;
  return user.active || isInGracePeriod(user);
}

const visibleUsers = users.filter(canAccess);
```

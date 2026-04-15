# Settings Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a `/settings` page with two tabs — Profile (edit name + email, all roles) and Company (edit company details, admin only).

**Architecture:** One new server endpoint (`PUT /api/v1/auth/me`) for profile updates. Three new client files (`SettingsPage`, `ProfileTab`, `CompanyTab`). `AuthContext` gains an `updateUser` method to sync state after save. Company tab reuses the existing `PUT /api/v1/companies/:id` endpoint.

**Tech Stack:** Express + Prisma + Zod (server); React + Ant Design + TypeScript (client)

---

## File Map

### Server
| File | Change |
|------|--------|
| `server/src/validators/auth.validator.ts` | Add `updateMeSchema` |
| `server/src/controllers/auth.controller.ts` | Add `updateMe` handler |
| `server/src/routes/auth.routes.ts` | Add `PUT /me` route |

### Client
| File | Change |
|------|--------|
| `client/src/contexts/AuthContext.tsx` | Add `updateUser` method |
| `client/src/hooks/useAuth.ts` | Expose `updateUser` from context (verify it re-exports it) |
| `client/src/pages/settings/ProfileTab.tsx` | Create |
| `client/src/pages/settings/CompanyTab.tsx` | Create |
| `client/src/pages/settings/SettingsPage.tsx` | Create |
| `client/src/App.tsx` | Add `<Route path="settings">` + import |

---

## Task 1: Add `updateMeSchema` to auth validator

**Files:**
- Modify: `server/src/validators/auth.validator.ts`

- [ ] **Step 1: Add the schema**

Open `server/src/validators/auth.validator.ts` and append:

```typescript
export const updateMeSchema = z.object({
  fullName: z.string().min(2).max(150),
  email: z.string().email().max(150),
});

export type UpdateMeInput = z.infer<typeof updateMeSchema>;
```

- [ ] **Step 2: Type-check server**

```bash
cd server && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add server/src/validators/auth.validator.ts
git commit -m "feat: add updateMeSchema to auth validator"
```

---

## Task 2: Add `updateMe` controller and route

**Files:**
- Modify: `server/src/controllers/auth.controller.ts`
- Modify: `server/src/routes/auth.routes.ts`

- [ ] **Step 1: Add `updateMe` handler to auth controller**

Open `server/src/controllers/auth.controller.ts`. Add the import for `updateMeSchema` at the top (it already imports `registerSchema`, `loginSchema`, `refreshSchema` — add `updateMeSchema` to the same import line):

```typescript
import { registerSchema, loginSchema, refreshSchema, updateMeSchema } from '../validators/auth.validator';
```

Then append the handler at the bottom of the file:

```typescript
export async function updateMe(req: Request, res: Response) {
  if (!req.user) return unauthorized(res);

  const parsed = updateMeSchema.safeParse(req.body);
  if (!parsed.success) {
    return error(res, parsed.error.errors.map(e => e.message).join(', '));
  }

  const { fullName, email } = parsed.data;

  const existing = await prisma.user.findFirst({
    where: { email, NOT: { id: BigInt(req.user.userId) } },
  });
  if (existing) return error(res, 'Email is already in use by another account');

  const updated = await prisma.user.update({
    where: { id: BigInt(req.user.userId) },
    data: { fullName, email },
    select: { id: true, fullName: true, email: true, status: true },
  });

  return success(res, { user: { ...updated, id: updated.id.toString() } });
}
```

- [ ] **Step 2: Register the route**

Open `server/src/routes/auth.routes.ts`. Add this line after the existing `router.get('/me', ...)` line:

```typescript
router.put('/me', authenticate, auditLog, authController.updateMe);
```

The full routes file should now look like:

```typescript
import { Router } from 'express';
import * as authController from '../controllers/auth.controller';
import { authenticate } from '../middleware/auth.middleware';
import { auditLog } from '../middleware/auditLog.middleware';

const router = Router();

router.post('/register', auditLog, authController.register);
router.post('/login', auditLog, authController.login);
router.post('/refresh', auditLog, authController.refresh);
router.post('/logout', auditLog, authController.logout);
router.get('/me', authenticate, authController.me);
router.put('/me', authenticate, auditLog, authController.updateMe);

export default router;
```

- [ ] **Step 3: Type-check server**

```bash
cd server && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add server/src/controllers/auth.controller.ts server/src/routes/auth.routes.ts
git commit -m "feat: add PUT /auth/me endpoint for profile updates"
```

---

## Task 3: Add `updateUser` to AuthContext

**Files:**
- Modify: `client/src/contexts/AuthContext.tsx`

- [ ] **Step 1: Update the context interface**

Open `client/src/contexts/AuthContext.tsx`. Add `updateUser` to the `AuthContextType` interface:

```typescript
interface AuthContextType {
  user: User | null;
  companies: CompanyAccess[];
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (fullName: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (patch: Partial<User>) => void;
}
```

- [ ] **Step 2: Implement `updateUser` inside `AuthProvider`**

Inside `AuthProvider`, add this after the `logout` callback:

```typescript
const updateUser = useCallback((patch: Partial<User>) => {
  setUser(prev => prev ? { ...prev, ...patch } : prev);
}, []);
```

- [ ] **Step 3: Expose it on the Provider value**

Update the `<AuthContext.Provider value={...}>` to include `updateUser`:

```typescript
return (
  <AuthContext.Provider value={{ user, companies, isAuthenticated, isLoading, login, register, logout, updateUser }}>
    {children}
  </AuthContext.Provider>
);
```

- [ ] **Step 4: Verify `useAuth` hook re-exports it**

Open `client/src/hooks/useAuth.ts`. It should simply return the full context value — `updateUser` will be available automatically since it's on the context. No changes needed if the hook returns the whole context object. Confirm it does.

- [ ] **Step 5: Type-check client**

```bash
cd client && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add client/src/contexts/AuthContext.tsx
git commit -m "feat: add updateUser to AuthContext"
```

---

## Task 4: Build ProfileTab

**Files:**
- Create: `client/src/pages/settings/ProfileTab.tsx`

- [ ] **Step 1: Create the file**

Create `client/src/pages/settings/ProfileTab.tsx`:

```typescript
import { useState } from 'react';
import { Form, Input, Button, message } from 'antd';
import { useAuth } from '../../hooks/useAuth';
import api from '../../services/api';

export default function ProfileTab() {
  const { user, updateUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [form] = Form.useForm();

  const onFinish = async (values: { fullName: string; email: string }) => {
    setLoading(true);
    try {
      await api.put('/auth/me', values);
      updateUser(values);
      message.success('Profile updated');
    } catch (err: any) {
      message.error(err.response?.data?.error || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Form
      form={form}
      layout="vertical"
      onFinish={onFinish}
      initialValues={{ fullName: user?.fullName, email: user?.email }}
      style={{ maxWidth: 480 }}
    >
      <Form.Item
        name="fullName"
        label="Full Name"
        rules={[{ required: true, min: 2, message: 'At least 2 characters required' }]}
      >
        <Input />
      </Form.Item>
      <Form.Item
        name="email"
        label="Email"
        rules={[{ required: true, type: 'email', message: 'Enter a valid email address' }]}
      >
        <Input />
      </Form.Item>
      <Form.Item>
        <Button type="primary" htmlType="submit" loading={loading}>
          Save Changes
        </Button>
      </Form.Item>
    </Form>
  );
}
```

- [ ] **Step 2: Type-check client**

```bash
cd client && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add client/src/pages/settings/ProfileTab.tsx
git commit -m "feat: add ProfileTab component"
```

---

## Task 5: Build CompanyTab

**Files:**
- Create: `client/src/pages/settings/CompanyTab.tsx`

- [ ] **Step 1: Create the file**

Create `client/src/pages/settings/CompanyTab.tsx`:

```typescript
import { useState, useEffect } from 'react';
import { Form, Input, InputNumber, Button, message, Descriptions } from 'antd';
import { useCompany } from '../../contexts/CompanyContext';
import api from '../../services/api';

export default function CompanyTab() {
  const { activeCompany, setActiveCompany } = useCompany();
  const [loading, setLoading] = useState(false);
  const [form] = Form.useForm();

  useEffect(() => {
    if (!activeCompany) return;
    api.get(`/companies/${activeCompany.id}`)
      .then(({ data }) => form.setFieldsValue(data.data))
      .catch(() => message.error('Failed to load company details'));
  }, [activeCompany?.id, form]);

  const onFinish = async (values: { name: string; address: string; challanPrefix: string; fiscalYearStart: number }) => {
    if (!activeCompany) return;
    setLoading(true);
    try {
      const { data } = await api.put(`/companies/${activeCompany.id}`, values);
      setActiveCompany({ ...activeCompany, name: data.data.name });
      message.success('Company updated');
    } catch (err: any) {
      message.error(err.response?.data?.error || 'Failed to update company');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Descriptions
        bordered
        size="small"
        style={{ maxWidth: 480, marginBottom: 24 }}
        column={1}
      >
        <Descriptions.Item label="BIN (read-only)">{activeCompany?.bin}</Descriptions.Item>
      </Descriptions>
      <Form
        form={form}
        layout="vertical"
        onFinish={onFinish}
        style={{ maxWidth: 480 }}
      >
        <Form.Item
          name="name"
          label="Company Name"
          rules={[{ required: true, min: 2, message: 'At least 2 characters required' }]}
        >
          <Input />
        </Form.Item>
        <Form.Item
          name="address"
          label="Address"
          rules={[{ required: true, min: 5, message: 'At least 5 characters required' }]}
        >
          <Input.TextArea rows={3} />
        </Form.Item>
        <Form.Item name="challanPrefix" label="Challan Prefix">
          <Input placeholder="CH" />
        </Form.Item>
        <Form.Item
          name="fiscalYearStart"
          label="Fiscal Year Start Month (1–12)"
        >
          <InputNumber min={1} max={12} />
        </Form.Item>
        <Form.Item>
          <Button type="primary" htmlType="submit" loading={loading}>
            Save Changes
          </Button>
        </Form.Item>
      </Form>
    </>
  );
}
```

- [ ] **Step 2: Type-check client**

```bash
cd client && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add client/src/pages/settings/CompanyTab.tsx
git commit -m "feat: add CompanyTab component"
```

---

## Task 6: Build SettingsPage and wire routing

**Files:**
- Create: `client/src/pages/settings/SettingsPage.tsx`
- Modify: `client/src/App.tsx`

- [ ] **Step 1: Create SettingsPage**

Create `client/src/pages/settings/SettingsPage.tsx`:

```typescript
import { Tabs } from 'antd';
import { useCompany } from '../../contexts/CompanyContext';
import ProfileTab from './ProfileTab';
import CompanyTab from './CompanyTab';

export default function SettingsPage() {
  const { isAdmin } = useCompany();

  const items = [
    { key: 'profile', label: 'Profile', children: <ProfileTab /> },
    ...(isAdmin ? [{ key: 'company', label: 'Company', children: <CompanyTab /> }] : []),
  ];

  return (
    <div>
      <h2 className="text-2xl font-bold text-on-surface mb-6 font-headline">Settings</h2>
      <Tabs items={items} />
    </div>
  );
}
```

- [ ] **Step 2: Add route in App.tsx**

Open `client/src/App.tsx`. Add the import near the other page imports at the top:

```typescript
import SettingsPage from './pages/settings/SettingsPage';
```

Then add the route inside the authenticated layout routes (after the `reports` route, before the closing `</Route>`):

```tsx
<Route path="settings" element={<SettingsPage />} />
```

- [ ] **Step 3: Type-check client**

```bash
cd client && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Smoke-test in browser**

Start the dev server:
```bash
npm run dev
```

Check:
1. Click "Settings" in the sidebar — page loads (no more dead-end).
2. Profile tab shows current name and email pre-filled.
3. Edit name/email and save — success toast appears, header updates immediately.
4. As admin: Company tab is visible. BIN shows as read-only. Edit name and save — header company name updates.
5. As operator: Company tab is hidden.

- [ ] **Step 5: Commit**

```bash
git add client/src/pages/settings/SettingsPage.tsx client/src/App.tsx
git commit -m "feat: add Settings page with Profile and Company tabs"
```

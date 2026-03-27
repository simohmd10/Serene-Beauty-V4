# Serene Beauty — E-Commerce Store

React 18 + Vite + TypeScript + Supabase + Tailwind CSS + shadcn/ui

---

## 🚀 Setup

### 1. Clone & Install

```bash
npm install
```

### 2. Environment Variables

Copy `.env.example` to `.env` and fill in your Supabase credentials:

```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key_here
```

### 3. Database Setup

Run **`SUPABASE_COMPLETE.sql`** in your Supabase Dashboard → SQL Editor.

> ⚠️ This single file replaces the old `SUPABASE_SETUP.sql` + `PROFILES_SETUP.sql`.
> It sets up all tables, RLS policies, the atomic `place_order()` function,
> and the `product-images` storage bucket.

After running the SQL, grant admin role to your account:

```sql
UPDATE profiles SET role = 'admin'
  WHERE id = (SELECT id FROM auth.users WHERE email = 'your@email.com');
```

### 4. Supabase Storage

The `product-images` bucket is created automatically by `SUPABASE_COMPLETE.sql`.
If you prefer to create it manually: Supabase Dashboard → Storage → New bucket → `product-images` (Public).

### 5. Run Locally

```bash
npm run dev
```

---

## 📁 Project Structure

```
src/
├── components/
│   ├── admin/         # Admin layout & sidebar
│   ├── home/          # Homepage sections
│   ├── ui/            # shadcn/ui components
│   └── ErrorBoundary.tsx
├── context/
│   ├── AdminAuthContext.tsx   # Supabase auth + role check
│   ├── AdminDataContext.tsx   # Admin CRUD operations
│   └── CartContext.tsx        # Cart with localStorage
├── hooks/
│   ├── useProducts.ts         # Product queries & mutations
│   ├── useOrders.ts           # Order queries (RPC for insert)
│   ├── useCustomers.ts        # Customer queries
│   └── useCategories.ts       # Public category hook
├── lib/
│   ├── supabase.ts            # Supabase client
│   ├── supabase-storage.ts    # Image upload helpers
│   └── category-service.ts   # Category CRUD functions
├── pages/
│   ├── admin/                 # Admin pages
│   └── ...                    # Storefront pages
└── data/
    └── products.ts            # Initial seed data (static)
```

---

## 🔒 Security Notes

- **RLS** is enabled on all tables. Anonymous users can only read products/categories and insert orders (via the `place_order` RPC function).
- **Admin writes** require `is_admin()` to return true (checks `profiles.role`).
- **Image uploads** go to Supabase Storage — no base64 in the database.
- **Order placement** uses an atomic PostgreSQL function (`place_order`) — all-or-nothing transaction.

---

## 📝 Admin Panel

Access at `/admin`. Features:
- Dashboard with real-time revenue charts
- Product management (CRUD + image upload)
- Order management & status updates
- Customer list
- Category management (synced with storefront)
- Store settings (persisted to DB)

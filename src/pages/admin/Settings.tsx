import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Store, Bell, Shield, Globe, Save, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAdminAuth } from "@/context/AdminAuthContext";

// ── Helpers ────────────────────────────────────────────────────────────────────

// FIX H-1: Settings now persist to Supabase store_settings table.
// Each setting is a key-value row: { key: "store_name", value: "Serene Beauty" }

async function loadSettings(): Promise<Record<string, string>> {
  const { data, error } = await supabase.from("store_settings").select("key, value");
  if (error) throw new Error(error.message);
  return Object.fromEntries((data ?? []).map((r) => [r.key, r.value ?? ""]));
}

async function saveSettings(settings: Record<string, string>): Promise<void> {
  const rows = Object.entries(settings).map(([key, value]) => ({
    key,
    value,
    updated_at: new Date().toISOString(),
  }));
  const { error } = await supabase
    .from("store_settings")
    .upsert(rows, { onConflict: "key" });
  if (error) throw new Error(error.message);
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function Section({ title, icon: Icon, children }: {
  title: string;
  icon: React.ElementType;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-xl border shadow-sm p-4 space-y-4">
      <div className="flex items-center gap-2">
        <Icon className="w-4 h-4 text-rose-500" />
        <h2 className="text-sm font-semibold text-gray-800">{title}</h2>
      </div>
      {children}
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function Settings() {
  const { userEmail } = useAdminAuth();

  const [store, setStore] = useState({
    name:        "Serene Beauty",
    email:       "contact@serenebeauty.com",
    phone:       "+1-800-SERENE",
    currency:    "USD",
    description: "Premium cosmetics designed to enhance your natural beauty.",
  });

  const [notifications, setNotifications] = useState({
    newOrders:    true,
    lowStock:     true,
    newCustomers: false,
    marketing:    false,
  });

  const [loadingSettings, setLoadingSettings] = useState(true);
  const [savingStore,     setSavingStore]      = useState(false);
  const [password, setPassword] = useState({ current: "", next: "", confirm: "" });
  const [savingPassword, setSavingPassword] = useState(false);

  // Load persisted settings from Supabase on mount
  useEffect(() => {
    loadSettings()
      .then((saved) => {
        setStore({
          name:        saved.store_name        ?? "Serene Beauty",
          email:       saved.store_email       ?? "contact@serenebeauty.com",
          phone:       saved.store_phone       ?? "+1-800-SERENE",
          currency:    saved.store_currency    ?? "USD",
          description: saved.store_description ?? "Premium cosmetics designed to enhance your natural beauty.",
        });
        setNotifications({
          newOrders:    saved.notify_new_orders    !== "false",
          lowStock:     saved.notify_low_stock     !== "false",
          newCustomers: saved.notify_new_customers === "true",
          marketing:    saved.notify_marketing     === "true",
        });
      })
      .catch(() => {
        // Silently fall back to defaults if table not set up yet
      })
      .finally(() => setLoadingSettings(false));
  }, []);

  const handleStoreSave = async () => {
    setSavingStore(true);
    try {
      await saveSettings({
        store_name:           store.name,
        store_email:          store.email,
        store_phone:          store.phone,
        store_currency:       store.currency,
        store_description:    store.description,
        notify_new_orders:    String(notifications.newOrders),
        notify_low_stock:     String(notifications.lowStock),
        notify_new_customers: String(notifications.newCustomers),
        notify_marketing:     String(notifications.marketing),
      });
      toast.success("Store settings saved");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Save failed";
      toast.error(`Failed to save: ${msg}`);
    } finally {
      setSavingStore(false);
    }
  };

  const handlePasswordSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.next !== password.confirm) {
      toast.error("New passwords do not match");
      return;
    }
    if (password.next.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }
    setSavingPassword(true);
    if (userEmail) {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: userEmail,
        password: password.current,
      });
      if (signInError) {
        toast.error("Current password is incorrect");
        setSavingPassword(false);
        return;
      }
    }
    const { error } = await supabase.auth.updateUser({ password: password.next });
    setSavingPassword(false);
    if (error) {
      toast.error("Failed to update password");
      return;
    }
    toast.success("Password updated successfully");
    setPassword({ current: "", next: "", confirm: "" });
  };

  if (loadingSettings) {
    return (
      <div className="p-4 lg:p-6 flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-rose-400" />
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-6 space-y-5 max-w-2xl mx-auto">
      <div>
        <h1 className="text-xl lg:text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-500 text-sm mt-0.5">Manage your store preferences</p>
      </div>

      {/* Store Info */}
      <Section title="Store Information" icon={Store}>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label className="text-sm text-gray-600">Store Name</Label>
            <Input value={store.name} onChange={(e) => setStore((s) => ({ ...s, name: e.target.value }))} className="h-11" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm text-gray-600">Email</Label>
            <Input type="email" value={store.email} onChange={(e) => setStore((s) => ({ ...s, email: e.target.value }))} className="h-11" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-sm text-gray-600">Phone</Label>
              <Input value={store.phone} onChange={(e) => setStore((s) => ({ ...s, phone: e.target.value }))} className="h-11" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm text-gray-600">Currency</Label>
              <Input value={store.currency} onChange={(e) => setStore((s) => ({ ...s, currency: e.target.value }))} className="h-11" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm text-gray-600">Store Description</Label>
            <Textarea value={store.description} onChange={(e) => setStore((s) => ({ ...s, description: e.target.value }))} rows={3} className="resize-none" />
          </div>
          <Button onClick={handleStoreSave} disabled={savingStore} className="w-full h-11 bg-rose-500 hover:bg-rose-600 text-white gap-2">
            {savingStore ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {savingStore ? "Saving…" : "Save Changes"}
          </Button>
        </div>
      </Section>

      {/* Notifications */}
      <Section title="Notifications" icon={Bell}>
        <div className="space-y-3">
          {([
            { key: "newOrders",    label: "New orders",       desc: "Get notified for each new order" },
            { key: "lowStock",     label: "Low stock alerts", desc: "Alert when product stock is low" },
            { key: "newCustomers", label: "New customers",    desc: "Notify on new registrations" },
            { key: "marketing",    label: "Marketing updates",desc: "Promotions and tips" },
          ] as const).map(({ key, label, desc }) => (
            <div key={key} className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-900">{label}</p>
                <p className="text-xs text-gray-500">{desc}</p>
              </div>
              <Switch
                checked={notifications[key]}
                onCheckedChange={(v) => setNotifications((n) => ({ ...n, [key]: v }))}
                className="data-[state=checked]:bg-rose-500"
              />
            </div>
          ))}
          <p className="text-xs text-gray-400 pt-1">Changes are saved with the Store Information button above.</p>
        </div>
      </Section>

      {/* Password */}
      <Section title="Change Password" icon={Shield}>
        <form onSubmit={handlePasswordSave} className="space-y-3">
          <div className="space-y-1.5">
            <Label className="text-sm text-gray-600">Current Password</Label>
            <Input type="password" value={password.current} onChange={(e) => setPassword((p) => ({ ...p, current: e.target.value }))} className="h-11" required />
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm text-gray-600">New Password</Label>
            <Input type="password" value={password.next} onChange={(e) => setPassword((p) => ({ ...p, next: e.target.value }))} className="h-11" required />
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm text-gray-600">Confirm New Password</Label>
            <Input type="password" value={password.confirm} onChange={(e) => setPassword((p) => ({ ...p, confirm: e.target.value }))} className="h-11" required />
          </div>
          <Button type="submit" variant="outline" className="w-full h-11 gap-2" disabled={savingPassword}>
            <Shield className="w-4 h-4" />
            {savingPassword ? "Updating..." : "Update Password"}
          </Button>
        </form>
      </Section>

      {/* About */}
      <Section title="About" icon={Globe}>
        <div className="space-y-2 text-sm text-gray-600">
          <div className="flex justify-between">
            <span>Version</span>
            <span className="font-medium text-gray-900">1.0.0</span>
          </div>
          <div className="flex justify-between">
            <span>Platform</span>
            <span className="font-medium text-gray-900">Serene Beauty Admin</span>
          </div>
          <div className="flex justify-between">
            <span>Admin Email</span>
            <span className="font-medium text-gray-900">{userEmail ?? "—"}</span>
          </div>
        </div>
      </Section>
    </div>
  );
}

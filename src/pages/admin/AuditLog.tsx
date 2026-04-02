import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { ScrollText, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface AuditEntry {
  id: number;
  event: string;
  order_id: string | null;
  order_ref: string | null;
  email: string | null;
  details: Record<string, unknown> | null;
  created_at: string;
}

const EVENT_STYLES: Record<string, string> = {
  order_placed: "bg-green-50 text-green-700 border-green-100",
  order_failed: "bg-red-50 text-red-700 border-red-100",
};

export default function AuditLog() {
  const [logs,    setLogs]    = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    const { data, error: err } = await supabase
      .from("audit_log")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);

    if (err) {
      setError(err.message);
    } else {
      setLogs((data ?? []) as AuditEntry[]);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  return (
    <div className="p-4 lg:p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl lg:text-2xl font-bold text-gray-900 flex items-center gap-2">
            <ScrollText className="w-5 h-5 text-rose-500" />
            Audit Log
          </h1>
          <p className="text-gray-500 text-sm mt-0.5">
            Immutable record of all order events
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={load} disabled={loading} className="gap-1.5">
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Desktop table */}
      <div className="hidden md:block bg-white rounded-xl border shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-gray-50">
              {["Time","Event","Order Ref","Email","Details"].map((h) => (
                <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y">
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i}>
                  {Array.from({ length: 5 }).map((_, j) => (
                    <td key={j} className="px-4 py-3">
                      <div className="h-4 bg-gray-100 rounded animate-pulse" />
                    </td>
                  ))}
                </tr>
              ))
            ) : logs.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-12 text-center text-gray-400 text-sm">
                  No audit events yet.
                </td>
              </tr>
            ) : (
              logs.map((log) => (
                <tr key={log.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap font-mono">
                    {new Date(log.created_at).toLocaleString("en-US", {
                      month: "short", day: "numeric",
                      hour: "2-digit", minute: "2-digit", second: "2-digit",
                    })}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium border ${EVENT_STYLES[log.event] ?? "bg-gray-50 text-gray-600 border-gray-100"}`}>
                      {log.event}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-700">
                    {log.order_ref ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-600 max-w-[160px] truncate">
                    {log.email ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500 max-w-[220px]">
                    {log.details ? (
                      <pre className="text-[11px] bg-gray-50 rounded p-1 overflow-x-auto">
                        {JSON.stringify(log.details, null, 2)}
                      </pre>
                    ) : "—"}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="md:hidden space-y-3">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-white rounded-xl border shadow-sm p-4 space-y-2">
              <div className="h-4 bg-gray-100 rounded animate-pulse w-1/3" />
              <div className="h-3 bg-gray-100 rounded animate-pulse w-2/3" />
            </div>
          ))
        ) : logs.map((log) => (
          <div key={log.id} className="bg-white rounded-xl border shadow-sm p-4 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium border ${EVENT_STYLES[log.event] ?? "bg-gray-50 text-gray-600 border-gray-100"}`}>
                {log.event}
              </span>
              <span className="text-[11px] text-gray-400 font-mono">
                {new Date(log.created_at).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
              </span>
            </div>
            {log.order_ref && <p className="text-xs font-mono text-gray-700">{log.order_ref}</p>}
            {log.email     && <p className="text-xs text-gray-500 truncate">{log.email}</p>}
          </div>
        ))}
      </div>
    </div>
  );
}

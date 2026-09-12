import { X, User, Monitor, Clock, FileText, CheckCircle, AlertTriangle, Shield, Code, ArrowRight, Building2, KeyRound } from "lucide-react";
import { AuditLogItem } from "../../api/activityLogs.api";

interface ActivityLogDrawerProps {
  log: AuditLogItem | null;
  onClose: () => void;
}

export default function ActivityLogDrawer({ log, onClose }: ActivityLogDrawerProps) {
  if (!log) return null;

  const severityBg: Record<string, string> = {
    INFO: "bg-blue-50 text-blue-700 border-blue-200",
    SUCCESS: "bg-emerald-50 text-emerald-700 border-emerald-200",
    WARNING: "bg-amber-50 text-amber-700 border-amber-200",
    ERROR: "bg-rose-50 text-rose-700 border-rose-200",
    CRITICAL: "bg-red-100 text-red-900 border-red-300 font-extrabold",
    SECURITY: "bg-purple-50 text-purple-700 border-purple-200",
    SYSTEM: "bg-slate-100 text-slate-700 border-slate-200",
  };

  const oldData = log.oldData || log.oldValue || log.changes?.removed;
  const newData = log.newData || log.newValue || log.changes?.added;
  const updatedDiff = log.changes?.updated;

  return (
    <div className="fixed inset-y-0 right-0 w-full max-w-xl bg-white shadow-2xl z-50 flex flex-col border-l border-slate-200 animate-in slide-in-from-right duration-200">
      {/* Drawer Header */}
      <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#E8F3EC] text-[#4A7B5B] flex items-center justify-center font-bold text-sm">
            {log.userName ? log.userName.charAt(0).toUpperCase() : "A"}
          </div>
          <div>
            <h3 className="font-extrabold text-slate-900 text-base leading-tight">{log.action}</h3>
            <p className="text-xs text-slate-400">{log.module} • {new Date(log.createdAt).toLocaleString()}</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Drawer Body */}
      <div className="flex-1 overflow-y-auto p-6 space-y-5 text-xs">
        {/* Status & Severity Badges */}
        <div className="flex items-center gap-2">
          <span className={`px-2.5 py-1 rounded-lg font-bold border ${severityBg[log.severity] || "bg-slate-50 text-slate-700"}`}>
            {log.severity}
          </span>
          <span className={`px-2.5 py-1 rounded-lg font-bold border ${log.status === "SUCCESS" ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-rose-50 text-rose-700 border-rose-200"}`}>
            {log.status}
          </span>
          <span className="text-slate-400 font-mono text-[11px] ml-auto">Req ID: {log.requestId || log.id.slice(-8)}</span>
        </div>

        {/* Actor & Post Attribution Card */}
        <div className="p-4 rounded-xl border border-slate-100 bg-slate-50/50 space-y-2">
          <span className="font-bold text-slate-400 uppercase tracking-wider block text-[10px]">Actor & Enterprise Post Attribution</span>
          <div className="grid grid-cols-2 gap-2 text-slate-800 font-medium">
            <div><span className="text-slate-400 font-normal">Actor Name:</span> {log.userName || "System / Automated"}</div>
            <div><span className="text-slate-400 font-normal">Personal Email:</span> {log.email || "system@swayam.in"}</div>
            <div><span className="text-slate-400 font-normal">Role Context:</span> <span className="font-bold text-slate-900">{log.roleId || "SYSTEM"}</span></div>
            <div><span className="text-slate-400 font-normal">Actor User ID:</span> <code className="font-mono text-[11px] text-slate-700">{log.userId || "system"}</code></div>
            {log.positionCode && (
              <div><span className="text-slate-400 font-normal">Position Post:</span> <span className="font-bold text-emerald-700">{log.positionCode}</span></div>
            )}
            {log.companyEmail && (
              <div><span className="text-slate-400 font-normal">Official Post Email:</span> <code className="font-mono text-emerald-800 text-[11px]">{log.companyEmail}</code></div>
            )}
          </div>
        </div>

        {/* Target Entity Context */}
        {(log.entityType || log.entityId) && (
          <div className="p-4 rounded-xl border border-slate-100 bg-slate-50/50 space-y-2">
            <span className="font-bold text-slate-400 uppercase tracking-wider block text-[10px]">Target Record / Entity Context</span>
            <div className="grid grid-cols-2 gap-2 text-slate-800 font-medium">
              <div><span className="text-slate-400 font-normal">Entity Type:</span> <span className="font-bold text-slate-900">{log.entityType || "Record"}</span></div>
              <div><span className="text-slate-400 font-normal">Entity ID:</span> <code className="font-mono text-slate-900">{log.entityId || "N/A"}</code></div>
              {log.entityName && (
                <div className="col-span-2"><span className="text-slate-400 font-normal">Entity Name:</span> {log.entityName}</div>
              )}
              {log.targetUserId && (
                <div className="col-span-2"><span className="text-slate-400 font-normal">Target User ID:</span> <code className="font-mono text-slate-700">{log.targetUserId}</code></div>
              )}
            </div>
          </div>
        )}

        {/* Technical & Request Context */}
        <div className="p-4 rounded-xl border border-slate-100 bg-slate-50/50 space-y-2">
          <span className="font-bold text-slate-400 uppercase tracking-wider block text-[10px]">Technical Execution Context</span>
          <div className="grid grid-cols-2 gap-2 text-slate-800 font-medium">
            <div><span className="text-slate-400 font-normal">Client IP:</span> <code className="font-mono text-slate-900">{log.ipAddress || "127.0.0.1"}</code></div>
            <div><span className="text-slate-400 font-normal">Execution Time:</span> {log.executionTime || 12} ms</div>
            <div><span className="text-slate-400 font-normal">Client Agent:</span> {log.browser || "Chrome"} / {log.operatingSystem || "OS"}</div>
            <div><span className="text-slate-400 font-normal">HTTP Route:</span> <code className="font-mono text-emerald-700">{log.requestMethod || "GET"} {log.endpoint || "/api"}</code></div>
          </div>
        </div>

        {/* Description */}
        <div>
          <span className="font-bold text-slate-400 uppercase tracking-wider block mb-1 text-[10px]">Action Description</span>
          <p className="p-3 rounded-xl border border-slate-100 bg-white font-medium text-slate-800">{log.description || "Action logged successfully."}</p>
        </div>

        {/* JSON DIFF VIEWER */}
        {(oldData || newData || updatedDiff) && (
          <div className="space-y-2">
            <span className="font-bold text-slate-400 uppercase tracking-wider block text-[10px]">Before vs After State Change Diff</span>
            <div className="p-4 rounded-xl border border-slate-800 bg-slate-950 font-mono text-[11px] text-slate-200 overflow-x-auto space-y-3">
              {updatedDiff && Object.keys(updatedDiff).length > 0 && (
                <div>
                  <div className="text-amber-400 font-bold mb-1.5">// Modified Attributes (Before → After)</div>
                  {Object.entries(updatedDiff).map(([k, v]: [string, any]) => (
                    <div key={k} className="flex items-center gap-2 py-1 border-b border-slate-900">
                      <span className="text-slate-400 font-semibold">{k}:</span>
                      <span className="text-rose-400 line-through">{JSON.stringify(v.from)}</span>
                      <ArrowRight size={12} className="text-slate-500 shrink-0" />
                      <span className="text-emerald-400 font-bold">{JSON.stringify(v.to)}</span>
                    </div>
                  ))}
                </div>
              )}

              {newData && (
                <div>
                  <div className="text-emerald-400 font-bold mb-1">// Result / New State Snapshot</div>
                  <pre className="text-emerald-300 whitespace-pre-wrap bg-slate-900/60 p-2.5 rounded-lg">{JSON.stringify(newData, null, 2)}</pre>
                </div>
              )}

              {oldData && (
                <div>
                  <div className="text-rose-400 font-bold mb-1">// Previous State Snapshot</div>
                  <pre className="text-rose-300 whitespace-pre-wrap bg-slate-900/60 p-2.5 rounded-lg">{JSON.stringify(oldData, null, 2)}</pre>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Drawer Footer */}
      <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex justify-end">
        <button
          onClick={onClose}
          className="px-4 h-9 rounded-xl border border-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-100 transition-colors"
        >
          Close Inspector
        </button>
      </div>
    </div>
  );
}


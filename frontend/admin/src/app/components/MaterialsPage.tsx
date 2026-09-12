import { useState } from "react";
import { Search, Library, FileText, Download } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { materialsApi } from "../../api/materials.api";

export default function MaterialsPage() {
  const [search, setSearch] = useState("");

  const { data: materialsRes, isLoading } = useQuery({
    queryKey: ["admin_materials"],
    queryFn: () => materialsApi.findAll(),
    retry: 1
  });

  const MATERIALS = materialsRes?.data || [];
  const filtered = MATERIALS.filter((m: any) => 
    m.title?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-5 lg:p-8 space-y-6" style={{ background: "#F8FAFC", minHeight: "100%" }}>
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Study Materials</h1>
          <p className="text-sm text-gray-500 mt-1">Manage PDFs, notes, PYQs and mock tests.</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-2xl border border-[#F1F5F9] shadow-sm flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input
            type="text"
            placeholder="Search materials..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
          />
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="text-center py-20 text-gray-500">Loading study materials...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-2xl border border-gray-100 shadow-sm">
          <Library className="mx-auto h-12 w-12 text-gray-300 mb-4" />
          <h3 className="text-lg font-medium text-gray-900">No materials found</h3>
          <p className="text-gray-500 text-sm mt-1">Please try adjusting your search terms.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-[#F1F5F9] shadow-sm overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/50 border-b border-gray-100">
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Title</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Subject/Category</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map((mat: any) => (
                <tr key={mat.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center">
                        <FileText className="w-5 h-5 text-indigo-500" />
                      </div>
                      <div>
                        <div className="font-medium text-gray-900">{mat.title}</div>
                        <div className="text-xs text-gray-500 mt-0.5">{mat.type || "PDF"}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                      {mat.category || "General"}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <a 
                      href={mat.url}
                      target="_blank"
                      rel="noreferrer"
                      className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors inline-block"
                      title="Download"
                    >
                      <Download size={18} />
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

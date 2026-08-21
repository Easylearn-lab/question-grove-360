import { useAuth } from "@/_core/hooks/useAuth";
import { useLocation } from "wouter";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  ArrowLeft, Users, BookOpen, BarChart3, Settings, Edit2, Trash2, Plus, Image, Upload,
  ChevronLeft, ChevronRight, Save, X, Search, Download, FileText, Stethoscope, Brain, Tag
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

// ─── GENERIC QUESTION ADMIN COMPONENT ─────────────────────────────────────────
function GenericQuestionAdmin({
  examType,
  queryHook,
  createHook,
  updateHook,
  deleteHook,
  fields,
  specialtyOptions,
  showReviewFilter,
}: {
  examType: string;
  queryHook: any;
  createHook: any;
  updateHook: any;
  deleteHook: any;
  fields: { key: string; label: string; type?: string; required?: boolean }[];
  specialtyOptions?: string[];
  showReviewFilter?: boolean;
}) {
  const [page, setPage] = useState(0);
  const [showCreate, setShowCreate] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [editForm, setEditForm] = useState<any>({});
  const [createForm, setCreateForm] = useState<any>({});
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [filterReview, setFilterReview] = useState(false);

  const limit = 20;
  const { data, isLoading, refetch } = queryHook({ limit, offset: page * limit });

  const createMutation = createHook({
    onSuccess: () => { toast.success(`${examType} question created`); setShowCreate(false); setCreateForm({}); refetch(); },
    onError: (err: any) => toast.error(err.message),
  });
  const updateMutation = updateHook({
    onSuccess: () => { toast.success("Updated successfully"); setEditingItem(null); refetch(); },
    onError: (err: any) => toast.error(err.message),
  });
  const deleteMutation = deleteHook({
    onSuccess: () => { toast.success("Deleted"); refetch(); },
    onError: (err: any) => toast.error(err.message),
  });

  const uploadImageMutation = trpc.admin.uploadQuestionImage.useMutation();

  const items = data?.questions || data?.flashcards || data?.cases || [];
  const total = data?.total || 0;
  const totalPages = Math.ceil(total / limit) || 1;

  const handleImageUpload = async (file: File): Promise<string | null> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = async () => {
        const base64 = (reader.result as string).split(",")[1];
        try {
          const result = await uploadImageMutation.mutateAsync({
            imageData: base64,
            imageMimeType: file.type,
            filename: `${examType}-${Date.now()}`,
          });
          resolve(result.imageUrl);
        } catch {
          toast.error("Image upload failed");
          resolve(null);
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const handleCreate = async () => {
    let finalForm = { ...createForm };
    if (imageFile) {
      const url = await handleImageUpload(imageFile);
      if (url) finalForm.imageUrl = url;
    }
    createMutation.mutate(finalForm);
    setImageFile(null);
  };

  const handleSave = async () => {
    if (!editingItem) return;
    let finalData = { ...editForm };
    if (imageFile) {
      const url = await handleImageUpload(imageFile);
      if (url) finalData.imageUrl = url;
    }
    updateMutation.mutate({ id: editingItem.id, data: finalData });
    setImageFile(null);
  };

  const openEdit = (item: any) => {
    setEditingItem(item);
    const form: any = {};
    fields.forEach((f) => { form[f.key] = item[f.key] || ""; });
    setEditForm(form);
  };

  // Determine display columns (first 4 fields)
  const displayFields = fields.slice(0, 4);

  // Filter items by review flag if enabled
  const filteredItems = filterReview ? items.filter((item: any) => item.reviewFlag) : items;
  const displayItems = filteredItems;

  return (
    <div>
      {/* Header */}
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-3">
          <h3 className="text-lg font-bold text-slate-900">{examType} ({total})</h3>
          {showReviewFilter && (
            <button
              onClick={() => setFilterReview(!filterReview)}
              className={`px-3 py-1 text-xs rounded-full font-medium transition ${filterReview ? "bg-amber-100 text-amber-800 border border-amber-300" : "bg-slate-100 text-slate-600 border border-slate-200 hover:bg-amber-50"}`}
            >
              {filterReview ? "⚠️ Showing Flagged Only" : "⚠️ Show Needs Review"}
            </button>
          )}
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setShowCreate(!showCreate)} className="bg-green-600 hover:bg-green-700 text-white gap-2">
            <Plus className="w-4 h-4" /> Add New
          </Button>
        </div>
      </div>

      {/* Create Form */}
      {showCreate && (
        <Card className="p-6 border-slate-200 mb-6">
          <h4 className="font-bold text-slate-900 mb-4">Create New {examType}</h4>
          <div className="grid md:grid-cols-2 gap-3 max-h-[60vh] overflow-y-auto">
            {fields.map((f) => (
              <div key={f.key} className={f.type === "textarea" ? "md:col-span-2" : ""}>
                <label className="block text-sm font-medium text-slate-700 mb-1">{f.label}{f.required && " *"}</label>
                {f.type === "textarea" ? (
                  <textarea
                    className="w-full border rounded-md p-2 text-sm min-h-[60px] resize-y"
                    value={createForm[f.key] || ""}
                    onChange={(e) => setCreateForm({ ...createForm, [f.key]: e.target.value })}
                  />
                ) : f.type === "select" && specialtyOptions ? (
                  <select
                    className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm"
                    value={createForm[f.key] || ""}
                    onChange={(e) => setCreateForm({ ...createForm, [f.key]: e.target.value })}
                  >
                    <option value="">Select...</option>
                    {specialtyOptions.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                ) : (
                  <Input
                    value={createForm[f.key] || ""}
                    onChange={(e) => setCreateForm({ ...createForm, [f.key]: e.target.value })}
                    placeholder={f.label}
                  />
                )}
              </div>
            ))}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">Image (optional)</label>
              <input type="file" accept="image/*" onChange={(e) => setImageFile(e.target.files?.[0] || null)} className="w-full text-sm border border-slate-300 rounded-md px-3 py-2" />
            </div>
          </div>
          <div className="mt-4 flex gap-3">
            <Button onClick={handleCreate} disabled={createMutation.isPending} className="bg-green-600 hover:bg-green-700 text-white">
              {createMutation.isPending ? "Creating..." : "Create"}
            </Button>
            <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
          </div>
        </Card>
      )}

      {/* Table */}
      <Card className="border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-3 py-2 text-left text-xs font-medium text-slate-500 w-12">ID</th>
                {displayFields.map((f) => (
                  <th key={f.key} className="px-3 py-2 text-left text-xs font-medium text-slate-500">{f.label}</th>
                ))}
                <th className="px-3 py-2 text-left text-xs font-medium text-slate-500 w-24">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={displayFields.length + 2} className="px-4 py-8 text-center text-slate-400">Loading...</td></tr>
              ) : displayItems.length === 0 ? (
                <tr><td colSpan={displayFields.length + 2} className="px-4 py-8 text-center text-slate-400">No items found</td></tr>
              ) : (
                displayItems.map((item: any) => (
                  <tr key={item.id} className={`border-b border-slate-100 hover:bg-slate-50 ${item.reviewFlag ? "bg-amber-50" : ""}`}>
                    <td className="px-3 py-2 text-xs text-slate-400 font-mono">
                      {item.id}
                      {item.reviewFlag && <span className="ml-1 text-amber-600" title="Needs Review">⚠️</span>}
                    </td>
                    {displayFields.map((f) => (
                      <td key={f.key} className="px-3 py-2 text-sm text-slate-700 max-w-[200px] truncate">
                        {String(item[f.key] || "").slice(0, 60)}{String(item[f.key] || "").length > 60 ? "..." : ""}
                      </td>
                    ))}
                    <td className="px-3 py-2">
                      <div className="flex gap-1">
                        <Button variant="ghost" size="sm" onClick={() => openEdit(item)}>
                          <Edit2 className="w-3.5 h-3.5" />
                        </Button>
                        <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700"
                          onClick={() => { if (window.confirm("Delete this item?")) deleteMutation.mutate(item.id); }}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Pagination */}
      <div className="flex items-center justify-between mt-4">
        <Button variant="outline" size="sm" onClick={() => setPage(Math.max(0, page - 1))} disabled={page === 0} className="gap-1">
          <ChevronLeft className="w-4 h-4" /> Previous
        </Button>
        <span className="text-sm text-slate-500">Page {page + 1} of {totalPages} ({total} total)</span>
        <Button variant="outline" size="sm" onClick={() => setPage(Math.min(totalPages - 1, page + 1))} disabled={page >= totalPages - 1} className="gap-1">
          Next <ChevronRight className="w-4 h-4" />
        </Button>
      </div>

      {/* Edit Dialog */}
      <Dialog open={!!editingItem} onOpenChange={(open) => { if (!open) setEditingItem(null); }}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit {examType} #{editingItem?.id}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 mt-4">
            {fields.map((f) => (
              <div key={f.key}>
                <label className="text-sm font-medium text-slate-700 mb-1 block">{f.label}</label>
                {f.type === "textarea" ? (
                  <textarea
                    className="w-full border rounded-md p-2 text-sm min-h-[60px] resize-y"
                    value={editForm[f.key] || ""}
                    onChange={(e) => setEditForm({ ...editForm, [f.key]: e.target.value })}
                  />
                ) : (
                  <Input
                    value={editForm[f.key] || ""}
                    onChange={(e) => setEditForm({ ...editForm, [f.key]: e.target.value })}
                  />
                )}
              </div>
            ))}
            <div>
              <label className="text-sm font-medium text-slate-700 mb-1 block">Upload Image (optional)</label>
              <input type="file" accept="image/*" onChange={(e) => setImageFile(e.target.files?.[0] || null)} className="w-full text-sm border border-slate-300 rounded-md px-3 py-2" />
              {editingItem?.imageUrl && <p className="text-xs text-slate-500 mt-1">Current: {editingItem.imageUrl}</p>}
            </div>
            {showReviewFilter && editingItem?.reviewFlag && (
              <div className="bg-amber-50 border border-amber-200 rounded-md p-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-amber-600">⚠️</span>
                    <span className="text-sm font-medium text-amber-800">Flagged: {editingItem.reviewFlag.replace(/_/g, " ")}</span>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-amber-300 text-amber-700 hover:bg-amber-100"
                    onClick={() => {
                      updateMutation.mutate({ id: editingItem.id, data: { reviewFlag: null } }, {
                        onSuccess: () => { toast.success("Review flag cleared"); setEditingItem(null); refetch(); }
                      });
                    }}
                  >
                    Clear Review Flag
                  </Button>
                </div>
                <p className="text-xs text-amber-600 mt-1">This question was auto-flagged because the explanation text may contradict the correctAnswer field. Review and correct before clearing.</p>
              </div>
            )}
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setEditingItem(null)} className="gap-1"><X className="w-4 h-4" /> Cancel</Button>
              <Button onClick={handleSave} disabled={updateMutation.isPending} className="bg-green-600 hover:bg-green-700 text-white gap-1">
                <Save className="w-4 h-4" /> {updateMutation.isPending ? "Saving..." : "Save"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── BULK UPLOAD COMPONENT ────────────────────────────────────────────────────
function BulkUploadAdmin() {
  const [contentType, setContentType] = useState<string>("akt");
  const [parsedRows, setParsedRows] = useState<any[]>([]);
  const [fileName, setFileName] = useState("");
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<{ inserted: number; errors: { row: number; error: string }[] } | null>(null);

  const bulkMutation = trpc.admin.bulkUpload.useMutation({
    onSuccess: (data) => {
      setResult(data);
      setImporting(false);
      toast.success(`Imported ${data.inserted} of ${data.total} rows`);
    },
    onError: (err) => { toast.error(err.message); setImporting(false); },
  });

  const CSV_TEMPLATES: Record<string, string> = {
    akt: "specialty,question,optionA,optionB,optionC,optionD,optionE,correctAnswer,explanationCorrect,difficulty,topic,imageUrl",
    plab1: "specialty,topic,subTopic,difficulty,questionType,question,optionA,optionB,optionC,optionD,optionE,correctAnswer,explanationCorrect,reference,imageUrl",
    msra: "specialty,topic,difficulty,questionType,question,optionA,optionB,optionC,optionD,optionE,correctAnswer,explanationCorrect,reference,imageUrl",
    jamb: "subject,topic,questionText,optionA,optionB,optionC,optionD,correctAnswer,explanation,imageUrl",
    flashcards: "front,back,specialty,category,explanation,difficulty",
    sca: "title,category,difficulty,patientName,patientAge,patientGender,presentingComplaint,backgroundContext,aiPatientPersona,examinationFindings",
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setResult(null);

    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      try {
        if (file.name.endsWith(".json")) {
          const json = JSON.parse(text);
          setParsedRows(Array.isArray(json) ? json : [json]);
        } else {
          // CSV parsing
          const lines = text.split("\n").filter((l) => l.trim());
          if (lines.length < 2) { toast.error("CSV must have header + data rows"); return; }
          const headers = lines[0].split(",").map((h) => h.trim().replace(/^"|"$/g, ""));
          const rows = [];
          for (let i = 1; i < lines.length; i++) {
            const values = parseCSVLine(lines[i]);
            const row: any = {};
            headers.forEach((h, idx) => { row[h] = values[idx] || ""; });
            rows.push(row);
          }
          setParsedRows(rows);
        }
      } catch (err) {
        toast.error("Failed to parse file. Check format.");
        setParsedRows([]);
      }
    };
    reader.readAsText(file);
  };

  const parseCSVLine = (line: string): string[] => {
    const result: string[] = [];
    let current = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') { inQuotes = !inQuotes; }
      else if (ch === "," && !inQuotes) { result.push(current.trim()); current = ""; }
      else { current += ch; }
    }
    result.push(current.trim());
    return result;
  };

  const handleDownloadTemplate = () => {
    const template = CSV_TEMPLATES[contentType] || "";
    const blob = new Blob([template + "\n"], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${contentType}_template.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = () => {
    if (parsedRows.length === 0) { toast.error("No rows to import"); return; }
    if (!window.confirm(`Import ${parsedRows.length} rows into ${contentType}?`)) return;
    setImporting(true);
    bulkMutation.mutate({ contentType: contentType as any, rows: parsedRows });
  };

  const previewHeaders = parsedRows.length > 0 ? Object.keys(parsedRows[0]) : [];

  return (
    <div>
      <h3 className="text-lg font-bold text-slate-900 mb-4">Bulk Upload</h3>

      {/* Content Type Selection */}
      <div className="flex gap-4 items-end mb-6">
        <div className="flex-1">
          <label className="block text-sm font-medium text-slate-700 mb-1">Content Type</label>
          <Select value={contentType} onValueChange={(v) => { setContentType(v); setParsedRows([]); setResult(null); }}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="akt">AKT Questions</SelectItem>
              <SelectItem value="plab1">PLAB1 Questions</SelectItem>
              <SelectItem value="msra">MSRA Questions</SelectItem>
              <SelectItem value="jamb">JAMB Questions</SelectItem>
              <SelectItem value="flashcards">Flashcards</SelectItem>
              <SelectItem value="sca">SCA Cases</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button variant="outline" onClick={handleDownloadTemplate} className="gap-2">
          <Download className="w-4 h-4" /> Download CSV Template
        </Button>
      </div>

      {/* File Upload */}
      <Card className="p-6 border-slate-200 mb-6">
        <label className="block text-sm font-medium text-slate-700 mb-2">Upload CSV or JSON file</label>
        <input
          type="file"
          accept=".csv,.json"
          onChange={handleFileUpload}
          className="w-full text-sm border border-slate-300 rounded-md px-3 py-2"
        />
        {fileName && <p className="text-sm text-slate-500 mt-2">File: {fileName} ({parsedRows.length} rows parsed)</p>}
      </Card>

      {/* Preview Table */}
      {parsedRows.length > 0 && (
        <Card className="border-slate-200 overflow-hidden mb-6">
          <div className="p-3 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
            <span className="text-sm font-medium text-slate-700">Preview ({parsedRows.length} rows)</span>
            <Button onClick={handleImport} disabled={importing} className="bg-green-600 hover:bg-green-700 text-white gap-2">
              <Upload className="w-4 h-4" /> {importing ? "Importing..." : `Import ${parsedRows.length} Rows`}
            </Button>
          </div>
          <div className="overflow-x-auto max-h-[300px] overflow-y-auto">
            <table className="w-full text-xs">
              <thead className="bg-slate-100 sticky top-0">
                <tr>
                  <th className="px-2 py-1 text-left">#</th>
                  {previewHeaders.slice(0, 6).map((h) => (
                    <th key={h} className="px-2 py-1 text-left">{h}</th>
                  ))}
                  {previewHeaders.length > 6 && <th className="px-2 py-1 text-left">...</th>}
                </tr>
              </thead>
              <tbody>
                {parsedRows.slice(0, 10).map((row, idx) => (
                  <tr key={idx} className="border-b border-slate-100">
                    <td className="px-2 py-1 text-slate-400">{idx + 1}</td>
                    {previewHeaders.slice(0, 6).map((h) => (
                      <td key={h} className="px-2 py-1 max-w-[150px] truncate">{String(row[h] || "").slice(0, 50)}</td>
                    ))}
                    {previewHeaders.length > 6 && <td className="px-2 py-1 text-slate-400">...</td>}
                  </tr>
                ))}
                {parsedRows.length > 10 && (
                  <tr><td colSpan={8} className="px-2 py-2 text-center text-slate-400">... and {parsedRows.length - 10} more rows</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Result */}
      {result && (
        <Card className="p-4 border-slate-200">
          <h4 className="font-bold text-slate-900 mb-2">Import Result</h4>
          <p className="text-sm text-green-700">Successfully imported: {result.inserted} / {parsedRows.length}</p>
          {result.errors.filter((e: any) => e.row === 0).length > 0 && (
            <div className="mt-2 bg-amber-50 border border-amber-200 rounded-md p-3">
              {result.errors.filter((e: any) => e.row === 0).map((err: any, idx: number) => (
                <p key={idx} className="text-sm text-amber-800">{err.error}</p>
              ))}
            </div>
          )}
          {result.errors.filter((e: any) => e.row !== 0).length > 0 && (
            <div className="mt-2">
              <p className="text-sm text-red-600 font-medium">Errors ({result.errors.filter((e: any) => e.row !== 0).length}):</p>
              <div className="max-h-[150px] overflow-y-auto mt-1">
                {result.errors.filter((e: any) => e.row !== 0).map((err: any, idx: number) => (
                  <p key={idx} className="text-xs text-red-500">Row {err.row}: {err.error}</p>
                ))}
              </div>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}

// ─── USERS ADMIN COMPONENT ────────────────────────────────────────────────────
function UsersAdmin() {
  const [page, setPage] = useState(0);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [editForm, setEditForm] = useState<any>({});
  const limit = 20;

  const { data, isLoading, refetch } = trpc.admin.getUsers.useQuery({ limit, offset: page * limit });
  const updateMutation = trpc.admin.updateUser.useMutation({
    onSuccess: () => { toast.success("User updated"); setEditingUser(null); refetch(); },
    onError: (err) => toast.error(err.message),
  });
  const deleteMutation = trpc.admin.deleteUser.useMutation({
    onSuccess: () => { toast.success("User deleted"); refetch(); },
    onError: (err) => toast.error(err.message),
  });

  const users = data?.users || [];
  const total = data?.total || 0;
  const totalPages = Math.ceil(total / limit) || 1;

  return (
    <div>
      <div className="text-sm text-slate-500 mb-3">Total users: {total}</div>
      <Card className="border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium text-slate-700">Name</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-slate-700">Email</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-slate-700">Role</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-slate-700">Subscription</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-slate-700">Joined</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-slate-700">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-400">Loading...</td></tr>
              ) : users.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-400">No users</td></tr>
              ) : (
                users.map((u: any) => (
                  <tr key={u.id} className="border-b border-slate-200 hover:bg-slate-50">
                    <td className="px-4 py-3 text-sm text-slate-900">{u.name || "—"}</td>
                    <td className="px-4 py-3 text-sm text-slate-600">{u.email || "—"}</td>
                    <td className="px-4 py-3 text-sm">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${u.role === "admin" ? "bg-purple-100 text-purple-700" : "bg-slate-100 text-slate-700"}`}>
                        {u.role}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600">{u.subscriptionStatus || "none"}</td>
                    <td className="px-4 py-3 text-sm text-slate-600">{u.createdAt ? new Date(u.createdAt).toLocaleDateString() : "—"}</td>
                    <td className="px-4 py-3 text-sm">
                      <div className="flex gap-2">
                        <Button variant="ghost" size="sm" onClick={() => { setEditingUser(u); setEditForm({ name: u.name || "", email: u.email || "", role: u.role || "user" }); }}>
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700"
                          onClick={() => { if (window.confirm(`Delete user ${u.name || u.email}?`)) deleteMutation.mutate(u.id); }}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Pagination */}
      <div className="flex items-center justify-between mt-4">
        <Button variant="outline" size="sm" onClick={() => setPage(Math.max(0, page - 1))} disabled={page === 0}>
          <ChevronLeft className="w-4 h-4" /> Previous
        </Button>
        <span className="text-sm text-slate-500">Page {page + 1} of {totalPages}</span>
        <Button variant="outline" size="sm" onClick={() => setPage(Math.min(totalPages - 1, page + 1))} disabled={page >= totalPages - 1}>
          Next <ChevronRight className="w-4 h-4" />
        </Button>
      </div>

      {/* Edit Dialog */}
      <Dialog open={!!editingUser} onOpenChange={(open) => { if (!open) setEditingUser(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Edit User #{editingUser?.id}</DialogTitle></DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <label className="text-sm font-medium text-slate-700 block mb-1">Name</label>
              <Input value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700 block mb-1">Email</label>
              <Input value={editForm.email} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700 block mb-1">Role</label>
              <Select value={editForm.role} onValueChange={(v) => setEditForm({ ...editForm, role: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">User</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setEditingUser(null)}>Cancel</Button>
              <Button onClick={() => updateMutation.mutate({ id: editingUser.id, data: editForm })} disabled={updateMutation.isPending} className="bg-green-600 hover:bg-green-700 text-white">
                {updateMutation.isPending ? "Saving..." : "Save"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── COUPON ADMIN COMPONENT ──────────────────────────────────────────────────
function CouponAdmin() {
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ code: "", discountType: "percentage" as const, discountValue: 10, maxUsageCount: 100, expiryDate: "" });

  const { data: coupons, refetch } = trpc.admin.getCoupons.useQuery();
  const createMutation = trpc.admin.createCoupon.useMutation({
    onSuccess: () => { toast.success("Coupon created"); setShowCreate(false); refetch(); },
    onError: (err) => toast.error(err.message),
  });
  const deleteMutation = trpc.admin.deleteCoupon.useMutation({
    onSuccess: () => { toast.success("Coupon deactivated"); refetch(); },
  });

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-bold text-slate-900">Coupons ({coupons?.length || 0})</h3>
        <Button onClick={() => setShowCreate(!showCreate)} className="bg-green-600 hover:bg-green-700 text-white gap-2">
          <Plus className="w-4 h-4" /> Create Coupon
        </Button>
      </div>

      {showCreate && (
        <Card className="p-6 border-slate-200 mb-6">
          <div className="grid md:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Code *</label>
              <Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} placeholder="e.g. WELCOME20" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Type</label>
              <Select value={form.discountType} onValueChange={(v: any) => setForm({ ...form, discountType: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="percentage">Percentage (%)</SelectItem>
                  <SelectItem value="fixed">Fixed Amount</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Value</label>
              <Input type="number" value={form.discountValue} onChange={(e) => setForm({ ...form, discountValue: parseInt(e.target.value) || 0 })} />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Max Uses</label>
              <Input type="number" value={form.maxUsageCount} onChange={(e) => setForm({ ...form, maxUsageCount: parseInt(e.target.value) || 1 })} />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Expiry Date</label>
              <Input type="date" value={form.expiryDate} onChange={(e) => setForm({ ...form, expiryDate: e.target.value })} />
            </div>
          </div>
          <div className="mt-4 flex gap-3">
            <Button onClick={() => createMutation.mutate({ ...form, maxUsageCount: form.maxUsageCount, expiryDate: form.expiryDate || null })} disabled={createMutation.isPending} className="bg-green-600 hover:bg-green-700 text-white">
              {createMutation.isPending ? "Creating..." : "Create"}
            </Button>
            <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
          </div>
        </Card>
      )}

      <Card className="border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-slate-500">Code</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-slate-500">Discount</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-slate-500">Usage</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-slate-500">Expires</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-slate-500">Status</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-slate-500">Actions</th>
              </tr>
            </thead>
            <tbody>
              {(coupons || []).map((c: any) => (
                <tr key={c.id} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="px-4 py-2 text-sm font-mono font-bold text-green-600">{c.code}</td>
                  <td className="px-4 py-2 text-sm">{c.discountType === "percentage" ? `${c.discountValue}%` : `$${c.discountValue}`}</td>
                  <td className="px-4 py-2 text-sm">{c.usageCount || 0}/{c.maxUsageCount || "∞"}</td>
                  <td className="px-4 py-2 text-sm text-slate-600">{c.expiryDate || "—"}</td>
                  <td className="px-4 py-2 text-sm">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${c.isActive ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                      {c.isActive ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-4 py-2">
                    <Button variant="ghost" size="sm" className="text-red-600" onClick={() => deleteMutation.mutate(c.id)}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

// ─── PICTURE360 ADMIN ─────────────────────────────────────────────────────────
function Picture360Admin() {
  const [showUpload, setShowUpload] = useState(false);
  const [uploadForm, setUploadForm] = useState({ specialty: "Dermatology", title: "", description: "", diagnosis: "", explanation: "", imageData: "", imageMimeType: "image/jpeg" });
  const [uploading, setUploading] = useState(false);

  const imagesQuery = trpc.admin.getPicture360Images.useQuery({ limit: 50, offset: 0 });
  const uploadMutation = trpc.admin.uploadPicture360Image.useMutation({
    onSuccess: () => { toast.success("Image uploaded"); imagesQuery.refetch(); setShowUpload(false); },
    onError: (err) => toast.error(err.message),
  });
  const deleteMutation = trpc.admin.deletePicture360Image.useMutation({
    onSuccess: () => { toast.success("Image archived"); imagesQuery.refetch(); },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => { setUploadForm((prev) => ({ ...prev, imageData: (reader.result as string).split(",")[1], imageMimeType: file.type })); };
    reader.readAsDataURL(file);
  };

  const SPECIALTIES = ["Dermatology", "Ophthalmology", "ECG", "ENT", "Chest X-ray", "Paediatrics"];

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-lg font-bold text-slate-900">Picture360 Images ({imagesQuery.data?.total || 0})</h3>
        <Button onClick={() => setShowUpload(!showUpload)} className="bg-green-600 hover:bg-green-700 text-white gap-2"><Upload className="w-4 h-4" /> Upload Image</Button>
      </div>
      {showUpload && (
        <Card className="p-6 border-slate-200 mb-6">
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Specialty</label>
              <select className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm" value={uploadForm.specialty} onChange={(e) => setUploadForm((prev) => ({ ...prev, specialty: e.target.value }))}>
                {SPECIALTIES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div><label className="block text-sm font-medium text-slate-700 mb-1">Title *</label><Input value={uploadForm.title} onChange={(e) => setUploadForm((prev) => ({ ...prev, title: e.target.value }))} /></div>
            <div><label className="block text-sm font-medium text-slate-700 mb-1">Diagnosis *</label><Input value={uploadForm.diagnosis} onChange={(e) => setUploadForm((prev) => ({ ...prev, diagnosis: e.target.value }))} /></div>
            <div><label className="block text-sm font-medium text-slate-700 mb-1">Image *</label><input type="file" accept="image/*" onChange={handleFileChange} className="w-full text-sm border border-slate-300 rounded-md px-3 py-2" /></div>
          </div>
          <div className="mt-4 flex gap-3">
            <Button onClick={() => { setUploading(true); uploadMutation.mutate(uploadForm, { onSettled: () => setUploading(false) }); }} disabled={uploading} className="bg-green-600 hover:bg-green-700 text-white">{uploading ? "Uploading..." : "Upload"}</Button>
            <Button variant="outline" onClick={() => setShowUpload(false)}>Cancel</Button>
          </div>
        </Card>
      )}
      <Card className="border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-slate-500">Image</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-slate-500">Title</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-slate-500">Specialty</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-slate-500">Diagnosis</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-slate-500">Actions</th>
              </tr>
            </thead>
            <tbody>
              {(imagesQuery.data?.images as any[] || []).map((img: any) => (
                <tr key={img.id} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="px-4 py-2"><img src={img.imageUrl} alt={img.title} className="w-12 h-12 object-cover rounded" /></td>
                  <td className="px-4 py-2 text-sm">{img.title}</td>
                  <td className="px-4 py-2 text-sm text-slate-600">{img.specialty}</td>
                  <td className="px-4 py-2 text-sm text-slate-600">{img.diagnosis}</td>
                  <td className="px-4 py-2"><Button variant="ghost" size="sm" className="text-red-600" onClick={() => deleteMutation.mutate(img.id)}><Trash2 className="w-4 h-4" /></Button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

// ─── MAIN ADMIN PANEL ─────────────────────────────────────────────────────────
export default function AdminPanel() {
  const { user, isAuthenticated } = useAuth();
  const [, navigate] = useLocation();
  const [activeTab, setActiveTab] = useState("analytics");

  useEffect(() => {
    if (!isAuthenticated || user?.role !== "admin") {
      navigate("/dashboard");
      toast.error("Admin access required");
    }
  }, [isAuthenticated, user, navigate]);

  if (!isAuthenticated || user?.role !== "admin") return null;

  const AKT_SPECIALTIES = ["Cardiology", "Respiratory", "Neurology", "Gastroenterology", "Endocrinology", "Renal", "Rheumatology", "Dermatology", "Haematology", "Infectious Disease", "Ophthalmology", "ENT", "Psychiatry", "Paediatrics", "Obstetrics & Gynaecology", "Pharmacology & Prescribing", "Statistics & Evidence-Based Medicine", "Ethics & Professionalism", "Musculoskeletal"];
  const PLAB1_SPECIALTIES = ["Medicine", "Surgery", "Obstetrics & Gynaecology", "Paediatrics", "Psychiatry", "GP & Public Health", "Clinical Pharmacology", "Ethics & Law"];
  const JAMB_SUBJECTS = ["Biology", "Chemistry", "Physics", "English Language"];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate("/dashboard")} className="text-slate-600 hover:text-slate-900">
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <h1 className="text-2xl font-bold text-slate-900">Admin Panel</h1>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <div className="overflow-x-auto mb-8">
            <TabsList className="inline-flex w-auto min-w-full">
              <TabsTrigger value="analytics" className="gap-1 text-xs"><BarChart3 className="w-3.5 h-3.5" />Analytics</TabsTrigger>
              <TabsTrigger value="users" className="gap-1 text-xs"><Users className="w-3.5 h-3.5" />Users</TabsTrigger>
              <TabsTrigger value="akt" className="gap-1 text-xs"><BookOpen className="w-3.5 h-3.5" />AKT</TabsTrigger>
              <TabsTrigger value="plab1" className="gap-1 text-xs"><Stethoscope className="w-3.5 h-3.5" />PLAB1</TabsTrigger>
              <TabsTrigger value="msra" className="gap-1 text-xs"><Brain className="w-3.5 h-3.5" />MSRA</TabsTrigger>
              <TabsTrigger value="msra_pd" className="gap-1 text-xs"><Brain className="w-3.5 h-3.5" />MSRA PD</TabsTrigger>
              <TabsTrigger value="jamb" className="gap-1 text-xs"><FileText className="w-3.5 h-3.5" />JAMB</TabsTrigger>
              <TabsTrigger value="flashcards" className="gap-1 text-xs"><Tag className="w-3.5 h-3.5" />Flashcards</TabsTrigger>
              <TabsTrigger value="sca" className="gap-1 text-xs"><Stethoscope className="w-3.5 h-3.5" />SCA</TabsTrigger>
              <TabsTrigger value="bulk" className="gap-1 text-xs"><Upload className="w-3.5 h-3.5" />Bulk Upload</TabsTrigger>
              <TabsTrigger value="coupons" className="gap-1 text-xs"><Settings className="w-3.5 h-3.5" />Coupons</TabsTrigger>
              <TabsTrigger value="picture360" className="gap-1 text-xs"><Image className="w-3.5 h-3.5" />Picture360</TabsTrigger>
              <TabsTrigger value="topics" className="gap-1 text-xs"><BookOpen className="w-3.5 h-3.5" />Topics</TabsTrigger>
              <TabsTrigger value="spelling" className="gap-1 text-xs"><FileText className="w-3.5 h-3.5" />Spelling</TabsTrigger>
            </TabsList>
          </div>

          {/* Analytics Tab - REAL DATA */}
          <TabsContent value="analytics">
            <AnalyticsTab />
          </TabsContent>

          {/* Users Tab - REAL DATA */}
          <TabsContent value="users">
            <UsersAdmin />
          </TabsContent>

          {/* AKT Questions */}
          <TabsContent value="akt">
            <GenericQuestionAdmin
              examType="AKT Question"
              queryHook={(input: any) => trpc.admin.getQuestions.useQuery(input)}
              createHook={(opts: any) => trpc.admin.createQuestion.useMutation(opts)}
              updateHook={(opts: any) => trpc.admin.updateQuestion.useMutation(opts)}
              deleteHook={(opts: any) => trpc.admin.deleteQuestion.useMutation(opts)}
              specialtyOptions={AKT_SPECIALTIES}
              showReviewFilter={true}
              fields={[
                { key: "question", label: "Question", type: "textarea", required: true },
                { key: "specialty", label: "Specialty", type: "select", required: true },
                { key: "topic", label: "Topic" },
                { key: "difficulty", label: "Difficulty" },
                { key: "optionA", label: "Option A", required: true },
                { key: "optionB", label: "Option B", required: true },
                { key: "optionC", label: "Option C", required: true },
                { key: "optionD", label: "Option D", required: true },
                { key: "optionE", label: "Option E" },
                { key: "correctAnswer", label: "Correct Answer", required: true },
                { key: "explanationCorrect", label: "Explanation", type: "textarea" },
              ]}
            />
          </TabsContent>

          {/* PLAB1 Questions */}
          <TabsContent value="plab1">
            <GenericQuestionAdmin
              examType="PLAB1 Question"
              queryHook={(input: any) => trpc.admin.getPlab1Questions.useQuery(input)}
              createHook={(opts: any) => trpc.admin.createPlab1Question.useMutation(opts)}
              updateHook={(opts: any) => trpc.admin.updatePlab1Question.useMutation(opts)}
              deleteHook={(opts: any) => trpc.admin.deletePlab1Question.useMutation(opts)}
              specialtyOptions={PLAB1_SPECIALTIES}
              fields={[
                { key: "question", label: "Question", type: "textarea", required: true },
                { key: "specialty", label: "Specialty", type: "select", required: true },
                { key: "topic", label: "Topic", required: true },
                { key: "difficulty", label: "Difficulty" },
                { key: "optionA", label: "Option A", required: true },
                { key: "optionB", label: "Option B", required: true },
                { key: "optionC", label: "Option C", required: true },
                { key: "optionD", label: "Option D", required: true },
                { key: "optionE", label: "Option E", required: true },
                { key: "correctAnswer", label: "Correct Answer", required: true },
                { key: "explanationCorrect", label: "Explanation", type: "textarea" },
                { key: "reference", label: "Reference" },
              ]}
            />
          </TabsContent>

          {/* MSRA Questions */}
          <TabsContent value="msra">
            <GenericQuestionAdmin
              examType="MSRA Question"
              queryHook={(input: any) => trpc.admin.getMsraQuestions.useQuery(input)}
              createHook={(opts: any) => trpc.admin.createMsraQuestion.useMutation(opts)}
              updateHook={(opts: any) => trpc.admin.updateMsraQuestion.useMutation(opts)}
              deleteHook={(opts: any) => trpc.admin.deleteMsraQuestion.useMutation(opts)}
              specialtyOptions={["Cardiology", "Respiratory", "Neurology", "Gastroenterology", "Endocrinology", "Renal", "Rheumatology", "Dermatology", "Haematology", "Infectious Disease", "Ophthalmology", "ENT", "Psychiatry", "Paediatrics", "Obstetrics & Gynaecology", "Pharmacology"]}
              fields={[
                { key: "question", label: "Question", type: "textarea", required: true },
                { key: "specialty", label: "Specialty", type: "select", required: true },
                { key: "topic", label: "Topic" },
                { key: "difficulty", label: "Difficulty" },
                { key: "optionA", label: "Option A", required: true },
                { key: "optionB", label: "Option B", required: true },
                { key: "optionC", label: "Option C", required: true },
                { key: "optionD", label: "Option D", required: true },
                { key: "optionE", label: "Option E" },
                { key: "correctAnswer", label: "Correct Answer", required: true },
                { key: "explanationCorrect", label: "Explanation", type: "textarea" },
              ]}
            />
          </TabsContent>

          {/* JAMB Questions */}

          {/* MSRA PD Questions */}
          <TabsContent value="msra_pd">
            <GenericQuestionAdmin
              examType="MSRA PD Question"
              queryHook={(input: any) => trpc.admin.getMsraPdQuestions.useQuery(input)}
              createHook={(opts: any) => trpc.admin.createMsraPdQuestion.useMutation(opts)}
              updateHook={(opts: any) => trpc.admin.updateMsraPdQuestion.useMutation(opts)}
              deleteHook={(opts: any) => trpc.admin.deleteMsraPdQuestion.useMutation(opts)}
              specialtyOptions={["Professional integrity and honesty", "Patient safety and duty of care", "Team working and communication", "Prioritisation under pressure", "Dealing with colleagues in difficulty", "NHS values and professionalism", "Consent and confidentiality", "Raising concerns and whistleblowing"]}
              fields={[
                { key: "questionType", label: "Format (RANKING or PICK3)", required: true },
                { key: "domain", label: "Topic/Domain", type: "select", required: true },
                { key: "scenario", label: "Scenario", type: "textarea", required: true },
                { key: "actionA", label: "Action A (Ranking)" },
                { key: "actionB", label: "Action B (Ranking)" },
                { key: "actionC", label: "Action C (Ranking)" },
                { key: "actionD", label: "Action D (Ranking)" },
                { key: "actionE", label: "Action E (Ranking)" },
                { key: "explanationRanking", label: "Ranking Explanation", type: "textarea" },
                { key: "optionA", label: "Option A (Pick3)" },
                { key: "optionB", label: "Option B (Pick3)" },
                { key: "optionC", label: "Option C (Pick3)" },
                { key: "optionD", label: "Option D (Pick3)" },
                { key: "optionE", label: "Option E (Pick3)" },
                { key: "explanationOptions", label: "Pick3 Explanation", type: "textarea" },
                { key: "reference", label: "Reference" },
              ]}
            />
          </TabsContent>

          {/* JAMB Questions */}
          <TabsContent value="jamb">
            <GenericQuestionAdmin
              examType="JAMB Question"
              queryHook={(input: any) => trpc.admin.getJambQuestions.useQuery(input)}
              createHook={(opts: any) => trpc.admin.createJambQuestion.useMutation(opts)}
              updateHook={(opts: any) => trpc.admin.updateJambQuestion.useMutation(opts)}
              deleteHook={(opts: any) => trpc.admin.deleteJambQuestion.useMutation(opts)}
              specialtyOptions={JAMB_SUBJECTS}
              fields={[
                { key: "questionText", label: "Question", type: "textarea", required: true },
                { key: "subject", label: "Subject", type: "select", required: true },
                { key: "topic", label: "Topic" },
                { key: "optionA", label: "Option A", required: true },
                { key: "optionB", label: "Option B", required: true },
                { key: "optionC", label: "Option C", required: true },
                { key: "optionD", label: "Option D", required: true },
                { key: "correctAnswer", label: "Correct Answer (A/B/C/D)", required: true },
                { key: "explanation", label: "Explanation", type: "textarea" },
              ]}
            />
          </TabsContent>

          {/* Flashcards */}
          <TabsContent value="flashcards">
            <GenericQuestionAdmin
              examType="Flashcard"
              queryHook={(input: any) => trpc.admin.getFlashcardsAdmin.useQuery(input)}
              createHook={(opts: any) => trpc.admin.createFlashcard.useMutation(opts)}
              updateHook={(opts: any) => trpc.admin.updateFlashcard.useMutation(opts)}
              deleteHook={(opts: any) => trpc.admin.deleteFlashcard.useMutation(opts)}
              specialtyOptions={AKT_SPECIALTIES}
              fields={[
                { key: "front", label: "Front (Question)", type: "textarea", required: true },
                { key: "back", label: "Back (Answer)", type: "textarea", required: true },
                { key: "specialty", label: "Specialty", type: "select" },
                { key: "category", label: "Category" },
                { key: "explanation", label: "Explanation", type: "textarea" },
                { key: "difficulty", label: "Difficulty" },
              ]}
            />
          </TabsContent>

          {/* SCA Cases */}
          <TabsContent value="sca">
            <GenericQuestionAdmin
              examType="SCA Case"
              queryHook={(input: any) => trpc.admin.getScaCases.useQuery(input)}
              createHook={(opts: any) => trpc.admin.createScaCase.useMutation(opts)}
              updateHook={(opts: any) => trpc.admin.updateScaCase.useMutation(opts)}
              deleteHook={(opts: any) => trpc.admin.deleteScaCase.useMutation(opts)}
              fields={[
                { key: "title", label: "Title", required: true },
                { key: "category", label: "Category" },
                { key: "difficulty", label: "Difficulty" },
                { key: "patientName", label: "Patient Name" },
                { key: "patientAge", label: "Patient Age" },
                { key: "patientGender", label: "Patient Gender" },
                { key: "presentingComplaint", label: "Presenting Complaint", type: "textarea" },
                { key: "backgroundContext", label: "Background Context", type: "textarea" },
                { key: "aiPatientPersona", label: "AI Patient Persona (JSON)", type: "textarea" },
                { key: "examinationFindings", label: "Examination Findings", type: "textarea" },
              ]}
            />
          </TabsContent>

          {/* Bulk Upload */}
          <TabsContent value="bulk">
            <BulkUploadAdmin />
          </TabsContent>

          {/* Coupons */}
          <TabsContent value="coupons">
            <CouponAdmin />
          </TabsContent>

          {/* Picture360 */}
          <TabsContent value="picture360">
            <Picture360Admin />
          </TabsContent>

          {/* Topics Admin */}
          <TabsContent value="topics">
            <TopicsAdmin />
          </TabsContent>

          {/* Spelling Words Admin */}
          <TabsContent value="spelling">
            <SpellingWordsAdmin />
          </TabsContent>

          {/* Ad Banners Admin */}
          <TabsContent value="banners">
            <AdBannersAdmin />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

// ─── ANALYTICS TAB (REAL DATA) ────────────────────────────────────────────────
function AnalyticsTab() {
  const { data, isLoading } = trpc.admin.getAnalytics.useQuery();

  if (isLoading) return <div className="text-center py-8 text-slate-400">Loading analytics...</div>;

  const stats = [
    { label: "Total Users", value: data?.totalUsers || 0, color: "text-blue-600" },
    { label: "Active Subscribers", value: data?.activeSubscribers || 0, color: "text-green-600" },
    { label: "AKT Questions", value: data?.totalQuestions || 0, color: "text-purple-600" },
    { label: "PLAB1 Questions", value: data?.totalPlab1Questions || 0, color: "text-indigo-600" },
    { label: "Flashcards", value: data?.totalFlashcards || 0, color: "text-orange-600" },
    { label: "SCA Cases", value: data?.totalScaCases || 0, color: "text-pink-600" },
    { label: "Total Attempts", value: data?.totalAttempts || 0, color: "text-teal-600" },
    { label: "Mocks Completed", value: data?.totalMocksCompleted || 0, color: "text-cyan-600" },
  ];

  return (
    <div className="grid md:grid-cols-4 gap-4">
      {stats.map((stat, idx) => (
        <Card key={idx} className="p-5 border-slate-200">
          <p className="text-sm text-slate-600 mb-1">{stat.label}</p>
          <p className={`text-3xl font-bold ${stat.color}`}>{stat.value.toLocaleString()}</p>
        </Card>
      ))}
    </div>
  );
}

// ─── TOPICS ADMIN TAB ────────────────────────────────────────────────
function TopicsAdmin() {
  const { data: subjects } = trpc.topics.getSubjects.useQuery();
  const [selectedSubject, setSelectedSubject] = useState<number | null>(null);
  const selSlug = subjects?.find(s => s.id === selectedSubject)?.slug || "";
  const { data: topicsList } = trpc.topics.getTopicsBySubjectSlug.useQuery(
    { slug: selSlug },
    { enabled: !!selectedSubject && !!selSlug }
  );

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-bold">Topics Library Management</h3>
      <div className="flex gap-2 flex-wrap">
        {subjects?.map(s => (
          <button key={s.id} onClick={() => setSelectedSubject(s.id)} className={`px-4 py-2 rounded-lg text-sm font-medium ${selectedSubject === s.id ? "bg-green-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
            {s.icon} {s.name}
          </button>
        ))}
      </div>
      {selectedSubject && topicsList && (
        <div className="border rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50"><tr><th className="text-left p-3">Topic</th><th className="text-left p-3">Difficulty</th><th className="text-left p-3">Linked Tag</th><th className="text-left p-3">Component</th></tr></thead>
            <tbody>
              {topicsList.map((t: any) => (
                <tr key={t.id} className="border-t hover:bg-gray-50">
                  <td className="p-3 font-medium">{t.name}</td>
                  <td className="p-3"><span className={`px-2 py-0.5 rounded text-xs ${t.difficultyLevel === "easy" ? "bg-green-100 text-green-800" : t.difficultyLevel === "hard" ? "bg-red-100 text-red-800" : "bg-amber-100 text-amber-800"}`}>{t.difficultyLevel}</span></td>
                  <td className="p-3 text-gray-500">{t.linkedQuestionTopicTag || "—"}</td>
                  <td className="p-3 text-gray-500 font-mono text-xs">{t.visualizeComponent || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {!selectedSubject && <div className="text-center py-12 text-gray-400"><p>Select a subject above to manage its topics</p></div>}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800">
        <p><strong>Note:</strong> Use the Bulk Upload tab to import new subjects and topics via CSV.</p>
      </div>
    </div>
  );
}

// ─── SPELLING WORDS ADMIN TAB ────────────────────────────────────────────────
function SpellingWordsAdmin() {
  const [category, setCategory] = useState("");
  const { data: categories } = trpc.topics.getSpellingCategories.useQuery();
  const { data: words } = trpc.topics.getSpellingWords.useQuery({ category: category || undefined, limit: 200 });

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-bold">Spelling Words ({words?.length || 0} words)</h3>
      <div className="flex gap-2 flex-wrap">
        <button onClick={() => setCategory("")} className={`px-3 py-1.5 rounded-lg text-sm ${!category ? "bg-amber-500 text-white" : "bg-gray-100 text-gray-600"}`}>All</button>
        {categories?.map(c => (
          <button key={c} onClick={() => setCategory(c)} className={`px-3 py-1.5 rounded-lg text-sm ${category === c ? "bg-amber-500 text-white" : "bg-gray-100 text-gray-600"}`}>{c}</button>
        ))}
      </div>
      <div className="border rounded-xl overflow-hidden max-h-[500px] overflow-y-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 sticky top-0"><tr><th className="text-left p-3">Word</th><th className="text-left p-3">Category</th><th className="text-left p-3">Difficulty</th><th className="text-left p-3">Hint</th></tr></thead>
          <tbody>
            {words?.map((w: any) => (
              <tr key={w.id} className="border-t hover:bg-gray-50">
                <td className="p-3 font-medium">{w.word}</td>
                <td className="p-3 text-gray-500">{w.category}</td>
                <td className="p-3"><span className={`px-2 py-0.5 rounded text-xs ${w.difficultyLevel === "easy" ? "bg-green-100 text-green-800" : w.difficultyLevel === "hard" ? "bg-red-100 text-red-800" : "bg-amber-100 text-amber-800"}`}>{w.difficultyLevel}</span></td>
                <td className="p-3 text-gray-500 text-xs">{w.hint || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm text-amber-800">
        <p><strong>Tip:</strong> Use the Bulk Upload tab (select "Spelling Words" as content type) to add words in bulk via CSV.</p>
      </div>
    </div>
  );
}

// ─── AD BANNERS ADMIN TAB ────────────────────────────────────────────────
function AdBannersAdmin() {
  const { data: banners, refetch } = trpc.adBanners.getAll.useQuery();
  const [showAdd, setShowAdd] = useState(false);
  const [newBanner, setNewBanner] = useState({ title: "", imageUrl: "", destinationUrl: "", position: 1 });
  const createBanner = trpc.adBanners.create.useMutation({ onSuccess: () => { refetch(); setShowAdd(false); setNewBanner({ title: "", imageUrl: "", destinationUrl: "", position: 1 }); } });
  const updateBanner = trpc.adBanners.update.useMutation({ onSuccess: () => refetch() });
  const deleteBanner = trpc.adBanners.delete.useMutation({ onSuccess: () => refetch() });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold">Ad Banners ({banners?.length || 0})</h3>
        <button onClick={() => setShowAdd(!showAdd)} className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700">+ Add Banner</button>
      </div>

      {showAdd && (
        <div className="border rounded-xl p-4 bg-green-50 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <input type="text" placeholder="Banner title" value={newBanner.title} onChange={e => setNewBanner({...newBanner, title: e.target.value})} className="border rounded px-3 py-2 text-sm" />
            <input type="number" placeholder="Position (1-3)" value={newBanner.position} onChange={e => setNewBanner({...newBanner, position: parseInt(e.target.value) || 1})} className="border rounded px-3 py-2 text-sm" min={1} max={3} />
            <input type="text" placeholder="Image URL (upload to S3 first)" value={newBanner.imageUrl} onChange={e => setNewBanner({...newBanner, imageUrl: e.target.value})} className="border rounded px-3 py-2 text-sm col-span-2" />
            <input type="text" placeholder="Destination URL (where click goes)" value={newBanner.destinationUrl} onChange={e => setNewBanner({...newBanner, destinationUrl: e.target.value})} className="border rounded px-3 py-2 text-sm col-span-2" />
          </div>
          <button onClick={() => createBanner.mutate({ ...newBanner, isActive: true })} disabled={!newBanner.title || !newBanner.imageUrl || !newBanner.destinationUrl} className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm disabled:opacity-50">Save Banner</button>
        </div>
      )}

      <div className="border rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left p-3">Preview</th>
              <th className="text-left p-3">Title</th>
              <th className="text-left p-3">Position</th>
              <th className="text-left p-3">Status</th>
              <th className="text-left p-3">Destination</th>
              <th className="text-left p-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {banners?.map((b: any) => (
              <tr key={b.id} className="border-t hover:bg-gray-50">
                <td className="p-3"><img src={b.imageUrl} alt={b.title} className="w-24 h-16 object-cover rounded" /></td>
                <td className="p-3 font-medium">{b.title}</td>
                <td className="p-3">Slot {b.position}</td>
                <td className="p-3">
                  <button onClick={() => updateBanner.mutate({ id: b.id, isActive: !b.isActive })} className={`px-2 py-0.5 rounded text-xs font-medium ${b.isActive ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-600"}`}>
                    {b.isActive ? "Active" : "Inactive"}
                  </button>
                </td>
                <td className="p-3 text-xs text-blue-600 max-w-[200px] truncate"><a href={b.destinationUrl} target="_blank" rel="noopener">{b.destinationUrl}</a></td>
                <td className="p-3">
                  <button onClick={() => { if (confirm("Delete this banner?")) deleteBanner.mutate({ id: b.id }); }} className="text-red-600 hover:text-red-800 text-xs font-medium">Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800">
        <p><strong>How to add a banner:</strong> Upload your banner image via the Picture360 admin tab or directly to S3, copy the returned URL, then paste it in the Image URL field above. Set the destination URL (where users go when they click), choose which ad slot position (1-3), and save.</p>
      </div>
    </div>
  );
}

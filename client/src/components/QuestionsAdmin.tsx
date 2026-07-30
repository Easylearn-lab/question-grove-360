import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Edit2, Search, ChevronLeft, ChevronRight, Save, X } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

export function QuestionsAdmin() {
  const [page, setPage] = useState(0);
  const [searchFilter, setSearchFilter] = useState("");
  const [specialtyFilter, setSpecialtyFilter] = useState("all");
  const [editingQuestion, setEditingQuestion] = useState<any>(null);
  const [editForm, setEditForm] = useState<any>({});

  const limit = 20;
  const { data, isLoading, refetch } = trpc.admin.getQuestions.useQuery({
    limit,
    offset: page * limit,
    specialty: specialtyFilter !== "all" ? specialtyFilter : undefined,
  });

  const updateMutation = trpc.admin.updateQuestion.useMutation({
    onSuccess: () => {
      toast.success("Question updated successfully");
      setEditingQuestion(null);
      refetch();
    },
    onError: (err) => {
      toast.error(`Failed to update: ${err.message}`);
    },
  });

  const questions = data?.questions || [];
  const total = data?.total || 0;
  const totalPages = Math.ceil(total / limit);

  const filteredQuestions = searchFilter.trim()
    ? questions.filter((q: any) =>
        q.question?.toLowerCase().includes(searchFilter.toLowerCase()) ||
        q.topic?.toLowerCase().includes(searchFilter.toLowerCase())
      )
    : questions;

  const openEditDialog = (q: any) => {
    setEditingQuestion(q);
    setEditForm({
      question: q.question || "",
      optionA: q.optionA || "",
      optionB: q.optionB || "",
      optionC: q.optionC || "",
      optionD: q.optionD || "",
      optionE: q.optionE || "",
      correctAnswer: q.correctAnswer || "",
      topic: q.topic || "",
      difficulty: q.difficulty || "",
      specialty: q.specialty || "",
    });
  };

  const handleSave = () => {
    if (!editingQuestion) return;
    updateMutation.mutate({
      id: editingQuestion.id,
      data: editForm,
    });
  };

  return (
    <div>
      {/* Filters */}
      <div className="flex gap-3 mb-4 items-end">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Search questions or topics..."
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={specialtyFilter} onValueChange={(v) => { setSpecialtyFilter(v); setPage(0); }}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="All Specialties" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Specialties</SelectItem>
            <SelectItem value="Cardiology">Cardiology</SelectItem>
            <SelectItem value="Respiratory">Respiratory</SelectItem>
            <SelectItem value="Neurology">Neurology</SelectItem>
            <SelectItem value="Gastroenterology">Gastroenterology</SelectItem>
            <SelectItem value="Endocrinology">Endocrinology</SelectItem>
            <SelectItem value="Renal">Renal</SelectItem>
            <SelectItem value="Rheumatology">Rheumatology</SelectItem>
            <SelectItem value="Dermatology">Dermatology</SelectItem>
            <SelectItem value="Haematology">Haematology</SelectItem>
            <SelectItem value="Infectious Disease">Infectious Disease</SelectItem>
            <SelectItem value="Ophthalmology">Ophthalmology</SelectItem>
            <SelectItem value="ENT">ENT</SelectItem>
            <SelectItem value="Psychiatry">Psychiatry</SelectItem>
            <SelectItem value="Paediatrics">Paediatrics</SelectItem>
            <SelectItem value="Obstetrics & Gynaecology">Obstetrics & Gynaecology</SelectItem>
            <SelectItem value="Pharmacology & Prescribing">Pharmacology & Prescribing</SelectItem>
            <SelectItem value="Statistics & Evidence-Based Medicine">Statistics & Evidence-Based Medicine</SelectItem>
            <SelectItem value="Ethics & Professionalism">Ethics & Professionalism</SelectItem>
            <SelectItem value="Musculoskeletal">Musculoskeletal</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Stats */}
      <div className="text-sm text-slate-500 mb-3">
        Showing {page * limit + 1}–{Math.min((page + 1) * limit, total)} of {total} questions
      </div>

      {/* Table */}
      <Card className="border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 w-12">ID</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500">Question</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 w-32">Specialty</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 w-40">Topic</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 w-20">Diff.</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 w-16">Edit</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-400">Loading...</td></tr>
              ) : filteredQuestions.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-400">No questions found</td></tr>
              ) : (
                filteredQuestions.map((q: any) => (
                  <tr key={q.id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="px-4 py-2 text-xs text-slate-400 font-mono">{q.id}</td>
                    <td className="px-4 py-2 text-sm text-slate-900 max-w-md truncate">{q.question?.slice(0, 80)}{q.question?.length > 80 ? "..." : ""}</td>
                    <td className="px-4 py-2 text-xs text-slate-600">{q.specialty}</td>
                    <td className="px-4 py-2">
                      {q.topic ? (
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-50 text-green-700 border border-green-200">
                          {q.topic}
                        </span>
                      ) : (
                        <span className="text-xs text-slate-300 italic">untagged</span>
                      )}
                    </td>
                    <td className="px-4 py-2">
                      {q.difficulty && (
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                          q.difficulty === "Medium" ? "bg-yellow-50 text-yellow-700" :
                          q.difficulty === "Hard" ? "bg-red-50 text-red-700" :
                          "bg-slate-50 text-slate-600"
                        }`}>
                          {q.difficulty}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-2">
                      <Button variant="ghost" size="sm" onClick={() => openEditDialog(q)}>
                        <Edit2 className="w-3.5 h-3.5" />
                      </Button>
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
        <Button
          variant="outline"
          size="sm"
          onClick={() => setPage(Math.max(0, page - 1))}
          disabled={page === 0}
          className="gap-1"
        >
          <ChevronLeft className="w-4 h-4" /> Previous
        </Button>
        <span className="text-sm text-slate-500">Page {page + 1} of {totalPages}</span>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
          disabled={page >= totalPages - 1}
          className="gap-1"
        >
          Next <ChevronRight className="w-4 h-4" />
        </Button>
      </div>

      {/* Edit Dialog */}
      <Dialog open={!!editingQuestion} onOpenChange={(open) => { if (!open) setEditingQuestion(null); }}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Question #{editingQuestion?.id}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <label className="text-sm font-medium text-slate-700 mb-1 block">Question Stem</label>
              <textarea
                className="w-full border rounded-md p-2 text-sm min-h-[80px] resize-y"
                value={editForm.question}
                onChange={(e) => setEditForm({ ...editForm, question: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium text-slate-700 mb-1 block">Specialty</label>
                <Input value={editForm.specialty} onChange={(e) => setEditForm({ ...editForm, specialty: e.target.value })} />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700 mb-1 block">Topic</label>
                <Input
                  value={editForm.topic}
                  onChange={(e) => setEditForm({ ...editForm, topic: e.target.value })}
                  placeholder="e.g. Headache, Epilepsy..."
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium text-slate-700 mb-1 block">Difficulty</label>
                <Select value={editForm.difficulty} onValueChange={(v) => setEditForm({ ...editForm, difficulty: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Easy">Easy</SelectItem>
                    <SelectItem value="Medium">Medium</SelectItem>
                    <SelectItem value="Hard">Hard</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700 mb-1 block">Correct Answer</label>
                <Select value={editForm.correctAnswer} onValueChange={(v) => setEditForm({ ...editForm, correctAnswer: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="A">A</SelectItem>
                    <SelectItem value="B">B</SelectItem>
                    <SelectItem value="C">C</SelectItem>
                    <SelectItem value="D">D</SelectItem>
                    <SelectItem value="E">E</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            {(["A", "B", "C", "D", "E"] as const).map((letter) => (
              <div key={letter}>
                <label className="text-sm font-medium text-slate-700 mb-1 block">
                  Option {letter} {editForm.correctAnswer === letter && <span className="text-green-600">(correct)</span>}
                </label>
                <Input
                  value={editForm[`option${letter}`]}
                  onChange={(e) => setEditForm({ ...editForm, [`option${letter}`]: e.target.value })}
                />
              </div>
            ))}
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setEditingQuestion(null)} className="gap-1">
                <X className="w-4 h-4" /> Cancel
              </Button>
              <Button
                onClick={handleSave}
                disabled={updateMutation.isPending}
                className="bg-green-600 hover:bg-green-700 text-white gap-1"
              >
                <Save className="w-4 h-4" /> {updateMutation.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

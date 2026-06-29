import { useAuth } from "@/_core/hooks/useAuth";
import { useLocation } from "wouter";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Users, BookOpen, BarChart3, Settings, Edit2, Trash2, Plus, Image, Upload } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

const MOCK_USERS = [
  { id: 1, name: "John Doe", email: "john@example.com", role: "user", joinDate: "2026-01-15", status: "active" },
  { id: 2, name: "Jane Smith", email: "jane@example.com", role: "user", joinDate: "2026-02-20", status: "active" },
  { id: 3, name: "Admin User", email: "admin@example.com", role: "admin", joinDate: "2025-12-01", status: "active" },
];

const MOCK_QUESTIONS = [
  { id: 1, text: "What is the classic presentation of AMI?", specialty: "Cardiology", difficulty: "Medium" },
  { id: 2, text: "What are the stages of CKD?", specialty: "Renal", difficulty: "Easy" },
  { id: 3, text: "Pathophysiology of DKA?", specialty: "Endocrinology", difficulty: "Hard" },
];

const ANALYTICS = {
  totalUsers: 2543,
  activeUsers: 1892,
  totalQuestions: 15420,
  mockExamsTaken: 8932,
  avgScore: 76.5,
  retention: 82,
};


function Picture360Admin() {
  const [showUpload, setShowUpload] = useState(false);
  const [uploadForm, setUploadForm] = useState({
    specialty: "Dermatology",
    title: "",
    description: "",
    diagnosis: "",
    explanation: "",
    imageData: "",
    imageMimeType: "image/jpeg",
  });
  const [uploading, setUploading] = useState(false);

  const imagesQuery = trpc.admin.getPicture360Images.useQuery({ limit: 50, offset: 0 });
  const uploadMutation = trpc.admin.uploadPicture360Image.useMutation({
    onSuccess: () => {
      toast.success("Image uploaded successfully");
      imagesQuery.refetch();
      setShowUpload(false);
      setUploadForm({ specialty: "Dermatology", title: "", description: "", diagnosis: "", explanation: "", imageData: "", imageMimeType: "image/jpeg" });
    },
    onError: (err) => toast.error(err.message),
  });
  const deleteMutation = trpc.admin.deletePicture360Image.useMutation({
    onSuccess: () => {
      toast.success("Image archived");
      imagesQuery.refetch();
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = (reader.result as string).split(",")[1];
      setUploadForm((prev) => ({ ...prev, imageData: base64, imageMimeType: file.type }));
    };
    reader.readAsDataURL(file);
  };

  const handleUpload = () => {
    if (!uploadForm.imageData || !uploadForm.title || !uploadForm.diagnosis) {
      toast.error("Please fill in title, diagnosis, and select an image");
      return;
    }
    setUploading(true);
    uploadMutation.mutate(uploadForm, { onSettled: () => setUploading(false) });
  };

  const SPECIALTIES = ["Dermatology", "Ophthalmology", "ECG", "ENT", "Chest X-ray", "Paediatrics"];

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-lg font-bold text-slate-900">Picture360 Images ({imagesQuery.data?.total || 0})</h3>
        <Button onClick={() => setShowUpload(!showUpload)} className="bg-green-600 hover:bg-green-700 text-white gap-2">
          <Upload className="w-4 h-4" />
          Upload Image
        </Button>
      </div>

      {showUpload && (
        <Card className="p-6 border-slate-200 mb-6">
          <h4 className="font-bold text-slate-900 mb-4">Upload New Image</h4>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Specialty</label>
              <select
                className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm"
                value={uploadForm.specialty}
                onChange={(e) => setUploadForm((prev) => ({ ...prev, specialty: e.target.value }))}
              >
                {SPECIALTIES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Title *</label>
              <Input value={uploadForm.title} onChange={(e) => setUploadForm((prev) => ({ ...prev, title: e.target.value }))} placeholder="e.g. Psoriasis Plaque" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Diagnosis *</label>
              <Input value={uploadForm.diagnosis} onChange={(e) => setUploadForm((prev) => ({ ...prev, diagnosis: e.target.value }))} placeholder="e.g. Plaque Psoriasis" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Image File *</label>
              <input type="file" accept="image/*" onChange={handleFileChange} className="w-full text-sm border border-slate-300 rounded-md px-3 py-2" />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
              <Input value={uploadForm.description} onChange={(e) => setUploadForm((prev) => ({ ...prev, description: e.target.value }))} placeholder="Brief clinical description" />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">Explanation</label>
              <Input value={uploadForm.explanation} onChange={(e) => setUploadForm((prev) => ({ ...prev, explanation: e.target.value }))} placeholder="Detailed explanation for learners" />
            </div>
          </div>
          <div className="mt-4 flex gap-3">
            <Button onClick={handleUpload} disabled={uploading} className="bg-green-600 hover:bg-green-700 text-white">
              {uploading ? "Uploading..." : "Upload Image"}
            </Button>
            <Button variant="outline" onClick={() => setShowUpload(false)}>Cancel</Button>
          </div>
        </Card>
      )}

      {/* Images List */}
      <Card className="border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium text-slate-700">Image</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-slate-700">Title</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-slate-700">Specialty</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-slate-700">Diagnosis</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-slate-700">Status</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-slate-700">Actions</th>
              </tr>
            </thead>
            <tbody>
              {(imagesQuery.data?.images as any[] || []).map((img: any) => (
                <tr key={img.id} className="border-b border-slate-200 hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <img src={img.imageUrl} alt={img.title} className="w-16 h-16 object-cover rounded" />
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-900">{img.title}</td>
                  <td className="px-4 py-3 text-sm text-slate-600">{img.specialty}</td>
                  <td className="px-4 py-3 text-sm text-slate-600">{img.diagnosis}</td>
                  <td className="px-4 py-3 text-sm">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${img.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {img.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700" onClick={() => deleteMutation.mutate(img.id)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </td>
                </tr>
              ))}
              {(!imagesQuery.data?.images || (imagesQuery.data.images as any[]).length === 0) && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-500">No images uploaded yet</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

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

  if (!isAuthenticated || user?.role !== "admin") {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/dashboard")}
            className="text-slate-600 hover:text-slate-900"
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <h1 className="text-2xl font-bold text-slate-900">Admin Panel</h1>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-5 mb-8">
            <TabsTrigger value="analytics" className="gap-2">
              <BarChart3 className="w-4 h-4" />
              Analytics
            </TabsTrigger>
            <TabsTrigger value="users" className="gap-2">
              <Users className="w-4 h-4" />
              Users
            </TabsTrigger>
            <TabsTrigger value="questions" className="gap-2">
              <BookOpen className="w-4 h-4" />
              Questions
            </TabsTrigger>
            <TabsTrigger value="settings" className="gap-2">
              <Settings className="w-4 h-4" />
              Settings
            </TabsTrigger>
            <TabsTrigger value="picture360" className="gap-2">
              <Image className="w-4 h-4" />
              Picture360
            </TabsTrigger>
          </TabsList>

          {/* Analytics Tab */}
          <TabsContent value="analytics">
            <div className="grid md:grid-cols-3 gap-6 mb-8">
              {[
                { label: "Total Users", value: ANALYTICS.totalUsers, icon: Users },
                { label: "Active Users (30d)", value: ANALYTICS.activeUsers, icon: Users },
                { label: "Total Questions", value: ANALYTICS.totalQuestions, icon: BookOpen },
              ].map((stat, idx) => (
                <Card key={idx} className="p-6 border-slate-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-slate-600 mb-1">{stat.label}</p>
                      <p className="text-3xl font-bold text-slate-900">{stat.value.toLocaleString()}</p>
                    </div>
                    <stat.icon className="w-10 h-10 text-green-600 opacity-20" />
                  </div>
                </Card>
              ))}
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <Card className="p-6 border-slate-200">
                <h3 className="font-bold text-slate-900 mb-4">Platform Metrics</h3>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-600">Mock Exams Taken</span>
                    <span className="font-bold text-slate-900">{ANALYTICS.mockExamsTaken.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-600">Average Score</span>
                    <span className="font-bold text-slate-900">{ANALYTICS.avgScore}%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-600">30-Day Retention</span>
                    <span className="font-bold text-slate-900">{ANALYTICS.retention}%</span>
                  </div>
                </div>
              </Card>

              <Card className="p-6 border-slate-200">
                <h3 className="font-bold text-slate-900 mb-4">Revenue Metrics</h3>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-600">MRR</span>
                    <span className="font-bold text-slate-900">$45,230</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-600">Paid Users</span>
                    <span className="font-bold text-slate-900">1,245</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-600">Churn Rate</span>
                    <span className="font-bold text-slate-900">3.2%</span>
                  </div>
                </div>
              </Card>
            </div>
          </TabsContent>

          {/* Users Tab */}
          <TabsContent value="users">
            <Card className="border-slate-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="px-6 py-3 text-left text-sm font-medium text-slate-700">Name</th>
                      <th className="px-6 py-3 text-left text-sm font-medium text-slate-700">Email</th>
                      <th className="px-6 py-3 text-left text-sm font-medium text-slate-700">Role</th>
                      <th className="px-6 py-3 text-left text-sm font-medium text-slate-700">Join Date</th>
                      <th className="px-6 py-3 text-left text-sm font-medium text-slate-700">Status</th>
                      <th className="px-6 py-3 text-left text-sm font-medium text-slate-700">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {MOCK_USERS.map((u) => (
                      <tr key={u.id} className="border-b border-slate-200 hover:bg-slate-50">
                        <td className="px-6 py-3 text-sm text-slate-900">{u.name}</td>
                        <td className="px-6 py-3 text-sm text-slate-600">{u.email}</td>
                        <td className="px-6 py-3 text-sm">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            u.role === "admin" ? "bg-purple-100 text-purple-700" : "bg-slate-100 text-slate-700"
                          }`}>
                            {u.role}
                          </span>
                        </td>
                        <td className="px-6 py-3 text-sm text-slate-600">{u.joinDate}</td>
                        <td className="px-6 py-3 text-sm">
                          <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                            {u.status}
                          </span>
                        </td>
                        <td className="px-6 py-3 text-sm">
                          <div className="flex gap-2">
                            <Button variant="ghost" size="sm">
                              <Edit2 className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700">
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </TabsContent>

          {/* Questions Tab */}
          <TabsContent value="questions">
            <div className="mb-6">
              <Button className="bg-green-600 hover:bg-green-700 text-gray-900 gap-2">
                <Plus className="w-4 h-4" />
                Add Question
              </Button>
            </div>

            <Card className="border-slate-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="px-6 py-3 text-left text-sm font-medium text-slate-700">Question</th>
                      <th className="px-6 py-3 text-left text-sm font-medium text-slate-700">Specialty</th>
                      <th className="px-6 py-3 text-left text-sm font-medium text-slate-700">Difficulty</th>
                      <th className="px-6 py-3 text-left text-sm font-medium text-slate-700">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {MOCK_QUESTIONS.map((q) => (
                      <tr key={q.id} className="border-b border-slate-200 hover:bg-slate-50">
                        <td className="px-6 py-3 text-sm text-slate-900">{q.text}</td>
                        <td className="px-6 py-3 text-sm text-slate-600">{q.specialty}</td>
                        <td className="px-6 py-3 text-sm">
                          {q.difficulty !== "Easy" ? (
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              q.difficulty === "Medium" ? "bg-yellow-100 text-yellow-700" :
                              "bg-red-100 text-red-700"
                            }`}>
                              {q.difficulty}
                            </span>
                          ) : (
                            <span className="px-2 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-600">—</span>
                          )}
                        </td>
                        <td className="px-6 py-3 text-sm">
                          <div className="flex gap-2">
                            <Button variant="ghost" size="sm">
                              <Edit2 className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700">
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings">
            <Card className="p-6 border-slate-200">
              <h3 className="text-lg font-bold text-slate-900 mb-6">Platform Settings</h3>
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Platform Name</label>
                  <Input defaultValue="Question Grove 360" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Support Email</label>
                  <Input defaultValue="support@questiongrove.com" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Max Questions Per Mock</label>
                  <Input defaultValue="200" type="number" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Coupon Access Duration (days)</label>
                  <Input defaultValue="3" type="number" disabled />
                  <p className="text-xs text-slate-500 mt-1">Fixed at 3 days. Coupons are admin-only.</p>
                </div>
                <Button className="bg-green-600 hover:bg-green-700 text-gray-900">Save Settings</Button>
              </div>
            </Card>
          </TabsContent>

          {/* Picture360 Tab */}
          <TabsContent value="picture360">
            <Picture360Admin />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

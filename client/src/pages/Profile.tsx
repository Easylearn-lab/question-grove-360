import { useAuth } from "@/_core/hooks/useAuth";
import { useLocation } from "wouter";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Save, Loader2, LogOut } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { SecuritySettings } from "@/components/SecuritySettings";

const SPECIALTIES = [
  "Cardiology",
  "Respiratory",
  "Gastroenterology",
  "Neurology",
  "Endocrinology",
  "Dermatology",
  "Psychiatry",
  "Musculoskeletal",
  "Renal",
  "Obstetrics & Gynaecology",
  "Paediatrics",
  "Haematology",
  "Ophthalmology",
  "ENT",
  "General Practice",
  "Surgery",
  "Anaesthetics",
];

const EXAMS = [
  "MRCGP AKT",
  "MRCGP SCA",
  "PLAB 1",
  "PLAB 2",
  "UKMLA",
  "MSRA",
  "MRCP Part 1",
  "MRCP Part 2",
  "MRCPCH",
  "MRCS",
  "FRCA",
  "MRCOG",
  "USMLE Step 1",
  "USMLE Step 2",
  "USMLE Step 3",
  "MCCQE",
  "AMC",
];

const TRAINING_YEARS = [
  "Medical Student Year 1",
  "Medical Student Year 2",
  "Medical Student Year 3",
  "Medical Student Year 4",
  "Medical Student Year 5",
  "Foundation Year 1",
  "Foundation Year 2",
  "Core Training Year 1",
  "Core Training Year 2",
  "Core Training Year 3",
  "Specialist Training Year 1",
  "Specialist Training Year 2+",
];

const COUNTRIES = [
  "United Kingdom",
  "United States",
  "Canada",
  "Australia",
  "India",
  "Pakistan",
  "United Arab Emirates",
  "Saudi Arabia",
  "Nigeria",
  "South Africa",
  "Other",
];

export default function Profile() {
  const { user, isAuthenticated, logout } = useAuth();
  const [, navigate] = useLocation();
  const { data: profile, isLoading: profileLoading } = trpc.profile.getProfile.useQuery();
  const updateProfileMutation = trpc.profile.updateProfile.useMutation();

  const [formData, setFormData] = useState({
    fullName: "",
    specialty: "",
    trainingYear: "",
    targetExam: "",
    targetExamDate: "",
    country: "",
    currency: "GBP",
    dailyQuestionGoal: 30,
    weeklyHourGoal: 10,
    leaderboardOptIn: false,
  });

  useEffect(() => {
    if (!isAuthenticated) {
      navigate("/");
    }
  }, [isAuthenticated, navigate]);

  useEffect(() => {
    if (profile) {
      setFormData({
        fullName: profile.fullName || "",
        specialty: profile.specialty || "",
        trainingYear: profile.trainingYear || "",
        targetExam: profile.targetExam || "",
        targetExamDate: profile.targetExamDate ? String(profile.targetExamDate) : "",
        country: profile.country || "",
        currency: profile.currency || "GBP",
        dailyQuestionGoal: profile.dailyQuestionGoal || 30,
        weeklyHourGoal: profile.weeklyHourGoal || 10,
        leaderboardOptIn: profile.leaderboardOptIn || false,
      });
    }
  }, [profile]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await updateProfileMutation.mutateAsync({
        specialty: formData.specialty,
        trainingYear: parseInt(formData.trainingYear) || undefined,
        targetExam: formData.targetExam,
        country: formData.country,
      });
      toast.success("Profile updated successfully!");
    } catch (error) {
      toast.error("Failed to update profile");
    }
  };

  if (!isAuthenticated || !user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/dashboard")}
            className="text-slate-600 hover:text-slate-900"
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <h1 className="text-2xl font-bold text-slate-900">Profile Settings</h1>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {profileLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 text-green-600 animate-spin" />
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Personal Information */}
            <Card className="p-8 border-slate-200">
              <h2 className="text-2xl font-bold text-slate-900 mb-6">Personal Information</h2>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="fullName" className="text-slate-700 font-medium">Full Name</Label>
                  <Input
                    id="fullName"
                    value={formData.fullName}
                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                    placeholder="Your full name"
                    className="mt-2"
                  />
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="country" className="text-slate-700 font-medium">Country</Label>
                    <Select value={formData.country} onValueChange={(value) => setFormData({ ...formData, country: value })}>
                      <SelectTrigger className="mt-2">
                        <SelectValue placeholder="Select country" />
                      </SelectTrigger>
                      <SelectContent>
                        {COUNTRIES.map((country) => (
                          <SelectItem key={country} value={country}>{country}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="currency" className="text-slate-700 font-medium">Currency</Label>
                    <Select value={formData.currency} onValueChange={(value) => setFormData({ ...formData, currency: value })}>
                      <SelectTrigger className="mt-2">
                        <SelectValue placeholder="Select currency" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="GBP">GBP (£)</SelectItem>
                        <SelectItem value="USD">USD ($)</SelectItem>
                        <SelectItem value="EUR">EUR (€)</SelectItem>
                        <SelectItem value="INR">INR (₹)</SelectItem>
                        <SelectItem value="AED">AED (د.إ)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </Card>

            {/* Medical Background */}
            <Card className="p-8 border-slate-200">
              <h2 className="text-2xl font-bold text-slate-900 mb-6">Medical Background</h2>
              <div className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="specialty" className="text-slate-700 font-medium">Primary Specialty</Label>
                    <Select value={formData.specialty} onValueChange={(value) => setFormData({ ...formData, specialty: value })}>
                      <SelectTrigger className="mt-2">
                        <SelectValue placeholder="Select specialty" />
                      </SelectTrigger>
                      <SelectContent>
                        {SPECIALTIES.map((specialty) => (
                          <SelectItem key={specialty} value={specialty}>{specialty}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="trainingYear" className="text-slate-700 font-medium">Training Year</Label>
                    <Select value={formData.trainingYear} onValueChange={(value) => setFormData({ ...formData, trainingYear: value })}>
                      <SelectTrigger className="mt-2">
                        <SelectValue placeholder="Select training year" />
                      </SelectTrigger>
                      <SelectContent>
                        {TRAINING_YEARS.map((year) => (
                          <SelectItem key={year} value={year}>{year}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </Card>

            {/* Exam Preparation */}
            <Card className="p-8 border-slate-200">
              <h2 className="text-2xl font-bold text-slate-900 mb-6">Exam Preparation</h2>
              <div className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="targetExam" className="text-slate-700 font-medium">Target Exam</Label>
                    <Select value={formData.targetExam} onValueChange={(value) => setFormData({ ...formData, targetExam: value })}>
                      <SelectTrigger className="mt-2">
                        <SelectValue placeholder="Select target exam" />
                      </SelectTrigger>
                      <SelectContent>
                        {EXAMS.map((exam) => (
                          <SelectItem key={exam} value={exam}>{exam}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="targetExamDate" className="text-slate-700 font-medium">Target Exam Date</Label>
                    <Input
                      id="targetExamDate"
                      type="date"
                      value={formData.targetExamDate || ""}
                      onChange={(e) => setFormData({ ...formData, targetExamDate: e.target.value })}
                      className="mt-2"
                    />
                  </div>
                </div>
              </div>
            </Card>

            {/* Study Goals */}
            <Card className="p-8 border-slate-200">
              <h2 className="text-2xl font-bold text-slate-900 mb-6">Study Goals</h2>
              <div className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="dailyQuestionGoal" className="text-slate-700 font-medium">Daily Question Goal</Label>
                    <Input
                      id="dailyQuestionGoal"
                      type="number"
                      min="1"
                      max="500"
                      value={formData.dailyQuestionGoal}
                      onChange={(e) => setFormData({ ...formData, dailyQuestionGoal: parseInt(e.target.value) })}
                      className="mt-2"
                    />
                  </div>
                  <div>
                    <Label htmlFor="weeklyHourGoal" className="text-slate-700 font-medium">Weekly Study Hours Goal</Label>
                    <Input
                      id="weeklyHourGoal"
                      type="number"
                      min="1"
                      max="100"
                      value={formData.weeklyHourGoal}
                      onChange={(e) => setFormData({ ...formData, weeklyHourGoal: parseInt(e.target.value) })}
                      className="mt-2"
                    />
                  </div>
                </div>
              </div>
            </Card>

            {/* Preferences */}
            <Card className="p-8 border-slate-200">
              <h2 className="text-2xl font-bold text-slate-900 mb-6">Preferences</h2>
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="leaderboardOptIn"
                  checked={formData.leaderboardOptIn}
                  onChange={(e) => setFormData({ ...formData, leaderboardOptIn: e.target.checked })}
                  className="w-4 h-4 rounded border-slate-300 text-green-600 cursor-pointer"
                />
                <Label htmlFor="leaderboardOptIn" className="text-slate-700 font-medium cursor-pointer">
                  Opt in to leaderboard (show my performance anonymously)
                </Label>
              </div>
            </Card>

            {/* Security Settings */}
            <SecuritySettings />

            {/* Submit Button */}
            <div className="flex gap-4">
              <Button
                type="submit"
                disabled={updateProfileMutation.isPending}
                className="bg-green-600 hover:bg-green-700 text-gray-900 gap-2"
              >
                {updateProfileMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    Save Changes
                  </>
                )}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate("/dashboard")}
              >
                Cancel
              </Button>
            </div>
          </form>
        )}

        {/* Account Actions */}
        <Card className="mt-8 p-6 border-red-200 bg-red-50">
          <h3 className="text-lg font-bold text-slate-900 mb-2">Account</h3>
          <p className="text-sm text-slate-600 mb-4">Sign out of your account on this device.</p>
          <Button
            variant="outline"
            className="border-red-300 text-red-600 hover:bg-red-100 gap-2"
            onClick={() => { logout(); navigate("/"); }}
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </Button>
        </Card>
      </main>
    </div>
  );
}

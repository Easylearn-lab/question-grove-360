import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";

export default function Onboarding() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    specialty: "",
    trainingYear: "",
    targetExam: "",
    country: "",
  });

  const updateProfileMutation = trpc.profile.updateProfile.useMutation();

  const handleNext = async () => {
    if (step === 4) {
      // Submit form
      try {
        await updateProfileMutation.mutateAsync({
          specialty: formData.specialty,
          trainingYear: parseInt(formData.trainingYear),
          targetExam: formData.targetExam,
          country: formData.country,
        });
        navigate("/dashboard");
      } catch (error) {
        console.error("Failed to update profile:", error);
      }
    } else {
      setStep(step + 1);
    }
  };

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 text-white flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex justify-between mb-2">
            {[1, 2, 3, 4].map((s) => (
              <div
                key={s}
                className={`h-1 flex-1 mx-1 rounded-full transition-all ${
                  s <= step ? "bg-teal-500" : "bg-gray-700"
                }`}
              />
            ))}
          </div>
          <p className="text-sm text-gray-400">Step {step} of 4</p>
        </div>

        {/* Card */}
        <div className="bg-gray-800 rounded-xl p-8 shadow-2xl">
          {/* Step 1: Specialty */}
          {step === 1 && (
            <div>
              <h2 className="text-3xl font-bold mb-2">Welcome, {user?.name}!</h2>
              <p className="text-gray-400 mb-8">Let's set up your profile to get the best experience.</p>
              
              <label className="block mb-4">
                <span className="block text-sm font-semibold mb-2">What's your medical specialty?</span>
                <select
                  value={formData.specialty}
                  onChange={(e) => setFormData({ ...formData, specialty: e.target.value })}
                  className="w-full bg-gray-700 text-white rounded-lg p-3 border border-gray-600 focus:border-teal-500 outline-none"
                >
                  <option value="">Select a specialty...</option>
                  <option value="General Practice">General Practice</option>
                  <option value="Internal Medicine">Internal Medicine</option>
                  <option value="Surgery">Surgery</option>
                  <option value="Pediatrics">Pediatrics</option>
                  <option value="Psychiatry">Psychiatry</option>
                  <option value="Obstetrics & Gynaecology">Obstetrics & Gynaecology</option>
                  <option value="Radiology">Radiology</option>
                  <option value="Pathology">Pathology</option>
                  <option value="Other">Other</option>
                </select>
              </label>
            </div>
          )}

          {/* Step 2: Training Year */}
          {step === 2 && (
            <div>
              <h2 className="text-3xl font-bold mb-2">Training Level</h2>
              <p className="text-gray-400 mb-8">This helps us personalize your learning path.</p>
              
              <label className="block mb-4">
                <span className="block text-sm font-semibold mb-2">What's your current training year?</span>
                <select
                  value={formData.trainingYear}
                  onChange={(e) => setFormData({ ...formData, trainingYear: e.target.value })}
                  className="w-full bg-gray-700 text-white rounded-lg p-3 border border-gray-600 focus:border-teal-500 outline-none"
                >
                  <option value="">Select training year...</option>
                  <option value="1">Year 1</option>
                  <option value="2">Year 2</option>
                  <option value="3">Year 3</option>
                  <option value="4">Year 4</option>
                  <option value="5">Year 5+</option>
                  <option value="0">Not in training</option>
                </select>
              </label>
            </div>
          )}

          {/* Step 3: Target Exam */}
          {step === 3 && (
            <div>
              <h2 className="text-3xl font-bold mb-2">Target Exam</h2>
              <p className="text-gray-400 mb-8">Which exam are you preparing for?</p>
              
              <label className="block mb-4">
                <span className="block text-sm font-semibold mb-2">Select your target exam</span>
                <select
                  value={formData.targetExam}
                  onChange={(e) => setFormData({ ...formData, targetExam: e.target.value })}
                  className="w-full bg-gray-700 text-white rounded-lg p-3 border border-gray-600 focus:border-teal-500 outline-none"
                >
                  <option value="">Select exam...</option>
                  <option value="MRCGP AKT">MRCGP AKT</option>
                  <option value="MRCGP SCA">MRCGP SCA</option>
                  <option value="PLAB 1">PLAB 1</option>
                  <option value="PLAB 2">PLAB 2</option>
                  <option value="USMLE Step 1">USMLE Step 1</option>
                  <option value="USMLE Step 2">USMLE Step 2</option>
                  <option value="USMLE Step 3">USMLE Step 3</option>
                  <option value="MCCQE1">MCCQE1</option>
                  <option value="MCCQE2">MCCQE2</option>
                  <option value="AMC">AMC</option>
                  <option value="Other">Other</option>
                </select>
              </label>
            </div>
          )}

          {/* Step 4: Study Goal */}
          {step === 4 && (
            <div>
              <h2 className="text-3xl font-bold mb-2">Location</h2>
              <p className="text-gray-400 mb-8">Where are you based?</p>
              
              <label className="block mb-4">
                <span className="block text-sm font-semibold mb-2">Select your country</span>
                <select
                  value={formData.country}
                  onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                  className="w-full bg-gray-700 text-white rounded-lg p-3 border border-gray-600 focus:border-teal-500 outline-none"
                >
                  <option value="">Select country...</option>
                  <option value="United Kingdom">United Kingdom</option>
                  <option value="United States">United States</option>
                  <option value="Canada">Canada</option>
                  <option value="Australia">Australia</option>
                  <option value="India">India</option>
                  <option value="UAE">UAE</option>
                  <option value="Saudi Arabia">Saudi Arabia</option>
                  <option value="Other">Other</option>
                </select>
              </label>
            </div>
          )}

          {/* Buttons */}
          <div className="flex gap-4 mt-8">
            <Button
              onClick={handleBack}
              disabled={step === 1}
              className="flex-1 bg-gray-700 hover:bg-gray-600 text-white disabled:opacity-50"
            >
              Back
            </Button>
            <Button
              onClick={handleNext}
              disabled={
                (step === 1 && !formData.specialty) ||
                (step === 2 && !formData.trainingYear) ||
                (step === 3 && !formData.targetExam) ||
                (step === 4 && !formData.country)
              }
              className="flex-1 bg-teal-600 hover:bg-teal-700 text-white disabled:opacity-50"
            >
              {step === 4 ? "Complete Setup" : "Next"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

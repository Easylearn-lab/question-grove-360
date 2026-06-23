import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Eye, EyeOff, AlertCircle, CheckCircle2 } from "lucide-react";
import { useLocation } from "wouter";

export function SecuritySettings() {
  const [, navigate] = useLocation();
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Form state for change password
  const [changePasswordForm, setChangePasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  // Queries and mutations
  const { data: loginMethods, isLoading: isLoadingMethods } = trpc.password.getLoginMethods.useQuery();
  const changePasswordMutation = trpc.password.changePassword.useMutation();
  const setPasswordMutation = trpc.password.requestSetPassword.useMutation();

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (changePasswordForm.newPassword !== changePasswordForm.confirmPassword) {
      setErrorMessage("New passwords do not match");
      return;
    }

    try {
      const result = await changePasswordMutation.mutateAsync({
        currentPassword: changePasswordForm.currentPassword,
        newPassword: changePasswordForm.newPassword,
        confirmPassword: changePasswordForm.confirmPassword,
      });

      setSuccessMessage(result.message);
      setChangePasswordForm({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });

      // Clear success message after 5 seconds
      setTimeout(() => setSuccessMessage(null), 5000);
    } catch (error: any) {
      setErrorMessage(error.message || "Failed to change password");
    }
  };

  const handleSetPassword = async () => {
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const result = await setPasswordMutation.mutateAsync();
      setSuccessMessage(result.message);
      setTimeout(() => setSuccessMessage(null), 5000);
    } catch (error: any) {
      setErrorMessage(error.message || "Failed to send password setup email");
    }
  };

  if (isLoadingMethods) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Security</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">Loading security settings...</div>
        </CardContent>
      </Card>
    );
  }

  const hasEmailPassword = loginMethods?.hasEmailPassword || false;
  const hasGoogle = loginMethods?.hasGoogle || false;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Security</CardTitle>
        <CardDescription>Manage your login methods and password</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Success Message */}
        {successMessage && (
          <Alert className="border-green-500 bg-green-50">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">{successMessage}</AlertDescription>
          </Alert>
        )}

        {/* Error Message */}
        {errorMessage && (
          <Alert className="border-red-500 bg-red-50">
            <AlertCircle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800">{errorMessage}</AlertDescription>
          </Alert>
        )}

        {/* Login Methods Display */}
        {(hasGoogle || hasEmailPassword) && (
          <div className="space-y-3">
            <h3 className="font-semibold text-sm">Login Methods</h3>
            <div className="space-y-2">
              {hasGoogle && (
                <div className="flex items-center justify-between p-3 border rounded-lg bg-gray-50">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                    <div>
                      <p className="font-medium text-sm">Google</p>
                      <p className="text-xs text-gray-600">Connected</p>
                    </div>
                  </div>
                </div>
              )}

              {hasEmailPassword && (
                <div className="flex items-center justify-between p-3 border rounded-lg bg-gray-50">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                    <div>
                      <p className="font-medium text-sm">Email & Password</p>
                      <p className="text-xs text-gray-600">Active</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Change Password Form (for users with email/password) */}
        {hasEmailPassword && (
          <div className="space-y-4 pt-4 border-t">
            <h3 className="font-semibold text-sm">Change Password</h3>

            <form onSubmit={handleChangePassword} className="space-y-4">
              {/* Current Password */}
              <div className="space-y-2">
                <Label htmlFor="current-password" className="text-sm">
                  Current Password
                </Label>
                <div className="relative">
                  <Input
                    id="current-password"
                    type={showCurrentPassword ? "text" : "password"}
                    placeholder="Enter your current password"
                    value={changePasswordForm.currentPassword}
                    onChange={(e) =>
                      setChangePasswordForm({
                        ...changePasswordForm,
                        currentPassword: e.target.value,
                      })
                    }
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  >
                    {showCurrentPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* New Password */}
              <div className="space-y-2">
                <Label htmlFor="new-password" className="text-sm">
                  New Password
                </Label>
                <div className="relative">
                  <Input
                    id="new-password"
                    type={showNewPassword ? "text" : "password"}
                    placeholder="Enter your new password"
                    value={changePasswordForm.newPassword}
                    onChange={(e) =>
                      setChangePasswordForm({
                        ...changePasswordForm,
                        newPassword: e.target.value,
                      })
                    }
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  >
                    {showNewPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* Confirm Password */}
              <div className="space-y-2">
                <Label htmlFor="confirm-password" className="text-sm">
                  Confirm New Password
                </Label>
                <div className="relative">
                  <Input
                    id="confirm-password"
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="Confirm your new password"
                    value={changePasswordForm.confirmPassword}
                    onChange={(e) =>
                      setChangePasswordForm({
                        ...changePasswordForm,
                        confirmPassword: e.target.value,
                      })
                    }
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              <p className="text-xs text-gray-600">
                Password must be at least 8 characters, include a number and a special character.
              </p>

              <Button
                type="submit"
                disabled={changePasswordMutation.isPending}
                className="w-full bg-[#32CD32] text-[#1A1A1A] hover:bg-[#2AB82A] font-medium"
              >
                {changePasswordMutation.isPending ? "Updating..." : "Update Password"}
              </Button>
            </form>
          </div>
        )}

        {/* Set Password for Google Users */}
        {hasGoogle && !hasEmailPassword && (
          <div className="space-y-4 pt-4 border-t">
            <div className="space-y-2">
              <h3 className="font-semibold text-sm">Add Email & Password Login</h3>
              <p className="text-sm text-gray-600">
                Sign in with your email and a password in addition to Google. You'll receive an email with a link to set your password.
              </p>
            </div>

            <Button
              onClick={handleSetPassword}
              disabled={setPasswordMutation.isPending}
              className="w-full bg-[#32CD32] text-[#1A1A1A] hover:bg-[#2AB82A] font-medium"
            >
              {setPasswordMutation.isPending ? "Sending..." : "Set a Password"}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Shield, ShieldCheck, ShieldOff, Copy, Check } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { toast } from "sonner";

export default function TwoFactorSettings() {
  const { user, isAuthenticated, loading } = useAuth();
  const [, navigate] = useLocation();
  const [verificationCode, setVerificationCode] = useState("");
  const [disableCode, setDisableCode] = useState("");
  const [setupData, setSetupData] = useState<{
    secret: string;
    qrCodeDataUrl: string;
    backupCodes: string[];
  } | null>(null);
  const [copiedSecret, setCopiedSecret] = useState(false);
  const [copiedBackup, setCopiedBackup] = useState(false);

  // Queries
  const statusQuery = trpc.twoFactor.getStatus.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  // Mutations
  const setupMutation = trpc.twoFactor.setup.useMutation();
  const verifyMutation = trpc.twoFactor.verify.useMutation();
  const disableMutation = trpc.twoFactor.disable.useMutation();

  if (loading || !isAuthenticated) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4">
        <div className="flex items-center justify-center h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600"></div>
        </div>
      </main>
    );
  }

  const handleSetup = async () => {
    try {
      const result = await setupMutation.mutateAsync();
      setSetupData({
        secret: result.secret,
        qrCodeDataUrl: result.qrCodeDataUrl,
        backupCodes: result.backupCodes,
      });
      toast.success("Scan the QR code with your authenticator app");
    } catch (error: any) {
      toast.error(error.message || "Failed to set up 2FA");
    }
  };

  const handleVerify = async () => {
    if (verificationCode.length !== 6) {
      toast.error("Please enter a 6-digit code");
      return;
    }
    try {
      await verifyMutation.mutateAsync({ code: verificationCode });
      toast.success("Two-factor authentication enabled!");
      setSetupData(null);
      setVerificationCode("");
      statusQuery.refetch();
    } catch (error: any) {
      toast.error(error.message || "Invalid verification code");
    }
  };

  const handleDisable = async () => {
    if (disableCode.length < 6) {
      toast.error("Please enter a valid code");
      return;
    }
    try {
      await disableMutation.mutateAsync({ code: disableCode });
      toast.success("Two-factor authentication disabled");
      setDisableCode("");
      statusQuery.refetch();
    } catch (error: any) {
      toast.error(error.message || "Invalid code");
    }
  };

  const copyToClipboard = (text: string, type: "secret" | "backup") => {
    navigator.clipboard.writeText(text);
    if (type === "secret") {
      setCopiedSecret(true);
      setTimeout(() => setCopiedSecret(false), 2000);
    } else {
      setCopiedBackup(true);
      setTimeout(() => setCopiedBackup(false), 2000);
    }
    toast.success("Copied to clipboard");
  };

  const isEnabled = statusQuery.data?.isEnabled ?? false;

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/settings")}
            className="hover:bg-slate-200"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-3xl font-bold text-slate-900">Two-Factor Authentication</h1>
        </div>

        {/* Status Card */}
        <Card className="p-6 mb-6 border-slate-200">
          <div className="flex items-center gap-4">
            {isEnabled ? (
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                <ShieldCheck className="w-6 h-6 text-green-600" />
              </div>
            ) : (
              <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center">
                <Shield className="w-6 h-6 text-slate-400" />
              </div>
            )}
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                {isEnabled ? "2FA is Enabled" : "2FA is Not Enabled"}
              </h2>
              <p className="text-sm text-slate-600">
                {isEnabled
                  ? "Your account is protected with two-factor authentication."
                  : "Add an extra layer of security to your account."}
              </p>
            </div>
          </div>
        </Card>

        {/* Setup Flow */}
        {!isEnabled && !setupData && (
          <Card className="p-6 border-slate-200">
            <h3 className="text-lg font-bold text-slate-900 mb-4">Set Up Two-Factor Authentication</h3>
            <p className="text-slate-600 mb-6">
              Use an authenticator app like Google Authenticator, Authy, or 1Password to generate
              time-based one-time passwords (TOTP) for additional account security.
            </p>
            <Button
              onClick={handleSetup}
              disabled={setupMutation.isPending}
              className="bg-teal-600 hover:bg-teal-700 text-white gap-2"
            >
              <Shield className="w-4 h-4" />
              {setupMutation.isPending ? "Setting up..." : "Begin Setup"}
            </Button>
          </Card>
        )}

        {/* QR Code & Verification */}
        {!isEnabled && setupData && (
          <div className="space-y-6">
            <Card className="p-6 border-slate-200">
              <h3 className="text-lg font-bold text-slate-900 mb-4">Step 1: Scan QR Code</h3>
              <p className="text-slate-600 mb-4">
                Scan this QR code with your authenticator app:
              </p>
              <div className="flex justify-center mb-4">
                <img
                  src={setupData.qrCodeDataUrl}
                  alt="2FA QR Code"
                  className="w-48 h-48 border border-slate-200 rounded-lg"
                />
              </div>
              <div className="bg-slate-50 p-3 rounded-lg">
                <p className="text-xs text-slate-500 mb-1">Or enter this secret manually:</p>
                <div className="flex items-center gap-2">
                  <code className="text-sm font-mono text-slate-700 flex-1 break-all">
                    {setupData.secret}
                  </code>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyToClipboard(setupData.secret, "secret")}
                  >
                    {copiedSecret ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                  </Button>
                </div>
              </div>
            </Card>

            <Card className="p-6 border-slate-200">
              <h3 className="text-lg font-bold text-slate-900 mb-4">Step 2: Save Backup Codes</h3>
              <p className="text-slate-600 mb-4">
                Store these backup codes in a safe place. You can use them to access your account if you lose your authenticator device.
              </p>
              <div className="bg-slate-50 p-4 rounded-lg mb-3">
                <div className="grid grid-cols-2 gap-2">
                  {setupData.backupCodes.map((code, i) => (
                    <code key={i} className="text-sm font-mono text-slate-700 p-1">
                      {code}
                    </code>
                  ))}
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => copyToClipboard(setupData.backupCodes.join("\n"), "backup")}
                className="gap-2"
              >
                {copiedBackup ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                Copy Backup Codes
              </Button>
            </Card>

            <Card className="p-6 border-slate-200">
              <h3 className="text-lg font-bold text-slate-900 mb-4">Step 3: Verify</h3>
              <p className="text-slate-600 mb-4">
                Enter the 6-digit code from your authenticator app to complete setup:
              </p>
              <div className="flex gap-3">
                <Input
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  placeholder="000000"
                  className="font-mono text-center text-lg tracking-widest max-w-[180px]"
                  maxLength={6}
                />
                <Button
                  onClick={handleVerify}
                  disabled={verifyMutation.isPending || verificationCode.length !== 6}
                  className="bg-teal-600 hover:bg-teal-700 text-white"
                >
                  {verifyMutation.isPending ? "Verifying..." : "Verify & Enable"}
                </Button>
              </div>
            </Card>
          </div>
        )}

        {/* Disable 2FA */}
        {isEnabled && (
          <Card className="p-6 border-slate-200">
            <div className="flex items-center gap-3 mb-4">
              <ShieldOff className="w-5 h-5 text-red-500" />
              <h3 className="text-lg font-bold text-slate-900">Disable Two-Factor Authentication</h3>
            </div>
            <p className="text-slate-600 mb-4">
              Enter a code from your authenticator app or a backup code to disable 2FA:
            </p>
            <div className="flex gap-3">
              <Input
                value={disableCode}
                onChange={(e) => setDisableCode(e.target.value.replace(/[^A-Za-z0-9]/g, "").slice(0, 6))}
                placeholder="Enter code"
                className="font-mono text-center text-lg tracking-widest max-w-[180px]"
                maxLength={6}
              />
              <Button
                onClick={handleDisable}
                disabled={disableMutation.isPending || disableCode.length < 6}
                variant="destructive"
              >
                {disableMutation.isPending ? "Disabling..." : "Disable 2FA"}
              </Button>
            </div>
          </Card>
        )}
      </div>
    </main>
  );
}

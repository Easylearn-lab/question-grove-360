import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Download, AlertCircle, CheckCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function Payments() {
  const { isAuthenticated } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  const subscriptionStatus = trpc.stripe.getSubscriptionStatus.useQuery(
    undefined,
    { enabled: isAuthenticated }
  );

  const paymentHistory = trpc.stripe.getPaymentHistory.useQuery(
    undefined,
    { enabled: isAuthenticated }
  );

  const cancelSubscription = trpc.stripe.cancelSubscription.useMutation({
    onSuccess: () => {
      toast.success("Subscription cancelled. You'll retain access until the end of your billing period.");
      subscriptionStatus.refetch();
    },
    onError: () => {
      toast.error("Failed to cancel subscription");
    },
  });

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 flex items-center justify-center">
        <Card className="p-8 text-center">
          <p className="text-slate-600 dark:text-slate-400 mb-4">
            Please sign in to view your subscription and payment information.
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Subscription Status */}
        <div className="mb-12">
          <h1 className="text-4xl font-bold text-slate-900 dark:text-white mb-8">
            Subscription & Payments
          </h1>

          {subscriptionStatus.isLoading ? (
            <Card className="p-8 flex items-center justify-center">
              <Loader2 className="w-6 h-6 animate-spin text-teal-600" />
            </Card>
          ) : (
            <Card className="p-8 border-l-4 border-l-teal-600">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-3 mb-4">
                    {subscriptionStatus.data?.status === "active" ? (
                      <CheckCircle className="w-6 h-6 text-green-600" />
                    ) : (
                      <AlertCircle className="w-6 h-6 text-slate-400" />
                    )}
                    <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
                      {subscriptionStatus.data?.status === "active"
                        ? "Active Subscription"
                        : "No Active Subscription"}
                    </h2>
                  </div>

                  {subscriptionStatus.data?.status === "active" && (
                    <>
                      <p className="text-slate-600 dark:text-slate-400 mb-2">
                        <span className="font-semibold">Plan:</span> {subscriptionStatus.data?.plan}
                      </p>
                      <p className="text-slate-600 dark:text-slate-400 mb-4">
                        <span className="font-semibold">Renews:</span>{" "}
                        {subscriptionStatus.data?.currentPeriodEnd
                          ? new Date(subscriptionStatus.data.currentPeriodEnd).toLocaleDateString()
                          : "N/A"}
                      </p>

                      {subscriptionStatus.data?.cancelAtPeriodEnd && (
                        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3 mb-4">
                          <p className="text-sm text-yellow-800 dark:text-yellow-200">
                            Your subscription will be cancelled at the end of the current billing period.
                          </p>
                        </div>
                      )}
                    </>
                  )}
                </div>

                {subscriptionStatus.data?.status === "active" && !subscriptionStatus.data?.cancelAtPeriodEnd && (
                  <Button
                    onClick={() => {
                      if (window.confirm("Are you sure you want to cancel your subscription?")) {
                        cancelSubscription.mutate();
                      }
                    }}
                    disabled={cancelSubscription.isPending}
                    variant="outline"
                    className="text-red-600 hover:text-red-700"
                  >
                    {cancelSubscription.isPending ? "Cancelling..." : "Cancel Subscription"}
                  </Button>
                )}
              </div>
            </Card>
          )}
        </div>

        {/* Payment History */}
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-6">
            Payment History
          </h2>

          {paymentHistory.isLoading ? (
            <Card className="p-8 flex items-center justify-center">
              <Loader2 className="w-6 h-6 animate-spin text-teal-600" />
            </Card>
          ) : paymentHistory.data && paymentHistory.data.length > 0 ? (
            <div className="space-y-4">
              {paymentHistory.data.map((payment: any) => (
                <Card key={payment.id} className="p-6 hover:shadow-lg transition-shadow">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <p className="font-semibold text-slate-900 dark:text-white mb-1">
                        {payment.description || "Subscription Payment"}
                      </p>
                      <p className="text-sm text-slate-600 dark:text-slate-400">
                        {new Date(payment.date).toLocaleDateString()}
                      </p>
                      <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                        Status:{" "}
                        <span
                          className={
                            payment.status === "paid"
                              ? "text-green-600 font-semibold"
                              : "text-yellow-600 font-semibold"
                          }
                        >
                          {payment.status}
                        </span>
                      </p>
                    </div>

                    <div className="text-right mr-6">
                      <p className="text-2xl font-bold text-slate-900 dark:text-white">
                        {payment.currency} {payment.amount.toFixed(2)}
                      </p>
                    </div>

                    {payment.pdfUrl && (
                      <a
                        href={payment.pdfUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg transition-colors"
                      >
                        <Download className="w-4 h-4" />
                        Invoice
                      </a>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="p-8 text-center">
              <p className="text-slate-600 dark:text-slate-400">
                No payment history available.
              </p>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

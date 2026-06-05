import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Plus, Trash2, Copy, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";

export function CouponManager() {
  const [newCode, setNewCode] = useState("");
  const [discountPercent, setDiscountPercent] = useState("10");
  const [maxUses, setMaxUses] = useState("100");
  const [expiryDate, setExpiryDate] = useState("");

  const coupons = trpc.admin.getCoupons.useQuery();
  const createCoupon = trpc.admin.createCoupon.useMutation({
    onSuccess: () => {
      toast.success("Coupon created successfully");
      setNewCode("");
      setDiscountPercent("10");
      setMaxUses("100");
      setExpiryDate("");
      coupons.refetch();
    },
    onError: () => {
      toast.error("Failed to create coupon");
    },
  });

  const deleteCoupon = trpc.admin.deleteCoupon.useMutation({
    onSuccess: () => {
      toast.success("Coupon deleted");
      coupons.refetch();
    },
    onError: () => {
      toast.error("Failed to delete coupon");
    },
  });

  const handleCreateCoupon = () => {
    if (!newCode.trim()) {
      toast.error("Please enter a coupon code");
      return;
    }

    createCoupon.mutate({
      code: newCode.toUpperCase(),
      discountType: "percentage" as const,
      discountValue: parseInt(discountPercent),
      maxUsageCount: parseInt(maxUses),
      expiryDate: expiryDate || null,
    });
  };

  return (
    <div className="space-y-6">
      {/* Create New Coupon */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
          Create New Coupon
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Coupon Code
            </label>
            <Input
              value={newCode}
              onChange={(e) => setNewCode(e.target.value)}
              placeholder="e.g., SAVE20"
              className="uppercase"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Discount (%)
            </label>
            <Input
              type="number"
              value={discountPercent}
              onChange={(e) => setDiscountPercent(e.target.value)}
              min="1"
              max="100"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Max Uses
            </label>
            <Input
              type="number"
              value={maxUses}
              onChange={(e) => setMaxUses(e.target.value)}
              min="1"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Expiry Date (Optional)
            </label>
            <Input
              type="date"
              value={expiryDate}
              onChange={(e) => setExpiryDate(e.target.value)}
            />
          </div>
        </div>
        <Button
          onClick={handleCreateCoupon}
          disabled={createCoupon.isPending}
          className="flex items-center gap-2 bg-teal-600 hover:bg-teal-700"
        >
          <Plus className="w-4 h-4" />
          Create Coupon
        </Button>
      </Card>

      {/* Coupons List */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
          Active Coupons
        </h3>
        {coupons.isLoading ? (
          <p className="text-slate-600 dark:text-slate-400">Loading coupons...</p>
        ) : coupons.data && coupons.data.length > 0 ? (
          <div className="space-y-3">
            {coupons.data.map((coupon: any) => (
              <div
                key={coupon.id}
                className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <code className="font-mono font-bold text-teal-600 dark:text-teal-400">
                      {coupon.code}
                    </code>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(coupon.code);
                        toast.success("Copied to clipboard");
                      }}
                      className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-slate-600 dark:text-slate-400">
                    <span>{coupon.discountPercent}% off</span>
                    <span>{coupon.usedCount}/{coupon.maxUses} uses</span>
                    {coupon.expiryDate && (
                      <span>
                        Expires: {new Date(coupon.expiryDate).toLocaleDateString()}
                      </span>
                    )}
                    {coupon.isActive && (
                      <span className="flex items-center gap-1 text-green-600">
                        <CheckCircle className="w-4 h-4" />
                        Active
                      </span>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => {
                    if (window.confirm("Delete this coupon?")) {
                      deleteCoupon.mutate(coupon.id);
                    }
                  }}
                  disabled={deleteCoupon.isPending}
                  className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-slate-600 dark:text-slate-400">No coupons created yet.</p>
        )}
      </Card>
    </div>
  );
}

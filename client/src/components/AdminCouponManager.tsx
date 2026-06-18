import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Trash2, Copy, Check } from "lucide-react";
import { toast } from "sonner";

interface Coupon {
  id: string;
  code: string;
  discountType: "percentage" | "fixed";
  discountValue: number;
  maxUses: number;
  usedCount: number;
  expiresAt: string;
  active: boolean;
  createdAt: string;
}

export default function AdminCouponManager() {
  const [coupons, setCoupons] = useState<Coupon[]>([
    {
      id: "1",
      code: "WELCOME20",
      discountType: "percentage",
      discountValue: 20,
      maxUses: 100,
      usedCount: 45,
      expiresAt: "2026-12-31",
      active: true,
      createdAt: "2026-01-15",
    },
    {
      id: "2",
      code: "SAVE50",
      discountType: "fixed",
      discountValue: 50,
      maxUses: 50,
      usedCount: 50,
      expiresAt: "2026-06-30",
      active: false,
      createdAt: "2026-01-01",
    },
  ]);

  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    code: "",
    discountType: "percentage" as const,
    discountValue: 10,
    maxUses: 100,
    expiresAt: "",
  });
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleAddCoupon = () => {
    if (!formData.code || !formData.expiresAt) {
      toast.error("Please fill in all fields");
      return;
    }

    const newCoupon: Coupon = {
      id: Date.now().toString(),
      code: formData.code.toUpperCase(),
      discountType: formData.discountType,
      discountValue: formData.discountValue,
      maxUses: formData.maxUses,
      usedCount: 0,
      expiresAt: formData.expiresAt,
      active: true,
      createdAt: new Date().toISOString().split("T")[0],
    };

    setCoupons([...coupons, newCoupon]);
    setFormData({
      code: "",
      discountType: "percentage",
      discountValue: 10,
      maxUses: 100,
      expiresAt: "",
    });
    setShowForm(false);
    toast.success("Coupon created successfully!");
  };

  const handleDeleteCoupon = (id: string) => {
    setCoupons(coupons.filter((c) => c.id !== id));
    toast.success("Coupon deleted");
  };

  const handleCopyCode = (code: string, id: string) => {
    navigator.clipboard.writeText(code);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
    toast.success("Copied to clipboard!");
  };

  const handleToggleCoupon = (id: string) => {
    setCoupons(
      coupons.map((c) =>
        c.id === id ? { ...c, active: !c.active } : c
      )
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Coupon Management</h2>
          <p className="text-slate-600 mt-1">Create and manage discount codes</p>
        </div>
        <Button
          onClick={() => setShowForm(!showForm)}
          className="bg-green-600 hover:bg-green-700 text-gray-900 gap-2"
        >
          <Plus className="w-4 h-4" />
          New Coupon
        </Button>
      </div>

      {/* Create Form */}
      {showForm && (
        <Card className="p-6 border-slate-200">
          <h3 className="text-lg font-bold text-slate-900 mb-4">Create New Coupon</h3>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="code" className="text-slate-700 font-medium">
                Coupon Code
              </Label>
              <Input
                id="code"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                placeholder="e.g., SUMMER20"
                className="mt-2"
              />
            </div>
            <div>
              <Label htmlFor="discountType" className="text-slate-700 font-medium">
                Discount Type
              </Label>
              <Select
                value={formData.discountType}
                onValueChange={(value: any) =>
                  setFormData({ ...formData, discountType: value })
                }
              >
                <SelectTrigger className="mt-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="percentage">Percentage (%)</SelectItem>
                  <SelectItem value="fixed">Fixed Amount ($)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="discountValue" className="text-slate-700 font-medium">
                Discount Value
              </Label>
              <Input
                id="discountValue"
                type="number"
                value={formData.discountValue}
                onChange={(e) => setFormData({ ...formData, discountValue: parseInt(e.target.value) })}
                placeholder="e.g., 20"
                className="mt-2"
              />
            </div>
            <div>
              <Label htmlFor="maxUses" className="text-slate-700 font-medium">
                Max Uses
              </Label>
              <Input
                id="maxUses"
                type="number"
                value={formData.maxUses}
                onChange={(e) => setFormData({ ...formData, maxUses: parseInt(e.target.value) })}
                placeholder="e.g., 100"
                className="mt-2"
              />
            </div>
            <div className="md:col-span-2">
              <Label htmlFor="expiresAt" className="text-slate-700 font-medium">
                Expiration Date
              </Label>
              <Input
                id="expiresAt"
                type="date"
                value={formData.expiresAt}
                onChange={(e) => setFormData({ ...formData, expiresAt: e.target.value })}
                className="mt-2"
              />
            </div>
          </div>
          <div className="flex gap-2 mt-6">
            <Button onClick={handleAddCoupon} className="bg-green-600 hover:bg-green-700 text-gray-900">
              Create Coupon
            </Button>
            <Button onClick={() => setShowForm(false)} variant="outline">
              Cancel
            </Button>
          </div>
        </Card>
      )}

      {/* Coupons Table */}
      <Card className="border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Discount</TableHead>
                <TableHead>Usage</TableHead>
                <TableHead>Expires</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {coupons.map((coupon) => (
                <TableRow key={coupon.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <code className="font-mono font-bold text-green-600">{coupon.code}</code>
                      <button
                        onClick={() => handleCopyCode(coupon.code, coupon.id)}
                        className="p-1 hover:bg-slate-100 rounded"
                      >
                        {copiedId === coupon.id ? (
                          <Check className="w-4 h-4 text-green-600" />
                        ) : (
                          <Copy className="w-4 h-4 text-slate-400" />
                        )}
                      </button>
                    </div>
                  </TableCell>
                  <TableCell>
                    {coupon.discountType === "percentage" ? (
                      <span className="font-semibold">{coupon.discountValue}%</span>
                    ) : (
                      <span className="font-semibold">${coupon.discountValue}</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      <p className="font-medium">{coupon.usedCount}/{coupon.maxUses}</p>
                      <div className="w-20 h-1 bg-slate-200 rounded-full mt-1">
                        <div
                          className="h-1 bg-green-600 rounded-full"
                          style={{ width: `${(coupon.usedCount / coupon.maxUses) * 100}%` }}
                        ></div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>{coupon.expiresAt}</TableCell>
                  <TableCell>
                    <button
                      onClick={() => handleToggleCoupon(coupon.id)}
                      className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        coupon.active
                          ? "bg-green-100 text-green-700"
                          : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {coupon.active ? "Active" : "Inactive"}
                    </button>
                  </TableCell>
                  <TableCell>
                    <button
                      onClick={() => handleDeleteCoupon(coupon.id)}
                      className="p-1 hover:bg-red-50 rounded text-red-600"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* Stats */}
      <div className="grid md:grid-cols-4 gap-4">
        <Card className="p-4 border-slate-200">
          <p className="text-sm text-slate-600">Total Coupons</p>
          <p className="text-3xl font-bold text-slate-900 mt-1">{coupons.length}</p>
        </Card>
        <Card className="p-4 border-slate-200">
          <p className="text-sm text-slate-600">Active</p>
          <p className="text-3xl font-bold text-green-600 mt-1">{coupons.filter((c) => c.active).length}</p>
        </Card>
        <Card className="p-4 border-slate-200">
          <p className="text-sm text-slate-600">Total Uses</p>
          <p className="text-3xl font-bold text-blue-600 mt-1">{coupons.reduce((sum, c) => sum + c.usedCount, 0)}</p>
        </Card>
        <Card className="p-4 border-slate-200">
          <p className="text-sm text-slate-600">Capacity</p>
          <p className="text-3xl font-bold text-purple-600 mt-1">{coupons.reduce((sum, c) => sum + c.maxUses, 0)}</p>
        </Card>
      </div>
    </div>
  );
}

import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";

export function QuestionSkeleton() {
  return (
    <Card className="p-6 border-slate-200">
      <Skeleton className="h-6 w-3/4 mb-4" />
      <Skeleton className="h-4 w-full mb-2" />
      <Skeleton className="h-4 w-5/6 mb-6" />
      <div className="space-y-2">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </div>
    </Card>
  );
}

export function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid md:grid-cols-4 gap-6">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="p-6 border-slate-200">
            <Skeleton className="h-4 w-1/2 mb-2" />
            <Skeleton className="h-8 w-3/4" />
          </Card>
        ))}
      </div>

      {/* Features Grid */}
      <div className="grid md:grid-cols-2 gap-6">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="p-6 border-slate-200">
            <Skeleton className="h-12 w-12 mb-4 rounded" />
            <Skeleton className="h-6 w-3/4 mb-2" />
            <Skeleton className="h-4 w-full mb-4" />
            <Skeleton className="h-10 w-full" />
          </Card>
        ))}
      </div>
    </div>
  );
}

export function TableSkeleton() {
  return (
    <Card className="border-slate-200 p-6">
      <div className="space-y-3">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="flex gap-4">
            <Skeleton className="h-10 flex-1" />
            <Skeleton className="h-10 flex-1" />
            <Skeleton className="h-10 flex-1" />
            <Skeleton className="h-10 flex-1" />
          </div>
        ))}
      </div>
    </Card>
  );
}

export function ChatSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Skeleton className="h-12 w-48 rounded-lg" />
      </div>
      <div className="flex justify-start">
        <Skeleton className="h-20 w-64 rounded-lg" />
      </div>
      <div className="flex justify-end">
        <Skeleton className="h-12 w-40 rounded-lg" />
      </div>
    </div>
  );
}

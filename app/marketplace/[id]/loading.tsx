import { Skeleton } from '@/components/ui/Skeleton';

export default function MarketplaceDetailLoading() {
  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-8">
      <Skeleton className="h-6 w-32" />
      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="space-y-4">
          <Skeleton className="aspect-[4/3] w-full rounded-2xl" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
          <Skeleton className="h-4 w-4/6" />
        </div>
        <div className="space-y-4">
          <Skeleton className="h-40 w-full rounded-2xl" />
          <Skeleton className="h-24 w-full rounded-2xl" />
        </div>
      </div>
    </div>
  );
}
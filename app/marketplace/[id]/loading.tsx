import { Skeleton } from '@/components/ui/Skeleton';

export default function MarketplaceDetailLoading() {
  return (
    <div className="mx-auto w-full max-w-[1120px] space-y-6 px-5 py-8">
      <Skeleton className="h-6 w-32" />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-4">
          <Skeleton className="aspect-[4/3] w-full rounded-2xl sm:aspect-[16/10]" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
          <Skeleton className="h-4 w-4/6" />
        </div>
        <div className="space-y-4">
          <Skeleton className="h-8 w-1/3 rounded-full" />
          <Skeleton className="h-4 w-full rounded-full" />
          <Skeleton className="h-4 w-5/6 rounded-full" />
          <Skeleton className="h-11 w-full rounded-full" />
        </div>
      </div>
    </div>
  );
}
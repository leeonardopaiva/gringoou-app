import { Skeleton } from '@/components/ui/Skeleton';
import { ContentColumn } from '@/components/ui/ContentColumn';

export default function NewsLoading() {
  return (
    <ContentColumn size="feed" className="space-y-4 px-4 py-6" aria-busy>
      <Skeleton className="h-8 w-32" />
      <Skeleton className="h-12 w-full rounded-2xl" />
      <Skeleton className="h-10 w-full rounded-full" />
      {[0, 1, 2].map((key) => (
        <div key={key} className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
          <Skeleton className="aspect-[16/9] w-full rounded-none" />
          <div className="space-y-2 p-4">
            <Skeleton className="h-4 w-4/5" />
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        </div>
      ))}
    </ContentColumn>
  );
}

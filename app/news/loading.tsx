import { Skeleton } from '@/components/ui/Skeleton';

export default function NewsLoading() {
  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-8">
      <Skeleton className="h-6 w-32" />
      <Skeleton className="h-12 w-full rounded-2xl" />
      <Skeleton className="h-10 w-64 rounded-full" />
      <Skeleton className="aspect-[16/9] w-full rounded-2xl" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Skeleton.Card />
        <Skeleton.Card />
        <Skeleton.Card />
      </div>
    </div>
  );
}
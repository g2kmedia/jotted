import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
    return (
        <div className="h-screen w-screen p-3 flex flex-col space-y-5 rounded-xl">
            <Skeleton className="h-8" />
            <Skeleton className="h-1/2" />
        </div>
    );
}
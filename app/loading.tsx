import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
    return (
        <div className="h-screen w-screen p-3 flex flex-col space-y-5 rounded-xl">
            <Skeleton className="h-8 opacity-30 bg-muted-foreground" />
            <Skeleton className="h-1/2 opacity-30 bg-muted-foreground" />
        </div>
    );
}
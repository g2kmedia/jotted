import { GlobeOff } from "lucide-react"

export default function OfflinePage() {
  return (
    <div className="h-1/3 flex flex-col justify-center items-center">
      <GlobeOff strokeWidth={"1"} size={48} className="w-full text-accent" />
      <h3 className="text-center text-lg">You're offline</h3>
      <p className="text-center text-sm mt-2 text-muted-foreground">
        You have stumbled upon a page that is currently
        <br />
        not available without an internet connection.
      </p>
    </div>
  );
}
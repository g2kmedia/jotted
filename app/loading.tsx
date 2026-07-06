export default function Loading() {
    return (
        <div className="flex h-full flex-col items-center justify-center">
                <p className="text-6xl font-hero text-accent">···</p>
                <h2 className="text-5xl font-hero text-foreground">Just a moment.</h2>
                <p className="font-titles text-secondaty-foreground">LOADING YOUR DATA</p>
        </div>
    );
}
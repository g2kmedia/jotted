export default function QuickFilterButton({ active, count, label, onClick }: {
    active: boolean,
    count: number,
    label: string,
    onClick: () => void
}) {
    return (
        <button
            className={`${active ? "border-accent text-foreground" : "border-transparent text-muted-foreground"} border-b-4 cursor-pointer hover:border-accent`}
            onClick={onClick}
        >
            <h1 className="text-4xl font-hero text-left font-extrabold text-accent">{count}</h1>
            <h2 className="text-left text-muted-foreground">{label}</h2>
        </button>
    );
}
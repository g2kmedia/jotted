import { useMemo } from "react";

export default function TagsBar(
    { tags, activeTags, onTagSelect, className }: {
        tags: string[],
        activeTags: string[],
        onTagSelect: (tagId: string) => void,
        className?: string
    }
) {
    const sortedTags = useMemo(() => {
        return [...tags].sort((a, b) => {
            const aIsActive = activeTags.includes(a);
            const bIsActive = activeTags.includes(b);

            if (aIsActive && !bIsActive) return -1;
            if (!aIsActive && bIsActive) return 1;
            return 0;
        });
    }, [tags, activeTags]);

    return (
        <nav aria-label="tags" className={`flex min-h-16 overflow-x-auto ${className}`}>
            {sortedTags.map((tag) => (
                <button
                    key={tag}
                    className={`${activeTags.includes(tag) ? "text-accent" : "text-secondary-foreground hover:text-accent"} pr-4 whitespace-nowrap cursor-pointer`}
                    onClick={() => onTagSelect(tag)}
                >
                    #{tag}
                </button>
            ))}
        </nav>
    );
}
import { Tag } from "@/lib/types";
import { useMemo } from "react";

export default function TagsBar(
    { tags, activeTags, onTagSelect }: { tags: Omit<Tag, "created_at">[], activeTags: number[], onTagSelect: (tagId: number) => void }
) {
    const sortedTags = useMemo(() => {
        return [...tags].sort((a, b) => {
            const aIsActive = activeTags.includes(a.id);
            const bIsActive = activeTags.includes(b.id);

            if (aIsActive && !bIsActive) return -1;
            if (!aIsActive && bIsActive) return 1;
            return 0;
        });
    }, [tags, activeTags]);

    return (
        <section className="flex mb-6 overflow-scroll [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {sortedTags.map((tag) => (
                <button
                    key={tag.id}
                    className={`${activeTags.includes(tag.id) ? "bg-accent" : ""} p-2.5 ml-2 border rounded-full whitespace-nowrap cursor-pointer`}
                    onClick={() => onTagSelect(tag.id)}
                >
                    #{tag.name}
                </button>
            ))}
        </section>
    );
}
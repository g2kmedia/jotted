import { useRef } from "react";

export default function TagsInput(
    { tags, onSubmit, className }: {
        tags?: string[],
        onSubmit: (value: string) => void
        className?: string
    }
) {
    const inputRef = useRef<HTMLInputElement>(null);

    const handleSubmit = () => {
        if (inputRef.current) {
            onSubmit(inputRef.current.value);
        }
    }

    return (
        <input
            ref={inputRef}
            type="text"
            defaultValue={tags?.join(" ")}
            placeholder="add tags..."
            onBlur={handleSubmit}
            className={`w-full p-2 pr-2 text-right font-light text-muted-foreground outline-hidden peer ${className}`}
        />
    );
};
import { Check } from "lucide-react";
import { useRef } from "react";

export default function TagsInput(
    { tags, onSubmit }: { tags?: string[], onSubmit: (value: string) => void }
) {
    const inputRef = useRef<HTMLInputElement>(null);

    const handleSubmit = () => {
        if (inputRef.current) {
            onSubmit(inputRef.current.value);
        }
    }

    return (
        <div className="flex p-2">
            <input
                ref={inputRef}
                type="text"
                defaultValue={tags?.join(" ")}
                placeholder="add tags..."
                className="w-full text-right font-light text-muted-foreground outline-hidden peer"
            />
            <button
                onMouseDown={handleSubmit}
                className="w-0 peer-focus:w-auto peer-focus:px-2 opacity-0 peer-focus:opacity-100 overflow-hidden transition-opacity cursor-pointer hover:text-accent"
            >
                <Check />
            </button>
        </div>
    );
};
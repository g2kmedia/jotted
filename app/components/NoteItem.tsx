import { localNote } from "@/lib/types";
import { Pin } from "lucide-react";
import Link from "next/link";

export default function NoteItem(
    { note }: {note: localNote}
) {
    return (
        <Link href={`/notes/${note.id}`}>
            <article className="max-h-22 py-2 mb-2 flex flex-row border-b-1">
                <div className="flex flex-col justify-between overflow-scroll [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                    <h4 className="flex items-center text-lg mb-1 whitespace-nowrap overflow-scroll [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                        {note.title}
                        {note.is_pinned === 1 && <span><Pin size={14} className="ml-2 text-secondary-foreground" /></span>}
                    </h4>
                    {note.tags &&
                        <ul className="flex gap-2 text-xs font-light text-secondary-foreground overflow-scroll [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                            {note.tags.map((tag, index) => (
                                <li key={index}>#{tag}</li>
                            ))}
                        </ul>
                    }
                </div>
            </article>
        </Link>
    );
}
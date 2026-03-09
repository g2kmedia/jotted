import SplitLayout from "@/app/components/SplitLayout";

export default function NotesLayout({
    notesOverview,
    notesEditor
}: Readonly<{
    notesOverview: React.ReactNode;
    notesEditor: React.ReactNode;
}>) {
    return <SplitLayout overview={notesOverview} editor={notesEditor} />
}
import SplitLayout from "../components/SplitLayout";

export default function TasksLayout({
    tasksOverview,
    tasksEditor
}: Readonly<{
    tasksOverview: React.ReactNode;
    tasksEditor: React.ReactNode;
}>) {
    return <SplitLayout overview={tasksOverview} editor={tasksEditor} />
}
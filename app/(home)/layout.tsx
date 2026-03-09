import SplitLayout from "@/app/components/SplitLayout";

export default function HomeLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return <SplitLayout overview={children} editor={null} />
}
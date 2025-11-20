import Header from "@/components/common/Header";
export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
    return (
        <>
            <Header />
            {children}
        </>
    );
}

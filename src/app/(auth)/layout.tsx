import Image from "next/image";
import Link from "next/link";
import BrandLogo from "@/components/common/BrandLogo";
import ThemeToggle from "@/components/common/ThemeToggle";
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>
    <section className="auth">
      <div className="flex flex-col md:flex-row min-h-screen relative">
        <div className="absolute top-3 right-3 z-20">
          <ThemeToggle />
        </div>
        <div className="content-column md:w-1/2 flex flex-col justify-center items-center h-[50vh] md:h-screen bg-muted text-foreground">
          <BrandLogo className="mb-6" alt="site-logo" width={220} height={93} />
          <h1 className="text-2xl mb-3 text-foreground">Welcome to Vie</h1>
          <p className="text-base text-muted-foreground">Get started by creating or joining a team</p>
     

          <div className="flex justify-center gap-4 mt-16">
            <div className="flex gap-2.5 p-2.5 bg-card border border-border rounded-[6px] cursor-pointer">
              <Image
                src="/svgs/playstore.svg"
                alt="play-store-icon"
                width={24}
                height={27}
              />
              <div className="description">
                <p className="text-xs">GET IT ON</p>
                <p className="font-medium text-md leading-[0.9]">Google Play</p>
              </div>
            </div>
            <div className="flex gap-2.5 p-2.5 bg-card border border-border rounded-[6px] cursor-pointer">
              <Image
                src="/svgs/apple.svg"
                alt="apple-store-icon"
                width={23}
                height={27}
              />
              <div className="description">
                <p className="text-xs">Download on the</p>
                <p className="font-medium text-md leading-[0.9]">App Store</p>
              </div>
            </div>
          </div>
        </div>
        <div className="form-column md:w-1/2 flex flex-col justify-center py-10 md:py-0 px-6 bg-background text-foreground">
          {children}
          <p className="text-muted-foreground mt-8 max-w-[400px] w-full text-center mx-auto">
            By continuing, you agree to our{" "}
            <Link href="/terms" className="text-primary hover:underline">Terms of Service</Link>{" "}
            and{" "}
            <Link href="/privacy" className="text-primary hover:underline">Privacy Policy</Link>
          </p>
        </div>
      </div>
    </section>
  </>;
}


import Image from "next/image";
import Link from "next/link";
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>
    <section className="auth">
      <div className="flex min-h-screen">
        <div className="content-column w-1/2 flex flex-col justify-center items-center">
          <Image
          className="mb-6"
            src="/svgs/logo.svg"
            alt="site-logo"
            width={220}
            height={93}
          />
          <h1 className="text-2xl mb-3">Welcome to VApps</h1>
          <p className="text-base">Get started by creating or joining a team</p>

          <div className="flex justify-center gap-4 mt-16">
            <div className="flex gap-2.5 p-2.5 border border-[#787878] rounded-[6px] cursor-pointer">
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
            <div className="flex gap-2.5 p-2.5 border border-[#787878] rounded-[6px] cursor-pointer">
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
        <div className="form-column w-1/2 flex flex-col justify-center">
          {children}
          <p className="text-[#FFFFFF] mt-8 max-w-[400px] w-full text-center mx-auto">By continuing, you agree to our <Link href="/terms" className="text-[#406140]">Terms of Service</Link> and <Link href="/privacy" className="text-[#406140]">Privacy Policy</Link></p>
        </div>
      </div>
    </section>
  </>;
}


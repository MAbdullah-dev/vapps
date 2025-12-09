import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Chrome, GithubIcon } from "lucide-react"
import Image from "next/image"

export default function Invite() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 px-4">
      <div className="w-full max-w-md rounded-xl border bg-background p-6 shadow-sm">
        
        {/* Logo */}
        <div className="mb-6 flex justify-center">
          <Image
            src="/images/logo.png"
            alt="Logo"
            width={140}
            height={60}
            priority
          />
        </div>

        {/* Heading */}
        <div className="mb-6 text-center">
          <h1 className="text-xl font-semibold">
            You’ve been invited
          </h1>
          <p className="text-sm text-muted-foreground">
            Join the workspace to continue
          </p>
        </div>

        {/* Email / Password */}
        <div className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="you@example.com"
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
            />
          </div>

          <Button className="w-full" size="lg">
            Continue
          </Button>
        </div>

        {/* Divider */}
        <div className="my-6 flex items-center gap-3">
          <Separator className="flex-1" />
          <span className="text-xs text-muted-foreground">OR</span>
          <Separator className="flex-1" />
        </div>

        {/* SSO Buttons */}
        <div className="space-y-3">
          <Button variant="outline" size="lg" className="w-full gap-2">
            <Chrome size={16} />
            Continue with Google
          </Button>

          <Button variant="outline" size="lg" className="w-full gap-2">
            <Image
              src="/svgs/atlassian.svg"
              alt="Atlassian"
              width={16}
              height={16}
            />
            Continue with Atlassian
          </Button>

          <Button variant="outline" size="lg" className="w-full gap-2">
            <GithubIcon size={16} />
            Continue with GitHub
          </Button>
        </div>

        {/* Footer */}
        <p className="mt-6 text-center text-xs text-muted-foreground">
          By continuing, you agree to our Terms of Service and Privacy Policy.
        </p>
      </div>
    </div>
  )
}

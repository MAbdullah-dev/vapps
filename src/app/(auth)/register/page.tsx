import Link from 'next/link';
import Image from 'next/image';
export default function RegisterPage() {
  return (
    <>
      <section className="register">
        <div className="container mx-auto">
          <div className="w-1/2">
          <Image src="images/logo.svg" alt="VApps Logo" width={120} height={40} />
          <h1>Welcome to VApps</h1>
          <p>Get started by creating or joining a team</p>
          <Link href="/auth/register">Register</Link>
          <Link href="/auth/login">Login</Link>
          </div>
          <div className="w-1/2"></div>
        </div>
      </section>
    </>
  );
}


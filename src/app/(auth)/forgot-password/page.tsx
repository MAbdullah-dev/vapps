import { redirect } from "next/navigation";

/** Legacy URL; login and middleware reference /forgot-password in some places. */
export default function ForgotPasswordRedirect() {
  redirect("/auth/forgot-password");
}

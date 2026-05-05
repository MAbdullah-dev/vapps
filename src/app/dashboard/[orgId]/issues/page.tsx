import { redirect } from "next/navigation";

export default async function IssuesIndexPage({
  params,
}: {
  params: Promise<{ orgId: string }>;
}) {
  const { orgId } = await params;
  redirect(`/dashboard/${orgId}/issues/summary`);
}

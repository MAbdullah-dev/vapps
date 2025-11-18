export default function SiteDashboardPage({
  params,
}: {
  params: { siteId: string };
}) {
  return (
    <div>
      <h1>Site Dashboard - {params.siteId}</h1>
      <p>Spaces / Workspaces list</p>
    </div>
  );
}


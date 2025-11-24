export default function AuditsPage({
  params,
}: {
  params: { siteId: string; workspaceId: string };
}) {
  return (
    <div>
      <h1>Audits</h1>
      <p>Site: {params.siteId}</p>
      <p>Workspace: {params.workspaceId}</p>
    </div>
  );
}


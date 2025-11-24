export default function DocumentsPage({
  params,
}: {
  params: { siteId: string; workspaceId: string };
}) {
  return (
    <div>
      <h1>Documents</h1>
      <p>Site: {params.siteId}</p>
      <p>Workspace: {params.workspaceId}</p>
    </div>
  );
}


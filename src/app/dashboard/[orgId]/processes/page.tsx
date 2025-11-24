"use client";

import Link from "next/link";
import { useParams } from "next/navigation";

export default function ProcessesListPage() {
  const { orgId } = useParams();

  const processes = [
    { id: "mobile-app", name: "Mobile App Development" },
    { id: "it-services", name: "IT Services" },
    { id: "quality-control", name: "Quality Control" },
  ];

  return (
    <div className="p-6">
      <h1 className="text-xl font-bold mb-4">Processes</h1>

      {processes.map((p) => (
        <Link
          key={p.id}
          href={`/dashboard/${orgId}/processes/${p.id}`}
          className="block p-4 mb-3 border rounded-lg hover:bg-gray-50"
        >
          {p.name}
        </Link>
      ))}
    </div>
  );
}

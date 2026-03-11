// page.tsx (Server Component — no "use client")
import { getServerSession } from "@/lib/actions/get-session";
import WorksPageClient from "./WorksPageClient";

export default async function WorksPage() {
  const session = await getServerSession();

  return <WorksPageClient session={session} />;
}

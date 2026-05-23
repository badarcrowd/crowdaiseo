import { redirect } from "next/navigation";

export default async function OverviewRedirect({
  params,
}: Readonly<{ params: Promise<{ workspace: string }> }>) {
  const { workspace } = await params;
  redirect(`/app/w/${workspace}/dashboard`);
}

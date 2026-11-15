import { FollowListPage } from "@/components/FollowListPage";

export const metadata = { title: "Takipçiler" };

export default async function FollowersPage(props: PageProps<"/u/[username]/takipciler">) {
  const { username } = await props.params;
  return <FollowListPage username={decodeURIComponent(username).toLowerCase()} kind="followers" />;
}

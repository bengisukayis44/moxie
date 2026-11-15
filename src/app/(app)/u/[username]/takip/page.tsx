import { FollowListPage } from "@/components/FollowListPage";

export const metadata = { title: "Takip edilenler" };

export default async function FollowingPage(props: PageProps<"/u/[username]/takip">) {
  const { username } = await props.params;
  return <FollowListPage username={decodeURIComponent(username).toLowerCase()} kind="following" />;
}

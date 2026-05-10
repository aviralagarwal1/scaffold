import { redirect } from "next/navigation";

export default function LegacyNewPublicationPage() {
  redirect("/publications/new");
}

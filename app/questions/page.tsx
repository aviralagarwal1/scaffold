import { permanentRedirect } from "next/navigation";

export default function QuestionsRedirectPage() {
  permanentRedirect("/support");
}

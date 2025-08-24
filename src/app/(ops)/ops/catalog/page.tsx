
import { redirect } from "next/navigation";

export default function OpsCatalogPage() {
    // This page is a container. Redirect to the main entity, which is routes.
    redirect('/ops/routes');
}

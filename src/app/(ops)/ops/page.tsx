import { redirect } from 'next/navigation';

// This page just redirects to the main dashboard of the ops panel.
export default function OpsRootPage() {
  redirect('/ops/dashboard');
}

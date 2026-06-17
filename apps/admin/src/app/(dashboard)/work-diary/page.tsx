import { redirect } from 'next/navigation';

// Work Diary now lives per-employee under Team → member detail → Work diary tab.
export default function WorkDiaryRedirect() {
  redirect('/team');
}

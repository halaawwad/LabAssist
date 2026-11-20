import { useCopy } from "@/components/MobileKit";

/** Display labels for stored report/submission statuses (stored values are unchanged). */
const statusLabels: Record<string, [string, string]> = {
  draft: ["Draft", "مسودة"],
  submitted: ["Submitted", "مُسلَّم"],
  reviewed: ["Reviewed", "تمت المراجعة"],
  changes: ["Changes requested", "مطلوب تعديلات"],
  revision: ["Revision requested", "مطلوب مراجعة"],
  approved: ["Approved", "معتمد"],
  accepted: ["Accepted", "مقبول"],
  declined: ["Declined", "مرفوض"],
  comment: ["Comment", "تعليق"],
  approval: ["Approval", "اعتماد"],
};

export function useStatusLabel() {
  const t = useCopy();
  return (status: string) => {
    const pair = statusLabels[status.toLowerCase()];
    return pair ? t(pair[0], pair[1]) : status;
  };
}

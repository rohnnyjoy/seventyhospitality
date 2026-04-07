import { Tag, type TagVariant } from 'octahedron';

const STATUS_CONFIG: Record<string, { variant: TagVariant; label: string }> = {
  active: { variant: 'success', label: 'Active' },
  past_due: { variant: 'warning', label: 'Past Due' },
  canceled: { variant: 'danger', label: 'Canceled' },
  unpaid: { variant: 'danger', label: 'Unpaid' },
  incomplete: { variant: 'neutral', label: 'Incomplete' },
};

export function MembershipStatus({ status }: { status: string | null }) {
  if (!status) {
    return <Tag variant="neutral">No Membership</Tag>;
  }

  const config = STATUS_CONFIG[status] ?? { variant: 'neutral' as TagVariant, label: status };
  return <Tag variant={config.variant}>{config.label}</Tag>;
}

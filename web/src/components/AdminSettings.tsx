import { useCallback, useEffect, useState } from 'react';
import {
  Button,
  AppIcon,
  Text,
  Modal,
  ModalActions,
  Input,
  DataTable,
  type DataTableColumn,
  EmptyState,
  pageStyles,
} from 'octahedron';
import { api, ApiError } from '../lib/api';
import { FormField } from './FormField';

type AdminUser = { id: string; email: string; name: string; role: string };

const columns: DataTableColumn<AdminUser>[] = [
  { name: 'Name', cell: (r) => r.name, sortValue: (r) => r.name },
  { name: 'Email', cell: (r) => r.email, sortValue: (r) => r.email },
  { name: 'Role', cell: (r) => r.role, maxWidth: 100 },
];

export function AdminSettings() {
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInvite, setShowInvite] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    api.listAdmins()
      .then((data) => setAdmins(data ?? []))
      .catch(() => setAdmins([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(load, [load]);

  async function handleDelete(user: AdminUser) {
    if (!confirm(`Remove ${user.email} as admin?`)) return;
    try {
      await api.deleteAdmin(user.id);
      load();
    } catch (e) {
      alert(e instanceof ApiError ? e.message : 'Failed to remove admin');
    }
  }

  const columnsWithActions: DataTableColumn<AdminUser>[] = [
    ...columns,
    {
      name: '',
      maxWidth: 40,
      cell: (r) => (
        <Button
          variant="ghost"
          icon={<AppIcon name="trash" />}
          ariaLabel={`Remove ${r.name}`}
          onClick={() => handleDelete(r)}
        />
      ),
    },
  ];

  return (
    <div className={pageStyles.page}>
      <div className={pageStyles.headerRow}>
        <div className={pageStyles.headerLeft}>
          <Text variant="title" as="div">Admin Users</Text>
        </div>
        <div className={pageStyles.headerActions}>
          <Button
            icon={<AppIcon name="plus" />}
            onClick={() => setShowInvite(true)}
          >
            Add admin
          </Button>
        </div>
      </div>

      <div className={pageStyles.contentArea}>
        {admins.length === 0 && !loading ? (
          <EmptyState
            title="No admin users"
            description="Add an admin to grant access to this dashboard."
          />
        ) : (
          <DataTable columns={columnsWithActions} rows={admins} loading={loading} />
        )}
      </div>

      {showInvite && (
        <InviteDialog
          onClose={() => setShowInvite(false)}
          onCreated={load}
        />
      )}
    </div>
  );
}

function InviteDialog({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError('');

    try {
      await api.createAdmin(email.trim(), name.trim());
      onCreated();
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to add admin');
      setSaving(false);
    }
  }

  return (
    <Modal title="Add admin" open onClose={onClose}>
      <form onSubmit={handleSubmit}>
        <FormField label="Name">
          {(id) => (
            <Input id={id} value={name} onValueChange={setName} placeholder="Jane Smith" autoFocus fill />
          )}
        </FormField>
        <FormField label="Email">
          {(id) => (
            <Input id={id} type="email" value={email} onValueChange={setEmail} placeholder="jane@example.com" fill />
          )}
        </FormField>
        {error && <Text intent="danger">{error}</Text>}
        <ModalActions>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button type="submit" color="primary" loading={saving}>Add admin</Button>
        </ModalActions>
      </form>
    </Modal>
  );
}

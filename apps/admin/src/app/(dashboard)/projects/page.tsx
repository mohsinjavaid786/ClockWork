'use client';

import { useEffect, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { api } from '@/lib/api';
import { PageHeader } from '@/components/PageHeader';
import { DataTable } from '@/components/DataTable';
import { Modal } from '@/components/Modal';
import { StatusBadge } from '@/components/StatusBadge';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { EmptyState } from '@/components/EmptyState';
import { formatDate } from '@/lib/utils';

interface Project {
  id: string;
  name: string;
  description?: string;
  color: string;
  isArchived: boolean;
  totalHours: number;
  createdAt: string;
}

const COLORS = ['#6366F1', '#EC4899', '#F59E0B', '#10B981', '#3B82F6', '#8B5CF6', '#EF4444'];

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: '', description: '', color: COLORS[0]! });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  function load() {
    api.projects
      .list()
      .then((d) => setProjects(d as Project[]))
      .catch(console.error)
      .finally(() => setLoading(false));
  }

  useEffect(load, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      await api.projects.create(form);
      setOpen(false);
      setForm({ name: '', description: '', color: COLORS[0]! });
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create project');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this project? All time entries will lose their project association.')) return;
    await api.projects.remove(id).catch(console.error);
    load();
  }

  const columns = [
    {
      key: 'name',
      header: 'Project',
      cell: (row: Project) => (
        <div className="flex items-center gap-3">
          <span
            className="h-3 w-3 rounded-full flex-shrink-0"
            style={{ background: row.color }}
          />
          <div>
            <p className="text-sm font-medium text-white">{row.name}</p>
            {row.description && (
              <p className="text-xs text-[#666666]">{row.description}</p>
            )}
          </div>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      cell: (row: Project) => (
        <StatusBadge
          status={row.isArchived ? 'inactive' : 'active'}
          label={row.isArchived ? 'Archived' : 'Active'}
        />
      ),
    },
    {
      key: 'hours',
      header: 'Total hours',
      cell: (row: Project) => (
        <span className="font-mono text-sm text-white">{row.totalHours.toFixed(1)}h</span>
      ),
    },
    {
      key: 'created',
      header: 'Created',
      cell: (row: Project) => (
        <span className="text-xs text-[#666666]">{formatDate(row.createdAt)}</span>
      ),
    },
    {
      key: 'actions',
      header: '',
      cell: (row: Project) => (
        <button
          onClick={() => handleDelete(row.id)}
          className="rounded p-1 text-[#444] hover:text-[#ef4444] transition-colors"
        >
          <Trash2 size={13} />
        </button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Projects"
        description={`${projects.length} project${projects.length !== 1 ? 's' : ''}`}
        action={
          <button
            onClick={() => setOpen(true)}
            className="flex items-center gap-2 rounded-md bg-white px-3 py-2 text-xs font-medium text-black hover:bg-[#e5e5e5] transition-colors"
          >
            <Plus size={13} />
            New project
          </button>
        }
      />

      {loading ? (
        <div className="flex justify-center py-12">
          <LoadingSpinner />
        </div>
      ) : projects.length === 0 ? (
        <EmptyState title="No projects yet" description="Create your first project to get started" />
      ) : (
        <DataTable columns={columns} data={projects} keyFn={(r) => r.id} />
      )}

      <Modal open={open} onClose={() => setOpen(false)} title="New project">
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-[#A1A1A1]">Name</label>
            <input
              value={form.name}
              onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
              required
              placeholder="Website Redesign"
              className="w-full rounded-md border border-[#2A2A2A] bg-[#0A0A0A] px-3 py-2 text-sm text-white placeholder-[#444] outline-none focus:border-[#444]"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-[#A1A1A1]">
              Description (optional)
            </label>
            <input
              value={form.description}
              onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
              placeholder="What is this project about?"
              className="w-full rounded-md border border-[#2A2A2A] bg-[#0A0A0A] px-3 py-2 text-sm text-white placeholder-[#444] outline-none focus:border-[#444]"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-[#A1A1A1]">Color</label>
            <div className="flex gap-2">
              {COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setForm((p) => ({ ...p, color: c }))}
                  className="h-7 w-7 rounded-full transition-transform hover:scale-110"
                  style={{
                    background: c,
                    outline: form.color === c ? `2px solid white` : 'none',
                    outlineOffset: '2px',
                  }}
                />
              ))}
            </div>
          </div>

          {error && (
            <p className="rounded border border-[#3f1515] bg-[#1c0a0a] px-3 py-2 text-xs text-[#ef4444]">
              {error}
            </p>
          )}

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="flex-1 rounded-md border border-[#2A2A2A] px-4 py-2 text-sm text-[#A1A1A1] hover:bg-[#1A1A1A] transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex flex-1 items-center justify-center gap-2 rounded-md bg-white px-4 py-2 text-sm font-medium text-black hover:bg-[#e5e5e5] disabled:opacity-50 transition-colors"
            >
              {saving && <LoadingSpinner size="sm" />}
              Create
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

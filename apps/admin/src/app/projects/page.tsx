'use client';

import { useEffect, useState } from 'react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { Badge } from '@/components/ui/Badge';
import { apiClient } from '@/lib/api';
import { initAuth } from '@/lib/auth';
import type { Project, ProjectStats } from '@trackdesk/shared';

interface ProjectWithStats extends Project { stats?: ProjectStats; }

export default function ProjectsPage() {
  const [projects, setProjects] = useState<ProjectWithStats[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [form, setForm] = useState({ name: '', description: '', color: '#6366f1' });

  useEffect(() => { initAuth(); loadProjects(); }, []);

  async function loadProjects() {
    const data = await apiClient.get<Project[]>('/projects');
    const withStats = await Promise.all(
      data.map(async (p) => {
        try {
          const stats = await apiClient.get<ProjectStats>(`/projects/${p.id}/stats`);
          return { ...p, stats };
        } catch { return p; }
      }),
    );
    setProjects(withStats);
  }

  async function save() {
    if (editingProject) {
      await apiClient.patch(`/projects/${editingProject.id}`, form);
    } else {
      await apiClient.post('/projects', form);
    }
    setShowModal(false);
    setEditingProject(null);
    setForm({ name: '', description: '', color: '#6366f1' });
    await loadProjects();
  }

  async function archive(p: Project) {
    await apiClient.patch(`/projects/${p.id}`, { isArchived: !p.isArchived });
    await loadProjects();
  }

  function openEdit(p: Project) {
    setEditingProject(p);
    setForm({ name: p.name, description: p.description ?? '', color: p.color });
    setShowModal(true);
  }

  return (
    <AdminLayout>
      <div className="flex justify-between items-center mb-5">
        <h2 className="text-xl font-bold">Projects</h2>
        <button className="bg-primary text-white text-sm px-4 py-2 rounded-lg" onClick={() => setShowModal(true)}>
          + New Project
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {projects.map((p) => (
          <div key={p.id} className="bg-slate-800 rounded-xl p-5 border border-slate-700 flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <span className="w-3 h-3 rounded-full" style={{ background: p.color }} />
              <span className="font-semibold">{p.name}</span>
              {p.isArchived && <Badge variant="default">Archived</Badge>}
            </div>
            {p.description && <p className="text-slate-400 text-sm">{p.description}</p>}
            {p.stats && (
              <div className="flex gap-4 text-xs text-slate-400">
                <span>{p.stats.totalHours}h total</span>
                <span>{p.stats.activeMembers} members</span>
              </div>
            )}
            <div className="flex gap-2 mt-auto">
              <button className="text-xs border border-slate-600 rounded px-2 py-1 text-slate-300 hover:text-white"
                onClick={() => openEdit(p)}>Edit</button>
              <button className="text-xs border border-slate-600 rounded px-2 py-1 text-slate-300 hover:text-white"
                onClick={() => archive(p)}>{p.isArchived ? 'Unarchive' : 'Archive'}</button>
            </div>
          </div>
        ))}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-slate-800 rounded-xl p-6 w-96 border border-slate-700">
            <h3 className="font-bold mb-4">{editingProject ? 'Edit Project' : 'New Project'}</h3>
            <div className="flex flex-col gap-3">
              <input className="bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-sm"
                placeholder="Project name" value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
              <textarea className="bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-sm resize-none"
                placeholder="Description (optional)" rows={3} value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
              <div className="flex items-center gap-3">
                <label className="text-sm text-slate-400">Color</label>
                <input type="color" value={form.color}
                  onChange={(e) => setForm((f) => ({ ...f, color: e.target.value }))}
                  className="w-8 h-8 rounded cursor-pointer border-0" />
                <span className="text-sm font-mono text-slate-400">{form.color}</span>
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button className="flex-1 bg-primary text-white rounded-lg py-2 text-sm font-medium" onClick={save}>
                {editingProject ? 'Save Changes' : 'Create'}
              </button>
              <button className="flex-1 border border-slate-600 text-slate-300 rounded-lg py-2 text-sm"
                onClick={() => { setShowModal(false); setEditingProject(null); }}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}

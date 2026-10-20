'use client';
import { useState, useEffect } from 'react';
import { X, Calendar as CalendarIcon } from 'lucide-react';

export default function TaskModal({
  isOpen,
  onClose,
  onSave,
  task = null,
  existingProjects = [],
  existingClients = [],
}) {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    project: 'Project One',
    dueDate: '',
    client: 'Personal',
    priority: 'Medium',
    stage: 'Not Started',
  });

  // Helper to format date into YYYY-MM-DD for the HTML date picker
  const getTodayISO = (offsetDays = 0) => {
    const d = new Date();
    d.setDate(d.getDate() + offsetDays);
    return d.toISOString().split('T')[0];
  };

  useEffect(() => {
    if (task) {
      setFormData(task);
    } else {
      setFormData({
        title: '',
        description: '',
        project: existingProjects[0] || 'Project One',
        dueDate: getTodayISO(0),
        client: existingClients[0] || 'Personal',
        priority: 'Medium',
        stage: 'Not Started',
      });
    }
  }, [task, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.title.trim()) return;
    onSave(formData);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-end md:items-center justify-center p-0 md:p-4 animate-fade-in">
      {/* Bottom sheet on mobile, centered modal on desktop */}
      <div className="bg-white rounded-t-2xl md:rounded-2xl w-full max-w-lg shadow-2xl border border-neutral-200 overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-100">
          <h3 className="font-semibold text-lg text-neutral-800">
            {task?.id ? 'Edit Task' : 'Add New Task'}
          </h3>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-neutral-100 rounded-full text-neutral-400 hover:text-neutral-600 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto">
          {/* Title */}
          <div>
            <label className="block text-xs font-semibold text-neutral-600 uppercase mb-1">
              Task Title *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Prepare client deck"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-3 py-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-neutral-600 uppercase mb-1">
              Description / Notes
            </label>
            <textarea
              rows={2}
              placeholder="Notes, URLs, specs, phone numbers..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm"
            />
          </div>

          {/* Project & Client (Combobox Datalists) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Project Combobox */}
            <div>
              <label className="block text-xs font-semibold text-neutral-600 uppercase mb-1">
                Project Name
              </label>
              <input
                list="projects-list"
                type="text"
                required
                placeholder="Select or type new..."
                value={formData.project}
                onChange={(e) => setFormData({ ...formData, project: e.target.value })}
                className="w-full px-3 py-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 text-sm bg-neutral-50/50"
              />
              <datalist id="projects-list">
                {existingProjects.map((p) => (
                  <option key={p} value={p} />
                ))}
              </datalist>

              {/* Quick-tap pills for existing projects */}
              {existingProjects.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-1.5">
                  {existingProjects.slice(0, 4).map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setFormData({ ...formData, project: p })}
                      className={`text-[11px] px-2 py-0.5 rounded-full border transition ${
                        formData.project === p
                          ? 'bg-blue-50 border-blue-400 text-blue-700 font-medium'
                          : 'bg-white border-neutral-200 text-neutral-600 hover:bg-neutral-50'
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Client Combobox */}
            <div>
              <label className="block text-xs font-semibold text-neutral-600 uppercase mb-1">
                Client
              </label>
              <input
                list="clients-list"
                type="text"
                required
                placeholder="Select or type new..."
                value={formData.client}
                onChange={(e) => setFormData({ ...formData, client: e.target.value })}
                className="w-full px-3 py-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 text-sm bg-neutral-50/50"
              />
              <datalist id="clients-list">
                {existingClients.map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>

              {/* Quick-tap pills for existing clients */}
              {existingClients.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-1.5">
                  {existingClients.slice(0, 4).map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setFormData({ ...formData, client: c })}
                      className={`text-[11px] px-2 py-0.5 rounded-full border transition ${
                        formData.client === c
                          ? 'bg-blue-50 border-blue-400 text-blue-700 font-medium'
                          : 'bg-white border-neutral-200 text-neutral-600 hover:bg-neutral-50'
                      }`}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Due Date with Pop-up Calendar */}
          <div>
            <label className="block text-xs font-semibold text-neutral-600 uppercase mb-1">
              Due Date
            </label>
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <input
                  type="date"
                  value={formData.dueDate}
                  onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                  className="w-full pl-9 pr-3 py-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 text-sm bg-white"
                />
                <CalendarIcon className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, dueDate: getTodayISO(0) })}
                className="px-3 py-2.5 text-xs font-medium border border-neutral-200 rounded-lg hover:bg-neutral-50 text-neutral-700 whitespace-nowrap"
              >
                Today
              </button>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, dueDate: getTodayISO(1) })}
                className="px-3 py-2.5 text-xs font-medium border border-neutral-200 rounded-lg hover:bg-neutral-50 text-neutral-700 whitespace-nowrap"
              >
                Tomorrow
              </button>
            </div>
          </div>

          {/* Priority & Stage */}
          <div className="grid grid-cols-2 gap-4 pt-1">
            <div>
              <label className="block text-xs font-semibold text-neutral-600 uppercase mb-1">
                Priority
              </label>
              <select
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                className="w-full px-3 py-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 text-sm bg-white"
              >
                <option value="High">High</option>
                <option value="Medium">Medium</option>
                <option value="Low">Low</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-neutral-600 uppercase mb-1">
                Stage
              </label>
              <select
                value={formData.stage}
                onChange={(e) => setFormData({ ...formData, stage: e.target.value })}
                className="w-full px-3 py-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 text-sm bg-white"
              >
                <option value="Not Started">Not Started</option>
                <option value="In Progress">In Progress</option>
                <option value="Review">Review</option>
              </select>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 border rounded-lg text-sm font-medium text-neutral-600 hover:bg-neutral-50 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium shadow-sm transition"
            >
              Save Task
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
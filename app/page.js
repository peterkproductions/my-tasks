'use client';
import { useState, useEffect } from 'react';
import {
  collection,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import PasscodeGate from '@/components/PasscodeGate';
import TaskModal from '@/components/TaskModal';
import VoiceRecorder from '@/components/VoiceRecorder';
import {
  Search,
  Plus,
  ChevronDown,
  ChevronRight,
  ArrowUpDown,
  CheckCircle2,
  Circle,
  MoreVertical,
  Edit2,
  Trash2,
  Calendar,
} from 'lucide-react';

export default function MyTasksApp() {
  const [tasks, setTasks] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedDescriptions, setExpandedDescriptions] = useState({});
  const [collapsedProjects, setCollapsedProjects] = useState({});
  const [activeMenuId, setActiveMenuId] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [taskToEdit, setTaskToEdit] = useState(null);

  // Live real-time sync with Firebase Firestore
  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'tasks'), (snapshot) => {
      const taskList = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setTasks(taskList);
    });
    return () => unsubscribe();
  }, []);

  // Compute unique existing projects and clients for the dropdowns
  const existingProjects = [...new Set(tasks.map((t) => t.project).filter(Boolean))];
  const existingClients = [...new Set(tasks.map((t) => t.client).filter(Boolean))];

  const toggleTaskCompletion = async (task) => {
    await updateDoc(doc(db, 'tasks', task.id), {
      completed: !task.completed,
    });
  };

  const handleSaveTask = async (taskData) => {
    if (taskToEdit) {
      await updateDoc(doc(db, 'tasks', taskToEdit.id), taskData);
    } else {
      await addDoc(collection(db, 'tasks'), {
        ...taskData,
        completed: false,
        createdAt: serverTimestamp(),
      });
    }
    setTaskToEdit(null);
  };

  const handleDeleteTask = async (id) => {
    await deleteDoc(doc(db, 'tasks', id));
    setActiveMenuId(null);
  };

  const toggleDescription = (id) => {
    setExpandedDescriptions((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const toggleProject = (project) => {
    setCollapsedProjects((prev) => ({ ...prev, [project]: !prev[project] }));
  };

  // Smart Date Formatter
  const formatDueDate = (dateStr) => {
    if (!dateStr) return '—';
    if (dateStr.toLowerCase() === 'today') return 'Today';
    if (dateStr.toLowerCase() === 'tomorrow') return 'Tomorrow';

    // If formatted as YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      const [year, month, day] = dateStr.split('-').map(Number);
      const targetDate = new Date(year, month - 1, day);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const diffDays = Math.round((targetDate - today) / (1000 * 60 * 60 * 24));
      if (diffDays === 0) return 'Today';
      if (diffDays === 1) return 'Tomorrow';
      if (diffDays === -1) return 'Yesterday';

      return targetDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
    return dateStr;
  };

  const filteredTasks = tasks.filter(
    (t) =>
      t.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.client?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const groupedTasks = filteredTasks.reduce((groups, task) => {
    const proj = task.project || 'Uncategorized';
    if (!groups[proj]) groups[proj] = [];
    groups[proj].push(task);
    return groups;
  }, {});

  const getPriorityBadge = (priority) => {
    switch (priority?.toLowerCase()) {
      case 'high':
        return 'bg-[#eb4d4b] text-white';
      case 'medium':
        return 'bg-[#e59838] text-white';
      case 'low':
        return 'bg-[#f5e586] text-neutral-800';
      default:
        return 'bg-neutral-200 text-neutral-700';
    }
  };

  const getStageBadge = (stage) => {
    switch (stage?.toLowerCase()) {
      case 'in progress':
        return 'bg-[#d9534f] text-white border-b-2 border-emerald-400';
      case 'review':
        return 'bg-[#a356c9] text-white';
      case 'not started':
      default:
        return 'bg-[#8e9095] text-white';
    }
  };

  return (
    <PasscodeGate>
      <div className="min-h-screen bg-[#eaecf0] p-2 sm:p-4 md:p-10 font-sans text-neutral-800">
        <div className="max-w-6xl mx-auto bg-white rounded-xl md:rounded-2xl shadow-xl border border-neutral-200 overflow-hidden">
          
          {/* Top Bar (Mobile-friendly Stack) */}
          <div className="p-4 sm:p-6 pb-2 border-b border-neutral-100">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-neutral-900">
                  My Tasks
                </h1>
                <div className="flex gap-6 mt-2 sm:mt-3 text-sm">
                  <button className="font-semibold text-blue-600 border-b-2 border-blue-600 pb-2">
                    List
                  </button>
                  <button
                    onClick={() => alert("Calendar view is coming soon!")}
                    className="font-normal text-neutral-400 hover:text-neutral-600 pb-2"
                  >
                    Calendar
                  </button>
                </div>
              </div>

              {/* Search Bar */}
              <div className="relative flex items-center w-full sm:w-auto">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search tasks..."
                  className="w-full sm:w-64 h-9 pl-4 pr-10 rounded-full border border-neutral-300 focus:outline-none focus:ring-1 focus:ring-blue-500 text-sm"
                />
                <div className="absolute right-1 top-1/2 -translate-y-1/2 w-7 h-7 bg-[#ea4c4c] rounded-full flex items-center justify-center text-white cursor-pointer shadow-sm">
                  <Search className="w-3.5 h-3.5" />
                </div>
              </div>
            </div>
          </div>

          {/* Action Row */}
          <div className="px-4 sm:px-6 py-3 flex items-center justify-between bg-white border-b border-neutral-200 text-sm">
            <div className="inline-flex rounded-lg shadow-sm">
              <button
                onClick={() => {
                  setTaskToEdit(null);
                  setIsModalOpen(true);
                }}
                className="flex items-center gap-1.5 bg-[#3b6edb] hover:bg-[#325ec2] text-white px-3.5 py-2 rounded-l-lg font-medium text-xs sm:text-sm"
              >
                <Plus className="w-4 h-4" /> Add Task
              </button>
              <button
                onClick={() => {
                  setTaskToEdit(null);
                  setIsModalOpen(true);
                }}
                className="bg-[#325ec2] text-white px-2 py-2 rounded-r-lg border-l border-blue-400 hover:bg-[#284ea6]"
              >
                <ChevronDown className="w-4 h-4" />
              </button>
            </div>

            <button className="flex items-center gap-1.5 text-neutral-500 hover:text-neutral-800 text-xs font-semibold uppercase tracking-wider">
              <ArrowUpDown className="w-3.5 h-3.5" /> Sort
            </button>
          </div>

          {/* Desktop Table Header (Hidden on Mobile) */}
          <div className="hidden md:grid grid-cols-12 px-6 py-3 bg-[#fafbfc] border-b border-neutral-200 text-xs font-semibold text-neutral-600">
            <div className="col-span-6 flex items-center gap-1">
              <span>Tasks by project</span>
              <ChevronDown className="w-4 h-4 text-neutral-400" />
            </div>
            <div className="col-span-2">Due date</div>
            <div className="col-span-1">Client</div>
            <div className="col-span-1 text-center">Priority</div>
            <div className="col-span-2 text-center">Stage</div>
          </div>

          {/* Task Accordion & Rows */}
          <div className="divide-y divide-neutral-200">
            {Object.keys(groupedTasks).length === 0 ? (
              <div className="p-8 sm:p-12 text-center text-neutral-400 text-sm">
                No tasks found. Use the mic or tap "+ Add Task".
              </div>
            ) : (
              Object.entries(groupedTasks).map(([project, projTasks]) => {
                const isCollapsed = collapsedProjects[project];
                return (
                  <div key={project} className="bg-white">
                    {/* Project Header Accordion */}
                    <div
                      onClick={() => toggleProject(project)}
                      className="px-4 sm:px-6 py-3 flex items-center gap-2 bg-[#fdfdfd] hover:bg-neutral-50 cursor-pointer select-none border-b border-neutral-100"
                    >
                      {isCollapsed ? (
                        <ChevronRight className="w-4 h-4 text-neutral-600" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-neutral-600" />
                      )}
                      <h2 className="font-bold text-neutral-900 text-sm sm:text-base">
                        {project}{' '}
                        <span className="font-normal text-neutral-500 text-xs sm:text-sm ml-1">
                          ( {projTasks.length} {projTasks.length === 1 ? 'Task' : 'Tasks'} )
                        </span>
                      </h2>
                    </div>

                    {!isCollapsed && (
                      <div className="divide-y divide-neutral-100">
                        {projTasks.map((task) => {
                          const isDescExpanded = expandedDescriptions[task.id];
                          const formattedDate = formatDueDate(task.dueDate);

                          return (
                            <div
                              key={task.id}
                              className="p-3.5 sm:px-6 sm:py-3.5 hover:bg-neutral-50/70 transition"
                            >
                              {/* ================= DESKTOP VIEW (MD and up) ================= */}
                              <div className="hidden md:grid grid-cols-12 items-start gap-2">
                                {/* Title & Expandable Description */}
                                <div className="col-span-6 flex items-start gap-3">
                                  <button
                                    onClick={() => toggleTaskCompletion(task)}
                                    className="mt-0.5 text-emerald-600 hover:opacity-80"
                                  >
                                    {task.completed ? (
                                      <CheckCircle2 className="w-5 h-5 fill-emerald-600 text-white" />
                                    ) : (
                                      <Circle className="w-5 h-5 text-neutral-300" />
                                    )}
                                  </button>
                                  <div className="flex-1 pr-2">
                                    <h3
                                      className={`text-sm font-semibold ${
                                        task.completed
                                          ? 'line-through text-neutral-400'
                                          : 'text-neutral-800'
                                      }`}
                                    >
                                      {task.title}
                                    </h3>
                                    {task.description && (
                                      <div className="mt-1">
                                        <button
                                          onClick={() => toggleDescription(task.id)}
                                          className="flex items-center gap-1 text-xs text-neutral-400 hover:text-neutral-600"
                                        >
                                          <span className="text-[10px]">
                                            {isDescExpanded ? '▼' : '▶'}
                                          </span>
                                        </button>
                                        {isDescExpanded && (
                                          <p className="text-xs text-neutral-500 mt-1 leading-relaxed whitespace-pre-wrap">
                                            {task.description}
                                          </p>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                </div>

                                {/* Due Date */}
                                <div className="col-span-2 text-xs md:text-sm text-teal-600 font-medium pt-1">
                                  {formattedDate}
                                </div>

                                {/* Client */}
                                <div className="col-span-1 pt-0.5">
                                  <span className="inline-block bg-[#ebecee] text-neutral-700 text-xs px-3 py-1 rounded-full font-medium">
                                    {task.client || 'General'}
                                  </span>
                                </div>

                                {/* Priority */}
                                <div className="col-span-1 text-center pt-0.5">
                                  <span
                                    className={`inline-block text-xs px-3 py-1 rounded-full font-medium ${getPriorityBadge(
                                      task.priority
                                    )}`}
                                  >
                                    {task.priority || 'Low'}
                                  </span>
                                </div>

                                {/* Stage & Menu */}
                                <div className="col-span-2 flex items-center justify-between pl-2 pt-0.5">
                                  <span
                                    className={`inline-block text-xs px-3 py-1 rounded-full font-medium shadow-sm ${getStageBadge(
                                      task.stage
                                    )}`}
                                  >
                                    {task.stage || 'Not Started'}
                                  </span>

                                  {/* Dropdown Menu */}
                                  <div className="relative">
                                    <button
                                      onClick={() =>
                                        setActiveMenuId(activeMenuId === task.id ? null : task.id)
                                      }
                                      className="p-1 hover:bg-neutral-200 rounded text-neutral-400 hover:text-neutral-600"
                                    >
                                      <MoreVertical className="w-4 h-4" />
                                    </button>
                                    {activeMenuId === task.id && (
                                      <div className="absolute right-0 top-6 bg-white border border-neutral-200 rounded-lg shadow-lg py-1 w-28 z-30">
                                        <button
                                          onClick={() => {
                                            setTaskToEdit(task);
                                            setIsModalOpen(true);
                                            setActiveMenuId(null);
                                          }}
                                          className="w-full text-left px-3 py-1.5 text-xs flex items-center gap-2 hover:bg-neutral-50 text-neutral-700"
                                        >
                                          <Edit2 className="w-3.5 h-3.5" /> Edit
                                        </button>
                                        <button
                                          onClick={() => handleDeleteTask(task.id)}
                                          className="w-full text-left px-3 py-1.5 text-xs flex items-center gap-2 hover:bg-red-50 text-red-600"
                                        >
                                          <Trash2 className="w-3.5 h-3.5" /> Delete
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>

                              {/* ================= MOBILE VIEW (< MD) ================= */}
                              <div className="block md:hidden space-y-2">
                                {/* Top line: Checkbox + Title + Menu */}
                                <div className="flex items-start justify-between gap-2">
                                  <div className="flex items-start gap-2.5 flex-1">
                                    <button
                                      onClick={() => toggleTaskCompletion(task)}
                                      className="mt-0.5 text-emerald-600 shrink-0"
                                    >
                                      {task.completed ? (
                                        <CheckCircle2 className="w-5 h-5 fill-emerald-600 text-white" />
                                      ) : (
                                        <Circle className="w-5 h-5 text-neutral-300" />
                                      )}
                                    </button>
                                    <div>
                                      <h3
                                        className={`text-sm font-semibold leading-tight ${
                                          task.completed
                                            ? 'line-through text-neutral-400'
                                            : 'text-neutral-800'
                                        }`}
                                      >
                                        {task.title}
                                      </h3>
                                    </div>
                                  </div>

                                  {/* Mobile Actions Menu */}
                                  <div className="relative shrink-0">
                                    <button
                                      onClick={() =>
                                        setActiveMenuId(activeMenuId === task.id ? null : task.id)
                                      }
                                      className="p-1 text-neutral-400 hover:text-neutral-600"
                                    >
                                      <MoreVertical className="w-4 h-4" />
                                    </button>
                                    {activeMenuId === task.id && (
                                      <div className="absolute right-0 top-6 bg-white border border-neutral-200 rounded-lg shadow-lg py-1 w-28 z-30">
                                        <button
                                          onClick={() => {
                                            setTaskToEdit(task);
                                            setIsModalOpen(true);
                                            setActiveMenuId(null);
                                          }}
                                          className="w-full text-left px-3 py-2 text-xs flex items-center gap-2 hover:bg-neutral-50 text-neutral-700"
                                        >
                                          <Edit2 className="w-3.5 h-3.5" /> Edit
                                        </button>
                                        <button
                                          onClick={() => handleDeleteTask(task.id)}
                                          className="w-full text-left px-3 py-2 text-xs flex items-center gap-2 hover:bg-red-50 text-red-600"
                                        >
                                          <Trash2 className="w-3.5 h-3.5" /> Delete
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                </div>

                                {/* Description (Collapsible) */}
                                {task.description && (
                                  <div className="pl-7">
                                    <button
                                      onClick={() => toggleDescription(task.id)}
                                      className="text-[11px] font-medium text-neutral-400 hover:text-neutral-600 flex items-center gap-1"
                                    >
                                      <span>{isDescExpanded ? 'Hide notes ▲' : 'View notes ▼'}</span>
                                    </button>
                                    {isDescExpanded && (
                                      <p className="text-xs text-neutral-500 mt-1 leading-relaxed bg-neutral-50 p-2 rounded-lg border border-neutral-100">
                                        {task.description}
                                      </p>
                                    )}
                                  </div>
                                )}

                                {/* Bottom Badges Wrap */}
                                <div className="flex flex-wrap items-center gap-1.5 pl-7 pt-1">
                                  {/* Due Date */}
                                  {task.dueDate && (
                                    <span className="inline-flex items-center gap-1 bg-teal-50 text-teal-700 text-[11px] px-2 py-0.5 rounded-full font-medium border border-teal-100">
                                      <Calendar className="w-3 h-3" />
                                      {formattedDate}
                                    </span>
                                  )}

                                  {/* Client */}
                                  <span className="inline-block bg-[#ebecee] text-neutral-700 text-[11px] px-2.5 py-0.5 rounded-full font-medium">
                                    {task.client || 'General'}
                                  </span>

                                  {/* Priority */}
                                  <span
                                    className={`inline-block text-[11px] px-2 py-0.5 rounded-full font-medium ${getPriorityBadge(
                                      task.priority
                                    )}`}
                                  >
                                    {task.priority || 'Low'}
                                  </span>

                                  {/* Stage */}
                                  <span
                                    className={`inline-block text-[11px] px-2 py-0.5 rounded-full font-medium shadow-sm ${getStageBadge(
                                      task.stage
                                    )}`}
                                  >
                                    {task.stage || 'Not Started'}
                                  </span>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Modal with dynamic projects & clients */}
        <TaskModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSave={handleSaveTask}
          task={taskToEdit}
          existingProjects={existingProjects}
          existingClients={existingClients}
        />

        {/* Voice Microphone */}
        <VoiceRecorder onTaskCreated={handleSaveTask} />
      </div>
    </PasscodeGate>
  );
}
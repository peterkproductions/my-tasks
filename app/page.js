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
        return 'bg-[#d9534f] text-white border-b-2 border-green-500';
      case 'review':
        return 'bg-[#a356c9] text-white';
      case 'not started':
      default:
        return 'bg-[#8e9095] text-white';
    }
  };

  return (
    <PasscodeGate>
      <div className="min-h-screen bg-[#eaecf0] p-4 md:p-10 font-sans text-neutral-800">
        <div className="max-w-6xl mx-auto bg-white rounded-2xl shadow-xl border border-neutral-200 overflow-hidden">
          
          {/* Header */}
          <div className="p-6 pb-2 border-b border-neutral-100">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-neutral-900">My Tasks</h1>
                <div className="flex gap-6 mt-3 text-sm">
                  <button className="font-semibold text-blue-600 border-b-2 border-blue-600 pb-2">
                    List
                  </button>
                  <button
                    onClick={() => alert("Calendar view is planned for a future update!")}
                    className="font-normal text-neutral-400 hover:text-neutral-600 pb-2"
                  >
                    Calendar
                  </button>
                </div>
              </div>

              {/* Search Bar */}
              <div className="flex items-center gap-2">
                <div className="relative flex items-center">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder=""
                    className="w-48 md:w-64 h-9 pl-4 pr-10 rounded-full border border-neutral-300 focus:outline-none focus:ring-1 focus:ring-blue-500 text-sm"
                  />
                  <div className="absolute right-1 top-1/2 -translate-y-1/2 w-7 h-7 bg-[#ea4c4c] rounded-full flex items-center justify-center text-white cursor-pointer shadow-sm">
                    <Search className="w-3.5 h-3.5" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Action Row */}
          <div className="px-6 py-4 flex items-center justify-between bg-white border-b border-neutral-200 text-sm">
            <div className="flex items-center">
              <div className="inline-flex rounded-lg shadow-sm">
                <button
                  onClick={() => {
                    setTaskToEdit(null);
                    setIsModalOpen(true);
                  }}
                  className="flex items-center gap-1.5 bg-[#3b6edb] hover:bg-[#325ec2] text-white px-4 py-2 rounded-l-lg font-medium text-xs md:text-sm"
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
            </div>

            <button className="flex items-center gap-1.5 text-neutral-500 hover:text-neutral-800 text-xs font-semibold uppercase tracking-wider">
              <ArrowUpDown className="w-3.5 h-3.5" /> Sort
            </button>
          </div>

          {/* Table Column Headers */}
          <div className="grid grid-cols-12 px-6 py-3 bg-[#fafbfc] border-b border-neutral-200 text-xs font-semibold text-neutral-600">
            <div className="col-span-12 md:col-span-6 flex items-center gap-1 cursor-pointer">
              <span>Tasks by project</span>
              <ChevronDown className="w-4 h-4 text-neutral-400" />
            </div>
            <div className="hidden md:block md:col-span-2">Due date</div>
            <div className="hidden md:block md:col-span-1">Client</div>
            <div className="hidden md:block md:col-span-1 text-center">Priority</div>
            <div className="hidden md:block md:col-span-2 text-center">Stage</div>
          </div>

          {/* Grouped Tasks */}
          <div className="divide-y divide-neutral-200">
            {Object.keys(groupedTasks).length === 0 ? (
              <div className="p-12 text-center text-neutral-400 text-sm">
                No tasks yet. Speak into the mic below or click "+ Add Task".
              </div>
            ) : (
              Object.entries(groupedTasks).map(([project, projTasks]) => {
                const isCollapsed = collapsedProjects[project];
                return (
                  <div key={project} className="bg-white">
                    {/* Collapsible Project Section Header */}
                    <div
                      onClick={() => toggleProject(project)}
                      className="px-6 py-3.5 flex items-center gap-2 bg-[#fdfdfd] hover:bg-neutral-50 cursor-pointer select-none border-b border-neutral-100"
                    >
                      {isCollapsed ? (
                        <ChevronRight className="w-4 h-4 text-neutral-600" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-neutral-600" />
                      )}
                      <h2 className="font-bold text-neutral-900 text-sm md:text-base">
                        {project}{' '}
                        <span className="font-normal text-neutral-500 text-xs md:text-sm ml-1">
                          ( {projTasks.length} {projTasks.length === 1 ? 'Task' : 'Tasks'} )
                        </span>
                      </h2>
                    </div>

                    {!isCollapsed && (
                      <div className="divide-y divide-neutral-100">
                        {projTasks.map((task) => {
                          const isDescExpanded = expandedDescriptions[task.id];
                          return (
                            <div
                              key={task.id}
                              className="grid grid-cols-12 px-6 py-3.5 items-start hover:bg-neutral-50/70 transition"
                            >
                              {/* Checkbox, Title & Description */}
                              <div className="col-span-12 md:col-span-6 flex items-start gap-3">
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
                              <div className="col-span-4 md:col-span-2 text-xs md:text-sm text-teal-600 font-medium pt-1">
                                {task.dueDate || '—'}
                              </div>

                              {/* Client Tag */}
                              <div className="col-span-3 md:col-span-1 pt-0.5">
                                <span className="inline-block bg-[#ebecee] text-neutral-700 text-xs px-3 py-1 rounded-full font-medium">
                                  {task.client || 'General'}
                                </span>
                              </div>

                              {/* Priority Pill */}
                              <div className="col-span-2 md:col-span-1 text-center pt-0.5">
                                <span
                                  className={`inline-block text-xs px-3 py-1 rounded-full font-medium ${getPriorityBadge(
                                    task.priority
                                  )}`}
                                >
                                  {task.priority || 'Low'}
                                </span>
                              </div>

                              {/* Stage Pill + Dropdown */}
                              <div className="col-span-3 md:col-span-2 flex items-center justify-between pl-2 pt-0.5">
                                <span
                                  className={`inline-block text-xs px-3 py-1 rounded-full font-medium shadow-sm ${getStageBadge(
                                    task.stage
                                  )}`}
                                >
                                  {task.stage || 'Not Started'}
                                </span>

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

        {/* Task Edit/Create Modal */}
        <TaskModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSave={handleSaveTask}
          task={taskToEdit}
        />

        {/* Floating Voice Microphone */}
        <VoiceRecorder onTaskCreated={handleSaveTask} />
      </div>
    </PasscodeGate>
  );
}
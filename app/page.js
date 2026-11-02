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
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
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
  Download,
  Copy,
  Check,
} from 'lucide-react';

export default function MyTasksApp() {
  const [tasks, setTasks] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedDescriptions, setExpandedDescriptions] = useState({});
  const [collapsedProjects, setCollapsedProjects] = useState({});
  const [activeMenuId, setActiveMenuId] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [taskToEdit, setTaskToEdit] = useState(null);
  const [copiedStatus, setCopiedStatus] = useState(false);

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

  const formatDueDate = (dateStr) => {
    if (!dateStr) return '—';
    if (dateStr.toLowerCase() === 'today') return 'Today';
    if (dateStr.toLowerCase() === 'tomorrow') return 'Tomorrow';

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
      case 'completed':
        return 'bg-emerald-600 text-white';
      case 'in progress':
        return 'bg-[#d9534f] text-white border-b-2 border-emerald-400';
      case 'review':
        return 'bg-[#a356c9] text-white';
      case 'not started':
      default:
        return 'bg-[#8e9095] text-white';
    }
  };

  // ===================== FEATURE 2A: DOWNLOAD COMPACT PDF =====================
  const downloadPDF = () => {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'pt',
      format: 'letter',
    });

    const todayDate = new Date().toISOString().split('T')[0];

    // Tight title header
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(`Task List — ${todayDate}`, 24, 30);

    const tableRows = [];

    Object.entries(groupedTasks).forEach(([project, projTasks]) => {
      // Project group banner row
      tableRows.push([
        {
          content: `${project.toUpperCase()} (${projTasks.length} ${projTasks.length === 1 ? 'Task' : 'Tasks'})`,
          colSpan: 5,
          styles: {
            fillColor: [240, 242, 245],
            textColor: [30, 41, 59],
            fontStyle: 'bold',
            fontSize: 9,
            cellPadding: 4,
          },
        },
      ]);

      projTasks.forEach((task) => {
        const statusCheck = task.completed ? '[X]' : '[ ]';
        const titleAndDesc = task.description
          ? `${statusCheck} ${task.title}\n${task.description}`
          : `${statusCheck} ${task.title}`;

        tableRows.push([
          titleAndDesc,
          formatDueDate(task.dueDate),
          task.client || 'General',
          task.priority || 'Low',
          task.stage || (task.completed ? 'Completed' : 'Not Started'),
        ]);
      });
    });

    autoTable(doc, {
      startY: 42,
      margin: { top: 20, right: 24, bottom: 20, left: 24 }, // Dense margins
      head: [['Task & Details', 'Due Date', 'Client', 'Priority', 'Stage']],
      body: tableRows,
      theme: 'grid',
      styles: {
        fontSize: 8,
        cellPadding: 3, // Tight cell spacing
        overflow: 'linebreak',
        textColor: [40, 40, 40],
        lineColor: [220, 224, 230],
        lineWidth: 0.5,
      },
      headStyles: {
        fillColor: [59, 110, 219],
        textColor: 255,
        fontStyle: 'bold',
        fontSize: 8.5,
        cellPadding: 4,
      },
      columnStyles: {
        0: { cellWidth: 260 },
        1: { cellWidth: 70 },
        2: { cellWidth: 70 },
        3: { cellWidth: 60, halign: 'center' },
        4: { cellWidth: 80, halign: 'center' },
      },
    });

    doc.save(`Tasks_${todayDate}.pdf`);
  };

  // ===================== FEATURE 2B: RICH COPY TO CLIPBOARD =====================
  const copyToClipboard = async () => {
    let plainText = `MY TASKS (${new Date().toLocaleDateString()})\n\n`;
    let htmlContent = `<div style="font-family: Arial, sans-serif; font-size: 13px; line-height: 1.4;">`;
    htmlContent += `<h2 style="font-size: 16px; margin-bottom: 8px;">My Tasks — ${new Date().toLocaleDateString()}</h2>`;

    Object.entries(groupedTasks).forEach(([project, projTasks]) => {
      plainText += `=== ${project} (${projTasks.length}) ===\n`;
      htmlContent += `<h3 style="font-size: 14px; margin-top: 14px; margin-bottom: 6px; color: #1e3a8a; border-bottom: 1px solid #cbd5e1; padding-bottom: 3px;">${project} (${projTasks.length})</h3><ul style="list-style-type: none; padding-left: 0;">`;

      projTasks.forEach((task) => {
        const check = task.completed ? '☑' : '☐';
        const formattedDate = formatDueDate(task.dueDate);

        plainText += `${check} ${task.title}\n`;
        if (task.description) plainText += `   Notes: ${task.description}\n`;
        plainText += `   Due: ${formattedDate} | Client: ${task.client || 'General'} | Priority: ${task.priority || 'Low'} | Stage: ${task.stage || 'Not Started'}\n\n`;

        htmlContent += `<li style="margin-bottom: 10px; padding-left: 4px;">`;
        htmlContent += `<strong>${check} ${task.title}</strong><br/>`;
        if (task.description) {
          htmlContent += `<span style="color: #4b5563; font-size: 12px; display: inline-block; margin-left: 18px; margin-top: 2px;"><em>Notes:</em> ${task.description.replace(/\n/g, '<br/>')}</span><br/>`;
        }
        htmlContent += `<span style="color: #6b7280; font-size: 11px; margin-left: 18px;">Due: <strong>${formattedDate}</strong> | Client: ${task.client || 'General'} | Priority: <em>${task.priority || 'Low'}</em> | Stage: <u>${task.stage || 'Not Started'}</u></span>`;
        htmlContent += `</li>`;
      });

      plainText += `\n`;
      htmlContent += `</ul>`;
    });

    htmlContent += `</div>`;

    try {
      if (navigator.clipboard && window.ClipboardItem) {
        const blobPlain = new Blob([plainText], { type: 'text/plain' });
        const blobHtml = new Blob([htmlContent], { type: 'text/html' });
        await navigator.clipboard.write([
          new ClipboardItem({
            'text/plain': blobPlain,
            'text/html': blobHtml,
          }),
        ]);
      } else {
        await navigator.clipboard.writeText(plainText);
      }

      setCopiedStatus(true);
      setTimeout(() => setCopiedStatus(false), 2500);
    } catch (err) {
      console.warn('Fallback copy to clipboard:', err);
      await navigator.clipboard.writeText(plainText);
      setCopiedStatus(true);
      setTimeout(() => setCopiedStatus(false), 2500);
    }
  };

  return (
    <PasscodeGate>
      <div className="min-h-screen bg-[#eaecf0] p-2 sm:p-4 md:p-10 font-sans text-neutral-800">
        <div className="max-w-6xl mx-auto bg-white rounded-xl md:rounded-2xl shadow-xl border border-neutral-200 overflow-hidden">
          
          {/* Top Bar with View Switcher, PDF & Clipboard actions, and Search */}
          <div className="p-4 sm:p-6 pb-2 border-b border-neutral-100">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-neutral-900">
                  My Tasks
                </h1>
                
                {/* Header Links Row */}
                <div className="flex items-center gap-4 sm:gap-6 mt-2 sm:mt-3 text-sm">
                  <button className="font-semibold text-blue-600 border-b-2 border-blue-600 pb-2">
                    List
                  </button>
                  <button
                    onClick={() => alert("Calendar view is coming soon!")}
                    className="font-normal text-neutral-400 hover:text-neutral-600 pb-2"
                  >
                    Calendar
                  </button>

                  <div className="h-4 w-px bg-neutral-200 mb-2" />

                  {/* 2A: Download PDF Link */}
                  <button
                    onClick={downloadPDF}
                    title="Download expanded task list as PDF"
                    className="flex items-center gap-1.5 font-medium text-xs sm:text-sm text-neutral-600 hover:text-blue-600 pb-2 transition"
                  >
                    <Download className="w-3.5 h-3.5 text-neutral-400" />
                    Download PDF
                  </button>

                  {/* 2B: Copy to Clipboard Link */}
                  <button
                    onClick={copyToClipboard}
                    title="Copy formatted task list to clipboard"
                    className="flex items-center gap-1.5 font-medium text-xs sm:text-sm text-neutral-600 hover:text-blue-600 pb-2 transition"
                  >
                    {copiedStatus ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        <span className="text-emerald-600 font-semibold">Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5 text-neutral-400" />
                        Copy to Clipboard
                      </>
                    )}
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

          {/* Desktop Table Header */}
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

          {/* Grouped Tasks */}
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
                    {/* Collapsible Project Section */}
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
                              {/* Desktop Row View */}
                              <div className="hidden md:grid grid-cols-12 items-start gap-2">
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

                                <div className="col-span-2 text-xs md:text-sm text-teal-600 font-medium pt-1">
                                  {formattedDate}
                                </div>

                                <div className="col-span-1 pt-0.5">
                                  <span className="inline-block bg-[#ebecee] text-neutral-700 text-xs px-3 py-1 rounded-full font-medium">
                                    {task.client || 'General'}
                                  </span>
                                </div>

                                <div className="col-span-1 text-center pt-0.5">
                                  <span
                                    className={`inline-block text-xs px-3 py-1 rounded-full font-medium ${getPriorityBadge(
                                      task.priority
                                    )}`}
                                  >
                                    {task.priority || 'Low'}
                                  </span>
                                </div>

                                <div className="col-span-2 flex items-center justify-between pl-2 pt-0.5">
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

                              {/* Mobile Card View */}
                              <div className="block md:hidden space-y-2">
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

                                {task.description && (
                                  <div className="pl-7">
                                    <button
                                      onClick={() => toggleDescription(task.id)}
                                      className="text-[11px] font-medium text-neutral-400 hover:text-neutral-600 flex items-center gap-1"
                                    >
                                      <span>{isDescExpanded ? 'Hide notes ▲' : 'View notes ▼'}</span>
                                    </button>
                                    {isDescExpanded && (
                                      <p className="text-xs text-neutral-500 mt-1 leading-relaxed bg-neutral-50 p-2 rounded-lg border border-neutral-100 whitespace-pre-wrap">
                                        {task.description}
                                      </p>
                                    )}
                                  </div>
                                )}

                                <div className="flex flex-wrap items-center gap-1.5 pl-7 pt-1">
                                  {task.dueDate && (
                                    <span className="inline-flex items-center gap-1 bg-teal-50 text-teal-700 text-[11px] px-2 py-0.5 rounded-full font-medium border border-teal-100">
                                      <Calendar className="w-3 h-3" />
                                      {formattedDate}
                                    </span>
                                  )}

                                  <span className="inline-block bg-[#ebecee] text-neutral-700 text-[11px] px-2.5 py-0.5 rounded-full font-medium">
                                    {task.client || 'General'}
                                  </span>

                                  <span
                                    className={`inline-block text-[11px] px-2 py-0.5 rounded-full font-medium ${getPriorityBadge(
                                      task.priority
                                    )}`}
                                  >
                                    {task.priority || 'Low'}
                                  </span>

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

        <TaskModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSave={handleSaveTask}
          task={taskToEdit}
          existingProjects={existingProjects}
          existingClients={existingClients}
        />

        <VoiceRecorder onTaskCreated={handleSaveTask} />
      </div>
    </PasscodeGate>
  );
}
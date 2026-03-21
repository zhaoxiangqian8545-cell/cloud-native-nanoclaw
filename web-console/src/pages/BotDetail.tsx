import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Radio, MessageSquare, Clock, Brain,
  FolderOpen, Settings as SettingsIcon, Plus, Trash2, ExternalLink,
  Play, Pause, Save, AlertTriangle,
} from 'lucide-react';
import { clsx } from 'clsx';
import TabNav from '../components/TabNav';
import Badge from '../components/Badge';
import FileBrowser from '../components/FileBrowser';
import {
  bots as botsApi, channels as channelsApi, groups as groupsApi,
  tasks as tasksApi, memory as memoryApi,
  providers as providersApi,
  Bot, ChannelConfig, Group, ScheduledTask,
  type ProviderPublic,
} from '../lib/api';

/* ── Tab definitions ───────────────────────────────────────────────── */

const tabs = [
  { key: 'overview', label: 'Overview', icon: <LayoutDashboard size={16} /> },
  { key: 'channels', label: 'Channels', icon: <Radio size={16} /> },
  { key: 'conversations', label: 'Conversations', icon: <MessageSquare size={16} /> },
  { key: 'tasks', label: 'Tasks', icon: <Clock size={16} /> },
  { key: 'memory', label: 'Memory', icon: <Brain size={16} /> },
  { key: 'files', label: 'Files', icon: <FolderOpen size={16} /> },
  { key: 'settings', label: 'Settings', icon: <SettingsIcon size={16} /> },
];

/* ── Overview tab ──────────────────────────────────────────────────── */

function OverviewTab({
  bot, botId, editing, setEditing, editName, setEditName, editDesc, setEditDesc, saveBot,
  providersList, selectedProviderId, setSelectedProviderId,
  selectedModelId, setSelectedModelId, saveModel, savingModel, modelStatus,
  channelCount, conversationCount, taskCount,
}: {
  bot: Bot;
  botId: string;
  editing: boolean;
  setEditing: (v: boolean) => void;
  editName: string;
  setEditName: (v: string) => void;
  editDesc: string;
  setEditDesc: (v: string) => void;
  saveBot: () => void;
  providersList: ProviderPublic[];
  selectedProviderId: string;
  setSelectedProviderId: (v: string) => void;
  selectedModelId: string;
  setSelectedModelId: (v: string) => void;
  saveModel: () => void;
  savingModel: boolean;
  modelStatus: 'saved' | 'error' | null;
  channelCount: number;
  conversationCount: number;
  taskCount: number;
}) {

  return (
    <div className="space-y-6">
      {/* Bot info card */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-slate-900">Bot Details</h2>
          {!editing && (
            <button
              onClick={() => setEditing(true)}
              className="text-sm text-accent-600 hover:text-accent-700 font-medium transition-colors"
            >
              Edit
            </button>
          )}
        </div>

        {editing ? (
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Name</label>
              <input
                value={editName}
                onChange={e => setEditName(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-accent-500 focus:ring-2 focus:ring-accent-500/20 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
              <textarea
                value={editDesc}
                onChange={e => setEditDesc(e.target.value)}
                placeholder="Description..."
                rows={3}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-accent-500 focus:ring-2 focus:ring-accent-500/20 focus:outline-none resize-none"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={saveBot}
                className="rounded-lg bg-accent-500 text-white px-4 py-2 text-sm font-medium hover:bg-accent-600 transition-colors"
              >
                Save
              </button>
              <button
                onClick={() => setEditing(false)}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            <div>
              <span className="text-sm text-slate-500">Name</span>
              <p className="text-sm font-medium text-slate-900">{bot.name}</p>
            </div>
            {bot.description && (
              <div>
                <span className="text-sm text-slate-500">Description</span>
                <p className="text-sm text-slate-700">{bot.description}</p>
              </div>
            )}
            <div>
              <span className="text-sm text-slate-500">Trigger</span>
              <p className="text-sm font-medium text-slate-900">{bot.triggerPattern}</p>
            </div>
          </div>
        )}
      </div>

      {/* Model / Provider card */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
        <h2 className="text-base font-semibold text-slate-900 mb-4">Model</h2>

        {providersList.length === 0 ? (
          <div className="text-sm text-slate-500 py-4">
            No model providers available. Contact your administrator.
          </div>
        ) : (
          <div className="space-y-4">
            {/* Provider dropdown */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Provider</label>
              <select
                value={selectedProviderId}
                onChange={(e) => {
                  const newId = e.target.value;
                  setSelectedProviderId(newId);
                  const prov = providersList.find(p => p.providerId === newId);
                  setSelectedModelId(prov?.modelIds[0] || '');
                }}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-accent-500 focus:ring-2 focus:ring-accent-500/20 focus:outline-none"
              >
                {providersList.map(p => (
                  <option key={p.providerId} value={p.providerId}>
                    {p.providerName} ({p.providerType === 'bedrock' ? 'Bedrock' : 'Anthropic API'})
                  </option>
                ))}
              </select>
            </div>

            {/* Model dropdown */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Model</label>
              <select
                value={selectedModelId}
                onChange={(e) => setSelectedModelId(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-accent-500 focus:ring-2 focus:ring-accent-500/20 focus:outline-none"
              >
                {(providersList.find(p => p.providerId === selectedProviderId)?.modelIds || []).map(mid => (
                  <option key={mid} value={mid}>{mid}</option>
                ))}
              </select>
            </div>

            {/* Save button */}
            <div className="flex items-center gap-3">
              <button
                onClick={saveModel}
                disabled={savingModel || !selectedProviderId || !selectedModelId}
                className="rounded-lg bg-accent-500 text-white px-4 py-2 text-sm font-medium hover:bg-accent-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {savingModel ? 'Saving...' : 'Save Model'}
              </button>
              {modelStatus === 'saved' && <span className="text-sm text-emerald-600">Saved</span>}
              {modelStatus === 'error' && <span className="text-sm text-red-600">Failed to save</span>}
            </div>
          </div>
        )}
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 text-center">
          <p className="text-2xl font-semibold text-slate-900">{channelCount}</p>
          <p className="text-sm text-slate-500 mt-1">Channels</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 text-center">
          <p className="text-2xl font-semibold text-slate-900">{conversationCount}</p>
          <p className="text-sm text-slate-500 mt-1">Conversations</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 text-center">
          <p className="text-2xl font-semibold text-slate-900">{taskCount}</p>
          <p className="text-sm text-slate-500 mt-1">Tasks</p>
        </div>
      </div>
    </div>
  );
}

/* ── Channels tab ──────────────────────────────────────────────────── */

function ChannelsTab({
  botId, channelsList, loadData,
}: {
  botId: string;
  channelsList: ChannelConfig[];
  loadData: () => void;
}) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {channelsList.map((ch) => (
        <div key={ch.channelId} className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-slate-900 capitalize">{ch.channelType}</h3>
              <Badge
                variant={
                  ch.status === 'connected' ? 'success' :
                  ch.status === 'pending_webhook' ? 'warning' : 'error'
                }
              >
                {ch.status === 'pending_webhook' ? 'Setup Incomplete' : ch.status}
              </Badge>
            </div>
            {ch.status === 'pending_webhook' && (
              <Link
                to={`/bots/${botId}/channels/setup?resume=${ch.channelType}`}
                className="inline-flex items-center gap-1 text-sm text-accent-600 hover:text-accent-700 font-medium"
              >
                Resume Setup <ExternalLink size={14} />
              </Link>
            )}
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100">
            <button
              onClick={() => {
                if (confirm(`Remove ${ch.channelType} channel?`)) {
                  channelsApi.delete(botId, ch.channelType).then(loadData);
                }
              }}
              className="inline-flex items-center gap-1.5 text-red-500 hover:text-red-700 text-sm transition-colors"
            >
              <Trash2 size={14} /> Remove
            </button>
          </div>
        </div>
      ))}

      {/* Add channel card */}
      <Link
        to={`/bots/${botId}/channels/new`}
        className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-300 p-5 text-slate-400 hover:border-accent-400 hover:text-accent-500 transition-colors min-h-[120px]"
      >
        <Plus size={24} />
        <span className="text-sm font-medium mt-2">Add Channel</span>
      </Link>
    </div>
  );
}

/* ── Conversations tab ─────────────────────────────────────────────── */

function ConversationsTab({
  botId, groupsList,
}: {
  botId: string;
  groupsList: Group[];
}) {
  if (groupsList.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 text-center">
        <MessageSquare size={32} className="mx-auto text-slate-300 mb-3" />
        <p className="text-sm text-slate-500">
          No conversations yet. Messages will appear here once users interact with your bot.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-200 bg-slate-50">
            <th className="text-left px-5 py-3 font-medium text-slate-600">Name</th>
            <th className="text-left px-5 py-3 font-medium text-slate-600">Channel</th>
            <th className="text-left px-5 py-3 font-medium text-slate-600">Last Active</th>
            <th className="text-right px-5 py-3 font-medium text-slate-600">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {groupsList.map((g) => (
            <tr key={g.groupJid} className="hover:bg-slate-50 transition-colors">
              <td className="px-5 py-3">
                <Link
                  to={`/bots/${botId}/messages/${encodeURIComponent(g.groupJid)}`}
                  className="font-medium text-slate-900 hover:text-accent-600 transition-colors"
                >
                  {g.name || g.groupJid}
                </Link>
              </td>
              <td className="px-5 py-3">
                <Badge variant="info">{g.channelType}</Badge>
              </td>
              <td className="px-5 py-3 text-slate-500">
                {g.lastMessageAt ? new Date(g.lastMessageAt).toLocaleDateString() : '--'}
              </td>
              <td className="px-5 py-3 text-right">
                <Link
                  to={`/bots/${botId}/groups/${encodeURIComponent(g.groupJid)}/memory`}
                  className="text-accent-600 hover:text-accent-700 font-medium transition-colors"
                >
                  Memory
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ── Tasks tab ────────────────────────────────────────────────────── */

function TasksTab({
  botId, tasksList, loadData,
}: {
  botId: string;
  tasksList: ScheduledTask[];
  loadData: () => void;
}) {
  const [showCreate, setShowCreate] = useState(false);
  const [newTask, setNewTask] = useState({ groupJid: '', prompt: '', scheduleType: 'cron', scheduleValue: '' });
  const [creating, setCreating] = useState(false);

  async function createTask() {
    setCreating(true);
    try {
      await tasksApi.create(botId, newTask);
      setShowCreate(false);
      setNewTask({ groupJid: '', prompt: '', scheduleType: 'cron', scheduleValue: '' });
      loadData();
    } catch (err) {
      console.error('Failed to create task:', err);
    } finally {
      setCreating(false);
    }
  }

  async function toggleTask(taskId: string, currentStatus: string) {
    const newStatus = currentStatus === 'active' ? 'paused' : 'active';
    await tasksApi.update(botId, taskId, { status: newStatus });
    loadData();
  }

  async function deleteTask(taskId: string) {
    if (!confirm('Delete this task?')) return;
    await tasksApi.delete(botId, taskId);
    loadData();
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-slate-500">{tasksList.length} scheduled task{tasksList.length !== 1 ? 's' : ''}</p>
        <button
          onClick={() => setShowCreate(true)}
          className="inline-flex items-center gap-1.5 rounded-lg bg-accent-500 text-white px-4 py-2 text-sm font-medium hover:bg-accent-600 transition-colors"
        >
          <Plus size={16} /> New Task
        </button>
      </div>

      {/* Create task form */}
      {showCreate && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 space-y-3">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Group JID</label>
            <input
              placeholder="e.g. group-chat-id"
              value={newTask.groupJid}
              onChange={e => setNewTask(prev => ({ ...prev, groupJid: e.target.value }))}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-accent-500 focus:ring-2 focus:ring-accent-500/20 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Prompt</label>
            <textarea
              placeholder="What should the bot do on this schedule?"
              value={newTask.prompt}
              onChange={e => setNewTask(prev => ({ ...prev, prompt: e.target.value }))}
              rows={3}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-accent-500 focus:ring-2 focus:ring-accent-500/20 focus:outline-none resize-none"
            />
          </div>
          <div className="flex gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Schedule Type</label>
              <select
                value={newTask.scheduleType}
                onChange={e => setNewTask(prev => ({ ...prev, scheduleType: e.target.value }))}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-accent-500 focus:ring-2 focus:ring-accent-500/20 focus:outline-none"
              >
                <option value="cron">Cron</option>
                <option value="interval">Interval (ms)</option>
                <option value="once">Once (ISO)</option>
              </select>
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium text-slate-700 mb-1">Schedule Value</label>
              <input
                placeholder={newTask.scheduleType === 'cron' ? '0 9 * * *' : newTask.scheduleType === 'interval' ? '3600000' : '2025-01-01T09:00:00Z'}
                value={newTask.scheduleValue}
                onChange={e => setNewTask(prev => ({ ...prev, scheduleValue: e.target.value }))}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-accent-500 focus:ring-2 focus:ring-accent-500/20 focus:outline-none"
              />
            </div>
          </div>
          <div className="flex gap-2 pt-1">
            <button
              onClick={createTask}
              disabled={creating || !newTask.groupJid.trim() || !newTask.prompt.trim() || !newTask.scheduleValue.trim()}
              className="rounded-lg bg-accent-500 text-white px-4 py-2 text-sm font-medium hover:bg-accent-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {creating ? 'Creating...' : 'Create Task'}
            </button>
            <button
              onClick={() => setShowCreate(false)}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Task list */}
      {tasksList.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 text-center">
          <Clock size={32} className="mx-auto text-slate-300 mb-3" />
          <p className="text-sm text-slate-500">
            No scheduled tasks yet. Create one to have your bot run prompts on a schedule.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {tasksList.map((task) => (
            <div key={task.taskId} className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
              <div className="flex justify-between items-start">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-900 truncate">
                    {task.prompt.length > 100 ? task.prompt.slice(0, 100) + '...' : task.prompt}
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    {task.scheduleType}: <span className="font-mono">{task.scheduleValue}</span>
                    {' '}&middot;{' '}Group: {task.groupJid}
                  </p>
                  {task.nextRun && (
                    <p className="text-xs text-slate-400 mt-1">
                      Next run: {new Date(task.nextRun).toLocaleString()}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2 ml-4 shrink-0">
                  <Badge
                    variant={
                      task.status === 'active' ? 'success' :
                      task.status === 'paused' ? 'warning' : 'neutral'
                    }
                  >
                    {task.status}
                  </Badge>
                  <button
                    onClick={() => toggleTask(task.taskId, task.status)}
                    className="inline-flex items-center gap-1 text-sm text-accent-600 hover:text-accent-700 font-medium transition-colors"
                    title={task.status === 'active' ? 'Pause' : 'Resume'}
                  >
                    {task.status === 'active' ? <Pause size={14} /> : <Play size={14} />}
                    {task.status === 'active' ? 'Pause' : 'Resume'}
                  </button>
                  <button
                    onClick={() => deleteTask(task.taskId)}
                    className="inline-flex items-center gap-1 text-sm text-red-500 hover:text-red-700 transition-colors"
                  >
                    <Trash2 size={14} /> Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Memory tab ───────────────────────────────────────────────────── */

function MemoryTab({ botId }: { botId: string }) {
  const [memoryTab, setMemoryTab] = useState<'bot' | 'shared'>('bot');
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<'saved' | 'error' | null>(null);

  useEffect(() => { loadMemory(); }, [memoryTab, botId]);

  async function loadMemory() {
    setLoading(true);
    setStatus(null);
    try {
      const result = memoryTab === 'bot'
        ? await memoryApi.getBotGlobal(botId)
        : await memoryApi.getShared();
      setContent(result.content || '');
    } catch (err) {
      console.error('Failed to load memory:', err);
      setContent('');
    } finally {
      setLoading(false);
    }
  }

  async function saveMemory() {
    setSaving(true);
    setStatus(null);
    try {
      if (memoryTab === 'bot') {
        await memoryApi.updateBotGlobal(botId, content);
      } else {
        await memoryApi.updateShared(content);
      }
      setStatus('saved');
      setTimeout(() => setStatus(null), 3000);
    } catch (err) {
      console.error('Failed to save memory:', err);
      setStatus('error');
    } finally {
      setSaving(false);
    }
  }

  const tabMeta = {
    bot: { label: 'Bot Memory', description: 'Bot operating manual — identity, personality, rules, and notes (CLAUDE.md)', placeholder: 'Enter bot memory content...' },
    shared: { label: 'Shared Memory', description: 'Memory shared across all bots (CLAUDE.md)', placeholder: 'Enter shared memory content...' },
  };
  const meta = tabMeta[memoryTab];

  return (
    <div className="space-y-4">
      {/* Sub-tabs */}
      <div className="flex gap-2">
        {(['bot', 'shared'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setMemoryTab(tab)}
            className={clsx(
              'px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
              memoryTab === tab
                ? 'bg-accent-500 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200',
            )}
          >
            {tabMeta[tab].label}
          </button>
        ))}
      </div>

      <p className="text-sm text-slate-500">{meta.description}</p>

      {loading ? (
        <div className="text-center py-12 text-slate-500 text-sm">Loading...</div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
          <textarea
            value={content}
            onChange={e => setContent(e.target.value)}
            rows={20}
            placeholder={meta.placeholder}
            className="w-full font-mono text-sm p-4 border border-slate-300 rounded-lg focus:border-accent-500 focus:ring-2 focus:ring-accent-500/20 focus:outline-none resize-y"
          />
          <div className="mt-4 flex items-center gap-3">
            <button
              onClick={saveMemory}
              disabled={saving}
              className="inline-flex items-center gap-1.5 rounded-lg bg-accent-500 text-white px-4 py-2 text-sm font-medium hover:bg-accent-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save size={16} /> {saving ? 'Saving...' : `Save ${meta.label}`}
            </button>
            {status === 'saved' && <span className="text-sm text-emerald-600">Saved successfully</span>}
            {status === 'error' && <span className="text-sm text-red-600">Failed to save</span>}
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Settings tab ─────────────────────────────────────────────────── */

function SettingsTab({
  bot, botId, loadData,
}: {
  bot: Bot;
  botId: string;
  loadData: () => void;
}) {
  const navigate = useNavigate();
  const [trigger, setTrigger] = useState(bot.triggerPattern);
  const [savingTrigger, setSavingTrigger] = useState(false);
  const [triggerStatus, setTriggerStatus] = useState<'saved' | 'error' | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function saveTrigger() {
    setSavingTrigger(true);
    setTriggerStatus(null);
    try {
      await botsApi.update(botId, { triggerPattern: trigger });
      setTriggerStatus('saved');
      setTimeout(() => setTriggerStatus(null), 2000);
      loadData();
    } catch (err) {
      console.error('Failed to save trigger:', err);
      setTriggerStatus('error');
    } finally {
      setSavingTrigger(false);
    }
  }

  async function deleteBot() {
    if (!window.confirm(`Are you sure you want to delete "${bot.name}"? This action cannot be undone.`)) return;
    setDeleting(true);
    try {
      await botsApi.delete(botId);
      navigate('/');
    } catch (err) {
      console.error('Failed to delete bot:', err);
      setDeleting(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Trigger pattern */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
        <h2 className="text-base font-semibold text-slate-900 mb-1">Trigger Pattern</h2>
        <p className="text-sm text-slate-500 mb-4">
          The regex pattern that activates this bot in group chats. Messages matching this pattern will be forwarded to the agent.
        </p>
        <div className="flex gap-3 items-start">
          <input
            value={trigger}
            onChange={e => setTrigger(e.target.value)}
            placeholder="e.g. ^@bot\\b"
            className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm font-mono focus:border-accent-500 focus:ring-2 focus:ring-accent-500/20 focus:outline-none"
          />
          <button
            onClick={saveTrigger}
            disabled={savingTrigger || trigger === bot.triggerPattern}
            className="rounded-lg bg-accent-500 text-white px-4 py-2 text-sm font-medium hover:bg-accent-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {savingTrigger ? 'Saving...' : 'Save'}
          </button>
        </div>
        {triggerStatus === 'saved' && <p className="text-sm text-emerald-600 mt-2">Saved</p>}
        {triggerStatus === 'error' && <p className="text-sm text-red-600 mt-2">Failed to save</p>}
      </div>

      {/* Danger zone */}
      <div className="bg-white rounded-xl shadow-sm border-2 border-red-200 p-5">
        <div className="flex items-center gap-2 mb-1">
          <AlertTriangle size={18} className="text-red-500" />
          <h2 className="text-base font-semibold text-red-700">Danger Zone</h2>
        </div>
        <p className="text-sm text-slate-500 mb-4">
          Deleting this bot will permanently remove all its channels, conversations, tasks, memory, and session data.
        </p>
        <button
          onClick={deleteBot}
          disabled={deleting}
          className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 text-white px-4 py-2 text-sm font-medium hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Trash2 size={16} /> {deleting ? 'Deleting...' : 'Delete Bot'}
        </button>
      </div>
    </div>
  );
}

/* ── Main component ────────────────────────────────────────────────── */

export default function BotDetail() {
  const { botId } = useParams<{ botId: string }>();
  const [bot, setBot] = useState<Bot | null>(null);
  const [channelsList, setChannels] = useState<ChannelConfig[]>([]);
  const [groupsList, setGroups] = useState<Group[]>([]);
  const [tasksList, setTasks] = useState<ScheduledTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [providersList, setProvidersList] = useState<ProviderPublic[]>([]);
  const [selectedProviderId, setSelectedProviderId] = useState('');
  const [selectedModelId, setSelectedModelId] = useState('');
  const [savingModel, setSavingModel] = useState(false);
  const [modelStatus, setModelStatus] = useState<'saved' | 'error' | null>(null);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => { if (botId) loadData(); }, [botId]);

  async function loadData() {
    try {
      const [botData, chs, grps, tks, provs] = await Promise.all([
        botsApi.get(botId!),
        channelsApi.list(botId!),
        groupsApi.list(botId!),
        tasksApi.list(botId!),
        providersApi.list(),
      ]);
      setBot(botData);
      setChannels(chs);
      setGroups(grps);
      setTasks(tks);
      setEditName(botData.name);
      setEditDesc(botData.description || '');
      setProvidersList(provs);

      // Set selected provider/model from bot data
      if (botData.providerId) {
        setSelectedProviderId(botData.providerId);
        setSelectedModelId(botData.modelId || '');
      } else if (provs.length > 0) {
        // No provider set yet — use default or first
        const defaultProv = provs.find(p => p.isDefault) || provs[0];
        setSelectedProviderId(defaultProv.providerId);
        setSelectedModelId(defaultProv.modelIds[0] || '');
      }
    } catch (err) {
      console.error('Failed to load bot:', err);
    } finally {
      setLoading(false);
    }
  }

  async function saveBot() {
    await botsApi.update(botId!, { name: editName, description: editDesc });
    setEditing(false);
    loadData();
  }

  async function saveModel() {
    if (!selectedProviderId || !selectedModelId) return;
    setSavingModel(true);
    setModelStatus(null);
    try {
      await botsApi.update(botId!, { providerId: selectedProviderId, modelId: selectedModelId });
      setModelStatus('saved');
      setTimeout(() => setModelStatus(null), 2000);
      loadData();
    } catch (err) {
      console.error('Failed to save model:', err);
      setModelStatus('error');
    } finally {
      setSavingModel(false);
    }
  }

  if (loading) return <div className="text-center py-12 text-slate-500">Loading...</div>;
  if (!bot) return <div className="text-center py-12 text-slate-500">Bot not found</div>;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">{bot.name}</h1>
          {bot.description && <p className="text-sm text-slate-500 mt-1">{bot.description}</p>}
        </div>
        <Badge variant={bot.status === 'active' ? 'success' : 'neutral'}>{bot.status}</Badge>
      </div>

      {/* Tabs */}
      <TabNav tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />

      {/* Tab content */}
      <div className="mt-6">
        {activeTab === 'overview' && (
          <OverviewTab
            bot={bot}
            botId={botId!}
            editing={editing}
            setEditing={setEditing}
            editName={editName}
            setEditName={setEditName}
            editDesc={editDesc}
            setEditDesc={setEditDesc}
            saveBot={saveBot}
            providersList={providersList}
            selectedProviderId={selectedProviderId}
            setSelectedProviderId={setSelectedProviderId}
            selectedModelId={selectedModelId}
            setSelectedModelId={setSelectedModelId}
            saveModel={saveModel}
            savingModel={savingModel}
            modelStatus={modelStatus}
            channelCount={channelsList.length}
            conversationCount={groupsList.length}
            taskCount={tasksList.length}
          />
        )}
        {activeTab === 'channels' && (
          <ChannelsTab botId={botId!} channelsList={channelsList} loadData={loadData} />
        )}
        {activeTab === 'conversations' && (
          <ConversationsTab botId={botId!} groupsList={groupsList} />
        )}
        {activeTab === 'tasks' && (
          <TasksTab botId={botId!} tasksList={tasksList} loadData={loadData} />
        )}
        {activeTab === 'memory' && (
          <MemoryTab botId={botId!} />
        )}
        {activeTab === 'files' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900">Files</h2>
              <p className="text-sm text-slate-500">Browse agent workspace on S3</p>
            </div>
            <FileBrowser botId={botId!} />
          </div>
        )}
        {activeTab === 'settings' && (
          <SettingsTab bot={bot} botId={botId!} loadData={loadData} />
        )}
      </div>
    </div>
  );
}

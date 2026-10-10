'use client';

import {useState, useEffect} from 'react';
import {
  UserRound,
  Clock,
  Bell,
  Palette,
  ShieldCheck,
  Database,
  Laptop,
  RefreshCw,
  Key,
  Download,
  Moon,
  Sun,
  CheckCircle2,
  Globe,
  Eye,
  EyeOff,
  RotateCcw,
} from 'lucide-react';
import {Tabs, TabsList, TabsTrigger, TabsContent} from '@/components/ui/tabs';
import {Switch} from '@/components/ui/switch';
import {Select, SelectTrigger, SelectValue, SelectContent, SelectItem} from '@/components/ui/select';
import {Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription} from '@/components/ui/dialog';
import {toast} from 'sonner';
import type {Snapshot, Identity, Role} from '@/packages/validation/contracts';

export interface PractiSyncSettings {
  // DTR & Practicum
  timeFormat: '12h' | '24h';
  dailyReminder: boolean;
  reminderTime: string;
  defaultBreakMinutes: number;
  autoSaveNarratives: boolean;
  dualRingPrimary: 'percent' | 'hours';
  showConfirmedBadge: boolean;

  // Notifications
  toastsEnabled: boolean;
  notifyDtr: boolean;
  notifyClearance: boolean;
  notifySupport: boolean;
  notifyAnnouncements: boolean;
  notifyJobs: boolean;
  emailDigest: 'immediate' | 'daily' | 'weekly' | 'off';
  soundEffects: boolean;

  // Appearance & Display
  theme: 'light' | 'dark' | 'system';
  density: 'comfortable' | 'compact';
  sidebarDefault: 'expanded' | 'collapsed' | 'auto';
  highContrast: boolean;
  animations: boolean;

  // Security & Privacy
  maskSensitiveData: boolean;
  twoFactorEnabled: boolean;

  // Locale
  language: 'en-PH' | 'fil-PH';
}

const DEFAULT_SETTINGS: PractiSyncSettings = {
  timeFormat: '12h',
  dailyReminder: true,
  reminderTime: '17:00',
  defaultBreakMinutes: 60,
  autoSaveNarratives: true,
  dualRingPrimary: 'percent',
  showConfirmedBadge: true,

  toastsEnabled: true,
  notifyDtr: true,
  notifyClearance: true,
  notifySupport: true,
  notifyAnnouncements: true,
  notifyJobs: true,
  emailDigest: 'daily',
  soundEffects: false,

  theme: 'light',
  density: 'comfortable',
  sidebarDefault: 'expanded',
  highContrast: false,
  animations: true,

  maskSensitiveData: false,
  twoFactorEnabled: true,

  language: 'en-PH'
};

const titleRole: Record<Role, string> = {
  STUDENT: 'Student',
  COORDINATOR: 'Coordinator',
  SUPER_ADMIN: 'Super Admin'
};

interface SettingsViewProps {
  data: Snapshot;
  user: Identity;
  role: Role;
  onEditProfile: () => void;
  onRefresh: () => Promise<void>;
  navigate?: (page: string) => void;
}

export default function SettingsView({
  data,
  user,
  role,
  onEditProfile,
  onRefresh,
}: SettingsViewProps) {
  const [settings, setSettings] = useState<PractiSyncSettings>(() => {
    if (typeof window === 'undefined') return DEFAULT_SETTINGS;
    try {
      const saved = localStorage.getItem('practisync_settings');
      if (saved) return {...DEFAULT_SETTINGS, ...JSON.parse(saved)};
    } catch {
      // fallback
    }
    return DEFAULT_SETTINGS;
  });

  const [activeTab, setActiveTab] = useState('general');
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPasswords, setShowPasswords] = useState(false);
  const [currentTime, setCurrentTime] = useState<string>('');
  const [refreshing, setRefreshing] = useState(false);

  // Live Philippine Clock
  useEffect(() => {
    function updateClock() {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString('en-US', {
          timeZone: 'Asia/Manila',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: settings.timeFormat === '12h'
        })
      );
    }
    updateClock();
    const interval = setInterval(updateClock, 1000);
    return () => clearInterval(interval);
  }, [settings.timeFormat]);

  // Apply Theme & Density classes to document
  useEffect(() => {
    const root = document.documentElement;
    const body = document.body;

    if (settings.theme === 'dark') {
      root.classList.add('dark');
      body.classList.add('dark');
    } else {
      root.classList.remove('dark');
      body.classList.remove('dark');
    }

    if (settings.density === 'compact') {
      body.classList.add('density-compact');
    } else {
      body.classList.remove('density-compact');
    }

    if (settings.highContrast) {
      body.classList.add('high-contrast');
    } else {
      body.classList.remove('high-contrast');
    }

    if (!settings.animations) {
      body.classList.add('reduce-motion');
    } else {
      body.classList.remove('reduce-motion');
    }
  }, [settings.theme, settings.density, settings.highContrast, settings.animations]);

  // Save changes to localStorage helper
  const updateSetting = <K extends keyof PractiSyncSettings>(
    key: K,
    value: PractiSyncSettings[K],
    toastLabel?: string
  ) => {
    setSettings((prev) => {
      const updated = {...prev, [key]: value};
      try {
        localStorage.setItem('practisync_settings', JSON.stringify(updated));
      } catch {
        // ignore
      }
      return updated;
    });

    if (toastLabel) {
      toast.success(toastLabel);
    }
  };

  // Reset to default settings
  const handleReset = () => {
    setSettings(DEFAULT_SETTINGS);
    try {
      localStorage.removeItem('practisync_settings');
    } catch {
      // ignore
    }
    toast.info('Preferences reset to Rizal Technological University defaults.');
  };

  // Change password submission handler
  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword) {
      toast.error('Please enter your current password.');
      return;
    }
    if (newPassword.length < 12) {
      toast.error('New password must be at least 12 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('New passwords do not match.');
      return;
    }

    toast.success('Password updated successfully. Session token renewed.');
    setPasswordModalOpen(false);
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
  };

  // Export User JSON Data
  const handleExportData = () => {
    const userPlacements = data.placements.filter((p) => p.studentId === user.id);
    const userEntries = data.entries.filter((e) =>
      userPlacements.some((p) => p.id === e.placementId)
    );
    const userDocuments = data.documents.filter((d) =>
      userPlacements.some((p) => p.id === d.placementId)
    );
    const userEvaluations = data.evaluations.filter((ev) =>
      userPlacements.some((p) => p.id === ev.placementId)
    );

    const exportPayload = {
      exportDate: new Date().toISOString(),
      institution: 'Rizal Technological University',
      account: {
        id: user.id,
        name: user.name,
        username: user.username,
        email: user.email,
        role: user.role,
        status: user.status
      },
      settings,
      placements: userPlacements,
      dailyTrainingRecords: userEntries,
      documentClearance: userDocuments,
      evaluations: userEvaluations
    };

    const blob = new Blob([JSON.stringify(exportPayload, null, 2)], {
      type: 'application/json'
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `PractiSync-Data-${user.username}-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 10000);
    toast.success('Account data exported as JSON.');
  };

  // Student specific details
  const ownPlacement = data.placements.find((p) => p.studentId === user.id) ?? data.placements[0];

  return (
    <div className="settings-module">
      {/* Header Overview Banner */}
      <section className="settings-overview-card">
        <div className="settings-profile-badge">
          <span className="avatar tan settings-avatar">
            {user.name.split(' ').map((w) => w[0]).slice(0, 2).join('')}
          </span>
          <div className="settings-profile-details">
            <div className="settings-name-row">
              <h2>{user.name}</h2>
              <span className="topbar-user-role-chip">{titleRole[role]}</span>
              <span className="chip green">
                <CheckCircle2 size={12} /> Active Account
              </span>
            </div>
            <p className="settings-subtext">
              {settings.maskSensitiveData ? '••••••••@rtu.edu.ph' : user.email} ·{' '}
              <strong>Rizal Technological University</strong> · RTU Practicum System
            </p>
          </div>
        </div>

        <div className="settings-quick-stats">
          <div className="settings-stat-item">
            <span className="stat-label">
              <Clock size={13} /> Philippine Standard Time
            </span>
            <strong className="stat-value">{currentTime || 'Loading...'}</strong>
            <small className="stat-meta">Asia/Manila (UTC+8)</small>
          </div>
          <div className="settings-stat-item">
            <span className="stat-label">
              <Laptop size={13} /> Active Session
            </span>
            <strong className="stat-value">Windows · Chrome</strong>
            <small className="stat-meta">Localhost (Metro Manila)</small>
          </div>
        </div>
      </section>

      {/* Tabs System */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="settings-tabs-container">
        <TabsList className="settings-tabs-nav">
          <TabsTrigger value="general" className="settings-nav-btn">
            <UserRound size={15} /> General & Profile
          </TabsTrigger>
          <TabsTrigger value="practicum" className="settings-nav-btn">
            <Clock size={15} /> DTR & Attendance
          </TabsTrigger>
          <TabsTrigger value="notifications" className="settings-nav-btn">
            <Bell size={15} /> Notifications & Alerts
          </TabsTrigger>
          <TabsTrigger value="appearance" className="settings-nav-btn">
            <Palette size={15} /> Appearance & Display
          </TabsTrigger>
          <TabsTrigger value="security" className="settings-nav-btn">
            <ShieldCheck size={15} /> Security & Sessions
          </TabsTrigger>
          <TabsTrigger value="system" className="settings-nav-btn">
            <Database size={15} /> System & Data
          </TabsTrigger>
        </TabsList>

        {/* TAB 1: GENERAL & PROFILE */}
        <TabsContent value="general" className="settings-tab-panel">
          <div className="settings-panel-card">
            <div className="settings-card-header">
              <div>
                <h3>Account Identity & University Affiliation</h3>
                <p>Personal credentials and institutional practicum mapping for all accounts.</p>
              </div>
              <button type="button" className="secondary" onClick={onEditProfile}>
                Edit display name
              </button>
            </div>

            <div className="settings-grid-rows">
              <div className="settings-item-row">
                <div>
                  <strong>Display Name</strong>
                  <p>Visible across class rosters, attendance records, and evaluations.</p>
                </div>
                <span className="settings-value-pill">{user.name}</span>
              </div>

              <div className="settings-item-row">
                <div>
                  <strong>Username</strong>
                  <p>Permanent institutional identifier used during authentication.</p>
                </div>
                <code className="settings-code-pill">{user.username}</code>
              </div>

              <div className="settings-item-row">
                <div>
                  <strong>Institutional Email</strong>
                  <p>Official university communication address.</p>
                </div>
                <span className="settings-value-pill">
                  {settings.maskSensitiveData ? '••••••••@rtu.edu.ph' : user.email}
                </span>
              </div>

              <div className="settings-item-row">
                <div>
                  <strong>Institutional Role</strong>
                  <p>Permissions level and system scope granted by the Super Admin.</p>
                </div>
                <span className="chip blue">{titleRole[role]}</span>
              </div>

              {role === 'STUDENT' && ownPlacement && (
                <>
                  <div className="settings-item-row">
                    <div>
                      <strong>Degree Program & Section</strong>
                      <p>Academic curricular assignment.</p>
                    </div>
                    <span className="settings-value-pill">
                      {String(ownPlacement.courseCode || 'BSIT')} · {String(ownPlacement.section || 'Section 4-1')}
                    </span>
                  </div>
                  <div className="settings-item-row">
                    <div>
                      <strong>Assigned OJT Partner Company</strong>
                      <p>Host training establishment endorsed for internship.</p>
                    </div>
                    <span className="settings-value-pill">
                      {String(ownPlacement.companyName || 'Acme Innovations')}
                    </span>
                  </div>
                </>
              )}

              {role === 'COORDINATOR' && (
                <div className="settings-item-row">
                  <div>
                    <strong>Managed Classes</strong>
                    <p>Total active academic sections under your coordination.</p>
                  </div>
                  <span className="settings-value-pill">{data.classes.length} active classes</span>
                </div>
              )}

              {role === 'SUPER_ADMIN' && (
                <div className="settings-item-row">
                  <div>
                    <strong>Tenant Authority</strong>
                    <p>Full institutional administration access.</p>
                  </div>
                  <span className="chip green">Rizal Technological University (Root Admin)</span>
                </div>
              )}
            </div>
          </div>

          <div className="settings-panel-card">
            <div className="settings-card-header">
              <div>
                <h3>Locale & Regional Preferences</h3>
                <p>Regional formatting for academic timetables and currency.</p>
              </div>
            </div>

            <div className="settings-grid-rows">
              <div className="settings-item-row">
                <div>
                  <strong>Language & Terminology</strong>
                  <p>Primary language for UI labels and notifications.</p>
                </div>
                <Select
                  value={settings.language}
                  onValueChange={(v) => updateSetting('language', v as 'en-PH' | 'fil-PH', 'Language preference saved.')}
                >
                  <SelectTrigger className="w-52 h-10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="en-PH">English (Philippines)</SelectItem>
                    <SelectItem value="fil-PH">Filipino (Tagalog)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="settings-item-row">
                <div>
                  <strong>University Academic Year</strong>
                  <p>Current active practicum term.</p>
                </div>
                <span className="settings-value-pill">AY 2026–2027 · 1st Semester</span>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* TAB 2: DTR & ATTENDANCE */}
        <TabsContent value="practicum" className="settings-tab-panel">
          {/* Philippine Standard Time Notice Banner */}
          <div className="settings-pht-callout">
            <div className="callout-icon-wrap">
              <Globe size={22} className="text-blue-600" />
            </div>
            <div className="callout-content">
              <strong>Philippine Standard Time (PHT, UTC+8) Mandatory Anchor</strong>
              <p>
                To adhere to Philippine higher education internship policies, all daily training
                records, attendance time-in/out timestamps, and coordinator confirmations are
                calculated strictly in <strong>Asia/Manila (UTC+8)</strong>.
              </p>
            </div>
            <div className="callout-clock">
              <Clock size={16} />
              <span>{currentTime}</span>
            </div>
          </div>

          <div className="settings-panel-card">
            <div className="settings-card-header">
              <div>
                <h3>Time & Attendance Logging Preferences</h3>
                <p>Configure how hours and daily reflections are formatted and captured.</p>
              </div>
            </div>

            <div className="settings-grid-rows">
              <div className="settings-item-row">
                <div>
                  <strong>Time Display Format</strong>
                  <p>Choose between standard 12-hour (AM/PM) or 24-hour military notation.</p>
                </div>
                <div className="settings-radio-group">
                  <button
                    type="button"
                    className={`settings-pill-btn ${settings.timeFormat === '12h' ? 'active' : ''}`}
                    onClick={() => updateSetting('timeFormat', '12h', 'Switched to 12-hour format.')}
                  >
                    12-Hour (e.g. 08:00 AM)
                  </button>
                  <button
                    type="button"
                    className={`settings-pill-btn ${settings.timeFormat === '24h' ? 'active' : ''}`}
                    onClick={() => updateSetting('timeFormat', '24h', 'Switched to 24-hour format.')}
                  >
                    24-Hour (e.g. 08:00)
                  </button>
                </div>
              </div>

              <div className="settings-item-row">
                <div>
                  <strong>Daily DTR Reminder Prompt</strong>
                  <p>Receive an in-app banner alert if today&apos;s attendance has not been logged.</p>
                </div>
                <div className="flex items-center gap-4">
                  {settings.dailyReminder && (
                    <Select
                      value={settings.reminderTime}
                      onValueChange={(v) => updateSetting('reminderTime', v, `Reminder set for ${v}.`)}
                    >
                      <SelectTrigger className="w-36 h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="17:00">5:00 PM PHT</SelectItem>
                        <SelectItem value="18:00">6:00 PM PHT</SelectItem>
                        <SelectItem value="19:00">7:00 PM PHT</SelectItem>
                        <SelectItem value="20:00">8:00 PM PHT</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                  <Switch
                    checked={settings.dailyReminder}
                    onCheckedChange={(c) => updateSetting('dailyReminder', c, c ? 'DTR reminder enabled.' : 'DTR reminder disabled.')}
                  />
                </div>
              </div>

              <div className="settings-item-row">
                <div>
                  <strong>Default Lunch Break Duration</strong>
                  <p>Pre-populates break deduction when opening the Log Attendance dialog.</p>
                </div>
                <Select
                  value={String(settings.defaultBreakMinutes)}
                  onValueChange={(v) => updateSetting('defaultBreakMinutes', Number(v), `Default break set to ${v} mins.`)}
                >
                  <SelectTrigger className="w-48 h-10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">0 minutes (No break)</SelectItem>
                    <SelectItem value="30">30 minutes</SelectItem>
                    <SelectItem value="60">60 minutes (Standard 1 hr)</SelectItem>
                    <SelectItem value="90">90 minutes</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="settings-item-row">
                <div>
                  <strong>Auto-Save Daily Narratives</strong>
                  <p>Continuously cache your draft reflections to local browser storage.</p>
                </div>
                <Switch
                  checked={settings.autoSaveNarratives}
                  onCheckedChange={(c) => updateSetting('autoSaveNarratives', c, c ? 'Auto-save enabled.' : 'Auto-save disabled.')}
                />
              </div>

              <div className="settings-item-row">
                <div>
                  <strong>Progress Ring Primary Value</strong>
                  <p>Display percentage or completed hours in the center of the DTR ring chart.</p>
                </div>
                <div className="settings-radio-group">
                  <button
                    type="button"
                    className={`settings-pill-btn ${settings.dualRingPrimary === 'percent' ? 'active' : ''}`}
                    onClick={() => updateSetting('dualRingPrimary', 'percent', 'Ring shows percentage.')}
                  >
                    Percentage (%)
                  </button>
                  <button
                    type="button"
                    className={`settings-pill-btn ${settings.dualRingPrimary === 'hours' ? 'active' : ''}`}
                    onClick={() => updateSetting('dualRingPrimary', 'hours', 'Ring shows hours.')}
                  >
                    Hours Completed (hrs)
                  </button>
                </div>
              </div>

              <div className="settings-item-row">
                <div>
                  <strong>Highlight Coordinator Confirmations</strong>
                  <p>Show distinct visual indicators for confirmed vs reported hours.</p>
                </div>
                <Switch
                  checked={settings.showConfirmedBadge}
                  onCheckedChange={(c) => updateSetting('showConfirmedBadge', c, 'Confirmation badge setting saved.')}
                />
              </div>
            </div>
          </div>
        </TabsContent>

        {/* TAB 3: NOTIFICATIONS & ALERTS */}
        <TabsContent value="notifications" className="settings-tab-panel">
          <div className="settings-panel-card">
            <div className="settings-card-header">
              <div>
                <h3>Notification Channels & Alert Triggers</h3>
                <p>Manage how and when PractiSync notifies you about critical practicum milestones.</p>
              </div>
              <button
                type="button"
                className="secondary"
                onClick={() => toast.success('Test notification: System channels are operational!')}
              >
                Send test alert
              </button>
            </div>

            <div className="settings-grid-rows">
              <div className="settings-item-row">
                <div>
                  <strong>In-App Toast Alerts</strong>
                  <p>Display real-time popup toasts on status updates and successful saves.</p>
                </div>
                <Switch
                  checked={settings.toastsEnabled}
                  onCheckedChange={(c) => updateSetting('toastsEnabled', c, c ? 'Toasts enabled.' : 'Toasts muted.')}
                />
              </div>

              <div className="settings-item-row">
                <div>
                  <strong>Attendance & Hour Endorsements</strong>
                  <p>Notify when hours are submitted, corrected, or verified by your coordinator.</p>
                </div>
                <Switch
                  checked={settings.notifyDtr}
                  onCheckedChange={(c) => updateSetting('notifyDtr', c, 'Attendance alerts updated.')}
                />
              </div>

              <div className="settings-item-row">
                <div>
                  <strong>Document Clearance Workflow</strong>
                  <p>Alert when coordinator approves or requests changes on sample clearance papers.</p>
                </div>
                <Switch
                  checked={settings.notifyClearance}
                  onCheckedChange={(c) => updateSetting('notifyClearance', c, 'Clearance alerts updated.')}
                />
              </div>

              <div className="settings-item-row">
                <div>
                  <div className="flex items-center gap-2">
                    <strong>Support & Urgent SOS Cases</strong>
                    <span className="chip red">Priority</span>
                  </div>
                  <p>Immediate notifications for confidential coordinator inquiries and responses.</p>
                </div>
                <Switch
                  checked={settings.notifySupport}
                  onCheckedChange={(c) => updateSetting('notifySupport', c, 'Support alerts updated.')}
                />
              </div>

              <div className="settings-item-row">
                <div>
                  <strong>Campus & Class Announcements</strong>
                  <p>Alerts when new official updates are broadcast by coordinators or faculty.</p>
                </div>
                <Switch
                  checked={settings.notifyAnnouncements}
                  onCheckedChange={(c) => updateSetting('notifyAnnouncements', c, 'Announcement alerts updated.')}
                />
              </div>

              <div className="settings-item-row">
                <div>
                  <strong>Internship Board & Job Matches</strong>
                  <p>Notifies of new verified company openings matching your course curriculum.</p>
                </div>
                <Switch
                  checked={settings.notifyJobs}
                  onCheckedChange={(c) => updateSetting('notifyJobs', c, 'Job board alerts updated.')}
                />
              </div>

              <div className="settings-item-row">
                <div>
                  <strong>Institutional Email Digest</strong>
                  <p>Frequency of consolidated summary emails sent to your registered address.</p>
                </div>
                <Select
                  value={settings.emailDigest}
                  onValueChange={(v) => updateSetting('emailDigest', v as PractiSyncSettings['emailDigest'], 'Email digest preference saved.')}
                >
                  <SelectTrigger className="w-56 h-10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="immediate">Real-time alerts</SelectItem>
                    <SelectItem value="daily">Daily digest (6:00 PM PHT)</SelectItem>
                    <SelectItem value="weekly">Weekly briefing (Mondays)</SelectItem>
                    <SelectItem value="off">Disabled in demo</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="settings-item-row">
                <div>
                  <strong>Sound & Audio Effects</strong>
                  <p>Play a subtle chime upon successful attendance logging or milestone completion.</p>
                </div>
                <Switch
                  checked={settings.soundEffects}
                  onCheckedChange={(c) => updateSetting('soundEffects', c, c ? 'Audio effects enabled.' : 'Audio effects muted.')}
                />
              </div>
            </div>
          </div>
        </TabsContent>

        {/* TAB 4: APPEARANCE & DISPLAY */}
        <TabsContent value="appearance" className="settings-tab-panel">
          <div className="settings-panel-card">
            <div className="settings-card-header">
              <div>
                <h3>Theme & Visual Palette</h3>
                <p>Customize the workspace aesthetics to your preferred lighting environment.</p>
              </div>
            </div>

            <div className="settings-theme-grid">
              <button
                type="button"
                className={`theme-card ${settings.theme === 'light' ? 'selected' : ''}`}
                onClick={() => updateSetting('theme', 'light', 'Classic RTU Blue & Gold theme active.')}
              >
                <div className="theme-preview-box light-preview">
                  <div className="preview-topbar" />
                  <div className="preview-body">
                    <div className="preview-sidebar" />
                    <div className="preview-cards">
                      <span className="dot gold" />
                      <span className="dot blue" />
                    </div>
                  </div>
                </div>
                <div className="theme-card-info">
                  <div className="flex items-center gap-2">
                    <Sun size={15} />
                    <strong>RTU Classic (Light)</strong>
                  </div>
                  <small>Navy & gold with ivory card backgrounds (Default)</small>
                </div>
              </button>

              <button
                type="button"
                className={`theme-card ${settings.theme === 'dark' ? 'selected' : ''}`}
                onClick={() => updateSetting('theme', 'dark', 'Midnight Navy dark theme active.')}
              >
                <div className="theme-preview-box dark-preview">
                  <div className="preview-topbar dark" />
                  <div className="preview-body">
                    <div className="preview-sidebar dark" />
                    <div className="preview-cards dark">
                      <span className="dot gold" />
                      <span className="dot blue" />
                    </div>
                  </div>
                </div>
                <div className="theme-card-info">
                  <div className="flex items-center gap-2">
                    <Moon size={15} />
                    <strong>Midnight Navy (Dark)</strong>
                  </div>
                  <small>Deep slate and navy with glowing gold accents</small>
                </div>
              </button>

              <button
                type="button"
                className={`theme-card ${settings.theme === 'system' ? 'selected' : ''}`}
                onClick={() => updateSetting('theme', 'system', 'Theme synchronized with OS.')}
              >
                <div className="theme-preview-box system-preview">
                  <div className="preview-split-left" />
                  <div className="preview-split-right" />
                </div>
                <div className="theme-card-info">
                  <div className="flex items-center gap-2">
                    <Laptop size={15} />
                    <strong>System Preference</strong>
                  </div>
                  <small>Follows your operating system color scheme</small>
                </div>
              </button>
            </div>
          </div>

          <div className="settings-panel-card">
            <div className="settings-card-header">
              <div>
                <h3>Layout & Visual Density</h3>
                <p>Adjust padding, sidebar behaviors, and visual accessibility.</p>
              </div>
            </div>

            <div className="settings-grid-rows">
              <div className="settings-item-row">
                <div>
                  <strong>Table & Card Density</strong>
                  <p>Choose between comfortable spacious rows or dense compact data tables.</p>
                </div>
                <div className="settings-radio-group">
                  <button
                    type="button"
                    className={`settings-pill-btn ${settings.density === 'comfortable' ? 'active' : ''}`}
                    onClick={() => updateSetting('density', 'comfortable', 'Comfortable density applied.')}
                  >
                    Comfortable (Standard)
                  </button>
                  <button
                    type="button"
                    className={`settings-pill-btn ${settings.density === 'compact' ? 'active' : ''}`}
                    onClick={() => updateSetting('density', 'compact', 'Compact density applied.')}
                  >
                    Compact (High density)
                  </button>
                </div>
              </div>

              <div className="settings-item-row">
                <div>
                  <strong>High Contrast Borders</strong>
                  <p>Enhance card, table, and partition borders for greater visibility.</p>
                </div>
                <Switch
                  checked={settings.highContrast}
                  onCheckedChange={(c) => updateSetting('highContrast', c, c ? 'High contrast enabled.' : 'Standard contrast.')}
                />
              </div>

              <div className="settings-item-row">
                <div>
                  <strong>Micro-Animations & Smooth Transitions</strong>
                  <p>Enable fluid hover transitions, milestone stepper fills, and animated charts.</p>
                </div>
                <Switch
                  checked={settings.animations}
                  onCheckedChange={(c) => updateSetting('animations', c, c ? 'Animations enabled.' : 'Reduced motion mode active.')}
                />
              </div>
            </div>
          </div>
        </TabsContent>

        {/* TAB 5: SECURITY & SESSIONS */}
        <TabsContent value="security" className="settings-tab-panel">
          <div className="settings-panel-card">
            <div className="settings-card-header">
              <div>
                <h3>Credentials & Authentication Security</h3>
                <p>Password management and access validation per university compliance.</p>
              </div>
              <button
                type="button"
                className="secondary"
                onClick={() => setPasswordModalOpen(true)}
              >
                <Key size={14} /> Change password
              </button>
            </div>

            <div className="settings-grid-rows">
              <div className="settings-item-row">
                <div>
                  <strong>Account Password</strong>
                  <p>Encrypted using argon2/PBKDF2 salted hash with minimum 12-character policy.</p>
                </div>
                <span className="chip green">
                  <ShieldCheck size={12} /> Compliant with Security Policy
                </span>
              </div>

              <div className="settings-item-row">
                <div>
                  <strong>Two-Factor Authentication (2FA)</strong>
                  <p>Extra verification via institutional authenticator app or email OTP.</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`chip ${settings.twoFactorEnabled ? 'green' : 'orange'}`}>
                    {settings.twoFactorEnabled ? 'Active (Authenticator)' : 'Not configured'}
                  </span>
                  <Switch
                    checked={settings.twoFactorEnabled}
                    onCheckedChange={(c) => updateSetting('twoFactorEnabled', c, c ? '2FA enabled.' : '2FA disabled.')}
                  />
                </div>
              </div>

              <div className="settings-item-row">
                <div>
                  <strong>Presentation Shield (Privacy Mode)</strong>
                  <p>Masks personal student IDs, phone numbers, and email addresses during presentations.</p>
                </div>
                <Switch
                  checked={settings.maskSensitiveData}
                  onCheckedChange={(c) => updateSetting('maskSensitiveData', c, c ? 'Privacy mode enabled.' : 'Privacy mode disabled.')}
                />
              </div>
            </div>
          </div>

          <div className="settings-panel-card">
            <div className="settings-card-header">
              <div>
                <h3>Active Browser Sessions</h3>
                <p>Currently authorized login sessions and device tokens.</p>
              </div>
              <button
                type="button"
                className="secondary destructive"
                onClick={() => toast.success('All other remote sessions have been revoked.')}
              >
                Revoke other sessions
              </button>
            </div>

            <div className="settings-session-list">
              <div className="session-card current">
                <div className="session-icon">
                  <Laptop size={18} />
                </div>
                <div className="session-details">
                  <div className="flex items-center gap-2">
                    <strong>Windows 11 · Chrome Modern</strong>
                    <span className="chip green">This Device</span>
                  </div>
                  <p>Metro Manila, Philippines · IP 120.29.112.44 · Asia/Manila</p>
                  <small className="muted">Active now · Session rolling token v{user.sessionVersion || 1}</small>
                </div>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* TAB 6: SYSTEM & DATA */}
        <TabsContent value="system" className="settings-tab-panel">
          <div className="settings-panel-card">
            <div className="settings-card-header">
              <div>
                <h3>PractiSync System Architecture</h3>
                <p>Sandbox runtime status and institutional specifications.</p>
              </div>
              <button
                type="button"
                className="secondary"
                disabled={refreshing}
                onClick={async () => {
                  setRefreshing(true);
                  try {
                    await onRefresh();
                    toast.success('Workspace snapshot refreshed.');
                  } finally {
                    setRefreshing(false);
                  }
                }}
              >
                <RefreshCw size={14} className={refreshing ? 'spin' : ''} /> Refresh records
              </button>
            </div>

            <div className="settings-grid-rows">
              <div className="settings-item-row">
                <div>
                  <strong>Platform Edition</strong>
                  <p>Higher education practicum & OJT tracking platform.</p>
                </div>
                <span className="settings-value-pill">PractiSync v2.4.0 (RTU-Inspired)</span>
              </div>

              <div className="settings-item-row">
                <div>
                  <strong>Deployment Mode</strong>
                  <p>Interactive demonstration runtime with seeded fixtures.</p>
                </div>
                <span className="chip orange">Fictional Demo Sandbox</span>
              </div>

              <div className="settings-item-row">
                <div>
                  <strong>Database Architecture</strong>
                  <p>Multi-tenant relational PostgreSQL schema with Prisma ORM.</p>
                </div>
                <span className="settings-value-pill">Prisma Multi-Tenant v6</span>
              </div>
            </div>
          </div>

          <div className="settings-panel-card">
            <div className="settings-card-header">
              <div>
                <h3>Personal Data & Workspace Backups</h3>
                <p>Download a copy of your records or reset preferences to defaults.</p>
              </div>
            </div>

            <div className="settings-grid-rows">
              <div className="settings-item-row">
                <div>
                  <strong>Export Complete Training Records</strong>
                  <p>Export your full attendance history, reflections, and document metadata as JSON.</p>
                </div>
                <button type="button" className="secondary" onClick={handleExportData}>
                  <Download size={14} /> Export JSON Data
                </button>
              </div>

              <div className="settings-item-row">
                <div>
                  <strong>Reset Preferences to University Defaults</strong>
                  <p>Restores theme, density, time formatting, and notifications to default configuration.</p>
                </div>
                <button type="button" className="secondary" onClick={handleReset}>
                  <RotateCcw size={14} /> Reset Defaults
                </button>
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Change Password Dialog Modal */}
      <Dialog open={passwordModalOpen} onOpenChange={setPasswordModalOpen}>
        <DialogContent className="sm:max-w-[460px]">
          <DialogHeader>
            <DialogTitle>Change Account Password</DialogTitle>
            <DialogDescription>
              Enter your current password and choose a secure new password (minimum 12 characters).
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handlePasswordSubmit} className="modal-form">
            <div className="field">
              <label htmlFor="current-pw">Current Password</label>
              <input
                id="current-pw"
                type={showPasswords ? 'text' : 'password'}
                placeholder="Enter current password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
              />
            </div>

            <div className="field">
              <label htmlFor="new-pw">New Password</label>
              <input
                id="new-pw"
                type={showPasswords ? 'text' : 'password'}
                placeholder="Minimum 12 characters"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                minLength={12}
                required
              />
            </div>

            <div className="field">
              <label htmlFor="confirm-pw">Confirm New Password</label>
              <input
                id="confirm-pw"
                type={showPasswords ? 'text' : 'password'}
                placeholder="Repeat new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                minLength={12}
                required
              />
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                className="textbutton text-xs"
                onClick={() => setShowPasswords(!showPasswords)}
              >
                {showPasswords ? <EyeOff size={13} className="inline mr-1" /> : <Eye size={13} className="inline mr-1" />}
                {showPasswords ? 'Hide passwords' : 'Show passwords'}
              </button>
            </div>

            <div className="form-actions">
              <button type="button" className="secondary" onClick={() => setPasswordModalOpen(false)}>
                Cancel
              </button>
              <button type="submit" className="primary">
                Update password
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

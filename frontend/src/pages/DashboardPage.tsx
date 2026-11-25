import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  updateProfile,
  addSkill,
  deleteSkill,
  updatePreferences,
  ApiError,
  UserSkill,
} from "../lib/api";

// ─── Reusable helpers ────────────────────────────────────────────────────────

const DIFFICULTY_OPTIONS = ["beginner", "intermediate", "advanced"] as const;
type Difficulty = (typeof DIFFICULTY_OPTIONS)[number];

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 shadow-lg space-y-4">
      <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-400">{title}</h2>
      {children}
    </section>
  );
}

function StatusMsg({ msg, isError }: { msg: string | null; isError?: boolean }) {
  if (!msg) return null;
  return (
    <p
      role={isError ? "alert" : "status"}
      className={`text-xs rounded-lg px-3 py-2 ${
        isError
          ? "text-rose-400 bg-rose-950/40 border border-rose-800/50"
          : "text-emerald-400 bg-emerald-950/40 border border-emerald-800/50"
      }`}
    >
      {msg}
    </p>
  );
}

// ─── Profile Section ─────────────────────────────────────────────────────────

function ProfileSection() {
  const { user, token, refreshUser } = useAuth();
  const profile = user?.profile;

  const [displayName, setDisplayName] = useState(profile?.display_name ?? "");
  const [bio, setBio] = useState(profile?.bio ?? "");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ text: string; error: boolean } | null>(null);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setSaving(true);
    setMsg(null);
    try {
      await updateProfile({ display_name: displayName || null, bio: bio || null }, token);
      await refreshUser();
      setMsg({ text: "Profile saved.", error: false });
    } catch (err) {
      setMsg({ text: err instanceof ApiError ? err.message : "Save failed.", error: true });
    } finally {
      setSaving(false);
    }
  };

  return (
    <SectionCard title="Profile">
      <form onSubmit={handleSave} className="space-y-3">
        <div>
          <label htmlFor="displayName" className="block text-xs font-medium text-slate-300 mb-1">
            Display Name
          </label>
          <input
            id="displayName"
            type="text"
            maxLength={50}
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-100 placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 transition"
            placeholder="Your display name"
          />
        </div>
        <div>
          <label htmlFor="bio" className="block text-xs font-medium text-slate-300 mb-1">
            Bio
          </label>
          <textarea
            id="bio"
            rows={3}
            maxLength={500}
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-100 placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 transition resize-none"
            placeholder="Tell others a bit about yourself…"
          />
        </div>
        <StatusMsg msg={msg?.text ?? null} isError={msg?.error} />
        <button
          type="submit"
          disabled={saving}
          className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold transition disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save Profile"}
        </button>
      </form>
    </SectionCard>
  );
}

// ─── Skills Section ───────────────────────────────────────────────────────────

function SkillsSection() {
  const { user, token, refreshUser } = useAuth();
  const [skillName, setSkillName] = useState("");
  const [level, setLevel] = useState<number>(3);
  const [adding, setAdding] = useState(false);
  const [msg, setMsg] = useState<{ text: string; error: boolean } | null>(null);

  const skills: UserSkill[] = user?.skills ?? [];

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !skillName.trim()) return;
    setAdding(true);
    setMsg(null);
    try {
      await addSkill({ skill_name: skillName.trim(), proficiency_level: level }, token);
      await refreshUser();
      setSkillName("");
      setLevel(3);
      setMsg({ text: "Skill added.", error: false });
    } catch (err) {
      setMsg({ text: err instanceof ApiError ? err.message : "Could not add skill.", error: true });
    } finally {
      setAdding(false);
    }
  };

  const handleDelete = async (skillId: number) => {
    if (!token) return;
    try {
      await deleteSkill(skillId, token);
      await refreshUser();
    } catch {
      /* silent – refresh will re-render correct state */
    }
  };

  return (
    <SectionCard title="Skills">
      {skills.length === 0 ? (
        <p className="text-sm text-slate-500">No skills added yet.</p>
      ) : (
        <ul className="space-y-2">
          {skills.map((s) => (
            <li
              key={s.id}
              className="flex items-center justify-between px-3 py-2 rounded-lg bg-slate-800/60 border border-slate-700/60"
            >
              <span className="text-sm text-slate-200">
                {s.skill_name}{" "}
                <span className="text-slate-500 text-xs">(level {s.proficiency_level})</span>
              </span>
              <button
                onClick={() => handleDelete(s.id)}
                aria-label={`Remove ${s.skill_name}`}
                className="text-xs text-rose-400 hover:text-rose-300 transition"
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}

      <form onSubmit={handleAdd} className="flex items-end gap-2 pt-2">
        <div className="flex-1">
          <label htmlFor="skillName" className="block text-xs font-medium text-slate-300 mb-1">
            Skill Name
          </label>
          <input
            id="skillName"
            type="text"
            required
            maxLength={50}
            value={skillName}
            onChange={(e) => setSkillName(e.target.value)}
            className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-100 placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 transition"
            placeholder="e.g. Python"
          />
        </div>
        <div>
          <label htmlFor="skillLevel" className="block text-xs font-medium text-slate-300 mb-1">
            Level (1–10)
          </label>
          <input
            id="skillLevel"
            type="number"
            min={1}
            max={10}
            required
            value={level}
            onChange={(e) => setLevel(Number(e.target.value))}
            className="w-20 px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 transition"
          />
        </div>
        <button
          type="submit"
          disabled={adding}
          className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold transition disabled:opacity-50 whitespace-nowrap"
        >
          {adding ? "Adding…" : "Add Skill"}
        </button>
      </form>
      <StatusMsg msg={msg?.text ?? null} isError={msg?.error} />
    </SectionCard>
  );
}

// ─── Preferences Section ──────────────────────────────────────────────────────

function PreferencesSection() {
  const { user, token, refreshUser } = useAuth();
  const prefs = user?.preferences;

  const [language, setLanguage] = useState(prefs?.preferred_programming_language ?? "");
  const [difficulty, setDifficulty] = useState<Difficulty | "">(
    (prefs?.preferred_difficulty as Difficulty | undefined) ?? ""
  );
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ text: string; error: boolean } | null>(null);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setSaving(true);
    setMsg(null);
    try {
      await updatePreferences(
        {
          preferred_programming_language: language || null,
          preferred_difficulty: difficulty || null,
        },
        token
      );
      await refreshUser();
      setMsg({ text: "Preferences saved.", error: false });
    } catch (err) {
      setMsg({ text: err instanceof ApiError ? err.message : "Save failed.", error: true });
    } finally {
      setSaving(false);
    }
  };

  return (
    <SectionCard title="Preferences">
      <form onSubmit={handleSave} className="space-y-3">
        <div>
          <label htmlFor="language" className="block text-xs font-medium text-slate-300 mb-1">
            Preferred Language
          </label>
          <input
            id="language"
            type="text"
            maxLength={50}
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-100 placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 transition"
            placeholder="e.g. Python"
          />
        </div>
        <div>
          <label htmlFor="difficulty" className="block text-xs font-medium text-slate-300 mb-1">
            Preferred Difficulty
          </label>
          <select
            id="difficulty"
            value={difficulty}
            onChange={(e) => setDifficulty(e.target.value as Difficulty | "")}
            className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 transition"
          >
            <option value="">— select —</option>
            {DIFFICULTY_OPTIONS.map((d) => (
              <option key={d} value={d}>
                {d.charAt(0).toUpperCase() + d.slice(1)}
              </option>
            ))}
          </select>
        </div>
        <StatusMsg msg={msg?.text ?? null} isError={msg?.error} />
        <button
          type="submit"
          disabled={saving}
          className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold transition disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save Preferences"}
        </button>
      </form>
    </SectionCard>
  );
}

// ─── Dashboard Page ───────────────────────────────────────────────────────────

export const DashboardPage: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/", { replace: true });
  };

  return (
    <div className="max-w-2xl mx-auto w-full space-y-6 py-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Dashboard</h1>
          <p className="text-sm text-slate-400 mt-0.5">
            Logged in as{" "}
            <span className="text-slate-200 font-medium">@{user?.username}</span>
          </p>
        </div>
        <button
          onClick={handleLogout}
          className="px-3 py-1.5 text-xs font-medium rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition"
        >
          Sign Out
        </button>
      </div>

      {/* Account info card */}
      <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800 flex gap-4 text-sm">
        <div>
          <span className="text-slate-500 text-xs">Username</span>
          <div className="text-slate-100 font-medium">@{user?.username}</div>
        </div>
        <div>
          <span className="text-slate-500 text-xs">Email</span>
          <div className="text-slate-100">{user?.email}</div>
        </div>
      </div>

      <ProfileSection />
      <SkillsSection />
      <PreferencesSection />
    </div>
  );
};

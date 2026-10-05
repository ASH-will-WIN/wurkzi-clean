import React, { useEffect, useRef, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { deleteMyAvatar, updateMyProfile, uploadMyAvatar } from "../api/profileApi";

const Profile = () => {
  const { user, profile, refreshProfile } = useAuth();
  const [form, setForm] = useState({ displayName: "", city: "", bio: "" });
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const inputRef = useRef(null);

  useEffect(() => {
    refreshProfile().catch((requestError) => setError(requestError.response?.data?.message || "Could not load your profile."));
  }, [refreshProfile]);

  useEffect(() => {
    setForm({
      displayName: profile?.displayName || user?.user_metadata?.name || "",
      city: profile?.city || "",
      bio: profile?.bio || "",
    });
  }, [profile, user]);

  const initials = (form.displayName || user?.email || "U").slice(0, 2).toUpperCase();
  const updateField = (event) => setForm((current) => ({ ...current, [event.target.name]: event.target.value }));

  const saveProfile = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    setMessage("");
    try {
      await updateMyProfile(form);
      await refreshProfile();
      setMessage("Profile saved.");
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Could not save your profile.");
    } finally {
      setSaving(false);
    }
  };

  const changeAvatar = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setUploading(true);
    setError("");
    setMessage("");
    try {
      await uploadMyAvatar(file);
      await refreshProfile();
      setMessage("Profile picture updated.");
    } catch (requestError) {
      setError(requestError.response?.data?.message || requestError.message || "Could not update your profile picture.");
    } finally {
      setUploading(false);
    }
  };

  const removeAvatar = async () => {
    setUploading(true);
    setError("");
    setMessage("");
    try {
      await deleteMyAvatar();
      await refreshProfile();
      setMessage("Profile picture removed.");
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Could not remove your profile picture.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <section className="min-h-screen bg-slate-950 px-4 py-12 text-white sm:px-6 lg:px-8">
      <div className="mx-auto max-w-2xl rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl sm:p-8">
        <h1 className="text-3xl font-bold">Your profile</h1>
        <p className="mt-2 text-slate-400">Manage your Wurkzi profile details.</p>

        <div className="mt-8 flex items-center gap-5 border-b border-slate-800 pb-8">
          {profile?.avatarUrl ? (
            <img src={profile.avatarUrl} alt="Your profile" className="h-20 w-20 rounded-full object-cover" />
          ) : (
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-wurkzi-600 text-xl font-bold">{initials}</div>
          )}
          <div>
            <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/gif,image/webp" className="hidden" onChange={changeAvatar} />
            <button type="button" onClick={() => inputRef.current?.click()} disabled={uploading} className="btn btn-primary">
              {uploading ? "Updating…" : "Change picture"}
            </button>
            {profile?.avatarUrl && (
              <button type="button" onClick={removeAvatar} disabled={uploading} className="ml-3 text-sm text-slate-400 hover:text-white">
                Remove
              </button>
            )}
            <p className="mt-2 text-xs text-slate-500">JPEG, PNG, GIF, or WebP. Up to 5 MB.</p>
          </div>
        </div>

        <form className="mt-8 space-y-5" onSubmit={saveProfile}>
          <label className="block text-sm font-medium">
            Display name
            <input name="displayName" value={form.displayName} onChange={updateField} maxLength={80} className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-white" />
          </label>
          <label className="block text-sm font-medium">
            City
            <input name="city" value={form.city} onChange={updateField} maxLength={80} placeholder="Detroit" className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-white" />
          </label>
          <label className="block text-sm font-medium">
            Bio
            <textarea name="bio" value={form.bio} onChange={updateField} maxLength={500} rows={5} className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-white" />
            <span className="mt-1 block text-right text-xs text-slate-500">{form.bio.length}/500</span>
          </label>

          {error && <p className="rounded-lg border border-red-800 bg-red-950 px-3 py-2 text-sm text-red-200" role="alert">{error}</p>}
          {message && <p className="rounded-lg border border-emerald-800 bg-emerald-950 px-3 py-2 text-sm text-emerald-200" role="status">{message}</p>}

          <button type="submit" disabled={saving} className="btn btn-primary w-full sm:w-auto">
            {saving ? "Saving…" : "Save profile"}
          </button>
        </form>
      </div>
    </section>
  );
};

export default Profile;

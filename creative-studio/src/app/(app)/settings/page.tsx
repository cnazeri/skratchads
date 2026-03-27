"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function SettingsPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [user, setUser] = useState<any>(null);
  const [fullName, setFullName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [companyWebsite, setCompanyWebsite] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [avatarPreview, setAvatarPreview] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");

  // Password fields
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordMessage, setPasswordMessage] = useState("");
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  useEffect(() => {
    const loadUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.replace("/login");
        return;
      }
      const u = session.user;
      setUser(u);
      setFullName(u.user_metadata?.full_name || "");
      setCompanyName(u.user_metadata?.company_name || "");
      setCompanyWebsite(u.user_metadata?.company_website || "");
      setAvatarUrl(u.user_metadata?.avatar_url || "");
      setAvatarPreview(u.user_metadata?.avatar_url || "");
      // Also load from localStorage defaults if metadata is empty
      try {
        const saved = window.localStorage?.getItem("skratch_company_defaults");
        if (saved) {
          const defaults = JSON.parse(saved);
          if (!u.user_metadata?.company_name && defaults.brandName) setCompanyName(defaults.brandName);
          if (!u.user_metadata?.company_website && defaults.websiteUrl) setCompanyWebsite(defaults.websiteUrl);
        }
      } catch { /* ignore */ }
    };
    loadUser();
  }, [router]);

  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [avatarMessage, setAvatarMessage] = useState("");

  const handleAvatarSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setAvatarFile(file);
    setAvatarMessage("");
    const reader = new FileReader();
    reader.onload = () => {
      setAvatarPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSaveAvatar = async () => {
    if (!avatarFile || !user) return;
    setIsUploadingAvatar(true);
    setAvatarMessage("");
    try {
      const ext = avatarFile.name.split(".").pop() || "png";
      const filePath = `${user.id}/avatar_${Date.now()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("assets")
        .upload(filePath, avatarFile, { upsert: true });

      if (uploadError) throw new Error(`Upload failed: ${uploadError.message}`);

      const { data: publicData } = supabase.storage
        .from("assets")
        .getPublicUrl(filePath);

      const newUrl = publicData.publicUrl;

      const { error } = await supabase.auth.updateUser({
        data: { avatar_url: newUrl },
      });
      if (error) throw error;

      setAvatarUrl(newUrl);
      setAvatarFile(null);
      setAvatarMessage("Photo saved.");
      setTimeout(() => setAvatarMessage(""), 3000);
    } catch (err: any) {
      setAvatarMessage(err.message || "Failed to save photo.");
    }
    setIsUploadingAvatar(false);
  };

  const handleSaveProfile = async () => {
    setIsSaving(true);
    setSaveMessage("");
    try {
      // If user selected a new avatar but hasn't saved it yet, upload it now too
      let finalAvatarUrl = avatarUrl;
      if (avatarFile && user) {
        const ext = avatarFile.name.split(".").pop() || "png";
        const filePath = `${user.id}/avatar_${Date.now()}.${ext}`;

        const { error: uploadError } = await supabase.storage
          .from("assets")
          .upload(filePath, avatarFile, { upsert: true });

        if (uploadError) throw new Error(`Avatar upload failed: ${uploadError.message}`);

        const { data: publicData } = supabase.storage
          .from("assets")
          .getPublicUrl(filePath);

        finalAvatarUrl = publicData.publicUrl;
        setAvatarUrl(finalAvatarUrl);
        setAvatarFile(null);
        setAvatarMessage("");
      }

      const { error } = await supabase.auth.updateUser({
        data: {
          full_name: fullName,
          company_name: companyName,
          company_website: companyWebsite,
          avatar_url: finalAvatarUrl,
        },
      });
      if (error) throw error;
      // Also sync to localStorage so new campaigns pick up the values
      try {
        window.localStorage?.setItem(
          "skratch_company_defaults",
          JSON.stringify({ brandName: companyName.trim(), websiteUrl: companyWebsite.trim() })
        );
      } catch { /* ignore */ }
      setSaveMessage("Profile updated successfully.");
    } catch (err: any) {
      setSaveMessage(err.message || "Failed to update profile.");
    }
    setIsSaving(false);
    setTimeout(() => setSaveMessage(""), 3000);
  };

  const handleChangePassword = async () => {
    setPasswordMessage("");
    if (!newPassword) {
      setPasswordMessage("Please enter a new password.");
      return;
    }
    if (newPassword.length < 6) {
      setPasswordMessage("Password must be at least 6 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordMessage("Passwords do not match.");
      return;
    }
    setIsChangingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      setPasswordMessage("Password changed successfully.");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      setPasswordMessage(err.message || "Failed to change password.");
    }
    setIsChangingPassword(false);
    setTimeout(() => setPasswordMessage(""), 4000);
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.replace("/login");
  };

  const initials = fullName
    ? fullName.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2)
    : user?.email?.[0]?.toUpperCase() || "?";

  return (
    <div className="max-w-2xl mx-auto px-6 py-10">
      <h1 className="text-2xl font-bold text-gray-900 mb-8">Account Settings</h1>

      {/* Profile Section */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
        <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-5">Profile</h2>

        {/* Avatar */}
        <div className="flex items-center gap-5 mb-6">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="relative group"
          >
            {avatarPreview ? (
              <img
                src={avatarPreview}
                alt="Avatar"
                className="w-20 h-20 rounded-full object-cover ring-2 ring-gray-200"
              />
            ) : (
              <div className="w-20 h-20 rounded-full bg-slate-500 text-white font-bold text-xl flex items-center justify-center ring-2 ring-gray-200">
                {initials}
              </div>
            )}
            <div className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleAvatarSelect}
          />
          <div>
            <p className="text-sm font-medium text-gray-900">Profile Photo</p>
            <p className="text-xs text-gray-400 mt-0.5">Click the avatar to upload a new image</p>
            {avatarFile && (
              <button
                onClick={handleSaveAvatar}
                disabled={isUploadingAvatar}
                className="mt-2 px-4 py-1.5 bg-blue-500 hover:bg-blue-600 text-white text-xs font-semibold rounded-lg transition-colors disabled:opacity-50"
              >
                {isUploadingAvatar ? "Saving..." : "Save Photo"}
              </button>
            )}
            {avatarMessage && (
              <p className={`text-xs mt-1 ${avatarMessage.includes("saved") ? "text-emerald-600" : "text-red-500"}`}>
                {avatarMessage}
              </p>
            )}
          </div>
        </div>

        {/* Full Name */}
        <div className="mb-4">
          <label className="text-xs font-semibold text-gray-600 block mb-1.5">Full Name</label>
          <input
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Your name"
          />
        </div>

        {/* Email (read-only) */}
        <div className="mb-4">
          <label className="text-xs font-semibold text-gray-600 block mb-1.5">Email</label>
          <input
            type="email"
            value={user?.email || ""}
            disabled
            className="w-full px-3 py-2 border border-gray-100 rounded-lg text-sm bg-gray-50 text-gray-400 cursor-not-allowed"
          />
        </div>

        {/* Company Name */}
        <div className="mb-4">
          <label className="text-xs font-semibold text-gray-600 block mb-1.5">Company / Brand Name</label>
          <input
            type="text"
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Your company or brand name"
          />
          <p className="text-xs text-gray-400 mt-1">This will be used as the default brand name for new campaigns.</p>
        </div>

        {/* Company Website */}
        <div className="mb-5">
          <label className="text-xs font-semibold text-gray-600 block mb-1.5">Company Website</label>
          <input
            type="url"
            value={companyWebsite}
            onChange={(e) => setCompanyWebsite(e.target.value)}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="https://www.example.com"
          />
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleSaveProfile}
            disabled={isSaving}
            className="px-5 py-2 bg-blue-500 hover:bg-blue-600 text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-50"
          >
            {isSaving ? "Saving..." : "Save Profile"}
          </button>
          {saveMessage && (
            <p className={`text-sm ${saveMessage.includes("success") ? "text-emerald-600" : "text-red-500"}`}>
              {saveMessage}
            </p>
          )}
        </div>
      </div>

      {/* Password Section */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
        <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-5">Change Password</h2>

        <div className="mb-4">
          <label className="text-xs font-semibold text-gray-600 block mb-1.5">New Password</label>
          <input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="At least 6 characters"
          />
        </div>

        <div className="mb-5">
          <label className="text-xs font-semibold text-gray-600 block mb-1.5">Confirm Password</label>
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Re-enter new password"
          />
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleChangePassword}
            disabled={isChangingPassword}
            className="px-5 py-2 bg-gray-800 hover:bg-gray-900 text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-50"
          >
            {isChangingPassword ? "Updating..." : "Update Password"}
          </button>
          {passwordMessage && (
            <p className={`text-sm ${passwordMessage.includes("success") ? "text-emerald-600" : "text-red-500"}`}>
              {passwordMessage}
            </p>
          )}
        </div>
      </div>

      {/* Sign Out Section */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-3">Session</h2>
        <p className="text-sm text-gray-500 mb-4">Sign out of your SkratchAds&trade; account on this device.</p>
        <button
          onClick={handleSignOut}
          className="px-5 py-2 bg-red-50 hover:bg-red-100 text-red-600 text-sm font-semibold rounded-lg transition-colors flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          Sign Out
        </button>
      </div>
    </div>
  );
}

import { useRef, useState } from "react";
import { resolveMediaUrl, uploadProfileAvatar } from "../api";
import {
  computeAgeFromBirthday,
  GENDER_IDENTITY_OPTIONS,
  maxBirthdayDate,
  minBirthdayDate,
  SEXUAL_ORIENTATION_OPTIONS,
} from "../lib/profileIdentity";
import { useI18n } from "../i18n";

type PersonalProfileSectionProps = {
  username: string;
  onUsernameChange: (value: string) => void;
  birthday: string;
  onBirthdayChange: (value: string) => void;
  avatarUrl: string;
  onAvatarUrlChange: (value: string) => void;
  genderIdentity: string;
  onGenderIdentityChange: (value: string) => void;
  genderCustom: string;
  onGenderCustomChange: (value: string) => void;
  sexualOrientation: string;
  onSexualOrientationChange: (value: string) => void;
  orientationCustom: string;
  onOrientationCustomChange: (value: string) => void;
  lgbtqVisible: boolean;
  onLgbtqVisibleChange: (value: boolean) => void;
  onProfilePatched: (avatarUrl: string) => void;
};

export default function PersonalProfileSection(props: PersonalProfileSectionProps) {
  const { t } = useI18n();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const age = computeAgeFromBirthday(props.birthday || null);
  const avatarSrc = resolveMediaUrl(props.avatarUrl);

  async function handleAvatarFile(file: File) {
    setUploading(true);
    setUploadError(null);
    try {
      const updated = await uploadProfileAvatar(file);
      props.onAvatarUrlChange(updated.avatar_url ?? "");
      props.onProfilePatched(updated.avatar_url ?? "");
    } catch (e) {
      setUploadError(e instanceof Error ? e.message : t("settings.avatarUploadFailed"));
    }
    setUploading(false);
  }

  return (
    <section className="space-y-4">
      <h3 className="font-headline-md text-[18px]">{t("settings.personalSection")}</h3>
      <div className="glass-card premium-shadow p-4 rounded-2xl space-y-4">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="relative w-20 h-20 rounded-full overflow-hidden border-2 border-primary/20 bg-primary-fixed flex items-center justify-center shrink-0 active:scale-95 transition-transform"
          >
            {avatarSrc ? (
              <img src={avatarSrc} alt="" className="w-full h-full object-cover" />
            ) : (
              <span className="material-symbols-outlined text-primary text-[32px]">person</span>
            )}
            <span className="absolute inset-0 bg-black/35 opacity-0 hover:opacity-100 flex items-center justify-center transition-opacity">
              <span className="material-symbols-outlined text-white text-[22px]">photo_camera</span>
            </span>
          </button>
          <div className="flex-1 min-w-0">
            <p className="font-label-sm text-on-surface-variant mb-1">{t("settings.avatar")}</p>
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="text-sm font-semibold text-primary"
            >
              {uploading ? t("settings.avatarUploading") : t("settings.changeAvatar")}
            </button>
            <p className="text-[11px] text-on-surface-variant mt-1">{t("settings.avatarHint")}</p>
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void handleAvatarFile(file);
              e.target.value = "";
            }}
          />
        </div>
        {uploadError && <p className="text-xs text-error">{uploadError}</p>}

        <div>
          <label className="font-label-sm text-on-surface-variant block mb-1">{t("settings.displayName")}</label>
          <input
            value={props.username}
            onChange={(e) => props.onUsernameChange(e.target.value)}
            className="w-full h-11 px-3 rounded-xl bg-surface-container-low border border-outline-variant/30 text-on-surface focus:ring-2 focus:ring-primary/20"
            placeholder={t("settings.displayNamePlaceholder")}
          />
        </div>

        <div>
          <div className="flex justify-between items-end mb-1">
            <label className="font-label-sm text-on-surface-variant">{t("settings.birthday")}</label>
            {age != null && (
              <span className="text-xs text-primary font-semibold">{t("settings.ageYears", { age })}</span>
            )}
          </div>
          <input
            type="date"
            value={props.birthday}
            min={minBirthdayDate()}
            max={maxBirthdayDate()}
            onChange={(e) => props.onBirthdayChange(e.target.value)}
            className="w-full h-11 px-3 rounded-xl bg-surface-container-low border border-outline-variant/30 text-on-surface focus:ring-2 focus:ring-primary/20"
          />
        </div>

        <div>
          <label className="font-label-sm text-on-surface-variant block mb-1">{t("settings.genderIdentity")}</label>
          <select
            value={props.genderIdentity}
            onChange={(e) => props.onGenderIdentityChange(e.target.value)}
            className="form-select w-full h-11 px-3 rounded-xl bg-surface-container-low border border-outline-variant/30 text-on-surface focus:ring-2 focus:ring-primary/20"
          >
            {GENDER_IDENTITY_OPTIONS.map((key) => (
              <option key={key} value={key}>
                {t(`settings.gender.${key}`)}
              </option>
            ))}
          </select>
          {props.genderIdentity === "self_describe" && (
            <input
              value={props.genderCustom}
              onChange={(e) => props.onGenderCustomChange(e.target.value)}
              placeholder={t("settings.genderCustomPlaceholder")}
              className="mt-2 w-full h-11 px-3 rounded-xl bg-surface-container-low border border-outline-variant/30 text-on-surface"
            />
          )}
        </div>

        <div>
          <label className="font-label-sm text-on-surface-variant block mb-1">{t("settings.sexualOrientation")}</label>
          <select
            value={props.sexualOrientation}
            onChange={(e) => props.onSexualOrientationChange(e.target.value)}
            className="form-select w-full h-11 px-3 rounded-xl bg-surface-container-low border border-outline-variant/30 text-on-surface focus:ring-2 focus:ring-primary/20"
          >
            {SEXUAL_ORIENTATION_OPTIONS.map((key) => (
              <option key={key} value={key}>
                {t(`settings.orientation.${key}`)}
              </option>
            ))}
          </select>
          {props.sexualOrientation === "self_describe" && (
            <input
              value={props.orientationCustom}
              onChange={(e) => props.onOrientationCustomChange(e.target.value)}
              placeholder={t("settings.orientationCustomPlaceholder")}
              className="mt-2 w-full h-11 px-3 rounded-xl bg-surface-container-low border border-outline-variant/30 text-on-surface"
            />
          )}
        </div>

        <label className="flex items-center justify-between gap-3 pt-1">
          <div>
            <p className="text-sm font-medium">{t("settings.lgbtqVisible")}</p>
            <p className="text-[11px] text-on-surface-variant mt-0.5">{t("settings.lgbtqVisibleHint")}</p>
          </div>
          <input
            type="checkbox"
            checked={props.lgbtqVisible}
            onChange={(e) => props.onLgbtqVisibleChange(e.target.checked)}
            className="w-5 h-5 accent-[#630ed4]"
          />
        </label>
      </div>
    </section>
  );
}

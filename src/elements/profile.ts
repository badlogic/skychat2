import { customElement, property } from "lit/decorators.js";
import { BaseElement, dom } from "../app.js";
import { html, nothing } from "lit";
import { defaultAvatar } from "../pages/default-icons.js";
import { ProfileView } from "@atproto/api/dist/client/types/app/bsky/actor/defs.js";

export function renderProfileAvatar(profile: ProfileView, smallAvatar = false) {
    return html`${profile.avatar
        ? html`<img loading="lazy" class="${smallAvatar ? "w-4 h-4" : "w-8 h-8 fancy-shadow"} rounded-full" src="${profile.avatar}" />`
        : defaultAvatar}`;
}

export function renderProfileNameAndHandle(profile: ProfileView, smallAvatar = false) {
    return html`<div class="flex flex-col">
        <span class="${smallAvatar ? "text-sm" : ""} font-semibold line-clamp-1 text-black dark:text-white hover:underline"
            >${profile.displayName ?? profile.handle}</span
        >
        ${profile.displayName && !smallAvatar ? html`<span class="text-xs text-muted-fg hover:underline">${profile.handle}</span>` : nothing}
    </div>`;
}

export function renderProfile(profile: ProfileView, smallAvatar = false) {
    return html`<a class="flex items-center gap-2 hover:no-underline" href="/profile/${profile.did}">
        ${renderProfileAvatar(profile, smallAvatar)} ${renderProfileNameAndHandle(profile, smallAvatar)}
    </a>`;
}

@customElement("profile-avatar-name")
export class ProfileAvatarNameElement extends BaseElement {
    @property()
    profile?: ProfileView;

    @property()
    small = false;

    render() {
        if (!this.profile) return html`${nothing}`;
        return html` <div class="flex flex-col">${renderProfile(this.profile, this.small)}</div> `;
    }
}

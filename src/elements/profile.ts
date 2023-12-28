import { customElement, property } from "lit/decorators.js";
import { BaseElement, dom } from "../app.js";
import { html, nothing } from "lit";
import { defaultAvatar } from "../pages/default-icons.js";
import { ProfileView } from "@atproto/api/dist/client/types/app/bsky/actor/defs.js";

export type ProfileAvatarNameSize = "normal" | "small" | "tiny";

@customElement("profile-avatar-name")
export class ProfileAvatarNameElement extends BaseElement {
    @property()
    profile?: ProfileView;

    @property()
    size: ProfileAvatarNameSize = "normal";

    render() {
        if (!this.profile) return html`${nothing}`;
        const profile = this.profile;

        switch (this.size) {
            case "normal":
                return html`
                    <a class="flex items-center gap-2 hover:no-underline" href="/profile/${profile.did}">
                        ${profile.avatar
                            ? html`<img loading="lazy" class="w-8 h-8 fancy-shadow rounded-full" src="${profile.avatar}" />`
                            : defaultAvatar}
                        <div class="flex flex-col">
                            <span class="font-semibold line-clamp-1 hover:underline">${profile.displayName ?? profile.handle}</span>
                            ${profile.displayName ? html`<span class="text-xs text-muted-fg hover:underline">${profile.handle}</span>` : nothing}
                        </div>
                    </a>
                `;
            case "small":
                return html`
                    <a class="flex items-center gap-2 hover:no-underline" href="/profile/${profile.did}">
                        ${profile.avatar
                            ? html`<img loading="lazy" class="w-4 h-4 fancy-shadow rounded-full" src="${profile.avatar}" />`
                            : defaultAvatar}
                        <span class="font-semibold line-clamp-1 hover:underline">${profile.displayName ?? profile.handle}</span>
                    </a>
                `;
            case "tiny":
                return html`
                    <a class="flex items-center gap-2 hover:no-underline" href="/profile/${profile.did}">
                        ${profile.avatar
                            ? html`<img loading="lazy" class="w-4 h-4 fancy-shadow rounded-full" src="${profile.avatar}" />`
                            : defaultAvatar}
                        <span class="text-xs text-muted-fg line-clamp-1 hover:underline">${profile.displayName ?? profile.handle}</span>
                    </a>
                `;
        }
    }
}

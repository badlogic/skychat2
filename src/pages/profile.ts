import { html, nothing } from "lit";
import { BaseElement, closeButton, copyTextToClipboard, renderError, renderInfo, renderRichText, renderTopbar, toast } from "../app.js";
import { customElement, property } from "lit/decorators.js";
import { pageContainerStyle, pageContentStyle } from "../utils/styles.js";
import { i18n } from "../utils/i18n.js";
import { ProfileViewDetailed } from "@atproto/api/dist/client/types/app/bsky/actor/defs.js";
import { BlueSky, getSkychatProfileUrl } from "../apis/bluesky.js";
import { router } from "../utils/routing.js";
import { store } from "../appstate.js";
import { defaultAvatar } from "./default-icons.js";
import { linkIcon, shieldIcon } from "../utils/icons.js";
import { StreamPage } from "../utils/streams.js";
import { GeneratorView } from "@atproto/api/dist/client/types/app/bsky/feed/defs.js";
import { ListView } from "@atproto/api/dist/client/types/app/bsky/graph/defs.js";
import { formatNumber, getYearMonthDayString } from "../utils/utils.js";
import { RichText } from "@atproto/api";

@customElement("profile-page")
export class ProfilePage extends BaseElement {
    @property()
    isLoading = true;

    @property()
    profile?: ProfileViewDetailed;

    @property()
    error?: string;

    hasGenerators = false;
    hasLists = false;
    creationDate?: Date;

    constructor() {
        super();
        this.load();
    }

    async load() {
        try {
            const did = router.getCurrentParams()?.get("id");
            if (!did) {
                this.error = i18n("Profile does not exist");
                return;
            }
            const result = await BlueSky.getProfiles([did]);
            if (result instanceof Error) {
                this.error = i18n("Profile does not exist");
                return;
            }
            this.profile = result[0];

            const promises = [
                BlueSky.getActorGenerators(this.profile.did, undefined, 1),
                BlueSky.getActorLists(this.profile.did, undefined, 1),
                BlueSky.getProfileCreationDate(this.profile.did),
            ];
            const results = await Promise.all(promises);
            this.hasGenerators = !(results[0] instanceof Error) && (results[0] as StreamPage<GeneratorView>).items.length > 0;
            this.hasLists = !(results[1] instanceof Error) && (results[1] as StreamPage<ListView>).items.length > 0;
            this.creationDate = results[2] instanceof Error ? undefined : (results[2] as Date);
            // FIXME notify
        } finally {
            this.isLoading = false;
        }
    }

    render() {
        if (this.isLoading)
            return html`<div class="${pageContainerStyle}">
                <div class="${pageContentStyle} mb-12"><loading-spinner class="mt-12"></loading-spinner></div>
            </div>`;

        if (this.error || !this.profile)
            return html`<div class="${pageContainerStyle}">
                ${renderTopbar(i18n("Profile"), closeButton())}
                <div class="${pageContentStyle} mb-12">${renderError(this.error ?? i18n("Profile does not exist"))}</div>
            </div>`;

        const profile = this.profile;
        const user = store.get("user");
        const rt = new RichText({ text: this.profile.description ?? "" });
        rt.detectFacetsWithoutResolution();
        const openGallery = (ev: Event, imageUrl: string) => {
            // FIXME
        };

        return html`<div class="${pageContainerStyle}">
            <div class="${pageContentStyle} relative mb-12">
                ${this.profile.banner
                    ? html`<img
                          @click=${(ev: MouseEvent) => openGallery(ev, this.profile!.banner!)}
                          src="${profile.banner}"
                          class="${this.profile.viewer?.blockedBy || this.profile.viewer?.blocking || this.profile.viewer?.blockingByList
                              ? "blur"
                              : ""} w-full h-[150px] object-cover"
                      />`
                    : html`<div class="bg-blue-500 h-[150px]"></div>`}
                <div class="absolute top-1 left-1 rounded-full bg-[#374151]/70 self-start">${closeButton()}</div>
                <div class="flex px-4 -mt-12 items-end">
                    ${profile.avatar
                        ? html`<img
                              @click=${(ev: MouseEvent) => openGallery(ev, this.profile!.avatar!)}
                              class="${this.profile.viewer?.blockedBy || this.profile.viewer?.blocking || this.profile.viewer?.blockingByList
                                  ? "blur"
                                  : ""} w-24 h-24 rounded-full fancy-shadow"
                              src="${profile.avatar}"
                          />`
                        : html`<i class="icon w-24 h-24">${defaultAvatar}</i>`}
                    <div class="ml-auto flex items-center gap-2">
                        ${profile.did != user?.profile.did
                            ? html`<profile-action-button
                                  .profile=${this.profile}
                                  @change=${(ev: CustomEvent) => this.profileChanged(ev.detail)}
                              ></profile-action-button>`
                            : nothing}
                    </div>
                </div>
                <div class="text-2xl px-4 flex items-center">
                    ${this.profile.displayName ?? this.profile.handle}
                    <button
                        class="flex items-center justify-center w-10 h-4"
                        @click=${() => {
                            copyTextToClipboard(getSkychatProfileUrl(this.profile!));
                            toast(i18n("Copied link to clipboard"));
                        }}
                    >
                        <i class="icon !w-5 !h-5 fill-muted-fg">${linkIcon}</i>
                    </button>
                </div>
                <div class="flex items-center gap-2 mt-2 px-4">
                    ${profile.viewer?.followedBy
                        ? html`<span class="p-1 text-xs rounded bg-muted text-muted-fg">${i18n("Follows you")}</span>`
                        : nothing}
                    <span class="text-muted-fg text-sm">${profile.handle}</span>
                </div>
                ${this.creationDate
                    ? html`<span class="text-muted-fg text-xs px-4 mt-2">${i18n("Joined") + " " + getYearMonthDayString(this.creationDate)}</span>`
                    : nothing}
                ${store.get("devPrefs")?.enabled
                    ? html`<div class="flex items-center gap-2 px-4">
                          <button
                              class="text-primary font-bold"
                              @click=${() => {
                                  copyTextToClipboard(this.profile!.did);
                                  toast("Copied did to clipboard");
                              }}
                          >
                              did</button
                          ><button
                              class="text-primary font-bold"
                              @click=${() => {
                                  copyTextToClipboard(JSON.stringify(this.profile, null, 2));
                                  toast("Copied JSON to clipboard");
                                  console.log(this.profile);
                              }}
                          >
                              JSON
                          </button>
                      </div>`
                    : nothing}
                <div class="mt-2 text-sm flex flex-col gap-2 px-4">
                    ${!(this.profile.viewer?.blockedBy || this.profile.viewer?.blocking || this.profile.viewer?.blockingByList)
                        ? html`
                            <div class="flex gap-2">
                            <a class="text-black dark:text-white" href="/followers/${this.profile.did}"
                                ><span class="font-semibold">${formatNumber(profile.followersCount)}</span> ${i18n("followers")}</a
                            >
                            <a class="text-black dark:text-white" href="/following/${this.profile.did}"><span class="font-semibold">${formatNumber(
                              profile.followsCount
                          )}</span> ${i18n("following")}</a>
                            <span><span class="font-semibold">${formatNumber(profile.postsCount)}</span> ${i18n("posts")}</span>
                            </div>
                        </div>
                        <div class="mt-1">${renderRichText({
                            text: rt.text,
                            facets: rt.facets,
                            createdAt: "",
                        })}</div>`
                        : nothing}
                    ${this.profile.viewer?.muted ? renderInfo(i18n("You are muting the user."), html`${shieldIcon}`) : nothing}
                    ${this.profile.viewer?.mutedByList
                        ? renderInfo(i18n("User muted by moderation list ")(this.profile.viewer.mutedByList.name), html`${shieldIcon}`)
                        : nothing}
                    ${this.profile.viewer?.blockedBy ? renderInfo(i18n("You are blocked by the user."), html`${shieldIcon}`) : nothing}
                    ${this.profile.viewer?.blocking ? renderInfo(i18n("You are blocking the user."), html`${shieldIcon}`) : nothing}
                    ${this.profile.viewer?.blockingByList
                        ? renderInfo(i18n("User blocked by moderation list ")(this.profile.viewer.blockingByList.name), html`${shieldIcon}`)
                        : nothing}
                </div>
            </div>
        </div>`;
    }

    profileChanged(profile: ProfileViewDetailed) {
        // FIXME
    }
}

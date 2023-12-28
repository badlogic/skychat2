import { html, nothing } from "lit";
import { BaseElement, closeButton, copyTextToClipboard, dom, renderError, renderInfo, renderRichText, renderTopbar, toast } from "../app.js";
import { customElement, property, state } from "lit/decorators.js";
import { pageContainerStyle, pageContentStyle } from "../utils/styles.js";
import { i18n } from "../utils/i18n.js";
import { ProfileViewDetailed } from "@atproto/api/dist/client/types/app/bsky/actor/defs.js";
import { ActorFeedType, BlueSky, FeedViewPostStream, PostViewStream, getSkychatProfileUrl } from "../apis/bluesky.js";
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

    @state()
    filter: ActorFeedType | "likes" | "generators" | "lists" = "posts_no_replies";

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

        let feed: HTMLElement;
        if (this.profile.viewer?.blockedBy || this.profile.viewer?.blocking || this.profile.viewer?.blockingByList) {
            feed = dom(html`<div class="p-4 text-center">${i18n("Nothing to show")}</div>`)[0];
        } else {
            switch (this.filter) {
                case "posts_with_replies":
                case "posts_no_replies":
                case "posts_with_media":
                    feed = dom(
                        html`<feed-view-post-stream
                            .stream=${new FeedViewPostStream((cursor?: string) => BlueSky.getActorFeed(this.filter as ActorFeedType, profile.did))}
                        ></feed-view-post-stream>`
                    )[0];
                    break;
                case "likes":
                    if (this.profile.did == user?.profile.did) {
                        feed = dom(
                            html`<feed-view-post-stream
                                .stream=${new FeedViewPostStream((cursor?: string) => BlueSky.getLoggedInActorLikes(cursor))}
                            ></feed-view-post-stream>`
                        )[0];
                    } else {
                        feed = dom(
                            html`<post-view-stream
                                .stream=${new PostViewStream((cursor?: string) => BlueSky.getActorLikes(this.profile!.did, cursor))}
                            ></post-view-stream>`
                        )[0];
                    }
                    break;
                // FIXME
                /*case "generators":
                    const generatorAction = (action: GeneratorViewElementAction, generator: GeneratorView) => {
                        if (action == "clicked") {
                            document.body.append(dom(html`<feed-overlay .feedUri=${generator.uri}></feed-overlay>`)[0]);
                        }
                    };
                    feed = dom(
                        html`<generators-stream-view
                            .minimal=${false}
                            .stream=${new ActorGeneratorsStream(this.profile.did)}
                            .action=${(action: GeneratorViewElementAction, generator: GeneratorView) => generatorAction(action, generator)}
                        ></generators-stream-view>`
                    )[0];
                    break;
                case "lists":
                    const listAction = (action: ListViewElementAction, list: ListView) => {
                        if (action == "clicked") {
                            document.body.append(dom(html`<list-overlay .listUri=${list.uri}></list-overlay>`)[0]);
                        }
                    };
                    feed = dom(
                        html`<lists-stream-view
                            .minimal=${false}
                            .stream=${new ActorListsStream(this.profile.did)}
                            .action=${(action: ListViewElementAction, list: ListView) => listAction(action, list)}
                        ></lists-stream-view>`
                    )[0];
                    break;*/
                default:
                    feed = dom(html`<div class="p-4 text-center">${i18n("Nothing to show")}</div>`)[0];
            }
        }

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
                <div class="absolute top-1 left-1 rounded-full bg-[#374151]/70 text-white self-start">${closeButton()}</div>
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
                    ${this.profile.viewer?.muted ? renderInfo(i18n("You are muting the user"), html`${shieldIcon}`) : nothing}
                    ${this.profile.viewer?.mutedByList
                        ? renderInfo(i18n("User muted by moderation list ")(this.profile.viewer.mutedByList.name), html`${shieldIcon}`)
                        : nothing}
                    ${this.profile.viewer?.blockedBy ? renderInfo(i18n("You are blocked by the user"), html`${shieldIcon}`) : nothing}
                    ${this.profile.viewer?.blocking ? renderInfo(i18n("You are blocking the user"), html`${shieldIcon}`) : nothing}
                    ${this.profile.viewer?.blockingByList
                        ? renderInfo(i18n("User blocked by moderation list ")(this.profile.viewer.blockingByList.name), html`${shieldIcon}`)
                        : nothing}
                </div>
                <div class="overflow-x-auto flex flex-nowrap border-b border-divider">
                    <button
                        class="whitespace-nowrap ${this.filter == "posts_no_replies"
                            ? "border-b-2 border-primary font-semibold"
                            : "text-muted-fg"} px-2 h-10"
                        @click=${() => (this.filter = "posts_no_replies")}
                    >
                        ${i18n("Posts")}
                    </button>
                    <button
                        class="whitespace-nowrap ${this.filter == "posts_with_replies"
                            ? "border-b-2 border-primary font-semibold"
                            : "text-muted-fg"} px-2 h-10"
                        @click=${() => (this.filter = "posts_with_replies")}
                    >
                        ${i18n("Posts & Replies")}
                    </button>
                    <button
                        class="whitespace-nowrap ${this.filter == "posts_with_media"
                            ? "border-b-2 border-primary font-semibold"
                            : "text-muted-fg"} px-2 h-10"
                        @click=${() => (this.filter = "posts_with_media")}
                    >
                        ${i18n("Media")}
                    </button>
                    <button
                        class="whitespace-nowrap ${this.filter == "likes" ? "border-b-2 border-primary font-semibold" : "text-muted-fg"} px-2 h-10"
                        @click=${() => (this.filter = "likes")}
                    >
                        ${i18n("Likes")}
                    </button>
                    ${this.hasGenerators
                        ? html`<button
                              class="whitespace-nowrap ${this.filter == "generators"
                                  ? "border-b-2 border-primary font-semibold"
                                  : "text-muted-fg"} px-2 h-10"
                              @click=${() => (this.filter = "generators")}
                          >
                              ${i18n("Feeds")}
                          </button>`
                        : nothing}
                    ${this.hasLists
                        ? html` <button
                              class="whitespace-nowrap ${this.filter == "lists"
                                  ? "border-b-2 border-primary font-semibold"
                                  : "text-muted-fg"} px-2 h-10"
                              @click=${() => (this.filter = "lists")}
                          >
                              ${i18n("Lists")}
                          </button>`
                        : nothing}
                </div>
                <div class="min-h-screen">${feed}</div>
            </div>
        </div>`;
    }

    profileChanged(profile: ProfileViewDetailed) {
        // FIXME
    }
}

import { customElement, property, state } from "lit/decorators.js";
import {
    BaseElement,
    closeButton,
    copyTextToClipboard,
    dom,
    hasLinkOrButtonParent,
    renderError,
    renderInfo,
    renderTopbar,
    toast,
    waitForScrollHeightUnchanged,
} from "../app.js";
import { TemplateResult, html, nothing } from "lit";
import { pageContainerStyle, pageContentStyle } from "../utils/styles.js";
import { i18n } from "../utils/i18n.js";
import { router } from "../utils/routing.js";
import { BlockedPost, NotFoundPost, ThreadViewPost } from "@atproto/api/dist/client/types/app/bsky/feed/defs.js";
import { BlueSky, date } from "../apis/bluesky.js";
import { AppBskyFeedDefs, AppBskyFeedGetPostThread } from "@atproto/api";
import { combineAtUri, splitAtUri } from "../common.js";
import { articleIcon, shieldIcon } from "../utils/icons.js";
import { state as appstate, store } from "../appstate.js";
import { map } from "lit/directives/map.js";
import { Block } from "typescript";

@customElement("thread-page")
export class ThreadPage extends BaseElement {
    @property()
    isLoading = true;

    @state()
    error?: string | TemplateResult;

    @state()
    thread?: ThreadViewPost | NotFoundPost | BlockedPost | { [k: string]: unknown; $type: string };

    @property()
    readerMode = false;

    canReaderMode = false;
    did?: string;
    rkey?: string;
    postUri?: string;

    constructor() {
        super();
        this.did = router.getCurrentParams()?.get("did");
        this.rkey = router.getCurrentParams()?.get("rkey");

        this.load();
    }

    async load() {
        try {
            if (!BlueSky.client) {
                this.error = i18n("Not connected");
                return;
            }

            if (!this.did || !this.rkey) {
                this.error = i18n("Post does not exist");
                return;
            }

            if (!this.did.startsWith("did:")) {
                const did = await BlueSky.getDidForHandle(this.did);
                if (did instanceof Error) {
                    this.error = i18n("Post does not exist");
                    return;
                }
                this.did = did;
            }
            this.postUri = combineAtUri(this.did, this.rkey, "app.bsky.feed.post");
            const postResponse = await BlueSky.client.getPost({ repo: this.did, rkey: this.rkey });

            // First, try to get the thread from the root downwards. This will work 99% of the time.
            let threadResponse: AppBskyFeedGetPostThread.Response | undefined;
            let rootUri = postResponse.value?.reply ? postResponse.value.reply.root.uri : this.postUri;
            try {
                threadResponse = await BlueSky.client.getPostThread({
                    depth: 1000,
                    parentHeight: 1000,
                    uri: rootUri,
                });

                // OK, we got the root, but is our post part of the tree? If not
                // we need to walk up its parents.
                if (threadResponse.success) {
                    let found = false;
                    const findPost = (thread: ThreadViewPost | NotFoundPost | BlockedPost) => {
                        if (!AppBskyFeedDefs.isThreadViewPost(thread)) {
                            found = thread.uri == this.postUri;
                            return;
                        }

                        if (thread.post.uri == this.postUri) {
                            found = true;
                            return;
                        }
                        if (thread.replies) {
                            for (const reply of thread.replies) {
                                if (
                                    AppBskyFeedDefs.isThreadViewPost(reply) ||
                                    AppBskyFeedDefs.isNotFoundPost(reply) ||
                                    AppBskyFeedDefs.isBlockedPost(reply)
                                ) {
                                    findPost(reply);
                                }
                            }
                        }
                    };
                    if (
                        AppBskyFeedDefs.isThreadViewPost(threadResponse.data.thread) ||
                        AppBskyFeedDefs.isNotFoundPost(threadResponse.data.thread) ||
                        AppBskyFeedDefs.isBlockedPost(threadResponse.data.thread)
                    ) {
                        findPost(threadResponse.data.thread);
                    }
                    // Well, we didn't find the highlighted post in the thread, so
                    // we'll traverse up its parents instead. Likely, it's parented
                    // to a deleted post in the thread.
                    if (!found) {
                        threadResponse = undefined;
                    }
                }
            } catch (e) {
                // Happens if the post could not be found.
            }

            // Whoops, root couldn't be fetched.
            if (!threadResponse || !threadResponse.success) {
                // The post itself was the root, nothing we can do, bail
                if (!postResponse.value.reply) {
                    this.error = i18n("Post does not exist");
                    return;
                }

                // Try to walk up the tree, to find the oldest viable parent.
                let parentUri = postResponse.value.reply.parent.uri;
                let finalParentUri = this.postUri;
                while (true) {
                    const atUri = splitAtUri(parentUri);
                    try {
                        const parentResponse = await BlueSky.client.getPost({ repo: atUri.repo, rkey: atUri.rkey });
                        finalParentUri = parentUri;
                        if (!parentResponse.value.reply) {
                            break;
                        } else {
                            parentUri = parentResponse.value.reply.parent.uri;
                        }
                    } catch (e) {
                        // Happens if the post doesn't exist, so we know the last parentUri is the good one
                        break;
                    }
                }

                // OK, we re-anchored to some parent, let's try to fetch the thread
                threadResponse = await BlueSky.client.getPostThread({
                    depth: 1000,
                    parentHeight: 1000,
                    uri: finalParentUri,
                });
            }

            const postUris: string[] = [];
            const collectPostUris = (post: ThreadViewPost) => {
                postUris.push(post.post.uri);
                if (post.replies) {
                    for (const reply of post.replies) {
                        if (AppBskyFeedDefs.isThreadViewPost(reply)) collectPostUris(reply);
                    }
                }
            };
            if (AppBskyFeedDefs.isThreadViewPost(threadResponse.data.thread)) {
                collectPostUris(threadResponse.data.thread);
            }
            const response = await BlueSky.getNumQuotes(postUris);
            if (!(response instanceof Error)) {
                for (const numQuotes of response) appstate.update("numQuotes", numQuotes, numQuotes.postUri);
            }
            this.thread = threadResponse.data.thread;
            if (this.applyFilters(this.thread, true).length > 1) this.canReaderMode = true;
        } catch (e) {
            this.error = i18n("Post does not exist");
        } finally {
            this.isLoading = false;
        }
    }

    applyFilters(
        thread: ThreadViewPost | NotFoundPost | BlockedPost | { [k: string]: unknown; $type: string },
        readerMode = false
    ): (ThreadViewPost | NotFoundPost | BlockedPost | { [k: string]: unknown; $type: string })[] {
        if (!AppBskyFeedDefs.isThreadViewPost(thread)) return [thread];
        const copyThread = (thread: ThreadViewPost): ThreadViewPost => {
            const replies: ThreadViewPost["replies"] = thread.replies ? [] : undefined;
            if (thread.replies) {
                for (const reply of thread.replies) {
                    if (AppBskyFeedDefs.isThreadViewPost(reply)) {
                        replies?.push(copyThread(reply));
                    } else {
                        replies?.push(reply);
                    }
                }
            }
            return { ...thread, replies };
        };
        thread = copyThread(thread);
        const sortReplies = (thread: ThreadViewPost) => {
            const parentAuthor = thread.post.author;
            const dateSort = (a: ThreadViewPost, b: ThreadViewPost) => {
                const aRecord = date(a);
                const bRecord = date(b);
                if (aRecord && bRecord) return aRecord.getTime() - bRecord.getTime();
                return 0;
            };
            let hasHighlightedPost = thread.post.uri == this.postUri;
            if (thread.replies) {
                const posts = thread.replies.filter((reply) => AppBskyFeedDefs.isThreadViewPost(reply)) as ThreadViewPost[];
                const authorPosts = posts.filter((reply) => reply.post.author.did == parentAuthor.did);
                authorPosts.sort(dateSort);
                const otherPosts = posts.filter((reply) => reply.post.author.did != parentAuthor.did);
                otherPosts.sort(dateSort);
                const other = thread.replies.filter((reply) => !AppBskyFeedDefs.isThreadViewPost(reply));
                thread.replies = [...authorPosts, ...otherPosts, ...other];
                let highlightedPost: ThreadViewPost | NotFoundPost | BlockedPost | undefined;
                for (const reply of thread.replies) {
                    if (AppBskyFeedDefs.isThreadViewPost(reply)) {
                        if (sortReplies(reply)) {
                            highlightedPost = reply;
                        }
                    } else {
                        if ((AppBskyFeedDefs.isBlockedPost(reply) || AppBskyFeedDefs.isNotFoundPost(reply)) && reply.uri == this.postUri) {
                            highlightedPost = reply;
                        }
                    }
                }
                if (highlightedPost) {
                    thread.replies = thread.replies.filter((reply) => reply != highlightedPost);
                    thread.replies = [highlightedPost, ...thread.replies];
                } else {
                    thread.replies = [...thread.replies];
                }
                hasHighlightedPost ||= highlightedPost != undefined;
            }
            return hasHighlightedPost;
        };
        sortReplies(thread);
        if (this.readerMode || readerMode) {
            const parentAuthor = thread.post.author;
            const threadPosts: ThreadViewPost[] = [];
            const collectThreadPosts = (replies: ThreadViewPost["replies"]) => {
                if (replies && replies.length > 0 && AppBskyFeedDefs.isThreadViewPost(replies[0]) && replies[0].post.author.did == parentAuthor.did) {
                    const opReply = replies[0];
                    threadPosts.push(opReply);
                    replies.splice(0, 1)[0];
                    collectThreadPosts(opReply.replies);
                }
            };
            collectThreadPosts(thread.replies);
            return [thread, ...threadPosts];
        }
        return [thread];
    }

    render() {
        if (this.isLoading) {
            return html`<div class="${pageContainerStyle}">
                <div class="${pageContentStyle}">${renderTopbar(i18n("Thread"), closeButton())}<loading-spinner></loading-spinner></div>
            </div>`;
        }

        if (this.error) {
            return html`<div class="${pageContainerStyle}">
                <div class="${pageContentStyle}">
                    ${renderTopbar(i18n("Thread"), closeButton())}${typeof this.error == "string" ? renderError(this.error) : this.error}
                </div>
            </div>`;
        }

        const buttons = html`<div class="ml-auto flex">
            <div class="flex">
                ${this.canReaderMode
                    ? html`<icon-toggle
                          @change=${(ev: CustomEvent) => (this.readerMode = ev.detail.value)}
                          .icon=${html`<i class="icon w-5 h-5">${articleIcon}</i>`}
                          class="w-10 h-10"
                      ></icon-toggle>`
                    : nothing}
            </div>
            ${store.get("devPrefs")?.enabled
                ? html`
                      <button
                          class="text-primary font-bold"
                          @click=${() => {
                              copyTextToClipboard(JSON.stringify(this.thread, null, 2));
                              toast("Copied JSON to clipboard");
                              console.log(this.thread);
                          }}
                      >
                          JSON
                      </button>
                  `
                : nothing}
        </div>`;

        const thread = this.thread ? this.applyFilters(this.thread) : undefined;
        const result = dom(html`<div class="px-4">
            ${this.isLoading ? html`<loading-spinner></loading-spinner>` : nothing} ${this.error ? renderInfo(this.error) : nothing}
            ${thread
                ? map(
                      thread,
                      (threadViewPost, index) =>
                          html`<div class="${index > 0 ? "mt-4" : ""}">
                              <thread-view-post
                                  .showReplies=${!this.readerMode}
                                  .highlightUri=${this.readerMode ? "" : this.postUri}
                                  .isRoot=${true}
                                  .thread=${threadViewPost}
                              ></thread-view-post>
                          </div>`
                  )
                : nothing}
        </div>`)[0];
        if (thread) {
            const scrollToUri = this.readerMode ? (AppBskyFeedDefs.isThreadViewPost(thread[0]) ? thread[0].post.uri : "") : this.postUri;
            const root = this.renderRoot.children[0] as HTMLElement;
            waitForScrollHeightUnchanged(root, () => {
                const postViewDom = this.querySelector(`[data-uri="${scrollToUri}"]`);
                postViewDom?.querySelector("post-view")?.scrollIntoView({ behavior: "smooth", block: "center" });
            });
        }

        return html`<div class="${pageContainerStyle}">
            <div class="${pageContentStyle}">${renderTopbar(i18n("Thread"), closeButton(), buttons)}${result}</div>
        </div>`;
    }
}

@customElement("thread-view-post")
export class ThreadViewPostElement extends BaseElement {
    @property()
    highlightUri = "";

    @property()
    isRoot = false;

    @property()
    thread?: ThreadViewPost["replies"];

    @property()
    showReplies = true;

    hasWiggled = false;

    render() {
        if (!this.thread || !AppBskyFeedDefs.isThreadViewPost(this.thread)) return html`${nothing}`;

        const thread = this.thread;
        if (AppBskyFeedDefs.isNotFoundPost(this.thread)) {
            return renderInfo(i18n("Post does not exist"));
        }

        if (AppBskyFeedDefs.isBlockedPost(thread)) {
            if (thread.author.viewer?.blockedBy) {
                return renderInfo(i18n("Post author has blocked you"), html`${shieldIcon}`);
            }
            if (thread.author.viewer?.blocking || thread.author.viewer?.blockingByList) {
                const author = thread.author;
                const showProfile = (ev: MouseEvent) => {
                    ev.preventDefault();
                    ev.stopPropagation();
                    document.body.append(dom(html`<profile-overlay .did=${author.did}></profile-overlay>`)[0]);
                };
                return html`<div class="flex items-center gap-2 cursor-pointer" @click=${(ev: MouseEvent) => showProfile(ev)}>
                    <i class="icon !w-5 !h-5 fill-muted-fg">${shieldIcon}</i><span>${i18n("You have blocked the post author")}</span
                    ><span class="text-xs">(${i18n("Click to view")})</span>
                </div>`;
            }

            return renderInfo(i18n("You have blocked the author or the author has blocked you"), html`${shieldIcon}`);
        }

        const animation = this.hasWiggled ? "" : "animate-shake animate-delay-500";
        const toggleReplies = (ev: MouseEvent) => {
            if (window.getSelection() && window.getSelection()?.toString().length != 0) return;
            if (hasLinkOrButtonParent(ev.target as HTMLElement)) return;
            if (!thread.replies || thread.replies.length == 0) return;
            ev.stopPropagation();
            repliesDom.classList.toggle("hidden");
            showMoredom.classList.toggle("hidden");
        };

        const highlight = thread.post.uri == this.highlightUri;

        const postDom = dom(html`<div data-uri="${thread.post.uri}" class="min-w-[350px] pr-2 flex flex-col">
            <post-view
                class="${!this.isRoot || (highlight && this.isRoot) ? "pl-2" : ""} ${highlight ? animation + " border-l border-primary" : ""}"
                .post=${this.thread.post}
                .smallHeader=${true}
                .openThreadOnclick=${false}
                @click=${(ev: MouseEvent) => toggleReplies(ev)}
            ></post-view>
            <div
                id="showMore"
                @click=${(ev: MouseEvent) => toggleReplies(ev)}
                class="hidden cursor-pointer self-start text-xs rounded bg-muted text-muted-fg self-start p-1"
            >
                ${i18n("Show replies")}
            </div>
            <div id="replies" class="${this.isRoot ? "-ml-2" : ""}">
                ${map(
                    this.thread.replies,
                    (reply) =>
                        html`<div class="border-l border-divider border-dotted mt-2 ml-4">
                            <thread-view-post .highlightUri=${this.highlightUri} .isRoot=${false} .thread=${reply}></thread-view-post>
                        </div>`
                )}
            </div>
        </div>`)[0];
        const repliesDom = postDom.querySelector("#replies") as HTMLElement;
        const showMoredom = postDom.querySelector("#showMore") as HTMLElement;
        if (!this.showReplies) toggleReplies(new MouseEvent("none"));
        return postDom;
    }
}

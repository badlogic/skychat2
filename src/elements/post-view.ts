import { PostView } from "@atproto/api/dist/client/types/app/bsky/feed/defs.js";
import { TemplateResult, html, nothing } from "lit";
import { customElement, property } from "lit/decorators.js";
import { BlueSky, record } from "../apis/bluesky.js";
import { BaseElement, SubscribedElement, ThreadPage, copyTextToClipboard, hasLinkOrButtonParent, renderInfo, toast } from "../app.js";
import { state, store } from "../appstate.js";
import { splitAtUri } from "../common.js";
import { i18n } from "../utils/i18n.js";
import { heartFilledIcon, heartIcon, quoteIcon, reblogIcon, replyIcon } from "../utils/icons.js";
import { StreamView } from "../utils/streamviews.js";
import { clone, error } from "../utils/utils.js";
import { router } from "../utils/routing.js";

@customElement("post-view-buttons")
export class PostViewButtons extends BaseElement {
    @property()
    post?: PostView;

    render() {
        if (!this.post) return html`${nothing}`;

        const numQuotes = state.get("numQuotes", this.post.uri);
        const buttonStyle = "flex items-center gap-1 text-muted-fg h-10 hover:no-underline";
        const highlightStyle = "animate-jump text-primary";
        const iconStyle = "icon w-4 h-4";

        return html`<div class="flex items-center h-10 gap-4" @click=${(ev: Event) => ev.stopPropagation()}>
            <button @click=${() => this.reply()} class="${buttonStyle}"><i class="${iconStyle}">${replyIcon}</i><span>${
            this.post.replyCount ?? 0
        }</button>
            <button @click=${() => this.quote()} class="${buttonStyle}"><i class="${iconStyle}">${quoteIcon}</i><span>${
            numQuotes?.numQuotes.toString() ?? 0
        }</button>
            <button @click=${() => this.repost()} class="${
            buttonStyle + " " + (this.post.viewer?.repost ? highlightStyle : "")
        }"><i class="${iconStyle}">${reblogIcon}</i><span>${this.post.repostCount ?? 0}</button>
            <button @click=${() => this.like()} class="${
            buttonStyle + " " + (this.post.viewer?.like ? highlightStyle : "")
        }"><i class="${iconStyle}">${this.post.viewer?.like ? heartFilledIcon : heartIcon}</i><span>${this.post.likeCount ?? 0}</button>
        ${
            store.get("devPrefs")?.enabled
                ? html`<button
                      class="text-primary"
                      @click=${() => {
                          copyTextToClipboard(this.post?.uri ?? "");
                          toast("Copied URI to clipboard");
                      }}
                  >
                      URI
                  </button>`
                : nothing
        }
        ${
            store.get("devPrefs")?.enabled
                ? html`<button
                      class="text-primary"
                      @click=${() => {
                          copyTextToClipboard(JSON.stringify(this.post, null, 2));
                          toast("Copied JSON to clipboard");
                      }}
                  >
                      JSON
                  </button>`
                : nothing
        }
        </div>`;
    }

    reply() {
        if (!BlueSky.client) return;
        if (!this.post) return;
    }

    quote() {
        if (!BlueSky.client) return;
        if (!this.post) return;
    }

    reposting = false;
    async repost() {
        if (!BlueSky.client) return;
        if (!this.post) return;
        if (this.reposting) return;
        this.reposting = true;
        this.post.viewer = this.post.viewer ?? {};
        const oldPost = clone(this.post);

        try {
            if (oldPost.viewer?.repost) {
                delete this.post.viewer.repost;
                this.post.repostCount = Math.max(0, (this.post.repostCount ?? 0) - 1);
                this.requestUpdate();
                await BlueSky.client.deleteRepost(oldPost.viewer.repost);
            } else {
                this.post.viewer.repost = "__tmp";
                this.post.repostCount = (this.post.repostCount ?? 0) + 1;
                this.requestUpdate();
                this.post.viewer.repost = (await BlueSky.client.repost(this.post.uri, this.post.cid)).uri;
            }
            state.update("post", this.post, this.post.uri);
        } catch (e) {
            error("Could not toggle repost on post", e);
            this.post = oldPost;
        } finally {
            this.reposting = false;
        }
    }

    liking = false;
    async like() {
        if (!BlueSky.client) return;
        if (!this.post) return;
        if (this.liking) return;
        this.liking = true;
        this.post.viewer = this.post.viewer ?? {};
        const oldPost = clone(this.post);

        try {
            if (oldPost.viewer?.like) {
                delete this.post.viewer.like;
                this.post.likeCount = Math.max(0, (this.post.likeCount ?? 0) - 1);
                this.requestUpdate();
                await BlueSky.client.deleteLike(oldPost.viewer.like);
            } else {
                this.post.viewer.like = "__tmp";
                this.post.likeCount = (this.post.likeCount ?? 0) + 1;
                this.requestUpdate();
                this.post.viewer.like = (await BlueSky.client.like(this.post.uri, this.post.cid)).uri;
            }
            state.update("post", this.post, this.post.uri);
        } catch (e) {
            error("Could not toggle like on post", e);
            this.post = oldPost;
        } finally {
            this.liking = false;
        }
    }
}

@customElement("post-view")
export class PostViewElement extends SubscribedElement {
    @property()
    post?: PostView;

    @property()
    showReplyingTo = true;

    @property()
    smallHeader = false;

    @property()
    openThreadOnClick = true;

    connectedCallback(): void {
        super.connectedCallback();
        if (this.post) {
            this.subscriptions.push(
                state.subscribe(
                    "post",
                    (event, id, data) => {
                        if (data) this.post = { ...data };
                    },
                    this.post.uri
                )
            );
        }
    }

    render() {
        if (!this.post) return renderInfo(i18n("Deleted post"));

        const rec = record(this.post);
        const embed = this.post.embed;
        const { repo, rkey } = splitAtUri(this.post.uri);

        return html`<div
            class="flex flex-col cursor-pointer"
            @click=${(ev: Event) => {
                if (!this.openThreadOnClick) return;
                if (window.getSelection() && window.getSelection()?.toString().length != 0) return;
                ev.stopPropagation();
                router.push("/thread/" + repo + "/" + rkey);
            }}
        >
            <div class="flex items-center gap-1">
                <profile-avatar-name .profile=${this.post.author} .size=${this.smallHeader ? "small" : "normal"}></profile-avatar-name>
                ${this.smallHeader ? html`<span>·</span>` : nothing}
                <a href="/thread/${this.post.author.did}/${splitAtUri(this.post.uri).rkey}" class="${this.smallHeader ? "" : "ml-auto self-start"}"
                    ><time-view class="text-xs text-muted-fg" .timeUTC=${new Date(rec?.createdAt ?? new Date().toISOString()).getTime()}></time-view
                ></a>
            </div>
            <record-view class="mt-1" .record=${rec} .showReplyingTo=${this.showReplyingTo}></record-view>
            ${embed ? html`<embed-view class="mt-1" .embed=${embed}></embed-view>` : nothing}
            <post-view-buttons class="-mb-2" .post=${this.post}></post-view-buttons>
        </div>`;
    }
}

@customElement("post-view-stream")
export class PostViewStreamView extends StreamView<PostView> {
    renderItem(item: PostView, polledItems: boolean): TemplateResult {
        return html`<post-view .post=${item}></post-view>`;
    }
}

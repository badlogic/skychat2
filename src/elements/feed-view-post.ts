import { customElement, property } from "lit/decorators.js";
import { BaseElement } from "../app.js";
import { TemplateResult, html, nothing } from "lit";
import { FeedViewPost } from "@atproto/api/dist/client/types/app/bsky/feed/defs.js";
import { FeedViewPostStream, record } from "../apis/bluesky.js";
import { StreamView } from "../utils/streamviews.js";
import { StreamProvider } from "../utils/streams.js";
import { AppBskyFeedDefs } from "@atproto/api";
import { reblogIcon } from "../utils/icons.js";

@customElement("feed-view-post")
export class FeedViewPostElement extends BaseElement {
    @property()
    post?: FeedViewPost;

    render() {
        if (!this.post) return html`<loading-spinner></loading-spinner>`;

        const post = this.post;

        const repostedBy = AppBskyFeedDefs.isReasonRepost(post.reason)
            ? html`<div class="mb-1 flex items-center gap-2 text-muted-fg text-xs">
                  <i class="icon w-4 h-4">${reblogIcon}</i>
                  <profile-avatar-name .profile=${post.reason.by} .size=${"tiny"}></profile-avatar-name>
              </div>`
            : nothing;

        if (this.post.reply && AppBskyFeedDefs.isPostView(this.post.reply.parent)) {
            return html`<div class="flex flex-col">
                ${repostedBy}
                <post-view .post=${this.post.reply.parent}></post-view>
                <post-view class="border-l border-primary ml-2 pl-2" .post=${this.post.post}></post-view>
            </div>`;
        }

        return html`<div class="flex flex-col">
            ${repostedBy}
            <post-view .post=${this.post.post}></post-view>
        </div>`;
    }
}

@customElement("feed-view-post-stream")
export class FeedViewPostStreamView extends StreamView<FeedViewPost> {
    constructor() {
        super();
        this.wrapItem = false;
    }

    renderItem(item: FeedViewPost, polledItems: boolean): TemplateResult {
        return html`<div class="border-b border-divider px-4 py-4"><feed-view-post .post=${item}></feed-view-post></div>`;
    }
}

import { PostView } from "@atproto/api/dist/client/types/app/bsky/feed/defs.js";
import { TemplateResult, html, nothing } from "lit";
import { customElement, property } from "lit/decorators.js";
import { record } from "../apis/bluesky.js";
import { BaseElement } from "../app.js";
import { StreamView } from "../utils/streamviews.js";
import { heartIcon, quoteIcon, reblogIcon, replyIcon } from "../utils/icons.js";
import { state } from "../appstate.js";

@customElement("post-view-buttons")
export class PostViewButtons extends BaseElement {
    @property()
    post?: PostView;

    render() {
        if (!this.post) return html`${nothing}`;
        const numQuotes = state.get("numQuotes", this.post.uri);
        const buttonStyle = "flex items-center gap-1 text-muted-fg h-10 hover:no-underline";
        const iconStyle = "icon w-4 h-4";

        return html`<div class="flex items-center h-10 gap-4">
            <a class="${buttonStyle}"><i class="${iconStyle}">${replyIcon}</i><span>${this.post.replyCount ?? 0}</a>
            <a class="${buttonStyle}"><i class="${iconStyle}">${quoteIcon}</i><span>${numQuotes?.numQuotes.toString() ?? 0}</a>
            <a class="${buttonStyle}"><i class="${iconStyle}">${reblogIcon}</i><span>${this.post.repostCount ?? 0}</a>
            <a class="${buttonStyle}"><i class="${iconStyle}">${heartIcon}</i><span>${this.post.likeCount ?? 0}</a>
        </div>`;
    }
}

@customElement("post-view")
export class PostViewElement extends BaseElement {
    @property()
    post?: PostView;

    render() {
        if (!this.post) return html`<loading-spinner></loading-spinner>`;

        return html`<div class="flex flex-col">
            <profile-avatar-name .profile=${this.post.author}></profile-avatar-name>
            <record-view class="mt-1" .record=${record(this.post)}></record-view>
            <post-view-buttons .post=${this.post}></post-view-buttons>
        </div>`;
    }
}

@customElement("post-view-stream")
export class PostViewStreamView extends StreamView<PostView> {
    renderItem(item: PostView, polledItems: boolean): TemplateResult {
        return html`<post-view .post=${item}></post-view>`;
    }
}

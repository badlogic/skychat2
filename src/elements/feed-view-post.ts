import { customElement, property } from "lit/decorators.js";
import { BaseElement } from "../app.js";
import { html } from "lit";
import { FeedViewPost } from "@atproto/api/dist/client/types/app/bsky/feed/defs.js";
import { record } from "../apis/bluesky.js";

@customElement("feed-view-post")
export class FeedViewPostElement extends BaseElement {
    @property()
    post?: FeedViewPost;

    render() {
        if (!this.post) return html`<loading-spinner></loading-spinner>`;

        return html`<div class="flex flex-col">
            <profile-avatar-name .profile=${this.post.post.author}></profile-avatar-name>
            <record-view .record=${record(this.post.post)}></record-view>
        </div>`;
    }
}

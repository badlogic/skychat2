import { TemplateResult, html, nothing } from "lit";
import { BaseElement, dom } from "../app.js";
import { customElement, property } from "lit/decorators.js";
import { AppBskyFeedPost, RichText } from "@atproto/api";
import { map } from "lit/directives/map.js";
import { splitAtUri } from "../common.js";
import { state } from "../appstate.js";
import { replyIcon } from "../utils/icons.js";
import { i18n } from "../utils/i18n.js";

export function renderRichText(record: AppBskyFeedPost.Record | RichText) {
    if (!record.facets) {
        return html`<div class="whitespace-pre-wrap break-words">${record.text}</div>`;
    }

    const rt = new RichText({
        text: record.text,
        facets: record.facets as any,
    });

    const segments: TemplateResult[] = [];

    for (const segment of rt.segments()) {
        if (segment.isMention()) {
            segments.push(html`<a class="text-primary" href="/profile/${segment.mention?.did}">${segment.text}</a>`);
        } else if (segment.isLink()) {
            segments.push(html`<a href="${segment.link?.uri}" target="_blank" class="text-blue-500 break-all">${segment.text}</a>`);
        } else if (segment.isTag()) {
            segments.push(html`<a href="/hashtag/${encodeURIComponent(segment.text)}" class="text-blue-500">${segment.text}</a>`);
        } else {
            segments.push(html`<span>${segment.text}</span>`);
        }
    }
    const result = html`<div class="whitespace-pre-wrap break-words">${map(segments, (segment) => segment)}</div>`;
    return result;
}

@customElement("record-view")
export class RecordElement extends BaseElement {
    @property()
    record?: AppBskyFeedPost.Record;

    @property()
    showReplyingTo = true;

    render() {
        if (!this.record) return html`${nothing}`;

        const record = this.record;

        const replyToAuthorDid = record.reply ? splitAtUri(record.reply?.parent.uri).repo : undefined;
        const replyToProfile = replyToAuthorDid && this.showReplyingTo ? state.get("profile", replyToAuthorDid) : undefined;

        return html`<div class="flex flex-col gap-2">
            ${replyToProfile
                ? html`<div class="flex items-center text-muted-fg text-xs">
                      <i class="icon w-4 h-4">${replyIcon}</i>
                      <span class="ml-1">${i18n("Replying to")}</span>
                      <profile-avatar-name class="ml-1" .profile=${replyToProfile} .size=${"tiny"}></profile-avatar-name>
                  </div>`
                : nothing}
            ${renderRichText(this.record)}
        </div>`;
    }
}

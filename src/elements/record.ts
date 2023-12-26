import { TemplateResult, html, nothing } from "lit";
import { BaseElement, dom } from "../app.js";
import { customElement, property } from "lit/decorators.js";
import { AppBskyFeedPost, RichText } from "@atproto/api";
import { map } from "lit/directives/map.js";

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
            segments.push(html`<a href="${segment.link?.uri}" target="_blank" class="break-all">${segment.text}</a>`);
        } else if (segment.isTag()) {
            segments.push(html`<a href="/hashtag/${encodeURIComponent(segment.text)}">${segment.text}</a>`);
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

    render() {
        if (!this.record) return html`${nothing}`;

        return html`<div>${renderRichText(this.record)}</div>`;
    }
}

import {
    AppBskyEmbedExternal,
    AppBskyEmbedImages,
    AppBskyEmbedRecord,
    AppBskyEmbedRecordWithMedia,
    AppBskyFeedDefs,
    AppBskyFeedPost,
} from "@atproto/api";
import { ViewImage } from "@atproto/api/dist/client/types/app/bsky/embed/images.js";
import { html, nothing } from "lit";
import { customElement, property } from "lit/decorators.js";
import { map } from "lit/directives/map.js";
import { BaseElement, dom, renderInfo, renderRichText } from "../app.js";
import { i18n } from "../utils/i18n.js";
import { deleteIcon, shieldIcon } from "../utils/icons.js";
import { router } from "../utils/routing.js";
import { GalleryImage } from "./image-gallery.js";
import { tryEmbedMedia } from "./external-media.js";

@customElement("embed-external")
export class ExternalEmbed extends BaseElement {
    @property()
    external?: AppBskyEmbedExternal.View;

    @property()
    tryEmbedMedia = true;

    render() {
        if (!this.external || !AppBskyEmbedExternal.isView(this.external)) return html`${nothing}`;

        if (this.tryEmbedMedia) {
            const mediaEmbed = tryEmbedMedia(this.external.external, false);
            if (mediaEmbed) return mediaEmbed;
        }

        const external = this.external.external;

        const thumb = typeof external.thumb == "string" ? external.thumb : external.image;
        return html`<a
            class="overflow-x-clip text-black dark:text-white mt-2 border border-divider rounded flex"
            target="_blank"
            href="${external.uri}"
        >
            ${thumb ? html`<img src="${thumb}" class="w-28 h-28 object-cover" />` : nothing}
            <div class="flex flex-col p-2 justify-center">
                <span class="text-muted-fg text-xs">${new URL(external.uri).host}</span>
                <span class="font-semibold text-sm line-clamp-2 break-any">${external.title.length > 0 ? external.title : external.uri}</span>
                <div class="text-sm line-clamp-2 break-any">${external.description}</div>
            </div>
        </a>`;
    }
}

@customElement("embed-images")
export class ImagesEmbed extends BaseElement {
    @property()
    images?: AppBskyEmbedImages.View;

    @property()
    small = false;

    @property()
    sensitive = false;

    render() {
        if (!this.images || !AppBskyEmbedImages.isView(this.images)) return html`${nothing}`;

        const images = this.images.images;
        const sensitive = this.sensitive;

        const renderAlt = (image: ViewImage) => {
            if (!image.alt) return html`${nothing}`;
            const openAlt = () => {
                router.pushModal(dom(html`<alt-text .alt=${image.alt}></alt-text>`)[0]);
            };
            return html`<button class="absolute bottom-2 left-2 text-xs bg-black text-white py-1 px-2 rounded" @click=${() => openAlt()}>
                ${i18n("ALT")}
            </button>`;
        };

        const renderGallery = (index: number) => {
            const imageUrls: GalleryImage[] = images.map((image) => {
                return { url: image.fullsize, alt: image.alt };
            });
            const gallery = dom(html`<image-gallery .images=${imageUrls} .index=${index}></image-gallery>`)[0];
            router.pushModal(gallery);
        };

        const renderImage = (image: ViewImage, index: number) => html`<div
            class="w-full h-full"
            @click=${(ev: Event) => {
                ev.stopPropagation();
                renderGallery(index);
            }}
        >
            <img
                src="${image.thumb}"
                alt="${image.alt}"
                class="cursor-pointer relative w-full h-full object-cover rounded ${sensitive ? "blur-lg" : ""}"
            />
            ${renderAlt(image)}
        </div>`;

        if (images.length == 1) {
            return html`<div class="w-full flex justify-center">
                <div class="relative">
                    <img
                        @click=${(ev: Event) => {
                            ev.stopPropagation();
                            renderGallery(0);
                        }}
                        src="${images[0].thumb}"
                        alt="${images[0].alt}"
                        class="cursor-pointer w-auto max-h-[80vh] rounded ${sensitive ? "blur-lg" : ""}"
                    />
                    ${renderAlt(images[0])}
                </div>
            </div>`;
        }
        if (images.length == 2) {
            return html` <div class="relative w-full aspect-[2/1] flex gap-1">
                ${map(images, (image, index) => html`<div class="w-[50%] h-full">${renderImage(image, index)}</div>`)}
            </div>`;
        }
        if (images.length == 3) {
            return html` <div class="relative flex gap-1">
                <div class="w-[66%] aspect-square rounded overflow-x-clip">${renderImage(images[0], 0)}</div>
                <div class="w-[33%] flex flex-col aspect-[1/2] gap-1">
                    <div class="w-full h-[50%]">${renderImage(images[1], 1)}</div>
                    <div class="w-full h-[50%]">${renderImage(images[2], 2)}</div>
                </div>
            </div>`;
        }
        if (images.length == 4) {
            return html` <div class="relative w-full aspect-square flex gap-1">
                <div class="w-[50%] aspect-square flex flex-col gap-1">
                    <div class="w-full h-[50%]">${renderImage(images[0], 0)}</div>
                    <div class="w-full h-[50%]">${renderImage(images[2], 2)}</div>
                </div>
                <div class="w-[50%] aspect-square flex flex-col gap-1">
                    <div class="w-full h-[50%]">${renderImage(images[1], 1)}</div>
                    <div class="w-full h-[50%]">${renderImage(images[3], 3)}</div>
                </div>
            </div>`;
        }

        return html`${nothing}`;
    }
}

@customElement("embed-record")
export class RecordEmbed extends BaseElement {
    @property()
    record?: AppBskyEmbedRecord.View;

    @property()
    small = false;

    @property()
    sensitive = false;

    render() {
        if (!this.record || !AppBskyEmbedRecord.isView(this.record)) return html`${nothing}`;

        const record = this.record.record;
        if (AppBskyEmbedRecord.isViewNotFound(record)) {
            return renderInfo(i18n("Deleted post"), html`${deleteIcon}`);
        }

        if (AppBskyEmbedRecord.isViewBlocked(record)) {
            return renderInfo(i18n("You are blocked by the user"), html`${shieldIcon}`);
        }

        // FIXME generator & list view

        if (AppBskyEmbedRecord.isViewRecord(record) && AppBskyFeedPost.isRecord(record.value)) {
            const post = record.value;

            return html`<div class="p-2 border border-divider rounded-md flex flex-col">
                <div class="flex">
                    <profile-avatar-name .profile=${record.author}></profile-avatar-name>
                    <time-view
                        class="ml-auto text-xs text-muted-fg self-start"
                        .timeUTC=${new Date(post.createdAt ?? new Date().toISOString()).getTime()}
                    ></time-view>
                </div>
                <record-view .record=${post}></record-view>
                ${map(record.embeds, (embed) => html`<embed-view class="mt-1" .embed=${embed}></embed-view>`)}
            </div>`;
        }

        return html`${nothing}`;
    }
}

@customElement("embed-record-with-media")
export class RecordWithMediaEmbed extends BaseElement {
    @property()
    recordWithMedia?: AppBskyEmbedRecordWithMedia.View;

    @property()
    small = false;

    @property()
    sensitive = false;

    render() {
        if (!this.recordWithMedia || !AppBskyEmbedRecordWithMedia.isView(this.recordWithMedia)) return html`${nothing}`;

        const recordEmbed = { $type: "app.bsky.embed.record#view", ...this.recordWithMedia.record };
        const imagesEmbed = AppBskyEmbedImages.isView(this.recordWithMedia.media) ? this.recordWithMedia.media : undefined;
        const externalEmbed = AppBskyEmbedExternal.isView(this.recordWithMedia.media) ? this.recordWithMedia.media : undefined;

        return html`<div class="flex flex-col gap-2">
            ${imagesEmbed ? html`<embed-images .images=${imagesEmbed} .small=${this.small} .sensitive=${this.sensitive}></embed-images>` : nothing}
            <embed-record .record=${recordEmbed} .small=${this.small} .sensitive=${this.sensitive}></embed-record>
        </div>`;
    }
}

@customElement("embed-view")
export class EmbedElement extends BaseElement {
    @property()
    embed?: any;

    @property()
    small = false;

    @property()
    sensitive = false;

    render() {
        if (!this.embed) return html`${nothing}`;
        const embed = this.embed;
        const imagesEmbed = AppBskyEmbedImages.isView(embed) ? embed : undefined;
        const recordEmbed = AppBskyEmbedRecord.isView(embed) ? embed : undefined;
        const recordWithMediaEmbed = AppBskyEmbedRecordWithMedia.isView(embed) ? embed : undefined;
        const externalEmbed = AppBskyEmbedExternal.isView(embed) || AppBskyEmbedExternal.isMain(embed) ? embed : undefined;

        return html`<div class="flex flex-col gap-1">
            ${imagesEmbed ? html`<embed-images .images=${imagesEmbed} .small=${this.small} .sensitive=${this.sensitive}></embed-images>` : nothing}
            ${externalEmbed
                ? html`<embed-external .external=${externalEmbed} .small=${this.small} .sensitive=${this.sensitive}></embed-external>`
                : nothing}
            ${recordEmbed ? html`<embed-record .record=${recordEmbed} .small=${this.small} .sensitive=${this.sensitive}></embed-record>` : nothing}
            ${recordWithMediaEmbed
                ? html`<embed-record-with-media
                      .recordWithMedia=${recordWithMediaEmbed}
                      .small=${this.small}
                      .sensitive=${this.sensitive}
                  ></embed-record-with-media>`
                : nothing}
        </div> `;
    }
}

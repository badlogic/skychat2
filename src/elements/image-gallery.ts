import { PropertyValueMap, html } from "lit";
import { customElement, property } from "lit/decorators.js";
import PhotoSwipe from "photoswipe";
import { router } from "../utils/routing.js";
import { BaseElement, dom, isMobileBrowser } from "../utils/ui-components.js";

// @ts-ignore
import arrowLeftIconSvg from "remixicon/icons/Arrows/arrow-left-s-line.svg";
// @ts-ignore
import arrowRightIconSvg from "remixicon/icons/Arrows/arrow-right-s-line.svg";
import { downloadIcon } from "../utils/icons.js";
import { i18n } from "../utils/i18n.js";
import { apiGet, apiGetBlob } from "../api.js";

export interface GalleryImage {
    url: string;
    alt?: string;
}

export interface LoadedImage {
    src: string;
    alt?: string;
    w: number;
    h: number;
}

async function downloadImage(imageUrl: string, imageName: string): Promise<void> {
    try {
        const response = await apiGetBlob("resolve-blob?url=" + encodeURIComponent(imageUrl));
        if (response instanceof Error) return;
        const imageObjectURL = URL.createObjectURL(response);

        const tempLink = document.createElement("a");
        tempLink.href = imageObjectURL;
        tempLink.download = imageName;
        document.body.appendChild(tempLink); // Append to the body
        tempLink.click(); // Simulate a click

        // Clean up
        URL.revokeObjectURL(imageObjectURL);
        document.body.removeChild(tempLink);
    } catch (error) {
        console.error("Error downloading image:", error);
    }
}

@customElement("alt-text")
export class AltText extends BaseElement {
    @property()
    alt: string = "";

    connectedCallback(): void {
        super.connectedCallback();
        document.documentElement.style.overflow = "hidden";
    }

    disconnectedCallback(): void {
        super.disconnectedCallback();
        document.documentElement.style.overflow = "auto";
    }

    render() {
        return html`<div class="z-50 w-full h-full fixed top-0 left-0 bg-background overflow-auto flex-1 p-4" @click=${() => router.pop()}>
            ${this.alt}
        </div>`;
    }
}

@customElement("image-gallery")
export class ImageGallery extends BaseElement {
    @property()
    isLoading = true;

    @property()
    images: GalleryImage[] = [];

    @property()
    index = 0;

    loadedImages: LoadedImage[] = [];

    constructor() {
        super();
    }

    connectedCallback(): void {
        super.connectedCallback();
        this.load();
    }

    async load() {
        try {
            const imagePromises = this.images.map(
                (image) =>
                    new Promise<LoadedImage | Error>((resolve, reject) => {
                        const img = new Image();
                        img.onload = () => {
                            resolve({
                                src: image.url,
                                w: img.width,
                                h: img.height,
                                alt: image.alt,
                            });
                        };
                        img.onerror = () => {
                            reject(new Error("Couldn't load image"));
                        };
                        img.src = image.url;
                    })
            );
            const results = await Promise.all(imagePromises);
            for (const result of results) {
                if (result instanceof Error) continue;
                this.loadedImages.push(result);
            }
        } finally {
            this.isLoading = false;
        }
    }

    render() {
        if (this.isLoading) {
            return html`<div class="fixed top-0 left-0 w-full h-full backdrop-blur-[32px] z-50 flex items-center justify-center">
                <loading-spinner></loading-spinner>
            </div>`;
        }

        let sx = 0,
            sy = 0;
        let clicked = false;
        const galleryDom = dom(
            html`<div
                class="fixed top-0 left-0 w-full h-full backdrop-blur-[32px] z-50"
                @click=${(ev: MouseEvent) => {
                    if (!clicked) return;
                    let target: HTMLElement | null = ev.target as HTMLElement;
                    let isButton = false;
                    while (target && target != this) {
                        if (target.tagName == "BUTTON") {
                            isButton = true;
                            break;
                        }
                        target = target.parentElement;
                    }
                    if (!isButton) router.pop();
                }}
            ></div>`
        )[0];
        const lightbox = new PhotoSwipe({
            dataSource: this.loadedImages,
            showHideAnimationType: "none",
            appendToEl: galleryDom,
            counter: false,
            index: this.index,
            wheelToZoom: true,
            zoom: true,
            loop: false,
            preloaderDelay: 1000000000,
            arrowPrevSVG: `<div class="text-white w-12 h-12">${arrowLeftIconSvg}</div>`,
            arrowNextSVG: `<div class="flex justify-end text-white w-full h-12">${arrowRightIconSvg}</div>`,
            pswpModule: () => import("photoswipe"),
        });
        lightbox.init();
        lightbox.on("close", () => {
            router.pop();
        });
        lightbox.on("slideActivate", (event) => {
            console.log("Slide activated");
        });
        lightbox.on("pointerDown", (ev) => {
            sx = ev.originalEvent.clientX;
            sy = ev.originalEvent.clientY;
        });
        lightbox.on("pointerUp", (ev) => {
            let dx = ev.originalEvent.clientX - sx;
            let dy = ev.originalEvent.clientY - sy;
            clicked = Math.sqrt(dx * dx + dy * dy) < 5;
        });

        const arrowEls = galleryDom.querySelectorAll(".pswp__button--arrow--prev, .pswp__button--arrow--next");
        let hideTimeout: any;
        const delay = 500;

        const hideArrows = () => {
            arrowEls.forEach((el) => (el as HTMLElement).classList.add("animate-fade", "animate-reverse"));
        };

        const showArrows = () => {
            clearTimeout(hideTimeout);
            arrowEls.forEach((el) => (el as HTMLElement).classList.remove("animate-fade", "animate-reverse"));
            hideTimeout = setTimeout(hideArrows, delay);
        };

        const buttons = dom(
            html`
                <div class="flex gap-2 mb-2 ml-2">
                    <button class="bg-black text-white py-1 px-2 rounded w-10 h-10 flex items-center justify-center">
                        <i class="icon w-5 h-5">${downloadIcon}</i>
                    </button>
                    <button class="bg-black text-white py-1 px-2 rounded w-10 h-10 flex items-center justify-center">${i18n("ALT")}</button>
                </div>
            `
        )[0];
        const downloadButton = buttons.children[0] as HTMLButtonElement;
        downloadButton.addEventListener("click", () => {
            const img = this.images[lightbox.currSlide!.index];
            const tokens = new URL(img.url).pathname.split("/");
            const fileName = tokens[tokens.length - 1] ?? "image.png";
            downloadImage(img.url, fileName);
        });
        const altButton = buttons.children[1] as HTMLButtonElement;
        altButton.addEventListener("click", () => {
            const img = this.images[lightbox.currSlide!.index];
            router.pushModal(dom(html`<alt-text .alt=${img.alt}></alt-text>`)[0]);
        });

        if (!this.images[this.index].alt) altButton.classList.add("hidden");
        lightbox.on("slideActivate", (event) => {
            if (!this.images[event.slide.index].alt) altButton.classList.add("hidden");
            else altButton.classList.remove("hidden");
        });

        const bottomBar = galleryDom.querySelector(".pswp__top-bar");
        bottomBar!.innerHTML = "";
        bottomBar?.append(buttons);

        galleryDom.addEventListener("mousemove", showArrows);
        hideTimeout = setTimeout(hideArrows, delay);

        return galleryDom;
    }
}

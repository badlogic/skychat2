import { AppBskyEmbedExternal } from "@atproto/api";
import { TemplateResult, html, nothing } from "lit";
import { unsafeHTML } from "lit-html/directives/unsafe-html.js";
import { Api } from "../api.js";
import { dom, onVisibilityChange } from "../app.js";
import { youtubePlayButton } from "../pages/default-icons.js";
import { enableYoutubeJSApi, error, getVideoDimensions } from "../utils/utils.js";
import { isViewNotFound } from "@atproto/api/dist/client/types/app/bsky/embed/record.js";

export function tryEmbedGiphyGif(externalEmbed: AppBskyEmbedExternal.ViewExternal | AppBskyEmbedExternal.External): TemplateResult | undefined {
    const url = externalEmbed.uri;
    const giphyPattern = /https?:\/\/(?:www\.)?giphy\.com\/gifs\/(?:.*-)?([a-zA-Z0-9]+)/;
    const match = url.match(giphyPattern);

    if (match) {
        const gifId = match[1];
        const gifURL = `https://media.giphy.com/media/${gifId}/giphy.gif`;
        return html`<div class="flex items-center justify-center mt-2"><img src="${gifURL}" class="max-h-[70vh] rounded" /></div>`;
    }

    return undefined;
}

export function tryEmbedTenorGif(
    externalEmbed: AppBskyEmbedExternal.ViewExternal | AppBskyEmbedExternal.External,
    minimal: boolean
): TemplateResult | undefined {
    const url = externalEmbed.uri;
    const tenorPattern = /https?:\/\/(?:www\.)?tenor\.com\/(?:[^\/]+\/)?view\/.*-(\d+)$/;
    if (!url.match(tenorPattern)) return undefined;

    const extractMediaLinks = (html: string): { gif?: string; mp4?: string } | undefined => {
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, "text/html");

        const ogImageMeta = doc.querySelector('meta[property="og:image"]');
        const ogVideoMeta = doc.querySelector('meta[property="og:video:secure_url"]');

        let result: { gif?: string; mp4?: string } = {};

        if (ogImageMeta && ogImageMeta.getAttribute("content")) {
            result.gif = ogImageMeta.getAttribute("content") ?? undefined;
        }

        if (ogVideoMeta && ogVideoMeta.getAttribute("content")) {
            result.mp4 = ogVideoMeta.getAttribute("content") ?? undefined;
        }

        return Object.keys(result).length > 0 ? result : undefined;
    };

    const tenorDom = dom(html`<div class="mt-2"></div>`)[0];
    Api.html(url)
        .then(async (rawHtml) => {
            if (rawHtml instanceof Error) {
                tenorDom.append(dom(html`<embed-external .external=${externalEmbed} .small=${minimal} .tryEmbedMedia=${false}></embed-external>`)[0]);
                return;
            }
            const media = extractMediaLinks(rawHtml);
            if (media) {
                if (media.mp4) {
                    const videoDom = dom(
                        html`<div class="flex justify-center items-center">
                            <video
                                src="${media.mp4}"
                                class="w-full h-auto max-h-[70vh] cursor-pointer"
                                muted
                                loop
                                playsinline
                                disableRemotePlayback
                            ></video>
                        </div>`
                    )[0];
                    tenorDom.append(videoDom);
                    onVisibilityChange(
                        videoDom,
                        () => {
                            const video = videoDom.querySelector("video") as HTMLVideoElement;
                            video.play();
                        },
                        () => {
                            const video = videoDom.querySelector("video") as HTMLVideoElement;
                            video.pause();
                        }
                    );
                } else if (media.gif) {
                    tenorDom.append(
                        dom(
                            html`<div class="flex justify-center items-center">
                                <img src="${media.gif}" class="w-full h-auto max-h-[70vh] rounded" />
                            </div>`
                        )[0]
                    );
                } else {
                    tenorDom.append(
                        dom(html`<embed-external .external=${externalEmbed} .small=${minimal} .tryEmbedMedia=${false}></embed-external>`)[0]
                    );
                }
            } else {
                tenorDom.append(dom(html`<embed-external .external=${externalEmbed} .small=${minimal} .tryEmbedMedia=${false}></embed-external>`)[0]);
            }
        })
        .catch(() => {
            tenorDom.append(dom(html`<embed-external .external=${externalEmbed} .small=${minimal} .tryEmbedMedia=${false}></embed-external>`)[0]);
        });
    return html`${tenorDom}`;
}

export function tryEmbedImgur(
    externalEmbed: AppBskyEmbedExternal.ViewExternal | AppBskyEmbedExternal.External,
    minimal: boolean
): TemplateResult | undefined {
    const url = externalEmbed.uri.replaceAll(".mp4", "");
    if (!url.includes("imgur.com")) return;

    const extractMediaInfo = (rawHtml: string) => {
        const parser = new DOMParser();
        const doc = parser.parseFromString(rawHtml, "text/html");
        const imageUrl = doc.querySelector('meta[name="twitter:image"]')?.getAttribute("content");
        const metaTags = doc.querySelectorAll("meta");
        let videoUrl = null;

        metaTags.forEach((tag) => {
            if (tag.getAttribute("property") === "og:video") {
                videoUrl = tag.getAttribute("content");
            }
        });
        const videoWidth = parseInt(doc.querySelector('meta[property="og:video:width"]')?.getAttribute("content") ?? "0");
        const videoHeight = parseInt(doc.querySelector('meta[property="og:video:height"]')?.getAttribute("content") ?? "0");

        if (imageUrl || videoUrl) {
            return {
                imageUrl,
                videoUrl,
                videoWidth,
                videoHeight,
            };
        }

        return undefined;
    };

    const imgurDom = dom(html`<div class="mt-2 rounded overflow-x-clip"></div>`)[0];
    Api.html(url)
        .then(async (rawHtml) => {
            if (rawHtml instanceof Error) {
                imgurDom.append(dom(html`<embed-external .external=${externalEmbed} .small=${minimal} .tryEmbedMedia=${false}></embed-external>`)[0]);
                return;
            }
            const media = extractMediaInfo(rawHtml);
            if (media) {
                if (media.videoUrl && media.videoWidth > 0 && media.videoHeight > 0) {
                    const videoDom = dom(
                        html`<div
                            class="flex justify-center items-center"
                            @click=${(ev: Event) => {
                                ev.preventDefault();
                                ev.stopPropagation();
                                ev.stopImmediatePropagation();
                                document.body.append(dom(html`<video-image-overlay .videoUrl=${media.videoUrl}></div>`)[0]);
                            }}
                        >
                            <video
                                src="${media.videoUrl}"
                                class="w-full cursor-pointer rounded max-h-[70vh]"
                                style="aspect-ratio: ${media.videoWidth}/${media.videoHeight};"
                                muted
                                loop
                                playsinline
                                disableRemotePlayback
                                controls
                            ></video>
                        </div>`
                    )[0];
                    imgurDom.append(videoDom);
                    onVisibilityChange(
                        videoDom,
                        () => {
                            const video = videoDom.querySelector("video") as HTMLVideoElement;
                            video.play();
                            console.log("Playing video");
                        },
                        () => {
                            const video = videoDom.querySelector("video") as HTMLVideoElement;
                            video.pause();
                            console.log("Pausing video");
                        }
                    );
                } else if (media.imageUrl) {
                    imgurDom.append(
                        dom(
                            html`<div
                                class="flex justify-center items-center"
                                @click=${(ev: Event) => {
                                    ev.preventDefault();
                                    ev.stopPropagation();
                                    ev.stopImmediatePropagation();
                                    document.body.append(dom(html`<video-image-overlay .imageUrl=${media.imageUrl}></div>`)[0]);
                                }}
                            >
                                <img src="${media.imageUrl}" class="rounded max-h-[70vh] max-w-full" />
                            </div>`
                        )[0]
                    );
                } else {
                    imgurDom.append(
                        dom(html`<embed-external .external=${externalEmbed} .small=${minimal} .tryEmbedMedia=${false}></embed-external>`)[0]
                    );
                }
            } else {
                imgurDom.append(dom(html`<embed-external .external=${externalEmbed} .small=${minimal} .tryEmbedMedia=${false}></embed-external>`)[0]);
            }
        })
        .catch(() => {
            imgurDom.append(dom(html`<embed-external .external=${externalEmbed} .small=${minimal} .tryEmbedMedia=${false}></embed-external>`)[0]);
        });
    return html`${imgurDom}`;
}

export function tryEmbedYouTubeVideo(
    externalEmbed: AppBskyEmbedExternal.ViewExternal | AppBskyEmbedExternal.External,
    minimal: boolean
): TemplateResult | undefined {
    const url = externalEmbed.uri;
    const videoRegExp = /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:watch\?v=|embed\/|v\/|shorts\/)|youtu\.be\/)([\w-]+)/;
    let videoID: string | undefined = "";
    if (videoRegExp.test(url)) {
        const match = url.match(videoRegExp);
        videoID = match ? match[1] : undefined;
        if (!videoID) return undefined;
    } else {
        return undefined;
    }

    if (videoID && videoID.length === 11) {
        const youtubeDom = dom(
            html` <div class="flex items-center justify-center">
                <div class="mt-2 self-center ${!minimal ? "w-full" : ""} rounded overflow-x-clip flex justify-center"></div>
            </div>`
        )[0];
        fetch(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoID}&format=json`)
            .then(async (data) => {
                const youtubeInfo = await data.json();
                const showIFrame = (ev: MouseEvent) => {
                    if (minimal) return;
                    ev.preventDefault();
                    ev.stopPropagation();
                    ev.stopImmediatePropagation();
                    const img = imgDom.querySelector("img")!;
                    const width = img.clientWidth;
                    const height = img.clientHeight;
                    requestAnimationFrame(() => {
                        const outerFrame = dom(
                            html`<div class="flex w-full h-full items-center justify-center">
                                ${unsafeHTML(enableYoutubeJSApi(youtubeInfo.html))}
                            </div>`
                        )[0];
                        const iframe = outerFrame.querySelector("iframe")!;
                        iframe.width = width.toString() + "px";
                        iframe.height = height.toString() + "px";
                        imgDom.remove();
                        youtubeDom.children[0].append(outerFrame);
                        setTimeout(() => {
                            iframe.contentWindow?.postMessage('{"event":"command","func":"' + "playVideo" + '","args":""}', "*");
                            imgDom.remove();
                            onVisibilityChange(
                                iframe,
                                () => {},
                                () => {
                                    iframe.contentWindow?.postMessage('{"event":"command","func":"' + "pauseVideo" + '","args":""}', "*");
                                }
                            );
                        }, 1000);
                    });
                };
                const imgDom = dom(
                    html` <div @click=${(ev: MouseEvent) => showIFrame(ev)} class="relative flex items-center cursor-pointer">
                        <img src="${youtubeInfo.thumbnail_url}" class="${minimal ? "max-w-[200px]" : ""} mx-auto" />
                        <div
                            class="absolute ${minimal ? "w-4 h-4" : "w-16 h-16"} disable-pointer-events"
                            style="top: calc(100% / 2 - ${minimal ? "8px" : "32px"}); left: calc(100% / 2 - ${minimal ? "8px" : "32px"});"
                        >
                            ${youtubePlayButton}
                        </div>
                        ${!minimal
                            ? html`<div class="flex items-center w-full absolute px-4 top-0 h-12 bg-[#111]/80 backdrop-blur">
                                  <span class="text-white font-semibold line-clamp-1 bg-[#111]/90"> ${youtubeInfo.title} </span>
                              </div>`
                            : nothing}
                    </div>`
                )[0];
                youtubeDom.children[0].append(imgDom);
            })
            .catch(() => {
                youtubeDom.append(
                    dom(html`<embed-external .external=${externalEmbed} .small=${minimal} .tryEmbedMedia=${false}></embed-external>`)[0]
                );
            });
        return html`${youtubeDom}`;
    }

    return undefined;
}

export function tryEmbedMp4(
    externalEmbed: AppBskyEmbedExternal.ViewExternal | AppBskyEmbedExternal.External,
    minimal: boolean
): TemplateResult | undefined {
    const url = externalEmbed.uri;
    if (!url.endsWith(".mp4")) return;

    const outerDom = dom(html`<div class="mt-2"></div>`)[0];
    getVideoDimensions(url).then((dimensions) => {
        if (dimensions instanceof Error) {
            dom(html`<embed-external .external=${externalEmbed} .small=${minimal} .tryEmbedMedia=${false}></embed-external>`)[0];
            return;
        }

        const videoDom = dom(
            html`<div
                class="flex justify-center items-center"
                @click=${(ev: Event) => {
                    ev.preventDefault();
                    ev.stopPropagation();
                    ev.stopImmediatePropagation();
                    document.body.append(dom(html`<video-image-overlay .videoUrl=${url}></div>`)[0]);
                }}
            >
                <video
                    src="${url}"
                    class="w-full cursor-pointer max-h-[70vh] rounded"
                    style="aspect-ratio: ${dimensions.width}/${dimensions.height};"
                    playsinline
                    disableRemotePlayback
                    controls
                    @click=${() => {
                        const video = videoDom.querySelector("video") as HTMLVideoElement;
                        if (video.paused) video.play();
                        else video.pause();
                    }}
                ></video>
            </div>`
        )[0];
        outerDom.append(videoDom);
        onVisibilityChange(
            videoDom,
            () => {},
            () => {
                const video = videoDom.querySelector("video") as HTMLVideoElement;
                video.pause();
                console.log("Pausing video");
            }
        );
    });
    return html`${outerDom}`;
}

export function tryEmbedSpotify(
    cardEmbed: AppBskyEmbedExternal.ViewExternal | AppBskyEmbedExternal.External,
    minimal: boolean
): TemplateResult | undefined {
    try {
        const url = new URL(cardEmbed.uri);
        if (!url.hostname.includes("open.spotify.com")) return;
        let iframeUrl = "https://open.spotify.com/embed";
        const pathTokens = url.pathname.split("/");
        if (pathTokens.length != 3) return;
        iframeUrl += url.pathname;
        return html`<iframe
            src="${iframeUrl}"
            frameborder="0"
            allowtransparency="true"
            allow="encrypted-media"
            class="mx-auto mt-2 w-full h-[80px]"
        ></iframe>`;
    } catch (e) {
        error("Couldn't embed Spotify link");
        return;
    }
}

export function tryEmbedTwitch(
    cardEmbed: AppBskyEmbedExternal.ViewExternal | AppBskyEmbedExternal.External,
    minimal: boolean
): TemplateResult | undefined {
    try {
        const url = new URL(cardEmbed.uri);
        if (!url.hostname.includes("twitch.tv")) return;
        const thisUrl = new URL(location.href);
        let iframeUrl = `https://player.twitch.tv/?parent=${thisUrl.hostname}&`;
        const pathTokens = url.pathname.split("/");
        if (pathTokens.length == 2) {
            iframeUrl += "channel=" + pathTokens[1];
        } else if (pathTokens.length == 3) {
            iframeUrl += "video=" + pathTokens[2];
        } else {
            return;
        }
        return html`${dom(html`<iframe
            src="${iframeUrl}&autoplay=false"
            frameborder="0"
            allowtransparency="true"
            allow="encrypted-media"
            allowfullscreen="true"
            class="mx-auto mt-2 w-full aspect-[16/9] max-h-[70vh] rounded overflow-x-clip"
        ></iframe>`)[0]}`;
    } catch (e) {
        error("Couldn't embed Spotify link");
        return;
    }
}

export function tryEmbedTwitter(
    cardEmbed: AppBskyEmbedExternal.ViewExternal | AppBskyEmbedExternal.External,
    minimal: boolean
): TemplateResult | undefined {
    const link = cardEmbed.uri.split("?")[0];
    const twitterPostRegex = /^https?:\/\/(twitter\.com|x\.com)\/(\w+)\/status\/(\d+)(\?\S*)?$/;
    const match = link.match(twitterPostRegex);

    if (match && match[3]) {
        const tweetId = match[3];
        return html`<iframe
            src="https://platform.twitter.com/embed/index.html?dnt=false&embedId=twitter-widget-0&frame=false&hideCard=false&hideThread=false&id=${tweetId}&lang=en&origin=${encodeURIComponent(
                window.location.href
            )}&theme=light&widgetsVersion=ed20a2b%3A1601588405575&width=550px"
            class="w-full h-[40vh] mt-2"
            title="Twitter Tweet"
            style="border: 0; overflow: hidden;"
        ></iframe>`;
    } else {
        return undefined;
    }
}

export function tryEmbedMedia(externalEmbed: AppBskyEmbedExternal.ViewExternal, minimal: boolean) {
    const mp4Embed = tryEmbedMp4(externalEmbed, minimal);
    if (mp4Embed) return mp4Embed;

    const youTubeEmbed = tryEmbedYouTubeVideo(externalEmbed, minimal);
    if (youTubeEmbed) return youTubeEmbed;

    const giphyEmbed = tryEmbedGiphyGif(externalEmbed);
    if (giphyEmbed) return giphyEmbed;

    const tenorEmbed = tryEmbedTenorGif(externalEmbed, minimal);
    if (tenorEmbed) return tenorEmbed;

    const imgurEmbed = tryEmbedImgur(externalEmbed, minimal);
    if (imgurEmbed) return imgurEmbed;

    const spotifyEmbed = tryEmbedSpotify(externalEmbed, minimal);
    if (spotifyEmbed) return spotifyEmbed;

    const twitchEmbed = tryEmbedTwitch(externalEmbed, minimal);
    if (twitchEmbed) return twitchEmbed;

    const twitterEmbed = tryEmbedTwitter(externalEmbed, minimal);
    if (twitterEmbed) return twitterEmbed;

    return undefined;
}

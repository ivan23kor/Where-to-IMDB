// import { escapeAttribute as a, escapeAttribute, escapeText as n } from './scripts/entities_escape.min.js';
// import { EntityDecoder as e, htmlDecodeTree as t, DecodingMode as s } from "./scripts/entities_decode.min.js";
// import { parse } from "./scripts/parse5.min.js";
// console.log(a, e, parse);
// import { EntityDecoder as e, htmlDecodeTree as t, DecodingMode as s } from "/npm/entities@4.5.0/lib/decode.js/+esm";

chrome.runtime.onConnect.addListener(function (port) {
    console.assert(port.name === "knockknock");
    port.onMessage.addListener(async function (msg) {
        if (msg.title) {
            const [title, url, data] = await findTitle(msg.title);
            port.postMessage({ data: data, title: title, url: url });
        }
    });
});


async function findTitle(title) {
    title = title.replaceAll(' ', '-').replaceAll("'", '');
    const url = `https://www.justwatch.com/ca/movie/${title}`;
    const html = await (await fetch(url)).text();

    const offers = parseOffers(html);

    return [title, url, offers];
    // const doc = new DOMParser().parseFromString(html, "text/html");
    // const title = doc.querySelector("div.buybox-row.stream.inline").textContent;
    // console.log(title);

    // // Extract the product description
    // const description = doc.querySelector("div.product-description").textContent;

    // // Extract the product price 
    // const price = doc.querySelector("span.price").textContent;
};

function searchNth(string, pattern, index = 1) {
    var L = string.length, i = -1;
    while (index-- && i++ < L) {
        i = string.indexOf(pattern, i);
        if (i < 0) break;
    }
    return i;
}

function parseOffers(html) {
    const start = searchNth(html, 'class="buybox-row__offers"')
    const row_offers = html.substring(start);
    const end = searchNth(row_offers, '</div><!---->')
    return `<div ${row_offers.slice(0, end)}`;
}
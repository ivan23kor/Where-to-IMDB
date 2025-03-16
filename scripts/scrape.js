import { parse } from "/lib/parse5.min.js";

// Establish connection with background script
chrome.runtime.onConnect.addListener(function (port) {
    port.onMessage.addListener(async function (msg) {
        if (msg.title) {
            const offers = await findOffers(msg.title);
            console.log(offers);
            port.postMessage({ offers: offers });
        }
    });
});

async function findOffers(title) {
    // TODO: do this replacement on the frontend side
    title = title.replaceAll(' ', '-').replaceAll("'", '');
    // const url = `https://www.justwatch.com/ca/movie/${title}`;
    const url = '/jw_sample_page.html';

    const html = await (await fetch(url)).text();

    const document = parse(html);

    const offersResult = [];
    const offers = querySelectorAll(document, "class", "buybox-row");
    for (const offer of offers) {
        const serviceUrls = querySelectorAll(offer, "class", "offer").map(node => node.attrs.find(attr => attr.name === "href").value);
        const images = querySelectorAll(offer, "class", "provider-icon");
        const altTexts = images.map(image => image.attrs.find(attr => attr.name === "alt").value);
        const iconUrls = images.map(image => image.attrs.find(attr => attr.name === "src").value);

        const numOffers = Math.min(serviceUrls.length, altTexts.length, iconUrls.length);
        for (let i = 0; i < numOffers; i++) {
            offersResult.push({
                serviceUrl: serviceUrls[i],
                altText: altTexts[i],
                iconUrl: iconUrls[i],
            });
        }
    }

    return offersResult;
};

function querySelectorAll(node, attrName, attrValue) {
    // Results array to store matching nodes
    const results = [];

    // Check if current node matches
    if (node.attrs && Array.isArray(node.attrs)) {
        const matchingAttr = node.attrs.find(attr =>
            attr.name === attrName && attr.value.split(" ").includes(attrValue)
        );
        if (matchingAttr) {
            results.push(node);
        }
    }

    // Base case: no children to traverse
    if (!node.childNodes || !Array.isArray(node.childNodes)) {
        return results;
    }

    // Recursive case: traverse all children
    for (const childNode of node.childNodes) {
        const childResults = querySelectorAll(childNode, attrName, attrValue);
        results.push(...childResults);
    }

    return results;
}

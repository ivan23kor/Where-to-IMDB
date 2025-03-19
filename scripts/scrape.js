import { parse, serialize } from "/lib/parse5.min.js";

// Establish connection with background script
chrome.runtime.onConnect.addListener(function (port) {
    port.onMessage.addListener(async function (msg) {
        if (msg.title) {
            const document = await fetchDocument(msg.title);
            const offers = findOffers(document);
            console.log(offers);
            port.postMessage({ offers: offers });
        }
    });
});

async function fetchDocument(title) {
    const encodedTitle = encodeURIComponent(title.toLowerCase());
    const url = `https://www.justwatch.com/ca/search/?q=${encodedTitle}`;

    const html = await (await fetch(url)).text();

    return await parse(html);
}

function findOffersInCategory(offersNode, categoryName) {
    const categoryNode = findTagWithClass(offersNode, `buybox-row ${categoryName} inline`);
    const offerNode = findTagWithClass(categoryNode, "buybox-row__offers");
    const offerLinks = findTags(offerNode, "a");

    let result = [];
    for (const link of offerLinks) {
        const price = getFirstText(link);
        const url = link.attrs.find(attr => attr.name === "href").value;
        const image = findTags(link, "img")[0];
        const name = image.attrs.find(attr => attr.name === "alt").value
        const imageSrc = image.attrs.find(attr => attr.name === "src").value

        result.push({
            price: price,
            url: url,
            name: name,
            imageSrc: imageSrc
        });
    }

    return result;
}

function findOffers(document) {
    const offersNode = findTagWithClass(document, "buybox__content inline");
    const stream = findOffersInCategory(offersNode, "stream");
    const rent = findOffersInCategory(offersNode, "rent");
    const buy = findOffersInCategory(offersNode, "buy");
    return [
        { categoryName: "stream", offers: stream },
        { categoryName: "rent", offers: rent },
        { categoryName: "buy", offers: buy }
    ];
};

function findTagWithClass(node, name) {
    // Check if current node matches
    if (node.attrs && Array.isArray(node.attrs)) {
        const matchingAttr = node.attrs.find(attr =>
            attr.name === "class" && attr.value === name
        );
        if (matchingAttr) {
            return node;
        }
    }

    // Base case: no children
    if (!node.childNodes || node.childNodes.length === 0) {
        return null;
    }

    // Recursive case: traverse all children
    for (const childNode of node.childNodes) {
        const classNode = findTagWithClass(childNode, name);
        if (classNode) {
            return classNode;
        }
    }

    return null;
}

// Find all tags with a specific name.
// The search ends when the first tag is found.
// Only tags from the same parent are returned.
function findTags(node, name) {
    // Check if current node matches
    if (node.tagName === name) {
        return [node];
    }

    // Base case: no children
    if (!node.childNodes || node.childNodes.length === 0) {
        return [];
    }

    return node.childNodes.map(childNode => findTags(childNode, name)).flat();
}

function getFirstText(node) {
    if (node.nodeName === "#text") {
        return node.value;
    }

    if (!node.childNodes || node.childNodes.length === 0) {
        return "";
    }

    for (const childNode of node.childNodes) {
        const textNode = getFirstText(childNode);
        if (textNode) {
            return textNode;
        }
    }
    return "";
}

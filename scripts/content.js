if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', afterDOMLoaded);
} else {
    afterDOMLoaded();
}


function afterDOMLoaded() {
    function connect() {
        return chrome.runtime.connect({ name: "port" });
    }

    var port = connect();
    port.onDisconnect.addListener(() => {
        console.log("Service worker port disconnected. Reconnecting...");
        port = connect();
    });

    // Select all movie title elements on the IMDB Top 250 page
    const titles = document.querySelectorAll('.ipc-metadata-list-summary-item');
    for (const title of titles) {
        title.addEventListener('mouseenter', (event) => {
            showOffersPopup(title, port);
        });
        title.addEventListener('mouseleave', (event) => {
            const popup = getOffersPopup(title);
            if (popup) {
                popup.style.visibility = "hidden";
            }
        });
    }
}

function extractMovieTitle(title) {
    const movieTitle = title.querySelector('.ipc-title__text').innerText
        .replace(/^\d+\.\s+/, '');
    const year = title.querySelector('.cli-title-metadata-item').innerText;
    return `${movieTitle} ${year}`;
}

function showOffersPopup(title, port) {
    // Try to look for existing popup
    let popup = getOffersPopup(title);
    if (popup) {
        popup.style.visibility = "visible";
        return;
    }

    // Extract movie title under hover
    const movieTitle = extractMovieTitle(title);

    // Send a request to background script for this movie title
    port.postMessage({ title: movieTitle });

    // Create streaming icons based on received data from background script
    const handleMessage = function (msg) {
        const popup = createPopup(title, msg.offers);
        title.appendChild(popup);

        // Avoid duplicate logs by removing the event listener after the first message
        port.onMessage.removeListener(handleMessage);
    };
    port.onMessage.addListener(handleMessage);
}

function getOffersPopup(title) {
    return title.querySelector(".offers-popup");
}

function createPopup(title, offers) {
    // Create popup
    const popup = document.createElement('div');
    popup.classList.add("offers-popup");
    popup.style.fontFamily = "Lato,Lato-fallback,Arial,sans-serif";
    popup.style.fontSize = "14px";
    popup.style.lineHeight = "1.428571429";
    popup.style.color = "#d5d5d5";
    popup.style.paddingTop = "56px";
    popup.style.boxSizing = "border-box";
    popup.style.display = "flex";
    popup.style.gap = "16px";
    popup.style.overflowX = "auto";
    popup.style.border = "1px solid #e0e0e0";
    popup.style.borderRadius = "8px";
    popup.style.backgroundColor = "rgba(51, 51, 51, 0.4)";
    popup.style.padding = "10px";

    // Position the popup over the title
    const titleRect = title.getBoundingClientRect();
    const scrollX = window.scrollX || document.documentElement.scrollLeft;
    const scrollY = window.scrollY || document.documentElement.scrollTop;
    const left = titleRect.left + scrollX;
    const top = titleRect.y + scrollY - 300;
    popup.style.position = "absolute";
    popup.style.zIndex = "1000";
    popup.style.left = left + 'px';
    popup.style.top = top + 'px';

    for (const offer of offers) {
        const categoryName = offer.categoryName;
        const offers = offer.offers;
        const category = createCategoryNode(categoryName, offers);
        popup.appendChild(category);
    }

    return popup;
}


function createCategoryNode(categoryName, offers) {
    const categoryContainer = document.createElement('div');

    const categoryNode = createCategoryLabelNode(categoryName);
    categoryContainer.appendChild(categoryNode);

    const offersNode = createOffersNode(offers);
    categoryContainer.appendChild(offersNode);

    return categoryContainer;
}

function createCategoryLabelNode(categoryName) {
    const label = document.createElement('label');
    label.textContent = categoryName;
    label.style.margin = "0";
    label.style.fontSize = "14px";
    label.style.fontWeight = "400";
    label.style.lineHeight = "100%";
    label.style.letterSpacing = ".24px";
    label.style.textTransform = "uppercase";
    label.style.flexShrink = "0";
    label.style.display = "flex";
    label.style.alignItems = "center";
    label.style.justifyContent = "center";
    label.style.transform = "none";
    label.style.writingMode = "unset";
    label.style.minHeight = "min-content";
    label.style.width = "100%";
    label.style.padding = "4px 16px";
    label.style.height = "min-content";
    label.style.color = "#797a7b";
    label.style.background = "#e6e6e6";
    label.style.boxSizing = "border-box";
    return label;
}

function createOffersNode(offers) {
    const offersContainer = document.createElement('div');
    offersContainer.style.fontFamily = "Lato,Lato-fallback,Arial,sans-serif";
    offersContainer.style.fontSize = "14px";
    offersContainer.style.lineHeight = "1.428571429";
    offersContainer.style.color = "#d5d5d5";
    offersContainer.style.paddingTop = "16px";
    offersContainer.style.display = "flex";
    offersContainer.style.gap = "16px";
    offersContainer.style.overflowX = "auto";
    offersContainer.style.boxSizing = "border-box";
    for (const offer of offers) {
        const offerNode = createOfferNode(offer);
        offersContainer.appendChild(offerNode);
    }
    return offersContainer;
}

function createOfferNode(offer) {
    const offerContainer = document.createElement('a');
    offerContainer.href = offer.url;

    const icon = createOfferIcon(offer);
    offerContainer.appendChild(icon);

    const price = createPriceNode(offer);
    offerContainer.appendChild(price);
    return offerContainer;
}


function createOfferIcon(offer) {
    // Create an icon for the offer
    const icon = document.createElement("img");
    icon.src = offer.imageSrc;
    icon.title = offer.name;
    icon.alt = offer.name;
    icon.style.height = icon.style.width = "42px";
    return icon;
}

function createPriceNode(offer) {
    const priceNode = document.createElement('div');
    priceNode.innerText = offer.price;
    priceNode.style.fontFamily = "Lato,Lato-fallback,Arial,sans-serif";
    priceNode.style.lineHeight = "1.428571429";
    priceNode.style.cursor = "pointer";
    priceNode.style.boxSizing = "border-box";
    priceNode.style.display = "flex";
    priceNode.style.alignItems = "center";
    priceNode.style.margin = "0";
    priceNode.style.textAlign = "center";
    priceNode.style.fontSize = "13px";
    priceNode.style.textDecoration = "none";
    priceNode.style.color = "#d5d5d5";
    priceNode.style.whiteSpace = "nowrap";
    return priceNode;
}
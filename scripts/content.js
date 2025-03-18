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
        .replace(/^\d+\.\s+/, '')
        .replace(/'/g, '')
        .replace(/ /g, '-');
    return movieTitle;
}

function showOffersPopup(title, port) {
    // Extract movie title under hover
    const movieTitle = extractMovieTitle(title);

    // Send a request to background script for this movie title
    port.postMessage({ title: movieTitle });

    // Create streaming icons based on received data from background script
    const handleMessage = function (msg) {
        const popup = getOffersPopup(title) || createPopup(title, msg.offers);
        popup.style.visibility = "visible";
        title.appendChild(popup);

        // Avoid duplicate logs by removing the event listener after the first message
        port.onMessage.removeListener(handleMessage);
    };
    port.onMessage.addListener(handleMessage);
};

function createLoadingIcon() {
    const icon = document.createElement("img");
    icon.setAttribute("src", chrome.runtime.getURL("/assets/loading.svg"));
    icon.setAttribute("alt", "Loading");
    icon.setAttribute("title", "Loading");
    icon.setAttribute("id", "loading-icon");
    icon.style.width = "42px";
    icon.style.overflow = "visible";
    return icon;
}

function createOfferIcon(offer) {
    // Create an icon for the offer
    const icon = document.createElement("img");
    icon.setAttribute("src", offer.iconUrl);
    icon.setAttribute("title", offer.altText);
    icon.setAttribute("alt", offer.altText);
    icon.setAttribute("href", offer.serviceUrl);
    icon.style.width = "30px";
    return icon;
}

function createPopup(title, offers) {
    const popup = document.createElement("div");
    popup.classList.add("offers-popup");
    popup.style.position = "absolute";
    popup.style.zIndex = "1000";

    const titleRect = title.getBoundingClientRect();
    const scrollX = window.scrollX || document.documentElement.scrollLeft;
    const scrollY = window.scrollY || document.documentElement.scrollTop;
    const left = titleRect.left + titleRect.width / 4 + scrollX;
    const top = titleRect.y + scrollY - 260;
    popup.style.left = left + 'px';
    popup.style.top = top + 'px';

    for (const offer of offers) {
        const icon = createOfferIcon(offer);
        popup.appendChild(icon);
    }

    return popup;

}

function getOffersPopup(title) {
    return title.querySelector(".offers-popup");
}
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
            addHoverToMovieTitle(title, port);
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

function addHoverToMovieTitle(title, port) {
    // Don't create duplicate streaming icons or loading icons for this title, return early.
    if (title.querySelector('.streaming-offers') || title.querySelector("#loading-icon")) {
        return;
    }

    // Add loading icon
    const rateButton = title.querySelector('.ipc-rate-button');
    addLoadingIcon(rateButton);

    // Extract movie title under hover
    const movieTitle = extractMovieTitle(title);

    // Send a request to background script for this movie title
    port.postMessage({ title: movieTitle });

    // Create streaming icons based on received data from background script
    // Avoid duplicate logs by removing the event listener after the first message
    const handleMessage = function (msg) {
        console.log(msg);
        // Remove loading icon
        const loadingIcon = title.querySelector("#loading-icon");
        if (loadingIcon) {
            loadingIcon.remove();
        }
        for (const offer of msg.offers) {
            addOffer(offer, rateButton);
        }
        port.onMessage.removeListener(handleMessage);
    };
    port.onMessage.addListener(handleMessage);
};

function addLoadingIcon(rateButton) {
    const loadingIcon = document.createElement("img");
    loadingIcon.setAttribute("src", chrome.runtime.getURL("/assets/loading.svg"));
    loadingIcon.setAttribute("alt", "Loading");
    loadingIcon.setAttribute("title", "Loading");
    loadingIcon.setAttribute("id", "loading-icon");
    loadingIcon.style.width = "42px";
    loadingIcon.style.overflow = "visible";
    rateButton.insertAdjacentElement('afterend', loadingIcon);
}

function addOffer(offer, rateButton) {
    // Create a new div for the offer
    const newDiv = document.createElement("div");
    newDiv.classList.add("streaming-offers");

    // Create an icon for the offer
    const newIcon = document.createElement("img");
    newIcon.classList.add("provider-icon");
    newIcon.setAttribute("src", offer.iconUrl);
    newIcon.setAttribute("title", offer.altText);
    newIcon.setAttribute("alt", offer.altText);
    newIcon.style.width = "30px";

    // Create a link for the offer
    const newHref = document.createElement("a");
    newHref.classList.add("offer");
    newHref.setAttribute("href", offer.serviceUrl);
    newHref.appendChild(newIcon);
    newDiv.appendChild(newHref);

    // Insert the new div after the rate button
    rateButton.insertAdjacentElement('afterend', newDiv);
}

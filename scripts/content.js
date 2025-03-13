if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', afterDOMLoaded);
} else {
    afterDOMLoaded();
}

function afterDOMLoaded() {
    var port = chrome.runtime.connect({ name: "knockknock" });
    // Select all movie title elements on the IMDB Top 250 page
    const movieTitles = document.querySelectorAll('.ipc-metadata-list-summary-item__tc');

    movieTitles.forEach(titleElement => {
        // Add hover event listener to each movie title
        titleElement.addEventListener('mouseenter', (event) => {
            // Don't create duplicate streaming icons for this title, return early.
            if (titleElement.querySelector('.buybox-row__offers')) {
                return;
            }

            // Extract movie title under hover
            const movieTitleWithOrdinal = titleElement.querySelector('.ipc-title__text').innerText;
            const movieTitle = movieTitleWithOrdinal.replace(/^\d+\.\s+/, '');
            console.log(movieTitle);

            // Send a request to JustWatch for this movie title
            port.postMessage({ title: movieTitle });
            port.onMessage.addListener(function (msg) {
                console.log(msg.offers);
                if (msg.offers) {
                    let rateButton = titleElement.querySelector('.ipc-rate-button');

                    // parse msg.offers from array of {
                    //     label: offerKind,
                    //     serviceUrl: serviceUrls[i],
                    //     altText: altTexts[i],
                    //     iconUrl: iconUrls[i],
                    // }
                    // and create an icon with label under it
                    msg.offers.forEach(offer => {
                        const newDiv = document.createElement("div");
                        newDiv.classList.add("buybox-row__offers");
                        const newIcon = document.createElement("img");
                        newIcon.classList.add("provider-icon");
                        newIcon.setAttribute("src", offer.iconUrl);
                        newIcon.setAttribute("alt", offer.altText);
                        newIcon.setAttribute("title", offer.label);
                        newIcon.style.width = "30px";
                        const newHref = document.createElement("a");
                        newHref.classList.add("offer");
                        newHref.setAttribute("href", offer.serviceUrl);
                        newHref.appendChild(newIcon);
                        newDiv.appendChild(newHref);
                        rateButton.insertAdjacentElement('afterend', newDiv);
                    });

                }
            });

        })
    })
}
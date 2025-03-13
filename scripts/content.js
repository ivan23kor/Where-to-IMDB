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
                if (msg.data) {
                    const newDiv = document.createElement("div");
                    newDiv.innerHTML = msg.data;

                    let rateButton = titleElement.querySelector('.ipc-rate-button');
                    rateButton.insertAdjacentElement('afterend', newDiv);
                }
            });

        })
    })
}
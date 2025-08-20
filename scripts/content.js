// Global popup element
let globalPopup = null;
let currentHoveredTitle = null;
let port = null;
let loadingSpinner = null;

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', afterDOMLoaded);
} else {
    afterDOMLoaded();
}

function afterDOMLoaded() {
    function connect() {
        return chrome.runtime.connect({ name: "port" });
    }

    port = connect();
    port.onDisconnect.addListener(() => {
        console.log("Service worker port disconnected. Reconnecting...");
        port = connect();
    });

    // Create the global popup once
    createGlobalPopup();
    
    // Create loading spinner
    createLoadingSpinner();

    // Select all movie title elements on the IMDB Top 250 page
    const titles = document.querySelectorAll('.ipc-metadata-list-summary-item');
    for (const title of titles) {
        title.addEventListener('mouseenter', (event) => {
            showLoadingSpinner(event);
            showGlobalPopup(title);
        });
        title.addEventListener('mousemove', (event) => {
            moveLoadingSpinner(event);
        });
        title.addEventListener('mouseleave', (event) => {
            hideLoadingSpinner();
            // Clear current hovered title
            if (currentHoveredTitle === title) {
                currentHoveredTitle = null;
            }
            
            // Small delay to allow moving to popup or another title
            setTimeout(() => {
                if (!currentHoveredTitle && !isHoveringPopup()) {
                    hideGlobalPopup();
                }
            }, 100);
        });
    }

    // Hide popup when mouse leaves the page area
    document.addEventListener('mouseleave', () => {
        hideLoadingSpinner();
        hideGlobalPopup();
    });
}

function extractMovieTitle(title) {
    const movieTitle = title.querySelector('.ipc-title__text').innerText
        .replace(/^\d+\.\s+/, '');
    const year = title.querySelector('.cli-title-metadata-item').innerText;
    return `${movieTitle} ${year}`;
}

function createGlobalPopup() {
    globalPopup = document.createElement('div');
    globalPopup.classList.add("global-offers-popup");
    globalPopup.style.fontFamily = "Lato,Lato-fallback,Arial,sans-serif";
    globalPopup.style.fontSize = "14px";
    globalPopup.style.lineHeight = "1.428571429";
    globalPopup.style.color = "#d5d5d5";
    globalPopup.style.boxSizing = "border-box";
    globalPopup.style.display = "none";
    globalPopup.style.flexDirection = "column";
    globalPopup.style.gap = "8px";
    globalPopup.style.border = "1px solid #444";
    globalPopup.style.borderRadius = "8px";
    globalPopup.style.backgroundColor = "rgba(32, 32, 32, 0.95)";
    globalPopup.style.padding = "12px";
    globalPopup.style.backdropFilter = "blur(10px)";
    globalPopup.style.position = "absolute";
    globalPopup.style.zIndex = "1000";
    globalPopup.style.maxWidth = "400px";
    globalPopup.style.width = "auto";
    globalPopup.style.pointerEvents = "auto"; // Allow interaction with popup
    
    // Add hover events to popup itself
    globalPopup.addEventListener('mouseenter', () => {
        // Keep popup visible when hovering over it
    });
    
    globalPopup.addEventListener('mouseleave', () => {
        // Hide popup when leaving both title and popup
        setTimeout(() => {
            if (!currentHoveredTitle) {
                hideGlobalPopup();
            }
        }, 50);
    });
    
    document.body.appendChild(globalPopup);
}

function createLoadingSpinner() {
    loadingSpinner = document.createElement('div');
    loadingSpinner.style.position = 'fixed';
    loadingSpinner.style.zIndex = '9999';
    loadingSpinner.style.display = 'none';
    loadingSpinner.style.pointerEvents = 'none';
    
    const spinnerImg = document.createElement('img');
    spinnerImg.src = chrome.runtime.getURL('assets/loading.svg');
    spinnerImg.style.width = '32px';
    spinnerImg.style.height = '32px';
    
    loadingSpinner.appendChild(spinnerImg);
    document.body.appendChild(loadingSpinner);
}

function showLoadingSpinner(event) {
    if (!loadingSpinner) return;
    
    loadingSpinner.style.display = 'block';
    moveLoadingSpinner(event);
}

function moveLoadingSpinner(event) {
    if (!loadingSpinner) return;
    
    loadingSpinner.style.left = (event.pageX + 10) + 'px';
    loadingSpinner.style.top = (event.pageY - 300) + 'px';
}

function hideLoadingSpinner() {
    if (loadingSpinner) {
        loadingSpinner.style.display = 'none';
    }
}

function showGlobalPopup(title) {
    currentHoveredTitle = title;
    
    // Position the popup next to the title with smart alignment
    const titleRect = title.getBoundingClientRect();
    const scrollX = window.scrollX || document.documentElement.scrollLeft;
    const scrollY = window.scrollY || document.documentElement.scrollTop;
    const left = titleRect.right + scrollX + 10;
    
    // Smart vertical alignment based on screen position
    const viewportHeight = window.innerHeight;
    const titleMiddle = titleRect.top + (titleRect.height / 2);
    const isInTopHalf = titleMiddle < (viewportHeight / 2);
    
    let top;
    if (isInTopHalf) {
        // Align top of popup with top of entry for top half
        top = titleRect.top + scrollY;
    } else {
        // Align bottom of popup with bottom of entry for bottom half
        // We'll adjust this after measuring popup height
        top = titleRect.bottom + scrollY;
    }
    
    globalPopup.style.left = left + 'px';
    // Keep popup hidden until content is loaded
    globalPopup.style.display = "none";
    
    // Set initial position, will adjust after content loads
    globalPopup.style.top = top + 'px';
    
    // Store positioning info for later adjustment
    globalPopup._positionInfo = { titleRect, isInTopHalf, scrollY };
    
    // Clear popup content while waiting for data
    globalPopup.innerHTML = '';
    
    // Extract movie title under hover
    const movieTitle = extractMovieTitle(title);
    
    // Send a request to background script for this movie title
    port.postMessage({ title: movieTitle });
    
    // Create streaming icons based on received data from background script
    const handleMessage = function (msg) {
        if (currentHoveredTitle === title) {
            hideLoadingSpinner(); // Hide the cursor-following spinner
            updateGlobalPopupContent(msg.offers);
            // Show popup only after content is loaded
            globalPopup.style.display = "flex";
            // Adjust position after showing popup
            adjustPopupPosition();
        }
        // Remove the event listener after handling the message
        port.onMessage.removeListener(handleMessage);
    };
    port.onMessage.addListener(handleMessage);
}

function hideGlobalPopup() {
    currentHoveredTitle = null;
    if (globalPopup) {
        globalPopup.style.display = "none";
        globalPopup.innerHTML = "";
    }
    hideLoadingSpinner();
}

function updateGlobalPopupContent(offers) {
    if (!globalPopup) return;
    
    globalPopup.innerHTML = "";
    
    // Check if there are any offers to display
    let hasOffers = false;
    for (const offer of offers) {
        if (offer.offers && offer.offers.length > 0) {
            hasOffers = true;
            break;
        }
    }
    
    // Only show popup if there are offers
    if (hasOffers) {
        for (const offer of offers) {
            const categoryName = offer.categoryName;
            const categoryOffers = offer.offers;
            const category = createCategoryNode(categoryName, categoryOffers);
            if (category) {
                globalPopup.appendChild(category);
            }
        }
        
        // Adjust position after content is loaded
        adjustPopupPosition();
    } else {
        // Show a message when no offers are available
        globalPopup.innerHTML = '<div style="color: #999; font-style: italic; padding: 10px;">No streaming options available</div>';
        adjustPopupPosition();
    }
}

function adjustPopupPosition() {
    if (!globalPopup || !globalPopup._positionInfo) return;
    
    const { titleRect, isInTopHalf, scrollY } = globalPopup._positionInfo;
    const popupRect = globalPopup.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    
    let newTop;
    
    if (isInTopHalf) {
        // Top alignment - ensure popup doesn't go below viewport
        newTop = titleRect.top + scrollY;
        const popupBottom = newTop - scrollY + popupRect.height;
        if (popupBottom > viewportHeight) {
            newTop = scrollY + viewportHeight - popupRect.height - 10;
        }
    } else {
        // Bottom alignment - align bottom of popup with bottom of entry
        newTop = titleRect.bottom + scrollY - popupRect.height;
        // Ensure popup doesn't go above viewport
        if (newTop < scrollY) {
            newTop = scrollY + 10;
        }
        // Ensure popup doesn't go below viewport
        const popupBottom = newTop - scrollY + popupRect.height;
        if (popupBottom > viewportHeight) {
            newTop = scrollY + viewportHeight - popupRect.height - 10;
        }
    }
    
    globalPopup.style.top = newTop + 'px';
}

function isHoveringPopup() {
    return globalPopup && globalPopup.matches(':hover');
}

// Remove this function as we're using a global popup now

// Remove this function as we're using updateGlobalPopupContent now


function createCategoryNode(categoryName, offers) {
    if (!offers || offers.length === 0) return null;
    
    const categoryContainer = document.createElement('div');
    categoryContainer.style.marginBottom = "8px";

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
    offersContainer.style.fontSize = "12px";
    offersContainer.style.lineHeight = "1.2";
    offersContainer.style.color = "#d5d5d5";
    offersContainer.style.paddingTop = "8px";
    offersContainer.style.display = "flex";
    offersContainer.style.gap = "8px";
    offersContainer.style.overflowX = "auto";
    offersContainer.style.boxSizing = "border-box";
    offersContainer.style.flexWrap = "wrap";
    for (const offer of offers) {
        const offerNode = createOfferNode(offer);
        offersContainer.appendChild(offerNode);
    }
    return offersContainer;
}

function createOfferNode(offer) {
    const offerContainer = document.createElement('a');
    offerContainer.href = offer.url;
    offerContainer.style.textDecoration = "none";
    offerContainer.style.display = "flex";
    offerContainer.style.flexDirection = "column";
    offerContainer.style.alignItems = "center";
    offerContainer.style.gap = "4px";
    offerContainer.style.padding = "4px";
    offerContainer.style.borderRadius = "4px";
    offerContainer.style.transition = "background-color 0.2s";
    offerContainer.addEventListener('mouseenter', () => {
        offerContainer.style.backgroundColor = "rgba(255, 255, 255, 0.1)";
    });
    offerContainer.addEventListener('mouseleave', () => {
        offerContainer.style.backgroundColor = "transparent";
    });

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
    icon.style.height = icon.style.width = "32px";
    icon.style.borderRadius = "4px";
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
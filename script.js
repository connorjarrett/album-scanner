const video = document.querySelector("video")
const selector = document.querySelector("select")
const box = document.querySelector(".box")

const barcodeDetector = new BarcodeDetector({});

var currentToken = undefined

var lastScanned = Date.now()
const scannedCodes = []
const catalogue = []

function closeOverlay() {
    if (document.querySelector(".overlay")) {
        document.querySelector(".overlay").remove()
    }
}

function closeCatalogue() {
    document.querySelector(".catalogue").classList.add("hidden")
}

function openCatalogue() {
    document.querySelector(".catalogue").classList.remove("hidden")
}

function escapeCSVValue(value) {
    if (Array.isArray(value)) {
        value = value.join('|'); // join arrays with a pipe
    }
    if (value === null || value === undefined) return '';
    value = String(value);
    // If the value contains a comma, quote, or newline, wrap in quotes and escape quotes
    if (/[",\n]/.test(value)) {
        value = `"${value.replace(/"/g, '""')}"`;
    }
    return value;
}

function objectsToCSV(data) {
    if (!data || !data.length) return '';

    // Get the headers from the keys of the first object
    const headers = Object.keys(data[0]);

    // Convert each object to a CSV row
    const rows = data.map(obj =>
        headers.map(header => escapeCSVValue(obj[header])).join(',')
    );

    // Combine headers and rows
    return [headers.join(','), ...rows].join('\n');
}


function sortCatalogue(sortType) {
    var sorted = catalogue

    if (sortType) {
        if (sortType == 'value') {
            sorted.sort((a, b) => {
                return b.value - a.value
            })
        } else if (sortType == 'artist') {
            sorted.sort((a, b) => {
                return a.artist.localeCompare(b.artist)
            })
        } else if (sortType == 'added') {
            sorted.sort((a, b) => {
                return b.scanned - a.scanned
            })
        } else if (sortType == 'year') {
            sorted.sort((a, b) => {
                return b.year - a.year
            })
        }
    }

    return sorted
}

function regenerateCatalogue() {
    const list = document.querySelector(".catalogue ul")
    document.querySelectorAll(".catalogue li").forEach(li => {
        li.remove()
    })

    const sortType = document.querySelector(".catalogue").dataset.sort
    var sortedCatalogue = sortCatalogue(sortType)

    sortedCatalogue.forEach(album => {
        const li = document.createElement("li")

        const img = document.createElement("img")
        img.src = album.img
        li.appendChild(img)

        const info = document.createElement("div")
        li.appendChild(info)

        const title = document.createElement("h3")
        title.textContent = `(${album.year}) ${album.title}`
        info.appendChild(title)

        const value = document.createElement("h4")
        value.innerHTML = `Selling for &euro;${album.value} ${album.wantsToSell ? '&vert; Marked for sale' : ''}`
        info.appendChild(value)

        const link = document.createElement("a")
        link.textContent = "View on Discogs"
        link.href = `https://www.discogs.com/release/${album.release_id}`
        link.target = '_blank'
        info.appendChild(link)

        list.appendChild(li)
    })
}

function setSortType(sort) {
    document.querySelector(".catalogue").dataset.sort = sort
    regenerateCatalogue()
}

function downloadCatalogueAs(type) {
    const sortType = document.querySelector(".catalogue").dataset.sort
    var a = document.querySelector('#downloader')

    if (!a) {
        a = document.createElement("a")
        a.id = "downloader"
        document.body.appendChild(a)
    }


    if (type == "json") {
        console.log("DOWNLOAD AS JSON")

        a.href = `data:text/json;charset=utf-8,${encodeURIComponent(JSON.stringify(sortCatalogue(catalogue), null, 4))}`
        a.download = "catalogue-json.json"

        a.click()
    } else if (type == "csv") {
        console.log("DOWNLOAD AS CSV")

        a.href = `data:text/csv;charset=utf-8,${encodeURIComponent(objectsToCSV(sortCatalogue(catalogue)))}`
        a.download = "catalogue-csv.csv"

        a.click()
    } else {
        console.error(`Invalid download type '${type}'`)
    }
}

async function addAlbum(album, wantsToSell) {
    const release = (await axios.get(album.resource_url)).data

    catalogue.push({
        barcode: album.barcode,
        title: album.title,
        artist: release.artists_sort,
        year: album.year,
        value: release.lowest_price ? release.lowest_price : 0,
        master_id: album.master_id,
        release_id: release.id,
        img: album.cover_image,
        tracks: release.tracklist.length,
        scanned: Date.now(),
        wantsToSell
    })

    regenerateCatalogue()
    console.log(album)
}

function discogsQuery(barcode) {
    axios.get(`https://api.discogs.com/database/search`, {
        params: {
            barcode,//: '0602455814692',

            type: 'release',
            token: checkAuth()
        }
    })
        .then(response => response.data.results)
        .then((results) => {
            if (results.length == 0) {
                console.error("No Results")

                var sound = new Audio('./sound/error.mp3');
                sound.play();
            } else {
                results.sort((a, b) => {
                    // Prioritize "Worldwide" or "USA & Europe"
                    const isPriorityA = (a.country === "Worldwide" || a.country === "USA & Europe") ? 1 : 0;
                    const isPriorityB = (b.country === "Worldwide" || b.country === "USA & Europe") ? 1 : 0;

                    if (isPriorityA !== isPriorityB) {
                        return isPriorityB - isPriorityA; // Prioritize the one with 1
                    }

                    // If both are priority or both are not, sort by whether thumb is non-empty
                    const hasThumbA = a.thumb ? 1 : 0;
                    const hasThumbB = b.thumb ? 1 : 0;

                    return hasThumbB - hasThumbA; // Prioritize non-empty thumb
                });

                const result = results[0]
                console.log(results)
                result.barcode = barcode

                closeOverlay()

                const overlay = document.createElement("div")
                overlay.classList = "overlay"

                const article = document.createElement("article")
                overlay.appendChild(article)

                const h2 = document.createElement("h2")
                h2.textContent = "Does the album match?"
                article.appendChild(h2)

                const h3 = document.createElement("h3")
                h3.textContent = result.title
                article.appendChild(h3)

                const img = document.createElement("img")
                img.src = result.cover_image
                article.appendChild(img)

                const buttons = document.createElement("div")
                buttons.classList = "selector"
                article.appendChild(buttons)

                const yes = document.createElement("button")
                yes.classList = "green"
                yes.textContent = "Yes"
                yes.onclick = () => {
                    // confirmAlbum(result)
                    document.querySelector(".overlay").childNodes.forEach(c => {
                        c.remove()
                    })

                    promptSell(result)
                }
                buttons.appendChild(yes)

                const no = document.createElement("button")
                no.classList = "red"
                no.textContent = "Try Again"
                no.onclick = closeOverlay
                buttons.appendChild(no)

                document.body.appendChild(overlay)
            }
        })

}

async function promptSell(result) {
    const release = (await axios.get(result.resource_url)).data
    closeOverlay()

    console.log(release)

    const overlay = document.createElement("div")
    overlay.classList = "overlay"

    const article = document.createElement("article")
    overlay.appendChild(article)

    const h2 = document.createElement("h2")
    h2.textContent = "Would you like to sell it?"
    article.appendChild(h2)

    const h3 = document.createElement("h3")
    h3.innerHTML = `It's currently going for &euro;${release.lowest_price} and ${release.community.want} people want it!`
    article.appendChild(h3)

    const img = document.createElement("img")
    img.src = result.cover_image
    article.appendChild(img)

    const buttons = document.createElement("div")
    buttons.classList = "selector"
    article.appendChild(buttons)

    const sell = document.createElement("button")
    sell.classList = "green"
    sell.textContent = "View on Discogs"
    sell.onclick = () => {
        closeOverlay()
        addAlbum(result, true)
        window.open(`https://www.discogs.com/sell/release/${release.id}`)
    }
    buttons.appendChild(sell)

    const keep = document.createElement("button")
    keep.textContent = "Keep"
    keep.onclick = () => {
        addAlbum(result, false)
        closeOverlay()
    }
    buttons.appendChild(keep)

    document.body.appendChild(overlay)
}

// discogsQuery('602455814692')

async function scan() {
    const barcodes = await barcodeDetector.detect(video)

    if (Date.now() - lastScanned > 1000) {
        box.style.opacity = "0"
    }

    if (barcodes.length == 0 || document.querySelector(".overlay") || document.querySelector(".catalogue:not(.hidden)")) {
        return false
    }

    const code = barcodes[0]

    if (scannedCodes.indexOf(code.rawValue) < 0) {
        discogsQuery(code.rawValue)
        scannedCodes.push(code.rawValue)

        var sound = new Audio('./sound/positive.mp3');
        sound.play();

        const rect = code.boundingBox

        box.style.opacity = "1"
        box.style.left = `${rect.left}px`;
        box.style.top = `${rect.top}px`;
        box.style.width = `${rect.width}px`;
        box.style.height = `${rect.height}px`;

        lastScanned = Date.now()
    } else {
        var foundAlbum = catalogue.find(e => e.barcode == code.rawValue)

        if (foundAlbum) {
            var sound = new Audio('./sound/warning.mp3');
            sound.play();

            setTimeout(() => {
                alert(`Already sanned '${foundAlbum.title}'`)
            }, 50)
        }
    }
}

function loadFromID(id) {
    navigator.mediaDevices
        .getUserMedia({
            video: {
                deviceId: id
            }
        })
        .then(async (stream) => {
            console.log(stream)

            video.srcObject = stream
            video.play()
        })
}

document.querySelector("#auth form").addEventListener("submit", (e) => {
    e.preventDefault();

    const token = document.querySelector("#auth #token").value

    axios.get(`https://api.discogs.com/database/search`, {
        params: {
            q: '',
            token
        }
    })
        .then((response) => {
            // Success
            currentToken = token

            closeOverlay()
            startCamera()
        })
        .catch((err) => {
            console.error(err)

            alert(err.response.data.message)
        })

})

function checkAuth() {
    if (currentToken != undefined) {
        return currentToken
    } else {
        alert("Invalid Token! Refresh Page.")
    }
}

function startCamera() {
    navigator.mediaDevices
        .getUserMedia({
            video: true
        })
        .then(async () => {
            const devices = await navigator.mediaDevices.enumerateDevices()
            const cameras = devices.filter(d => d.kind == "videoinput").map(d => { return { id: d.deviceId, name: d.label } })

            cameras.forEach((camera) => {
                var option = document.createElement("option")
                option.textContent = camera.name
                option.value = camera.id

                selector.appendChild(option)
            })

            loadFromID(cameras[0].id)
            setInterval(scan, 100)
        })
        .catch((error) => {
            var sound = new Audio('./sound/warning.mp3');
            sound.play();

            setTimeout(() => {
                alert("Check if a camera is connected or if your browser supports mediaDevices")
            }, 100)

            console.error(error)
        })
}

selector.onchange = () => {
    loadFromID(selector.value)
}

/*
navigator.mediaDevices
    .getUserMedia({
        video: { width: 1280 }
    })
    .then(async (stream) => {
        console.log(stream)
        video.srcObject = stream
        video.play()

        navigator.mediaDevices.enumerateDevices()
            .then((devices) => {
                devices.forEach((device) => {
                    if (device.kind == "videoinput") {
                        console.log(`${device.kind}: ${device.label} id = ${device.deviceId}`);
                    }
                });
            })

        setInterval(scan, 500)
    })
    .catch((error) => {
        alert("Error - check if a camera is connected")
        console.error(error)
    })
*/
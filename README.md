# album-scanner
A web app to quickly scan Vinyl & CDs using their barcode to quickly catalogue them and find out how much they're worth.

## How It Works
This app is simple and easy to use, here's how:
1. Enter Discogs key & allow camera
2. Hold the camera up to the barcode on the album (usually at the back)
3. Repeat for your whole catalogue
4. View by clicking **My Catalogue**
5. Sort by Year, Scan Time, Artist, and Value
6. Export as either a CSV or JSON

## Setup
### Camera Access
This app requires your camera, there's no manual entry feature.
To save time, make sure you have a camera connected before you enter your token.

If you have multiple cameras (e.g. front & back) you can easily switch between them on the go.

### Discogs API
Due to restricitons with this type of web-app, and in the favour of keeping things simple, you'll need to supply your own Discogs personal access token.

It's free and simple to get — and isn't shared with anyone except Discogs.

1. Head to [Account &rarr; Developers]("https://www.discogs.com/settings/developers")
2. Click **Generate token**
3. Copy the token, and enter it in the box

[Discogs API Documentation](https://www.discogs.com/developers/)
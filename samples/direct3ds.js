// Sample code environment variables.
MERCHANT_ID="100856"
MERCHANT_SECRET="Circle4Take40Idea"
GATEWAY_URL="https://gateway.cardstream.com/direct/"

const { Gateway } = require("../gateway.js");
const fs = require("fs");
const path = require("path");
var express = require("express");
var https = require("https");
var app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Direct (3DS) example.
app.get("/direct3ds", function (req, res) {

	let htmlBody = "<h1>Direct (3DS) example</h1>";
	console.log("Direct (3DS) example");

	// The direct form Url for the SDK can be set via the directUrl property 
	// or passed as the field redirectUrl in the request.
	Gateway.directUrl = GATEWAY_URL; // https://gateway.cardstream.com.com/direct/

	// Gateway request.
	let gatewayRequest = {
		"merchantID": MERCHANT_ID,
		"action": "SALE",
		"type": "1",
		"transactionUnique": "NodeSDK Sample code test",
		"countryCode": "826",
		"currencyCode": "826",
		"amount": "1001",
		"cardNumber": "4012001037141112",
		"cardExpiryMonth": "12",
		"cardExpiryYear": "20",
		"cardCVV": "083",
		"customerName": "Test Customer",
		"customerEmail": "test@testcustomer.com",
		"customerAddress": "16 Test Street",
		"customerPostCode": "TE15 5ST",
		"orderRef": "Test purchase",
		"remoteAddress": "127.0.0.1",
		"threeDSRedirectURL": "https://localhost:8989/direct3ds",
		"deviceChannel": "browser",
		"deviceIdentity": req.headers['user-agent'],
		"deviceTimeZone": "0",
		"deviceCapabilities": "javascript",
		"deviceScreenResolution": "1x1x1",
		"deviceAcceptContent": req.headers['accept'],
		"deviceAcceptLanguage": req.headers['accept-language'],
	};

	// A safer alternative to passing the secret in the request is to set it on the SDK.
	Gateway.merchantSecret = MERCHANT_SECRET;

	// Output request.
	htmlBody += "<label>Direct request before being prepared</label>";
	htmlBody += prettyPrint(gatewayRequest);
	console.log("Direct request pre signature", gatewayRequest);

	// A 3rd alterative is to sign the request manually using the SDK.
	gatewayRequest.signature = Gateway.sign(gatewayRequest, MERCHANT_SECRET);

	console.log("Processing direct request");

	Gateway.directRequest(gatewayRequest).then((response) => {

		console.log("Response from gateway: ", response);
		htmlBody += "<h2>Gateway response</h2>" + prettyPrint(response);

		try {

			// Verify the response.
			Gateway.verifyResponse(response, MERCHANT_SECRET)

			// If the response from the gateway is 65802 then 3DS authentication is required.
			if (response.responseCode == "65802") {

				console.log("3DS Authentication is required");

				// Build HTML form to submit 3DS data.
				htmlBody += "<form action=" + response.threeDSURL + " method=\"POST\">";
				Object.keys(response.threeDSRequest).forEach((key) => {
					htmlBody += "<input type=\"hidden\" name=\"" + key + "\" value=\"" + response.threeDSRequest[key] + "\" />\n";
				});
				htmlBody += "<input type=\"submit\" value=\"Submit\"></form>";

				console.log("Setting cookie with threeDSRef: ", response.threeDSRef);

				// output to page
				res.writeHead(200, {
					'Set-Cookie': 'threeDSRef=' + response.threeDSRef + ';path=/direct3ds',
					'Content-Type': 'text/html'
				});

			} else {

				// Process the response from direct.
				if (response.responseCode == 0) {
					htmlBody += "Transaction successful";
				} else {
					htmlBody += "Transaction failed";
				}

				res.writeHead(200, {
					'Content-Type': 'text/html'
				});
			}

		} catch (error) {

			console.log("Error : ", error);
			htmlBody += "The response could not be verified.";

			res.writeHead(200, {
				'Content-Type': 'text/html'
			});
		}


		// Write output to browser.
		res.write(htmlBody);
		res.end();

	}).catch((error) => {
		console.error(error);
	});


});


// Direct example - ACS response.
app.post("/direct3ds", function (req, res) {

	let htmlBody = "<h1>Direct example (3DS) - response from ACS</h1>";
	console.log("Direct example (3DS) - response from ACS", req.body);

	// ACS response to be sent back to the gateway.
	let acsResponse = {
		merchantID: MERCHANT_ID,
		threeDSRef: "",
		threeDSResponse: {},
		directUrl: GATEWAY_URL // https://gateway.cardstream.com.com/direct/"
	};

	// Add each field returned from ACS to the threeDSResponses fields.
	acsResponse.threeDSResponse = Object.fromEntries(new URLSearchParams(req.body))

	// Get the threeDSRef from the cookie stored previously and add it to the acsResponse.
	acsResponse.threeDSRef = req.headers.cookie.slice(req.headers.cookie.indexOf('=') + 1);

	// Sign the request.
	acsResponse.signature = Gateway.sign(acsResponse, MERCHANT_SECRET);

	// Send the ACS response to the gateway.
	Gateway.directRequest(acsResponse).then((response) => {

		console.log("Response from gateway: ", response);

		try {

			// Verify the response.
			Gateway.verifyResponse(response, MERCHANT_SECRET)

			if (response.responseCode == "65802") {

				console.log("Further 3DS authentication required");

				// Build HTML form
				htmlBody += "<form action=" + response.threeDSURL + " method=\"POST\">";
				Object.keys(response.threeDSRequest).forEach((key) => {
					htmlBody += "<input type=\"hidden\" name=\"" + key + "\" value=\"" + response.threeDSRequest[key] + "\" />\n";
				});

				htmlBody += "<input type=\"submit\" value=\"Submit\"></form>";

				console.log("Setting cookie threeDSRef: ", response.threeDSRef);

				// output to page
				res.writeHead(200, {
					'Set-Cookie': 'threeDSRef=' + response.threeDSRef + ';path=/direct3ds',
					'Content-Type': 'text/html'
				});

			} else {

				// Process the response from direct.
				if (response.responseCode == 0) {
					htmlBody += "Transaction successful";
				} else {
					htmlBody += "Transaction failed";
				}

				res.writeHead(200, {
					'Content-Type': 'text/html'
				});

			}

		} catch (error) {

			console.log("Error : ", error);
			htmlBody += "The response could not be verified.";

			res.writeHead(200, {
				'Content-Type': 'text/html'
			});
		}

		htmlBody += prettyPrint(response);

		res.write(htmlBody);
		res.end();

	});
});

/**
 * Pretty Print 
 * 
 * Converts an objects fields to a 
 * HTML list of field names and values.
 * @param {*} fields 
 * @returns 
 */
function prettyPrint(fields) {
	return "<pre>" + JSON.stringify(fields, undefined, 2) + "</pre>";
}

https
	.createServer(
		{
			cert: fs.readFileSync(path.resolve(__dirname, './servercertificate.crt')),
			key: fs.readFileSync(path.resolve(__dirname, './servercertificatekey.key')),
		},
		app
	)
	.listen(8989, function () {
		console.log(
			"Server listening. Visit https://localhost:8989/direct3ds"
		);
	});

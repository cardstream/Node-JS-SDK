// Sample code environment variables.
MERCHANT_ID="100856"
MERCHANT_SECRET="Circle4Take40Idea"
GATEWAY_URL="https://gateway.cardstream.com/paymentform/"

const { Gateway } = require("../gateway.js");
const fs = require("fs");
const path = require("path");
var express = require("express");
var https = require("https");
var app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Hosted form example - request.
app.get("/hosted", function (req, res) {

	let htmlBody = "<h1>Hosted form example</h1>";

	// The hosted form Url for the SDK can be set via the hostedUrl property 
	// or passed as the field redirectUrl in the request.
	Gateway.hostedUrl = GATEWAY_URL; // https://gateway.cardstream.com.com/paymentform/

	// Create the hosted form request to send to the gateway.
	let gatewayRequest = {
		"merchantID": MERCHANT_ID,
		"action": "SALE",
		"type": 1,
		"transactionUnique": "NodeSDK Sample code test",
		"countryCode": 826,
		"currencyCode": 826,
		"amount": 1001,
		"redirectURL": "https://localhost:8989/hosted/response/",
	};

	// A safer alternative to passing the secret in the request is to set it on the SDK.
	Gateway.merchantSecret = MERCHANT_SECRET;

	// Output request.
	htmlBody += "<label>Hosted form request before being prepared</label>";
	htmlBody += prettyPrint(gatewayRequest);
	console.log("Hosted form request pre signature", gatewayRequest);

	// A 3rd alterative is to sign the request manually using the SDK.
	gatewayRequest.signature = Gateway.sign(gatewayRequest, MERCHANT_SECRET);

	// Using the gateway SDK, pass the gateway request to the hostedRequest
	// function which will return a HTML form.
	htmlBody += Gateway.hostedRequest(gatewayRequest);

	// Output request signed and prepared.
	htmlBody += "<label>Hosted form request</label>";
	htmlBody += prettyPrint(gatewayRequest);
	console.log("Hosted form HTML", htmlBody);

	// Output the HTML to the browser.
	res.writeHead(200, {
		'Content-Type': 'text/html'
	});
	res.write(htmlBody);
	res.end();

});


// Hosted form example - response.
app.post("/hosted/response", function (req, res) {

	console.log("Hosted form response: ", req.body);
	var htmlBody = "<h1>Hosted form response</h1>";

	try {

		// Verify the response.
		Gateway.verifyResponse(req.body, MERCHANT_SECRET)

		// Process the response from the hosted form.
		if (req.body.responseCode == 0) {
			htmlBody += "Transaction successful";
		} else {
			htmlBody += "Transaction failed";
		}

	} catch (error) {
		console.log("Error : ", error);
		htmlBody += "The response could not be verified.";
	}

	// Output response from the hosted form.
	htmlBody += prettyPrint(req.body)
	res.writeHead(200, {
		'Content-Type': 'text/html'
	});
	res.write(htmlBody);
	res.end();

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
			"Server listening. Visit https://localhost:8989/hosted/"
		);
	});

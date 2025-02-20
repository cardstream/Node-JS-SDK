# README

# Contents
- Introduction
- Prerequisites
- Using the Gateway SDK
- Sample Code
- License

# Introduction
This NodeJS SDK provides an easy method to integrate with the payment gateway.
 - The GatewaySDK.js file contains the main body of the SDK.
 - The tests/Sample.js file is intended as a minimal guide to demonstrate a complete 3DSv2 authentication process.

# Prerequisites
- The SDK requires the following prerequisites to be met in order to function correctly:
    - Node v12.x+
	- _crypto-js (`npm install crypto-js`)
    - _axios_ module (`npm install axios`)

	npm i --production

> <span style="color: red">Please note that we can only offer support for the SDK itself. While every effort has been made to ensure the sample code is complete and bug free, it is only a guide and should not be used in a production environment.</span>

# Using the Gateway SDK

Require the gateway SDK into your project

```
const gateway = require('./gateway.js').Gateway;
```

Once your SDK has been required. You create your request array, for example:
```
reqFields = {
	"merchantID" => "XXXXXX",
	"action" => "SALE",
	"type" => 1,
	"transactionUnique" => uniqid,
	"countryCode" => 826,
	"currencyCode" => 826,
	"amount" => 1001,
	"cardNumber" => "XXXXXXXXXXXXXXXX",
	"cardExpiryMonth" => XX,
	"cardExpiryYear" => XX,
	"cardCVV" => "XXX",
	"customerName" => "Test Customer",
	"customerEmail" => "test@testcustomer.com",
	"customerAddress" => "30 Test Street",
	"customerPostcode" => "TE15 5ST",
	"orderRef" => "Test purchase",

	# The following fields are mandatory for 3DS v2
	"remoteAddress": "127.0.0.1",
	"threeDSRedirectURL": "https://localhost:8989/direct3ds",
	"deviceChannel": "browser",
	"deviceIdentity": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/111.0.0.0 Safari/537.36",
	"deviceTimeZone": "0",
	"deviceCapabilities": "javascript",
	"deviceScreenResolution": "1x1x1",
	"deviceAcceptContent": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
	"deviceAcceptLanguage": "en-GB,en-US;q=0.9,en;q=0.8",
}

```
> NB: This is a sample request. The gateway features many more options. Please see our integration guides for more details.

Then, depending on your integration method, you'd either call (as a promise):

```
gateway.directRequest(reqFields)
```

OR

```
gateway.hostedRequest(reqFields)
```

And then handle the response received from the gateway.


Sample Code's
----

To use the sample code change the constants at the top of the hosted.js or direct.js file.

MERCHANT_ID="merchant_id_here" replace merchant_id_here with your Gateways merchant id.
MERCHANT_SECRET="merchant_secret_here" replace merchant_secret_here with your Gateways merchant secret.
GATEWAY_URL="https://gateway.cardstream.com.com/" replace https://gateways.cardstream.com.com with your Gateways intergration URL.

To run the Hosted sample code - node samples/hosted.js
A server will start on port 8989. Visit https://localhost:8989/hosted

To run the Direct 3DS sample code - node samples/direct3ds.js
A server will start on port 8989. Visit https://localhost:8989/direct3ds

License
----
MIT

**Disclaimer**

Sample code, SDKs and modules have been created as reference material only. Modules are developed and tested against vanilla base platform installs only. Any further module compatibility would need to be tested by the user/merchant/developer. Version support is as shown within the associated VERSION section. All sample code, SDKs and modules offer foundation transaction functionality for merchant and developers to use as a guide and/or to adapt, enhance or otherwise build upon. For the avoidance of doubt, this means that some desired functionality may not be useable or exist. All sample code, SDKs or modules that are used will require complete full end to end testing by the user/merchant/developer. Further to this, use of any sample code, SDKs or modules, Cardstream bears no responsibility for; nor extends any warranty in regard to; nor accepts any liability arising due to any changes or errors in functionality that may result. Developers, merchants or other users of any sample code, SDKs or modules accept these conditions de facto upon usage.

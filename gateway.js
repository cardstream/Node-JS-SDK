/**
 * Class to communicate with Payment Gateway
 */
const crypto = require("crypto");
const axios = require("axios");

var Gateway = {
	/**
	 * @var string	Gateway Hosted API Endpoint
	 */
	hostedUrl: "https://gateway.cardstream.com.com/paymentform/",

	/**
	 * @var string	Gateway Direct API Endpoint
	 */
	directUrl: "https://gateway.cardstream.com.com/direct/",

	/**
	 * @var string	Merchant Account Id or Alias
	 */
	merchantID: "100856",

	/**
	 * @var string	Password for above Merchant Account
	 */
	merchantPwd: null,

	/**
	 * @var string	Secret for above Merchant Account
	 */
	merchantSecret: "Circle4Take40Idea",

	/**
	 * @var string	Proxy URL if required (eg. 'https://www.proxy.com:3128')
	 */
	proxyUrl: null,

	/**
	 * @var boolean	Enable debugging
	 */
	debugOn: false,

	/**
	 * Useful response codes
	 */
	RC_SUCCESS: 0, // Transaction successful
	RC_DO_NOT_HONOR: 5, // Transaction declined 
	RC_3DS_AUTHENTICATION_REQUIRED: 0x1010a,

	/**
	 * Send request to Gateway using HTTP Direct API.
	 *
	 * The method will send a request to the Gateway using the HTTP Direct API.
	 *
	 * The request will use the following Gateway properties unless alternative
	 * values are provided in the request;
	 *   + 'directUrl'		- Gateway Direct API Endpoint
	 *   + 'merchantID'		- Merchant Account Id or Alias
	 *   + 'merchantPwd'	- Merchant Account Password (or null)
	 *   + 'merchantSecret'	- Merchant Account Secret (or null)
	 *
	 * The method will {@link sign() sign} the request and also {@link
	 * verifySignature() check the signature} on any response.
	 *
	 * The method will throw an exception if it is unable to send the request
	 * or receive the response.
	 *
	 * The method does not attempt to validate any request fields.
	 *
	 * @param	array	request		request data
	 * @param	array	options		options (or null)
	 * @return	promise				request response
	 *
	 */
	directRequest: function (request, options) {
		this.debug("directRequest() - args=", request, options);

		var requestSettings = Gateway.prepareRequest(request, options);

		// Handle response
		var resolve_response = function (data) {
			if (!data) {
				throw Error("No response from Payment Gateway");
			}

			Gateway.verifyResponse(data, requestSettings.secret);
			Gateway.debug("directRequest() - ret=", data);

			return data;
		};

		var URLEncodedRequest = http_build_query(request);

		const config = {
			method: "post",
			url: requestSettings.direct_url,
			data: URLEncodedRequest,
			headers: { "Content-Type": "application/x-www-form-urlencoded" },
			mode: "no-cors", // 'cors' by default
		};

		let res = new Promise((resolve, reject) => {
			axios(config)
				.then((response) => {
					responseFields = http_parse_query(response.data);
					resolve_response(responseFields)
					resolve(responseFields);
				})
				.catch((error) => {
					reject(error);
				});
		});

		return res;
	},

	/**
	 * Prepare a request for sending to the Gateway.
	 *
	 * The method will extract the following configuration properties from the
	 * request if they are present and return them in an array;
	 *   + 'merchantSecret'	- Merchant Account Secret (or null)
	 *   + 'directUrl'		- Gateway Direct API Endpoint
	 *   + 'hostedUrl'		- Gateway Hosted API Endpoint
	 *
	 * The method will insert the following configuration properties into the
	 * request if they are not already present;
	 *   + 'merchantID'		- Merchant Account Id or Alias
	 *   + 'merchantPwd'	- Merchant Account Password (or null)
	 *
	 * The method will throw an exception if the request doesn't contain an
	 * 'action' element or a 'merchantID' element (and none could be inserted).
	 *
	 * The method does not attempt to validate any request fields.
	 *
	 * @param	array	request		request data (input & return)
	 * @param	array	options		options (or null)
	 * @return	array				extacted properties
	 */
	prepareRequest: function (request, options) {
		if (!request) {
			throw Error("Request must be provided.");
		}

		// Insert 'merchantID' if doesn't exist and default is available
		if (!request.merchantID && Gateway.merchantID) {
			request.merchantID = Gateway.merchantID;
		}

		// Insert 'merchantPwd' if doesn't exist and default is available
		if (!request.merchantPwd && Gateway.merchantPwd) {
			request.merchantPwd = Gateway.merchantPwd;
		}

		// A 'merchantID' must be set
		if (!request.merchantID) {
			throw Error("Merchant ID or Alias must be provided.");
		}

		var ret = {};

		if (request.merchantSecret) {
			ret.secret = request.merchantSecret;
			delete request.merchantSecret;			
		} else {
			ret.secret = Gateway.merchantSecret;
		}

		if (request.hostedUrl) {
			ret.hosted_url = request.hostedUrl;
		} else {
			ret.hosted_url = Gateway.hostedUrl;
		}

		if (request.directUrl) {
			ret.direct_url = request.directUrl;
		} else {
			ret.direct_url = Gateway.directUrl;
		}

		// Remove items we don't want to send in the request
		// (they may be there if a previous response is sent)
		delete request.responseCode;
		delete request.responseMessage;
		delete request.responseStatus;
		delete request.state;
		delete request.merchantAlias;
		delete request.merchantID2;
		delete request.hostedUrl;
		delete request.directUrl;
		delete request.signature;
		
		if(!request.signature) {
			request.signature = Gateway.sign(request, ret.secret);
		}

		return ret;
	},

	/**
   * Send request to Gateway using HTTP Hosted API.
   *
   * The method will send a request to the Gateway using the HTTP Hosted API.
   *
   * The request will use the following Gateway properties unless alternative
   * values are provided in the request;
   *   + 'hostedUrl'		- Gateway Hosted API Endpoint
   *   + 'merchantID'		- Merchant Account Id or Alias
   *   + 'merchantPwd'	- Merchant Account Password (or null)
   *   + 'merchantSecret'	- Merchant Account Secret (or null)
   *
   * The method accepts the following options;
   *   + 'formAttrs'		- HTML form attributes string
   *   + 'submitAttrs'	- HTML submit button attributes string
   *   + 'submitImage'	- URL of image to use as the Submit button
   *   + 'submitHtml'		- HTML to show on the Submit button
   *   + 'submitText'		- Text to show on the Submit button
   *
   * 'submitImage', 'submitHtml' and 'submitText' are mutually exclusive
   * options and will be checked for in that order. If none are provided
   * the submitText='Pay Now' is assumed.
   *
   * The method will sign the request, to allow for submit
   * button images etc. partial signing will be used.
   *
   * The method returns the HTML fragment that needs including in order to
   * send the request.
   *
   * The method will throw an exception if it is unable to send the request.
   *
   * The method does not attempt to validate any request fields.
   *
   * If the request doesn't contain a 'redirectURL' element then one will be
   * added which redirects the response to the current script.
   *
   *
   * @param	{array}	request	request data
   * @param	{array}	options	options (or null)
   * @return	{string}			request HTML form.
   *
   * @throws	if there's invalid request data
   */
	hostedRequest: function (request, options = {}) {
		this.debug("hostedRequest() - args=", request, options);

		var requestSettings = this.prepareRequest(request, options);

		if (!('redirectURL' in request)) {
			throw new Error("redirectURL not set in request and unable to set from environment");
		}

		let ret = '<form method="post" ' +
			(('formAttrs' in options) ? options['formAttrs'] : '') +
			' action="' + htmlentities(requestSettings['hosted_url']) + "\">\n";

		for (const [name, value] of Object.entries(request)) {
			ret += fieldToHtml(name, value);
		}

		if ('submitAttrs' in options) {
			ret += options['submitAttrs'];
		}

		if ('submitImage' in options) {
			ret += '<input ' +
				('submitAttrs' in options) ? options['submitAttrs'] : '' +
				' type="image" src="' + htmlentities(options['submitImage']) + "\">\n";
		} else if ('submitHtml' in options) {
			ret += '<button type="submit" ' +
				(('submitAttrs' in options) ? options['submitAttrs'] : '') +
				">" + options['submitHtml'] + "</button>\n";
		} else {
			ret += '<input ';
			ret += (('submitAttrs' in options) ? options['submitAttrs'] : '');
			ret += ' type="submit" value="' + (('submitText' in options) ? htmlentities(options['submitText']) : 'Pay Now') + "\">\n";
		}

		ret += "</form>\n";
		return ret;
	},


	/**
	 * Verify the any response.
	 *
	 * This method will verify that the response is present, contains a response
	 * code and is correctly signed.
	 *
	 * If the response is invalid then an exception will be thrown.
	 *
	 * Any signature is removed from the passed response.
	 *
	 * @param	array	data		reference to the response to verify
	 * @param	string	secret		secret to use in signing
	 * @return	boolean				true if signature verifies
	 */
	verifyResponse: function (response, secret) {
		if (!response || typeof response.responseCode === "undefined") {
			throw Error("Invalid response from Payment Gateway");
		}

		if (!secret) {
			secret = Gateway.merchantSecret;
		}

		var fields = null;
		var signature = null;
		if (typeof response.signature !== "undefined") {
			signature = response.signature;
			delete response.signature;
			if (secret && signature && signature.indexOf("|") !== -1) {
				[signature, fields] = signature.split("|");
			}
		}

		// We display three suitable different exception messages to help show
		// secret mismatches between ourselves and the Gateway without giving
		// too much away if the messages are displayed to the Cardholder.
		if (!secret && signature) {
			// Signature present when not expected (Gateway has a secret but we don't)
			throw Error("Incorrectly signed response from Payment Gateway (1)");
		} else if (secret && !signature) {
			// Signature missing when one expected (We have a secret but the Gateway doesn't)
			throw Error("Incorrectly signed response from Payment Gateway (2)");
		} else if (secret && Gateway.sign(response, secret, fields) !== signature) {
			// Signature mismatch
			throw Error("Incorrectly signed response from Payment Gateway");
		}

		// Put the signature back into the response.
		response.signature = signature;

		return true;
	},

	/**
	 * Sign the given array of data.
	 *
	 * This method will return the correct signature for the data array.
	 *
	 * If the secret is not provided then any {@link merchantSecret
	 * default secret} is used.
	 *
	 * The partial parameter is used to indicate that the signature should
	 * be marked as 'partial' and can take three possible value types as
	 * follows;
	 *   + boolean	- sign with all data fields
	 *   + string	- comma separated list of data field names to sign
	 *   + array	- array of data field names to sign
	 *
	 * @param	array	data		data to sign
	 * @param	string	secret		secret to use in signing
	 * @param	mixed	partial		partial signing
	 * @return	string				signature
	 */
	sign: function (data, secret, partial) {
		// Support signing only a subset of the data fields
		if (partial) {
			var new_data = {};
			if (typeof partial === "string") {
				partial = partial.split(",");
			}
			if (Array.isArray(partial)) {
				for (var key in data) {
					if (key in partial) {
						new_data[key] = data[key];
					}
				}
			}
			data = new_data;
			partial = Object.keys(data).join(",");
		}

		var ret = null;

		// Sort the data in ascending ascii key order
		data = ksort(data);

		// Convert to a URL encoded string
		ret = http_build_query(data);

		// Normalise all line endings (CRNL|NLCR|NL|CR) to just NL (%0A)
		ret = ret.replace(/%0D%0A|%0A%0D|%0D/gi, "%0A");

		// Hash the string and secret together
		ret = sha512(ret + secret);

		// Mark as partially signed if required
		if (partial) {
			ret += "|" + partial;
		}

		return ret;
	},

	/**
	 * Debug
	 *
	 * @param	string  message		Debug message
	 * @param	object	object		Object to output
	 */
	debug: function (message, object) {
		if (this.debugOn)
			console.log(message, object);
	}

};

/**
 * Sort data by key.
 *
 * Sort data by ascii key order.
 *
 * @param	object		data		data to sort
 * @return 	void
 */
function ksort(data) {
	// Compare keys as ascii strings
	var sorter = function (a, b) {
		return a > b ? 1 : a < b ? -1 : 0;
	};

	// Sort the data in ascending ascii key order
	var ret = {};
	var keys = Object.keys(data).sort(sorter);
	for (var i = 0; i < keys.length; i++) {
		var k = keys[i];
		ret[k] = data[k];
	}

	return ret;
}

/**
 * Calculate the SHA512 hash of a string.
 *
 * @param	string		str			string to hash
 * @return	string					hashed string
 */
function sha512(str) {
	return crypto.createHash("sha512").update(str).digest("hex");
}

/**
 * Build URL encoded query string.
 *
 * Returns a URL encoded query string from the object provided in the same
 * manner as PHP's http_build_query() method.
 *
 * Encoding is as per RFC 1738 and the application/x-www-form-urlencoded
 * media type, which implies that spaces are encoded as plus (+) signs.
 *
 * @param	object		data		data to build
 * @return	string					URL encode query string
 */
function http_build_query(data) {
	var build = function (key, val) {
		if (val === true) {
			val = "1";
		} else if (val === false) {
			val = "0";
		}

		if (val === null) {
			return "";
		} else if (typeof val === "object") {
			var k,
				tmp = [];
			for (k in val) {
				if (val[k] !== null) {
					tmp.push(build(key + "[" + k + "]", val[k]));
				}
			}
			return tmp.join("&");
		} else if (typeof val !== "function") {
			return urlencode(key) + "=" + urlencode(val);
		} else {
			throw Error("There was an error processing for http_build_query().");
		}
	};

	var key,
		val,
		tmp,
		ret = [];

	for (key in data) {
		val = data[key];
		tmp = build(key, val);
		if (tmp !== "") {
			ret.push(tmp);
		}
	}

	return ret.join("&");
}

/**
 * Parse URL-encoded query string.
 *
 * Parses a URL encoded query string into an object in the same manner
 * as PHP's parse_str() method.
 *
 * Encoding is as per RFC 1738 and the application/x-www-form-urlencoded
 * media type, which implies that spaces are encoded as plus (+) signs.
 *
 * @param	string		str			string to parse
 * @return	object					parsed data
 */
function http_parse_query(str) {
	var obj,
		last_obj,
		ret = {};

	var params = String(str).replace(/^&/, "").replace(/&$/, "").split("&");
	for (var i = 0, max_i = params.length; i < max_i; i++) {
		var tmp = params[i].split("=");
		var key = urldecode(tmp[0]);
		var val = tmp.length < 2 ? "" : urldecode(tmp[1]);

		if (
			key.includes("__proto__") ||
			key.includes("constructor") ||
			key.includes("prototype")
		) {
			break;
		}

		while (key.charAt(0) === " ") {
			key = key.slice(1);
		}

		if (key.indexOf("\x00") > -1) {
			key = key.slice(0, key.indexOf("\x00"));
		}

		if (key && key.charAt(0) !== "[") {
			var j, max_j;
			var keys = [];
			var post_left_bracket_pos = 0;

			for (j = 0, max_j = key.length; j < max_j; j++) {
				if (key.charAt(j) === "[" && !post_left_bracket_pos) {
					post_left_bracket_pos = j + 1;
				} else if (key.charAt(j) === "]") {
					if (post_left_bracket_pos) {
						if (!keys.length) {
							keys.push(key.slice(0, post_left_bracket_pos - 1));
						}
						keys.push(
							key.substr(post_left_bracket_pos, j - post_left_bracket_pos)
						);
						post_left_bracket_pos = 0;
						if (key.charAt(j + 1) !== "[") {
							break;
						}
					}
				}
			}

			if (!keys.length) {
				keys = [key];
			}

			for (j = 0, max_j = keys[0].length; j < max_j; j++) {
				var chr = keys[0].charAt(j);
				if (chr === " " || chr === "." || chr === "[") {
					keys[0] = keys[0].substr(0, j) + "_" + keys[0].substr(j + 1);
				}
				if (chr === "[") {
					break;
				}
			}

			obj = ret;
			for (j = 0, max_j = keys.length; j < max_j; j++) {
				key = keys[j].replace(/^['"]/, "").replace(/['"]$/, "");
				last_obj = obj;
				if ((key === "" || key === " ") && j !== 0) {
					// Insert new dimension
					var ct = -1;
					for (var p in obj) {
						if (obj.hasOwnProperty(p)) {
							if (+p > ct && p.match(/^\d+$/g)) {
								ct = +p;
							}
						}
					}
					key = ct + 1;
				}
				// if primitive value, replace with object
				if (Object(obj[key]) !== obj[key]) {
					obj[key] = {};
				}
				obj = obj[key];
			}

			last_obj[key] = val;
		}
	}

	return ret;
}

/**
 * URL encode a string.
 *
 * Returns a string in which all non-alphanumeric characters except -_. have
 * been replaced with a percent (%) sign followed by two hex digits and
 * spaces encoded as plus (+) signs. It is encoded the same way that the
 * posted data from a WWW form is encoded, that is the same way as in
 * application/x-www-form-urlencoded media type.
 *
 * @param	string		str			string to encode
 * @return	string					encoded string
 */
function urlencode(str) {
	str = str + "";
	return encodeURIComponent(str)
		.replace(/!/g, "%21")
		.replace(/'/g, "%27")
		.replace(/\(/g, "%28")
		.replace(/\)/g, "%29")
		.replace(/\*/g, "%2A")
		.replace(/~/g, "%7E")
		.replace(/%20/g, "+");
}

/**
 * URL decode a string.
 *
 * Returns a string in which any %## URL encoding in the given string is
 * decode and plus symbols ('+') are decoded to a space character.
 *
 * @param	string		str			string to decode
 * @return	string					decoded string
 */
function urldecode(str) {
	return decodeURIComponent(
		(str + "")
			.replace(/%(?![\da-f]{2})/gi, function () {
				return "%25";
			})
			.replace(/\+/g, "%20")
	);
}

function htmlentities(str) {
	if (typeof str == 'number') {
		return str.toString();
	}

	return str.replace(/[&<>'"]/g,
		tag => ({
			'&': '&amp;',
			'<': '&lt;',
			'>': '&gt;',
			"'": '&#39;',
			'"': '&quot;'
		}[tag]));
}

/**
 * Return the field name and value as HTML input tags.
 *
 * The method will return a string containing one or more HTML <input
 * type="hidden"> tags which can be used to store the name and value.
 *
 * @param	string		$name		field name
 * @param	mixed		$value		field value
 * @return	string					HTML containing <INPUT> tags
 */
function fieldToHtml(name, value) {
	ret = '';
	if (typeof value === "object" && !Array.isArray(value)) {
		Object.entries(value).forEach(([nestedKey, nestedValue]) => {
			ret += fieldToHtml(`${name}[${nestedKey}]`, nestedValue);
		});
	} else {
		// Convert all applicable characters or none printable characters to HTML entities
		value = ordEntities(htmlentities(value));
		ret = `<input type="hidden" name="${name}" value="${value}" />\n`;
	}

	return ret;
}

/**
 * Replace all characters below or equal to 0x1f
 * with &# ; escaped equivalent.
 * E.g. /t becomes &#9;
 *
 * (0x00 to 0x1f consists of whitespace and control characters)
 */
function ordEntities(str) {
	return str.replace(/[(\x00-\x1f)]/g,
		match => {
			return '&#' + match.codePointAt(0) + ';';
		});
}

exports.Gateway = Gateway;

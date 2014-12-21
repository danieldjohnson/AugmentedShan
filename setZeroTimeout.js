/*! Cross-browser-compatible setZeroTimeout
 *
 * I took the original setZeroTimeout and made it cross-browser-compatible, using setTimeout(fn, 0) as a fallback in case postMessage is not supported.
 * Mathias Bynens <http://mathiasbynens.be/>
 * See <http://mathiasbynens.be/notes/settimeout-onload>
 *
 * Copyright statement below:
 *
 * See <http://dbaron.org/log/20100309-faster-timeouts>
 * By L. David Baron <dbaron@dbaron.org>, 2010-03-07, 2010-03-09
 * Released under the following license:
 *
 * Copyright (c) 2010, The Mozilla Foundation
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are
 * met:
 *
 * - Redistributions of source code must retain the above copyright
 * - notice, this list of conditions and the following disclaimer.
 * - Redistributions in binary form must reproduce the above copyright
 * - notice, this list of conditions and the following disclaimer in
 * - the documentation and/or other materials provided with the
 * - distribution.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS
 * IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED
 * TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A
 * PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT
 * HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
 * SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED
 * TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR
 * PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF
 * LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING
 * NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
 * SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 *
 */

// BEGIN implementation of setZeroTimeout

// Only add setZeroTimeout to the window object, and hide everything else in a closure.
(function() {

	var timeouts = [],
	    messageName = 'zero-timeout-message';

	// Like setTimeout, but only takes a function argument.  There's
	// no time argument (always zero) and no arguments (you have to
	// use a closure).
	function setZeroTimeoutPostMessage(fn) {
		timeouts.push(fn);
		window.postMessage(messageName, '*');
	}

	function setZeroTimeout(fn) {
		setTimeout(fn, 0);
	}

	function handleMessage(event) {
		if (event.source == window && event.data == messageName) {
			if (event.stopPropagation) {
				event.stopPropagation();
			}
			if (timeouts.length) {
				timeouts.shift()();
			}
		}
	}

	if (window.postMessage) {
		if (window.addEventListener) {
			window.addEventListener('message', handleMessage, true);
		} else if (window.attachEvent) {
			window.attachEvent('onmessage', handleMessage);
		}
		window.setZeroTimeout = setZeroTimeoutPostMessage;
	} else {
		window.setZeroTimeout = setZeroTimeout;
	}

}());

// END implementation of setZeroTimeout
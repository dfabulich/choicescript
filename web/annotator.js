// annotator.js: Part of my modification to allow annotating choicescript games using Hypothes.is.

// Global vars to hold current scene and current label data
// Currently unused, since this.name and this.linenum work okay. 
var annotatorCurScene;
var annotatorCurLabel;

// Only load hypothes.is if not file:// and window.location has the pushstate() method.
(function() {
	var head = document.getElementsByTagName('head')[0];
	var js = document.createElement("script");

	js.type = "text/javascript";
	js.async = true; // html5
	js.defer = true; // fallback for older browsers that don't have async

	if (window.location.protocol != 'file:' && window.history.pushState) {
		js.src = "https://hypothes.is/embed.js";
		head.appendChild(js);
	}
})();

// Functions
// 
function unloadHypothesis() {
        var appLinkEl =
          document.querySelector('link[type="application/annotator+html"]');
        appLinkEl.dispatchEvent(new Event('destroy'));
      };

function loadHypothesis() {
        var embedScript = document.createElement('script');
        embedScript.setAttribute('src','https://hypothes.is/app/embed.js');
        document.body.appendChild(embedScript);
      };

/* KNOWN ISSUES:
 *
 * 1. None!
 *
 * BUGS:
 *
 * 1. If game is restarted, it needs to clear the url back to index.html
 *
 * 2. Running locally, i.e. file://, window.history.pushState() throws an error: Operation insecure. Use python web server.
 *
 * TO DO:
 *
 * 1. Fix the above bug #1.
 * 2. If you want to prevent the 404 error using pythons simplehttpserver, see: http://stackoverflow.com/questions/15401815/python-simplehttpserver (No longer get 404 errors since I made the fake url use a querystring.)
 * 3. Check for requirements: html5 and url is not file:/// 
 */

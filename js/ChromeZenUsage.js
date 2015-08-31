
/**
 * Error to display on the login page
 */
var loginError = null;

/**
 * ZenUsage object
 */
var _ZenUsage = null;

/**
 * The account key
 */
var _account = null;

/**
 * The last stats lookup object
 */
var _stats = null;

/**
 * Callback fron the usage page
 */
var _getStateCallback = function(){};

/**
 *
 */
var _testLoginCallback = function(){};

chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
	chrome.extension.getBackgroundPage().console.log(request.type);

	if (request.type === 'getStats') {
		_getStateCallback = sendResponse;

		if (_stats) {
			_getStateCallback(_stats);
		}

		//must return true sendResponse wont work 
		return true;
	
	} else if (request.type === 'testLogin') {
		_testLoginCallback = sendResponse;

		return true;
	}
});

/**
 * Error callback from ZenUsage (when checking auth calls)
 */
function authcallback (message,o) {
	if (message === "Authentication Error") {

		//make sure we go back to the login page
		chrome.browserAction.setPopup({
			popup:'view/login.html'
		});

		//if the _testLoginCallback has been registered call this with the MESSAGE
		_testLoginCallback(o);
 	}
	if (message === "Exception") {
		chrome.extension.getBackgroundPage().console.log('Exception: '+o);
	}
}

/**
 * GUI update callback from ZenUsage
 */
function callback_from_zen_usage(){
	var state = _ZenUsage.GetState();

	chrome.extension.getBackgroundPage().console.log(state);

	//Authenticate state
	if(state === "auth_complete"){
		//login page requires callback of 'valid' to move to usage view
		_testLoginCallback('valid');

		_ZenUsage.FetchAccountList();

	//FetchAccountList state
	} else if (state === "account_list_complete"){
		var accounts = _ZenUsage.GetAccounts();
		
		chrome.extension.getBackgroundPage().console.log(accounts);
			
		//returns object with username as key and product as property
		for(var acc in accounts){
			//for simplicity just take the last account in the object
			_account = acc;
		}

		//run an UpdateUsage immediatly to get the current stats
		_ZenUsage.UpdateUsage(_account);

		//set an interval callback to keep the stats updated every 20 mins
		setInterval(function() {
			_ZenUsage.UpdateUsage(_account);
		}, 1000*60*20);
	

	} else if (state === "updated_stats") {
		_stats = _ZenUsage.GetStats()[_account];

		_stats = formatStats(_stats);

		chrome.extension.getBackgroundPage().console.log(_stats);

		updateBadge();

		//if the usage page has registered a callback pass stats to this
		_getStateCallback(_stats);
	}
}

/**
 * Formatter to convert the stats form MiB to GiB and add in any extra display keys
 */
function formatStats(stats) {
	var statsTemp = {};
	
	//ZenUsage.GetStats() outputs an Array structure which has issues with sending to runtime.onMessage
	//therefore convert it into a true js object
	for (var k in stats){
		if (stats.hasOwnProperty(k)) {
			statsTemp[k] = stats[k];
		}
	}

	//format all the MiB vakues required to GiB
	statsTemp.account_allowance_gb = (parseInt(statsTemp.account_allowance)/1024).toFixed(2);
	statsTemp.bank_available_gb = (parseInt(statsTemp.bank_available)/1024).toFixed(2);
	statsTemp.total_used_gb = (parseInt(statsTemp.total_used)/1024).toFixed(2);
	statsTemp.upload_usage_used_gb = (parseInt(statsTemp.upload_usage_used)/1024).toFixed(2);

	//the remaining usage in GiB
	statsTemp.remaining_calc_gb = (statsTemp.account_allowance_gb - statsTemp.total_used_gb).toFixed(2);

	//the used percentage (to 2 decimals)
	statsTemp.percentage_calc = ( 100 * (parseInt(statsTemp.total_used) / parseInt(statsTemp.total_available))).toFixed(2);

	//concat the username and product_name into the final display format
	statsTemp.username_product_name = statsTemp.username + ' (' + statsTemp.product_name + ')';

	return statsTemp;
}

/**
 * Update the badge displayed over the icon
 */
function updateBadge() {
	//can only support 4 chars on badge
	var percentageUsed = Math.round(_stats.percentage_calc);
	
	//set the colour (defaults to red for > 90)
	if (percentageUsed < 75 ) {
		chrome.browserAction.setBadgeBackgroundColor({color:'#FFCC66'});	//orange
	} else if (percentageUsed < 90 ) {
		chrome.browserAction.setBadgeBackgroundColor({color:'#00FF00'});	//green
	}

	chrome.browserAction.setBadgeText({text: String(percentageUsed)+'%'});
}

/**
 * Called from login view with user provided auth credientials
 */
function login(username, password){
	chrome.extension.getBackgroundPage().console.log('checkLogin');

	//set the username and password in the persistent store
	localStorage["_username"] = username;
	localStorage["_password"] = password;
  
	initiate();
}

/**
 * Called from usage view when user requests logout
 */
function logout() {
	localStorage["_username"] = null;
	localStorage["_password"] = null;

	initiate();
}

function initiate(){
	chrome.extension.getBackgroundPage().console.log('initiate');

	chrome.browserAction.setBadgeText({text: ''});

	//if the username or password is not set yet
	if (!localStorage["_username"] || !localStorage["_password"]) {
		//show the login page
		chrome.browserAction.setPopup({
			popup:'view/login.html'
		});
		//nothing more can do
		return;
	}

	//swap to the usage view
	chrome.browserAction.setPopup({
		popup:'view/usage.html'
	});

	//initate the ZenUsage object with the stored credentials
	_ZenUsage = new ZenUsage(
		localStorage["_username"],
		localStorage["_password"],
		'Chrome Toolbar',
		chrome.app.getDetails().version,
		function(message, o){
			chrome.extension.getBackgroundPage().console.log(message);
			chrome.extension.getBackgroundPage().console.log(o);
			authcallback(message, o);
		}
	);

	//set the callback for GUI updates
	_ZenUsage.SetGUICallback(callback_from_zen_usage);

	_ZenUsage.Authenticate();
}

//call initiate on first load
initiate();

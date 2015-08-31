/**
 * Send a message to the background script to register a callback when new stats are loaded
 */
chrome.runtime.sendMessage({type: "getStats"}, function(response) {
	renderStats(response);
});

/**
 * Render stats object to the view
 */
function renderStats(stats) {
	//hide the loading bar
	$('.js-loading').addClass('hidden');

	//show the table
	$('.table').removeClass('hidden');

	//go through all the td elements in the table and if they have a data=stats and it exists in the stats
	//array, use this as the content
	$('table td').each(function( index ) {
		var statKey = $(this).data('stats');
		var stat = stats[statKey];

		if (stat) {
			//if the index has _gb in concat on the hr ending
			if (statKey.indexOf("_gb") !== -1) {
				stat = stats[statKey] + ' GB';
			}
			$(this).text(stat);		
		}
	});
}

/**
 * User has clicked on the logout button
 */
$('.js-logout').on('click',function(e){
	//call the logout function on the background
	chrome.runtime.getBackgroundPage(function(bgWindow) {
	   bgWindow.logout();
	});

	//off to the login page
	window.location.href="login.html";
});
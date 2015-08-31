/**
 * User has clicked the submit button on the form
 */
$('.js-submit').on('click',function(e){

	//dont want to actually submit anything
	e.preventDefault();

	//make sure any old error is hidden
	$('.js-error').addClass('hidden');

	//register with the background page the callback which will return with the status
	chrome.runtime.sendMessage({type: "testLogin"}, function(response) {
		renderLogin(response);
	});

	//call the background scripts login function
	chrome.runtime.getBackgroundPage(function(bgWindow) {
	   bgWindow.login(
	   		$('#email').val(),
	   		$('#password').val()
	   	);
	});

});

/**
 * Called when login callback responds
 */
function renderLogin(response) {
	if (response === 'valid') {
		//off to the usage page
		window.location.href="usage.html";
	} else {
		$('.js-error').removeClass('hidden').text(response);
	}
}
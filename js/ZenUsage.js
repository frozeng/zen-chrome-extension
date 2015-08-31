function ZenUsage(user, pass, clientname, clientversion, error_callback){

	this.UpdateUsage = UpdateUsage;
	this.Authenticate = Authenticate;
	this.SetGUICallback = SetGUICallback;
	this.FetchAccountList = FetchAccountList;
	this.FetchDefaultAccount = FetchDefaultAccount;
	this.FetchBuyBandwidthURL = FetchBuyBandwidthURL;

	this.AuthNeeded = AuthNeeded;
	this.debug = debug;
	this.GetState = GetState;
	this.GetAccounts = GetAccounts;
	this.GetStats = GetStats;
	this.GetDefaultAccount = GetDefaultAccount;
	this.GetBuyBandwidthURL = GetBuyBandwidthURL;
	
	this.SetAuthGUIDs = SetAuthGUIDs;
	this.SetAuthenticationDetails = SetAuthenticationDetails;

	this.ClearAuthGUIDs = ClearAuthGUIDs;

	this.getUserGUID = function(){return _auth_guid};
	this.getClientGUID = function(){return _client_guid};

	var me = this;

	var _error_callback = error_callback;
	var _gui_callback = null;
	var _default_account = null;
	var _accounts = new Array();
	var _username = null;
	var _password = null;
	var _clientname = clientname;
	var _clientversion = clientversion;
	var _auth_guid = null;
	var _client_guid = null;
	var xmlhttp = new XMLHttpRequest();
	var _account_summerys = new Array();
	var _default_account = null;
	var _buy_bandwidth_url = null;
	SetAuthenticationDetails(user,pass);
	
	var _state = "start";
	
//	_auth_guid =   "ff02442b-d9c0-42db-9d51-2239902ac4b3";
//	_client_guid = "acb5bd05-e793-47d8-8e7f-34840331e989";
	
	function ClearAuthGUIDs(){
		_auth_guid =   "ff02442b-d9c0-42db-9d51-2239902ac4b3";
		_client_guid = "acb5bd05-e793-47d8-8e7f-34840331e989";		
	}
	
	function SetAuthGUIDs(auth, client){
		_auth_guid = auth;
		_client_guid = client;
	}
	
	function SetAuthenticationDetails(user, pass){
		_username = user;
		_password = pass;
		_auth_guid = null;
		_client_guid = null;
	}
	
	function AuthNeeded(){
		if(!_auth_guid)
			return 1;
		if(!_client_guid)
			return 2;
	}
	
	function GetBuyBandwidthURL(){
		return _buy_bandwidth_url;
	}
	
	function GetState(){
		return _state;
	}
	
	function GetDefaultAccount(){
		return _default_account;
	}
	
	function GetAccounts(){
		return _accounts;
	}

	function GetStats(){
		return _account_summerys;
	}


	function SetGUICallback(cb){
		_gui_callback = cb;
	}
	
	function UpdateGUI(state){
		if(state)
			_state = state;
		if(_gui_callback)
			_gui_callback(this);
	}

	function callback(instance, method) {
	  return function() {
	    method.apply(instance, arguments);
	  }
	}
	
	function SoapUnwrap(message, name){
		var r = message.getElementsByTagName(name+"Response");
		if(!r ||  !r[0])
			throw("Could not find a "+name+" Response in the result.");
		return message.getElementsByTagName(name+"Response")[0];
	}
	
	function MakeCall(message, name, cb){
		var text = SoapWrap(message,name);
		SendRequest(text, function(msg){
			try{
				var body = SoapUnwrap(msg, name);
				cb(body);
			}catch(e){
				autherror = "Zen Usage: Your Username or Password are incorrect. Please check them against those used to log into the Zen website.";
				if(msg.getElementsByTagName("faultstring").length)
				{
					var error = msg.getElementsByTagName("faultstring")[0].firstChild.nodeValue;

					//if(error.indexOf("Zen.Exceptions.CredentialException") != -1)
					//{
					//	UpdateGUI("authentication_expired_error");
					//	return;
					//}
					if(error.indexOf("Zen.Exceptions.ValidationException") != -1)
					{
						UpdateGUI("authentication_expired_error");
						return;
					}
					if(error.indexOf("Zen.Exceptions.AuthenticationException") != -1)
					{
						_error_callback("Authentication Error", autherror);
						return;
					}
					
					error = error.substring(error.indexOf(':')+1);
					_error_callback("Exception",e);
				} else if(msg.getElementsByTagName("Fault").length)
				{
					var error = msg.getElementsByTagName("Fault")[0];
					error=error.firstChild.firstChild.textContent;
					if (error=="q0:FailedAuthentication") {
						_error_callback("Authentication Error", autherror);
						return;
					}
					else {
						_error_callback("Exception",e);
					}
				} else if(msg.getElementsByTagName("soap:Fault").length) 
				{
					var error = msg.getElementsByTagName("soap:Fault")[0];
					error=error.firstChild.firstChild.textContent;
					if (error=="q0:FailedAuthentication") {
						_error_callback("Authentication Error", autherror);
					}
					else {
						_error_callback("Exception",e);
					}					
				}else {
					_error_callback("Exception",e);
				}
				UpdateGUI("error");
			}
		});
	}

	function AuthenticationResponse(msg){
		UpdateGUI("fetching_client_auth");
		_auth_guid = msg.getElementsByTagName("AuthenticateResult")[0].firstChild.nodeValue;
		MakeCall(soapy().add("AuthenticationGUID", _auth_guid).add("ClientVersion", _clientversion).add("ClientName",_clientname).add("ClientIsBeta","true").value, "ValidateClient", callback(this, AuthenticateClientResponse))
	}
	
	function AuthenticateClientResponse(msg){
		_client_guid = msg.getElementsByTagName("ValidateClientResult")[0].firstChild.nodeValue;
		UpdateGUI("auth_complete");
	}

	
	function Authenticate()
    {
		UpdateGUI("fetching_user_auth");
		_auth_guid = null;
		_client_guid = null;
		MakeCall(soapy().add("username", _username).add("password", _password).value, "Authenticate", callback(this, AuthenticationResponse));
	}

	function FetchDefaultAccount(){
		UpdateGUI("fetching_default_account");		
		var request = soapy().add("AuthenticationGUID", _auth_guid).add("ClientValidationGUID", _client_guid).value;
		MakeCall(request, "GetDefaultBroadbandAccount", callback(this, FetchDefaultAccountResponse));
	}
	
	function FetchDefaultAccountResponse(msg){
		var account_defs = msg.getElementsByTagName("GetDefaultBroadbandAccountResult");
		if(account_defs.length){
			_default_account = account_defs[0].firstChild.nodeValue;
		}
		UpdateGUI("default_account_found");
		UpdateGUI("idle");
	}

	
	function FetchBuyBandwidthURL(username)
	{
		UpdateGUI("fetching_url");		
		var request = soapy().add("AuthenticationGUID", _auth_guid).add("ClientValidationGUID", _client_guid).add("WizardType", "UsageAllowanceWizard").add("DSLUsername",username).value;
		MakeCall(request, "GetWizardLink", callback(this, FetchBuyBandwidthURLResponse));
	}
	
	function FetchBuyBandwidthURLResponse(msg)
	{
		_buy_bandwidth_url = msg.getElementsByTagName("GetWizardLinkResult")[0].firstChild.nodeValue;
		UpdateGUI("got_buy_bandwidth_url");		
		UpdateGUI("idle");		
	}
	
	function FetchAccountList(){
		UpdateGUI("fetching_account_list");		
		var request = soapy().add("AuthenticationGUID", _auth_guid).add("ClientValidationGUID", _client_guid).value;
		MakeCall(request, "GetAuthorisedBroadbandAccounts", callback(this, FetchAccountListResponse));
	}
	
	function FetchAccountListResponse(msg){
		var account_defs = msg.getElementsByTagName("BroadbandAccount");
		_accounts = new Array();
		for(var i = 0; i < account_defs.length; i++){
			var acc = account_defs.item(i);
			var uname = acc.getElementsByTagName("DSLUsername")[0].firstChild.nodeValue;
			var alias = null;
			if(acc.getElementsByTagName("AliasName").length)
				alias = acc.getElementsByTagName("AliasName")[0].firstChild.nodeValue;
			var ptype = acc.getElementsByTagName("ProductName")[0].firstChild.nodeValue;
			_accounts[uname] = (alias?alias:uname) + " ("+ptype+")";
			me.debug("Accounts: "+_accounts.length);
		}
		me.debug("Accounts: "+_accounts.length);
		UpdateGUI("account_list_complete");
		UpdateGUI("idle");
	}
	
	
	function UpdateUsage(account){
		if(_auth_guid && _client_guid){
			UpdateGUI("fetching_usage");
			var request = soapy().add("AuthenticationGUID", _auth_guid).add("ClientValidationGUID", _client_guid).add("DSLUsername", account).value;
			MakeCall(request, "GetBroadbandConnection", callback(this, UpdateUsageResponse));
		}else{
			this.Authenticate();			
		}
	}

	function ParseUpdateUsageResponse(msg, key){
		try{
			return msg.getElementsByTagName(key)[0].firstChild.nodeValue;		
		}catch(e){
			return null;
		}
	}


	function UpdateUsageResponse(msg){
		var stats = new Array();

		stats["total_available"] = ParseUpdateUsageResponse(msg, "DownloadUsageAllowanceTotal_MB");
		stats["total_used"] = ParseUpdateUsageResponse(msg, "DownloadUsageAllowanceUsed_MB");
		stats["account_allowance"] = ParseUpdateUsageResponse(msg, "DownloadUsageAllowance_MB");
		stats["rate_limit_up"] = ParseUpdateUsageResponse(msg, "Police");
		stats["rate_limit_down"] = ParseUpdateUsageResponse(msg, "Rate");
		stats["service_speed"] = ParseUpdateUsageResponse(msg, "Speed");
		stats["average_daily_usage"] = ParseUpdateUsageResponse(msg, "DailyAverageDownloadUsage_MB");
		stats["bank_used"] = ParseUpdateUsageResponse(msg, "DownloadUsageAllowanceBankUsed_MB");
		stats["bank_available"] = ParseUpdateUsageResponse(msg, "DownloadUsageAllowanceBank_MB");
		stats["regrade_usage_available"] = ParseUpdateUsageResponse(msg, "DownloadUsageAllowanceUsedAtRegrade_MB");
		stats["product_name"] = ParseUpdateUsageResponse(msg, "ProductName");
		stats["upload_usage_used"] = ParseUpdateUsageResponse(msg, "UploadUsageAllowanceUsed_MB");
		stats["username"] = ParseUpdateUsageResponse(msg, "DSLUsername");
		
		_account_summerys[stats["username"]] = stats;
		UpdateGUI("updated_stats");		
		UpdateGUI("idle");		
	}
	
	
	var request_in_progress = false;
	function SendRequest(message, cb){
		if(request_in_progress){
			me.debug("1 request at a time.");
			return;
		}
			
		request_in_progress = true;
		
		xmlhttp.open("POST", "https://webservices.zen.co.uk/broadband/v3.11/serviceengine.asmx", true);
		xmlhttp.setRequestHeader("Content-Type", "text/xml");
		
		xmlhttp.onreadystatechange=function() {
		    if (xmlhttp.readyState==4) {
			
				request_in_progress = false;
				
				me.debug(xmlhttp.statusText);
				me.debug(xmlhttp.responseText);
				cb(xmlhttp.responseXML);
			}
		}
		me.debug("=========== SENDING ==========\n\n"+message+"\n\n");

		xmlhttp.send(message);
	}
	
	
	function SOAPy(){
		this.value = "";
		this.add = function(name,value, attrs){
			value = HTMLentities(value);
			if(attrs)
				this.value += "<"+name+" "+attrs+">"+value+"</"+name+">\n";
			else
				this.value += "<"+name+">"+value+"</"+name+">\n";
			return this;
		}
		
		this.n = function(){
			this.value = "";
		}
	}
	
	function soapy(){
		return new SOAPy();	
	} 
	
	function SoapWrap(message, name){
		return "<?xml version=\"1.0\" encoding=\"utf-8\"?>\n"+
		"<soap:Envelope \n"+
		"	xmlns:soap=\"http://schemas.xmlsoap.org/soap/envelope/\"\n"+
		"	xmlns:xsi=\"http://www.w3.org/2001/XMLSchema-instance\" \n"+
		"	xmlns:xsd=\"http://www.w3.org/2001/XMLSchema\" \n"+
		"	xmlns:wsa=\"http://schemas.xmlsoap.org/ws/2004/08/addressing\" \n"+
		"	xmlns:wsse=\"http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-secext-1.0.xsd\"\n"+
		"	xmlns:wsu=\"http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-utility-1.0.xsd\"\n"+
		"	>\n"+
		"<soap:Header>\n"+
		"	<wsa:Action>https://webservices.zen.co.uk/broadbandstatistics/GetUsage</wsa:Action>\n"+
		"	<wsa:MessageID>urn:uuid:97fbd859-2a6e-4bc1-b201-92accf4828c3</wsa:MessageID>\n"+
		"	<wsa:ReplyTo>\n"+
		"		<wsa:Address>http://schemas.xmlsoap.org/ws/2004/08/addressing/role/anonymous</wsa:Address>\n"+
		"	</wsa:ReplyTo>\n"+
		"	<wsa:To>https://webservices.zen.co.uk/broadband/v3.11/serviceengine.asmx</wsa:To>\n"+
		"	<wsse:Security soap:mustUnderstand=\"1\">\n"+
		"	<wsse:UsernameToken xmlns:wsu=\"http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-utility-1.0.xsd\" wsu:Id=\"SecurityToken-3e12170e-c6b4-4546-bde6-d6fbfd00cc10\">\n"+
		soapy().add("wsse:Username", _username).add("wsse:Password", _password, "Type=\"http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-username-token-profile-1.0#PasswordText\"").value +
		"	</wsse:UsernameToken>\n"+
		"	</wsse:Security>\n"+
		"</soap:Header>\n"+
		"<soap:Body>\n"+
		"	<"+ name+" xmlns=\"https://webservices.zen.co.uk/broadband/v3.11/\">"+ message + "	</"+ name+">\n"+
		"</soap:Body>\n"+
		"</soap:Envelope>\n";
	}
	
	function HTMLentities(texte) {
		texte = texte.replace(/"/g,'&quot;'); // 34 22
		texte = texte.replace(/&/g,'&amp;'); // 38 26
		texte = texte.replace(/\'/g,'&#39;'); // 39 27
		texte = texte.replace(/</g,'&lt;'); // 60 3C
		texte = texte.replace(/>/g,'&gt;'); // 62 3E
		texte = texte.replace(/\^/g,'&circ;'); // 94 5E
		texte = texte.replace(/‘/g,'&lsquo;'); // 145 91
		texte = texte.replace(/’/g,'&rsquo;'); // 146 92
		texte = texte.replace(/“/g,'&ldquo;'); // 147 93
		texte = texte.replace(/”/g,'&rdquo;'); // 148 94
		texte = texte.replace(/•/g,'&bull;'); // 149 95
		texte = texte.replace(/–/g,'&ndash;'); // 150 96
		texte = texte.replace(/—/g,'&mdash;'); // 151 97
		texte = texte.replace(/˜/g,'&tilde;'); // 152 98
		texte = texte.replace(/™/g,'&trade;'); // 153 99
		texte = texte.replace(/š/g,'&scaron;'); // 154 9A
		texte = texte.replace(/›/g,'&rsaquo;'); // 155 9B
		texte = texte.replace(/œ/g,'&oelig;'); // 156 9C
		texte = texte.replace(//g,'&#357;'); // 157 9D
		texte = texte.replace(/ž/g,'&#382;'); // 158 9E
		texte = texte.replace(/Ÿ/g,'&Yuml;'); // 159 9F
		// texte = texte.replace(/ /g,'&nbsp;'); // 160 A0
		texte = texte.replace(/¡/g,'&iexcl;'); // 161 A1
		texte = texte.replace(/¢/g,'&cent;'); // 162 A2
//		texte = texte.replace(/£/g,'&pound;'); // 163 A3
		//texte = texte.replace(/ /g,'&curren;'); // 164 A4
		texte = texte.replace(/¥/g,'&yen;'); // 165 A5
		texte = texte.replace(/¦/g,'&brvbar;'); // 166 A6
		texte = texte.replace(/§/g,'&sect;'); // 167 A7
		texte = texte.replace(/¨/g,'&uml;'); // 168 A8
		texte = texte.replace(/©/g,'&copy;'); // 169 A9
		texte = texte.replace(/ª/g,'&ordf;'); // 170 AA
		texte = texte.replace(/«/g,'&laquo;'); // 171 AB
		texte = texte.replace(/¬/g,'&not;'); // 172 AC
		texte = texte.replace(/­/g,'&shy;'); // 173 AD
		texte = texte.replace(/®/g,'&reg;'); // 174 AE
		texte = texte.replace(/¯/g,'&macr;'); // 175 AF
		texte = texte.replace(/°/g,'&deg;'); // 176 B0
		texte = texte.replace(/±/g,'&plusmn;'); // 177 B1
		texte = texte.replace(/²/g,'&sup2;'); // 178 B2
		texte = texte.replace(/³/g,'&sup3;'); // 179 B3
		texte = texte.replace(/´/g,'&acute;'); // 180 B4
		texte = texte.replace(/µ/g,'&micro;'); // 181 B5
		texte = texte.replace(/¶/g,'&para'); // 182 B6
		texte = texte.replace(/·/g,'&middot;'); // 183 B7
		texte = texte.replace(/¸/g,'&cedil;'); // 184 B8
		texte = texte.replace(/¹/g,'&sup1;'); // 185 B9
		texte = texte.replace(/º/g,'&ordm;'); // 186 BA
		texte = texte.replace(/»/g,'&raquo;'); // 187 BB
		texte = texte.replace(/¼/g,'&frac14;'); // 188 BC
		texte = texte.replace(/½/g,'&frac12;'); // 189 BD
		texte = texte.replace(/¾/g,'&frac34;'); // 190 BE
		texte = texte.replace(/¿/g,'&iquest;'); // 191 BF
		texte = texte.replace(/À/g,'&Agrave;'); // 192 C0
		texte = texte.replace(/Á/g,'&Aacute;'); // 193 C1
		texte = texte.replace(/Â/g,'&Acirc;'); // 194 C2
		texte = texte.replace(/Ã/g,'&Atilde;'); // 195 C3
		texte = texte.replace(/Ä/g,'&Auml;'); // 196 C4
		texte = texte.replace(/Å/g,'&Aring;'); // 197 C5
		texte = texte.replace(/Æ/g,'&AElig;'); // 198 C6
		texte = texte.replace(/Ç/g,'&Ccedil;'); // 199 C7
		texte = texte.replace(/È/g,'&Egrave;'); // 200 C8
		texte = texte.replace(/É/g,'&Eacute;'); // 201 C9
		texte = texte.replace(/Ê/g,'&Ecirc;'); // 202 CA
		texte = texte.replace(/Ë/g,'&Euml;'); // 203 CB
		texte = texte.replace(/Ì/g,'&Igrave;'); // 204 CC
		texte = texte.replace(/Í/g,'&Iacute;'); // 205 CD
		texte = texte.replace(/Î/g,'&Icirc;'); // 206 CE
		texte = texte.replace(/Ï/g,'&Iuml;'); // 207 CF
		texte = texte.replace(/Ð/g,'&ETH;'); // 208 D0
		texte = texte.replace(/Ñ/g,'&Ntilde;'); // 209 D1
		texte = texte.replace(/Ò/g,'&Ograve;'); // 210 D2
		texte = texte.replace(/Ó/g,'&Oacute;'); // 211 D3
		texte = texte.replace(/Ô/g,'&Ocirc;'); // 212 D4
		texte = texte.replace(/Õ/g,'&Otilde;'); // 213 D5
		texte = texte.replace(/Ö/g,'&Ouml;'); // 214 D6
		texte = texte.replace(/×/g,'&times;'); // 215 D7
		texte = texte.replace(/Ø/g,'&Oslash;'); // 216 D8
		texte = texte.replace(/Ù/g,'&Ugrave;'); // 217 D9
		texte = texte.replace(/Ú/g,'&Uacute;'); // 218 DA
		texte = texte.replace(/Û/g,'&Ucirc;'); // 219 DB
		texte = texte.replace(/Ü/g,'&Uuml;'); // 220 DC
		texte = texte.replace(/Ý/g,'&Yacute;'); // 221 DD
		texte = texte.replace(/Þ/g,'&THORN;'); // 222 DE
		texte = texte.replace(/ß/g,'&szlig;'); // 223 DF
		texte = texte.replace(/à/g,'&aacute;'); // 224 E0
		texte = texte.replace(/á/g,'&aacute;'); // 225 E1
		texte = texte.replace(/â/g,'&acirc;'); // 226 E2
		texte = texte.replace(/ã/g,'&atilde;'); // 227 E3
		texte = texte.replace(/ä/g,'&auml;'); // 228 E4
		texte = texte.replace(/å/g,'&aring;'); // 229 E5
		texte = texte.replace(/æ/g,'&aelig;'); // 230 E6
		texte = texte.replace(/ç/g,'&ccedil;'); // 231 E7
		texte = texte.replace(/è/g,'&egrave;'); // 232 E8
		texte = texte.replace(/é/g,'&eacute;'); // 233 E9
		texte = texte.replace(/ê/g,'&ecirc;'); // 234 EA
		texte = texte.replace(/ë/g,'&euml;'); // 235 EB
		texte = texte.replace(/ì/g,'&igrave;'); // 236 EC
		texte = texte.replace(/í/g,'&iacute;'); // 237 ED
		texte = texte.replace(/î/g,'&icirc;'); // 238 EE
		texte = texte.replace(/ï/g,'&iuml;'); // 239 EF
		texte = texte.replace(/ð/g,'&eth;'); // 240 F0
		texte = texte.replace(/ñ/g,'&ntilde;'); // 241 F1
		texte = texte.replace(/ò/g,'&ograve;'); // 242 F2
		texte = texte.replace(/ó/g,'&oacute;'); // 243 F3
		texte = texte.replace(/ô/g,'&ocirc;'); // 244 F4
		texte = texte.replace(/õ/g,'&otilde;'); // 245 F5
		texte = texte.replace(/ö/g,'&ouml;'); // 246 F6
		texte = texte.replace(/÷/g,'&divide;'); // 247 F7
		texte = texte.replace(/ø/g,'&oslash;'); // 248 F8
		texte = texte.replace(/ù/g,'&ugrave;'); // 249 F9
		texte = texte.replace(/ú/g,'&uacute;'); // 250 FA
		texte = texte.replace(/û/g,'&ucirc;'); // 251 FB
		texte = texte.replace(/ü/g,'&uuml;'); // 252 FC
		texte = texte.replace(/ý/g,'&yacute;'); // 253 FD
		texte = texte.replace(/þ/g,'&thorn;'); // 254 FE
		texte = texte.replace(/ÿ/g,'&yuml;'); // 255 FF
		return texte;
	}

	function writeFile( sFilePath, sFileContent )
	{
		try
		{
			var file = Components.classes["@mozilla.org/file/local;1"].createInstance(Components.interfaces.nsILocalFile);
			file.QueryInterface(Components.interfaces.nsIFile);
			file.initWithPath( sFilePath );
			var strm = Components.classes["@mozilla.org/network/file-output-stream;1"].createInstance(Components.interfaces.nsIFileOutputStream);
			strm.QueryInterface(Components.interfaces.nsIOutputStream);
			strm.QueryInterface(Components.interfaces.nsISeekableStream);
			strm.init( file, 0x04 | 0x08 | 0x10, 420, 0 );
			strm.write( sFileContent, sFileContent.length );
			strm.flush();
			strm.close();
		}
		catch(ex)
		{
			window.alert(ex.message);
		}
	}

	function debug(str)		
	{
		var debugFile = "c:\zenusageviewer.log"
		try
		{
			var prefs = Components.classes["@mozilla.org/preferences-service;1"].
		                    getService(Components.interfaces.nsIPrefService);
			prefs = prefs.getBranch("extensions.zenusage.");
			try{debugFile = prefs.getBoolPref('debugFile');}catch(e){}
			
			if(prefs.getBoolPref('debug'))
			{
				alert(str);
				me.writeFile(debugFile, str+"\n");
			}
		}
		catch(e)
		{
		}
	}
}

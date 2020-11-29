var request = require('request-promise');
var dateTime = require('node-datetime');
var settings = require('./settings.js');
var utils = require('./utils.js');
var async = require('async');

var timeNow = dateTime.create();
var dayInMs = 86400000;

var timeNDays = (settings.lastNDays + 1) * dayInMs
//Set time as now - period
var timeNDaysAgo = timeNow._created - timeNDays;

var fileName =  settings.fileName;
if (settings.addTimestamp)
	fileName += '_' + (timeNow.format('d-f-Y-H_M_S'));


/**/ 
var appVersion = "1.1";
var requiredSettingsVersion = "1.1";
/**/


//Start it
run();


function run()
{
	console.log("dra-reporter version: " + appVersion);
	if (requiredSettingsVersion != settings.version)
	{
  		console.log("Aborting - Required settings version is " + requiredSettingsVersion + " wherease actual settings version is "+ settings.version);
  		process.exit();
	}

	if (settings.useIncidentTimeAsPresent || settings.saveResponseResults || settings.useResponseFromFile || settings.useOldApiVer)
	{
		console.log("DEBUG MODE!")
		if (settings.saveResponseResults && settings.useResponseFromFile)
		{
			console.log("It is not allowed to save response to file and use response from file at the same time");
			console.log("Stopped!");
			process.exit();
		}


		
		//Check if required files are found
		if (settings.useResponseFromFile)
		{
			console.log("Use Response from file")
			if (!utils.fileExists(settings.incidentsDataFileName))
			{
				console.log(settings.incidentsDataFileName + " file not found");
				console.log("Stopped!");
				process.exit();
			}

			if (settings.reportPerIncidentResponder)
			{
				if (!utils.fileExists(settings.incidentResponderFilePrefix + "-" + settings.permissionsFilePostFix))
				{
					console.log(settings.incidentResponderFilePrefix + "-" + settings.permissionsFilePostFix + " file not found");
					console.log("Stopped!");
					process.exit();
				}
			}

			if (settings.reportPerAppOwner)
			{
				if (!utils.fileExists(settings.appOwnerFilePrefix + "-" + settings.permissionsFilePostFix))
				{
					console.log(settings.appOwnerFilePrefix + "-" + settings.permissionsFilePostFix + " file not found");
					console.log("Stopped!");
					process.exit();
				}
			}	
		}
		if (settings.useIncidentTimeAsPresent)
			console.log("Use incident time as present")
		if (settings.useOldApiVer)
			console.log("Use old API version");
	}


	if (settings.draServerIp == "" || settings.draAuthString == "")
	{
		console.log("Missing credentials");
		console.log("Stopped!");
		process.exit();
	}
	var incidentsData;
	var permissionsData;
	var responseData = {"incidentData": null, "permissionsData": null, "apiVer": "1.2"};

	async.parallel(
		[ 
		  function(callback) {
			//Get main account info
			getIncidentsData(responseData, callback);
		  },
		  function(callback) {
			//Get permissions data
			if (settings.reportPerIncidentResponder) //This is relevant only if Incident responder is needed;
				getIrPermissionData(responseData, callback);
			else
				callback();
		  },
		  function(callback) {
			//Get permissions data
			if (settings.reportPerAppOwner) //This is relevant only if Incident responder is needed;
				getAoPermissionData(responseData, callback);
			else
				callback();
		  },
		], 
		function done(err) {
		  if (err) {
			console.log("run error");
			console.log(err)
		  }
		  else
			  processData(responseData.incidentsData, responseData.permissionsIrData, responseData.permissionsAoData, responseData.apiVer)
		}
	  );
}  	

function getIncidentsData(responseData, callback)
{
	if (!settings.useResponseFromFile)
	{
		console.log("Retrieve incidents data from DRA " + settings.draServerIp);
		getIncidentDataFromDra(responseData, "1.2", callback);
	}
	else
	{
		console.log("Get Incidents data from file");
		getIncidentDataFromFile(responseData, callback);
	}
}


//File related.
function getIncidentDataFromFile(responseData, callback)
{
	var response = utils.getFromFile(settings.incidentsDataFileName);
	var jResponse = JSON.parse(response);

	responseData.incidentsData = jResponse;
	if (settings.useOldApiVer)
		responseData.apiVer = "1.0";

	callback();
}

function getIrPermissionData(responseData, callback)
{
	if (!settings.useResponseFromFile)
	{
		console.log("Retrieve Incident Responders permissions data from DRA " + settings.draServerIp);
		getIrPermissionDataFromDra(responseData, "1.2", callback);
	}
	else
	{
		console.log("Get Incident Responders Permissions data from file");
		permissionsData = getPermissionFromFile(settings.incidentResponderFilePrefix, responseData, callback);
	}
}

function getAoPermissionData(responseData, callback)
{
	if (!settings.useResponseFromFile)
	{
		console.log("Retrieve App Owners permissions data from DRA " + settings.draServerIp);
		getAoPermissionDataFromDra(responseData, "1.2", callback);
	}
	else
	{
		console.log("Get App Owners Permissions data from file");
		permissionsData = getPermissionFromFile(settings.appOwnerFilePrefix, responseData, callback);
	}
}

function getPermissionFromFile(preFix, responseData, callback)
{
	var response = utils.getFromFile(preFix + "-" + settings.permissionsFilePostFix);
	var jResponse = JSON.parse(response);

	if (preFix == settings.incidentResponderFilePrefix)
		responseData.permissionsIrData = jResponse;
	else if (preFix == settings.appOwnerFilePrefix)
		responseData.permissionsAoData = jResponse;
	callback();
}

function processData(incidentsData, permissionsIrData, permissionsAoData, apiVer)
{
	var respondersList = [];

	//First one is 'All'
	respondersList.push({"type": "All", "name": "All", "ipList": "na"});

	if (settings.reportPerIncidentResponder)
	{
		if (permissionsIrData)
		{
			for (var i=0; i<permissionsIrData.permissions.length; i++)
			{
				if (permissionsIrData.permissions[i].allowed_destination_ips.length > 0)
				{
					respondersList.push({"type": "responder", "name": permissionsIrData.permissions[i].username, "ipList": permissionsIrData.permissions[i].allowed_destination_ips});
				}
			}
		}
	}

	if (settings.reportPerAppOwner)
	{
		if (permissionsAoData)
		{
			for (var i=0; i<permissionsAoData.permissions.length; i++)
			{
				if (permissionsAoData.permissions[i].allowed_destination_ips.length > 0)
				{
					respondersList.push({"type": "responder", "name": permissionsAoData.permissions[i].username, "ipList": permissionsAoData.permissions[i].allowed_destination_ips});
				}
			}		
		}
	}

	async.forEach(respondersList, function(responder, cb){
		processPerResponder(responder.type, responder.name, responder.ipList, incidentsData, apiVer, cb);
	}, function(err){
		if (err){
			//deal with the error
			console.log("error in process data " + err)
		}
		if(settings.printDebugInfo)
			console.timeEnd("Done")
	});
}

function processPerResponder(type, name, ipAddresses, incidentsData, apiVer, informCaller)
{
	var draInfo = {"status": "ok", "data": "ok"};

	setDraStats(type, ipAddresses, incidentsData, draInfo);
	buildDraReport(type, name, ipAddresses, draInfo, apiVer);
	informCaller();
}

//Get data from DRA https calls
function getIncidentDataFromDra(responseData, apiVer, callback)
{
	var basicAuthStr = "Basic " + settings.draAuthString;
	var urlString = "https://" + settings.draServerIp + ":8443/counterbreach/api/" + apiVer +"/security_events?event_category=incident&status=all";
	// form data
	var options = {
		method: 'GET',
		rejectUnauthorized: false,
		requestCert: true,
		
		agent: false,
		port: 8443,
		uri: urlString,
		resolveWithFullResponse: true, //Set to get HTTP error code
		simple: false,				   //Set to hand HTTP error code
		headers: {
			'Content-Type': 'application/json',
			'Authorization': basicAuthStr 
			},
		}
	if (settings.printDebugInfo)
		console.log(urlString);
	request(options)
	.then(function (response) {	
		 var errMessage = response.body;
		 if (response.statusCode == 200)
		 {
			var jResponse = JSON.parse(response.body);
			if (settings.saveResponseResults) //Used for debug
			{
				console.log("Saving Incidents data to file")
				utils.saveToFile(settings.incidentsDataFileName, response.body);
			}
			responseData.incidentsData = jResponse;
			if (settings.useOldApiVer)
				apiVer = "1.0"
			responseData.apiVer = apiVer;
			callback();
		 }
		 else if (response.statusCode == 404)
		 {
			if (settings.printDebugInfo)
				console.log("getIncidentDataFromDra - Previous API version")

			getIncidentDataFromDra(responseData, "1.0", callback)
		 }
		 else
		 {
			console.log("getIncidentDataFromDra failed")
			callback("Failed getIncidentDataFromDra " + response);
		 }
	})
	.catch(function (err) {
		// Deal with the error
		console.log("getIncidentDataFromDra failed")
		callback("FAILED getIncidentDataFromDra " + err);
	})
}

function getIrPermissionDataFromDra(responseData, apiVer, callback)
{
	var basicAuthStr = "Basic " + settings.draAuthString;
	var urlString = "https://"  + settings.draServerIp + ":8443/counterbreach/api/1.2/users/permissions"
	// form data
	var options = {
		method: 'GET',
		rejectUnauthorized: false,
		requestCert: true,
		
		agent: false,
		port: 8443,
		uri: urlString,
		resolveWithFullResponse: true, //Set to get HTTP error code
		simple: false,				   //Set to hand HTTP error code
		headers: {
			'Content-Type': 'application/json',
			'Authorization': basicAuthStr 
			},
		}
	if (settings.printDebugInfo)
		console.log(urlString);
		
	request(options)
	.then(function (response) {	
		//console.log(response.body);
			var errMessage = response.body;
			if (response.statusCode == 200)
			{
				var jResponse = JSON.parse(response.body);
				if (settings.saveResponseResults) //Used for debug
				{
					console.log("Saving Incident responders permissions response to file")
					utils.saveToFile(settings.incidentResponderFilePrefix + "-" + settings.permissionsFilePostFix, response.body);
				}
				if (settings.useOldApiVer)
					apiVer = "1.0"
				responseData.permissionsIrData = jResponse;
				callback();
			}
			else if (response.statusCode == 404)
			{
				if (settings.printDebugInfo)
					console.log("getIrPermissionDataFromDra - Previous API version")

				getIrPermissionDataFromDra(responseData, "1.0", callback)
			}
			else
			{
				console.log("getIrPermissionDataFromDra failed")
				callback("Failed getIrPermissionDataFromDra " + response);
			 }
		})
		.catch(function (err) {
			// Deal with the error
			console.log("getPermissionsDataFromDra failed")
			callback("Failed getPermissionsDataFromDra " + err);
		})
}	


function getAoPermissionDataFromDra(responseData, apiVer, callback)
{
	var basicAuthStr = "Basic " + settings.draAuthString;
	var urlString = "https://"  + settings.draServerIp + ":8443/counterbreach/api/1.2/users/permissions/appowners"
	// form data
	var options = {
		method: 'GET',
		rejectUnauthorized: false,
		requestCert: true,
		
		agent: false,
		port: 8443,
		uri: urlString,
		resolveWithFullResponse: true, //Set to get HTTP error code
		simple: false,				   //Set to hand HTTP error code
		headers: {
			'Content-Type': 'application/json',
			'Authorization': basicAuthStr 
			},
		}
	if (settings.printDebugInfo)
		console.log(urlString);
	request(options)
	.then(function (response) {	
		//console.log(response.body);
			var errMessage = response.body;
			if (response.statusCode == 200)
			{
				var jResponse = JSON.parse(response.body);
				if (settings.saveResponseResults) //Used for debug
				{
					console.log("Saving App Owners permissions response to file")
					utils.saveToFile(settings.appOwnerFilePrefix + "-" + settings.permissionsFilePostFix, response.body);
				}
				responseData.permissionsAoData = jResponse;
				callback();
			}
			else if (response.statusCode == 404)
			{
				console.log("Application Owners not supported in current DRA version")
				callback();
			}
			else
			{
				console.log("getAoPermissionDataFromDra failed")
				callback("Failed getAoPermissionDataFromDra " + response);
			 }
		})/*
		.catch(function (err) {
			// Deal with the error
			console.log("getAoPermissionDataFromDra failed")
			callback("Failed getAoPermissionDataFromDra " + err);
		})*/
}



//*************************/
//HTML and csv reports
function buildDraReport(type, name, ipAddresses, draInfo, apiVer)
{
	var output;
	var lastDayCaption;
	if (draInfo.status != "ok")
	{
		console.log(draInfo.data);
		return;
	}

	if (settings.printDebugInfo)
		console.log(draInfo.data.incidentSpecificStats);

	//Do this only if there are incidents
	if (draInfo.data.incidentSpecificStats)
	{
		/*Sort by incident name as appears in DRA help */
		draInfo.data.incidentSpecificStats.sort(function (a,b) {
			if (a.sortOrder <= b.sortOrder)
				return (-1);
			else
				return (1);
			});
	}
	output = '<html> <script src="https://code.jquery.com/jquery-3.1.0.js"></script>\n';
	output += '<head> <style> tr:nth-child(even) {background: #CCC}</style> </head>\n';
	output += '<title> Imperva Data Risk Analytics Report</title>\n'
	output += '<style> table, th, td {border: 1px solid black; border-collapse: collapse;} .redText { color:red; } .blackText { color:black; } .greenText { color:green; } .brownText { color:brown; } .orangeText { color:orange; }</style>\n'
	output += '<body>\n';
	output += '<h1> Imperva Data Risk Analytics Report - ' + timeNow.format('d-f-Y') + '</h1>\n';
	output += '<h1> ' + name + '</h1>\n';

	if (type == "responder")
	{
		output += '<h3> Covered IP addresses</h3>'
		output += ipAddresses[0];
		for (var k=1; k<ipAddresses.length; k++)
			output += ', ' + ipAddresses[k];
		output += '\n';
	}

	//Last N days section
	if (settings.lastNDays == 1)
		lastDayCaption = 'Last 1 Day';
	else 
		lastDayCaption = 'Last ' + settings.lastNDays + ' Days';

	output += '<h2>' + lastDayCaption + '</h2>\n';
	output += buildLastNDaysStats(draInfo);

	output += '<h2>Overall since ' + dateTime.create(draInfo.data.firstEventTime).format('d-f-Y') + '</h2>\n'
	output += buildOverAllStats(draInfo, apiVer);

	output += '</body>\n';
	output += '</html>\n';
	// Save to file to html
	utils.saveToFile(settings.filePath + name + "_" + fileName + '.html', output);

	if (settings.saveReportCsv)
		createCsv(name, draInfo, apiVer, lastDayCaption)

	// Save accumulative data
	if (settings.saveAccumData)
		createAccumCsv(name, draInfo.data.accumData, apiVer);
}

function buildOverAllStats(draInfo, apiVer)
{
	//If there are no incidents get out
	if (!draInfo.data.incidentSpecificStats)
	{
		return ("No Incidents");
	}
	var displayClosed = false;
	if (apiVer == "1.2")
		displayClosed = true;
	var output = '<table>\n';
	output += '<tr><th align="left">Incident name</th><th align="left" colspan="5">Open</th>'
	if (displayClosed)
		output += '<th align="left" colspan="5">Closed</th>';
	output += '</tr>\n';
	output += '<tr><th align="left"></th><th align="left" style="font-size:20px">Total</th><th align="left" style="background-color:#D0313D;color:white;">Critical</th><th align="left" style="background-color:#F36B22;color:white;">High</th><th align="left" style="background-color:#F8B41C;color:white;">Medium</th><th align="left" style="background-color:#608EA6;color:white;">Low</th>'
	if (displayClosed)
		output += '</th><th align="left" style="font-size:20px">Total</th><th align="left" style="background-color:#D0313D;color:white;">Critical</th><th align="left" style="background-color:#F36B22;color:white;">High</th><th align="left" style="background-color:#F8B41C;color:white;">Medium</th><th align="left" style="background-color:#608EA6;color:white;">Low</th>'
	output += '</tr>\n'; 
	for (var i=0; i<draInfo.data.incidentSpecificStats.length; i++)
	{
		output += '<tr><td align="left">' + draInfo.data.incidentSpecificStats[i].name + '</td>';
		output += '<td align="left">' + draInfo.data.incidentSpecificStats[i].totalOpen + '</td>' +
			'<td align="left">' + draInfo.data.incidentSpecificStats[i].openCritStatus + '</td>' +
			'<td align="left">' + draInfo.data.incidentSpecificStats[i].openHiStatus + '</td>' +
			'<td align="left">' + draInfo.data.incidentSpecificStats[i].openMedStatus + '</td>' +
			'<td align="left">' + draInfo.data.incidentSpecificStats[i].openLowStatus + '</td>';
		if (displayClosed)
		{
			output += '<td align="left">' + draInfo.data.incidentSpecificStats[i].totalClose + '</td>' +
			'<td align="left">' + draInfo.data.incidentSpecificStats[i].totalCloseCritical + '</td>' +
			'<td align="left">' + draInfo.data.incidentSpecificStats[i].totalCloseHi + '</td>' +
			'<td align="left">' + draInfo.data.incidentSpecificStats[i].totalCloseMedium + '</td>' +
			'<td align="left">' + draInfo.data.incidentSpecificStats[i].totalCloseLow + '</td>';			
		}
		output += '</tr>\n';
	}
	output += '<tr><td align="left" style="font-size:20px">' + "Total" + '</td>' +
		'<td align="left" style="font-size:20px">' + draInfo.data.totalOpen + '</td>' +
		'<td align="left" style="font-size:20px">' + draInfo.data.totalOpenCritical + '</td>' +
		'<td align="left" style="font-size:20px">' + draInfo.data.totalOpenHi + '</td>' +
		'<td align="left" style="font-size:20px">' + draInfo.data.totalOpenMedium + '</td>' +
		'<td align="left" style="font-size:20px">' + draInfo.data.totalOpenLow + '</td>';
	if (displayClosed)
	{
		output += '<td align="left" style="font-size:20px">' + draInfo.data.totalClose + '</td>' +
			'<td align="left" style="font-size:20px">' + draInfo.data.totalCloseCritical + '</td>' +
		 	'<td align="left" style="font-size:20px">' + draInfo.data.totalCloseHi + '</td>' +
			'<td align="left" style="font-size:20px">' + draInfo.data.totalCloseMedium + '</td>' +
			'<td align="left" style="font-size:20px">' + draInfo.data.totalCloseLow + '</td>';
	}
	output += '</tr>\n';
	output += '</table>\n'

	return (output);
}

function buildLastNDaysStats(draInfo)
{
	if (!draInfo.data.incidentSpecificStats)
	{
		return ("No Incidents");
	}

	var output = '<table>\n';

	output += '<tr><th align="left">Incident name</th><th align="left" colspan="5">Opened</th></tr>\n';
	output += '<tr><th align="left"></th><th align="left" style="font-size:20px">Total</th><th align="left" style="background-color:#D0313D;color:white;">Critical</th><th align="left" style="background-color:#F36B22;color:white;">High</th><th align="left" style="background-color:#F8B41C;color:white;">Medium</th><th align="left" style="background-color:#608EA6;color:white;">Low</th></tr>\n';
	for (var i=0; i<draInfo.data.incidentSpecificStats.length; i++)
	{
		output += '<tr><td align="left">' + draInfo.data.incidentSpecificStats[i].name + '</td>' +
			'<td align="left">' + draInfo.data.incidentSpecificStats[i].lastNDaysOpened + '</td>' +
			'<td align="left">' + draInfo.data.incidentSpecificStats[i].lastNDaysOpenedCrit + '</td>' +
			'<td align="left">' + draInfo.data.incidentSpecificStats[i].lastNDaysOpenedHi + '</td>' +
			'<td align="left">' + draInfo.data.incidentSpecificStats[i].lastNDaysOpenedMed + '</td>' +
			'<td align="left">' + draInfo.data.incidentSpecificStats[i].lastNDaysOpenedLow + '</td>\n';
	}
	output += '<tr><td align="left" style="font-size:20px">' + "Total" + '</td>' +
	'<td align="left" style="font-size:20px">' + draInfo.data.lastNDaysOpened + '</td>' +
	'<td align="left" style="font-size:20px">' + draInfo.data.lastNDaysOpenedCrit + '</td>' +
	'<td align="left" style="font-size:20px">' + draInfo.data.lastNDaysOpenedHi + '</td>' +
	'<td align="left" style="font-size:20px">' + draInfo.data.lastNDaysOpenedMedium + '</td>' +
	'<td align="left" style="font-size:20px">' + draInfo.data.lastNDaysOpenedLow + '</td>\n';
	output += '</table>'

	return (output);
}

//CSV functions
function createAccumCsvStruct(name, apiType, sortOrder)
{
	this.name = name;
	this.sortOrder = sortOrder;
	this.apiType = apiType;
	
	this.nameRow = name;
	this.totalOpenRow = 'Total Open'
	this.openCritStatusRow = 'Open Critical';
	this.openHiStatusRow = 'Open High';
	this.openMediumStatusRow = 'Open Medium';
	this.openLowStatusRow = 'Open Low';
	this.csvFileOutput = '';
}

function createAccumCsvAll()
{
	var incidentAccumCsvStruct = [];

	incidentAccumCsvStruct.push(new createAccumCsvStruct('Overall', 0, 'Overall'));			

	if (settings.reportDbIncidents)
	{
		for (var i=0; i < settings.incidentsTranslationTable.dbIncidets.length; i++)
		{
				incidentAccumCsvStruct.push(new createAccumCsvStruct(settings.incidentsTranslationTable.dbIncidets[i].name, 
					settings.incidentsTranslationTable.dbIncidets[i].sortOrder, settings.incidentsTranslationTable.dbIncidets[i].apiType));			
		}
	}
	if (settings.reportFileIncidents)
	{
		for (var i=0; i < settings.incidentsTranslationTable.fileIncidents.length; i++)
		{
			incidentAccumCsvStruct.push(new createAccumCsvStruct(settings.incidentsTranslationTable.dbIncidets[i].name, 
				settings.incidentsTranslationTable.dbIncidets[i].sortOrder, settings.incidentsTranslationTable.dbIncidets[i].apiType));			
		}
	}

	return (incidentAccumCsvStruct)
}

function setAccumInCsv(isLast, csvStruct, period, totalOpen, totalOpenCritical, totalOpenHi, totalOpenMedium, totalOpenLow)
{
	if (!isLast)
	{
		csvStruct.nameRow += ',';
		csvStruct.totalOpenRow += ',' + totalOpen;
		csvStruct.openCritStatusRow += ',' + totalOpenCritical;
		csvStruct.openHiStatusRow += ',' + totalOpenHi;
		csvStruct.openMediumStatusRow += ',' + totalOpenMedium;
		csvStruct.openLowStatusRow += ',' + totalOpenLow;
	}
	else //Last call
	{
		csvStruct.nameRow += '\n';
		csvStruct.totalOpenRow += '\n';
		csvStruct.openCritStatusRow += '\n';
		csvStruct.openHiStatusRow += '\n';
		csvStruct.openMediumStatusRow += '\n';
		csvStruct.openLowStatusRow += '\n';		 
		csvStruct.csvFileOutput =  csvStruct.nameRow + csvStruct.totalOpenRow + csvStruct.openCritStatusRow + 
			csvStruct.openHiStatusRow + csvStruct.openMediumStatusRow + csvStruct.openLowStatusRow;
	}
}

function createAccumCsv(name, accumData, apiVer)
{
	var accumCsvStruct = createAccumCsvAll();
	var csvFileOutput;
	var colunmsNamesRow = 'Epoch';
	var columnNamesFormatRow = ' ';
	var totalOpenRow = 'Open';
	var openCritStatusRow = 'Open Critical';
	var openHiStatusRow = 'Open High';
	var openMediumStatusRow = 'Open Medium';
	var openLowStatusRow = 'Open Low';

	if (!accumData)
		return;

	/* Columns grow for each period of time*/
	for (var i=0; i<accumData.length; i++)
	{
		colunmsNamesRow += ',' + accumData[i].period;
		columnNamesFormatRow += ',' + dateTime.create(accumData[i].period).format('d-f-Y');

		//total is the first struct
		setAccumInCsv(false, accumCsvStruct[0], 
				accumData[i].period, accumData[i].totalOpen, accumData[i].totalOpenCritical, 
				accumData[i].totalOpenHi, accumData[i].totalOpenMedium, accumData[i].totalOpenLow);

		for (var j = 0; j < accumData[i].incidentSpecificStats.length; j++)
		{
			setAccumInCsv(false, accumCsvStruct[j + 1], //Incremented by one since 0 is total 
				accumData[i].period, accumData[i].incidentSpecificStats[j].totalOpen, accumData[i].incidentSpecificStats[j].openCritStatus, 
				accumData[i].incidentSpecificStats[j].openHiStatus, accumData[i].incidentSpecificStats[j].openMedStatus, 
				accumData[i].incidentSpecificStats[j].openLowStatus);
		}
	}

	//Build file out of rows
	colunmsNamesRow += '\n';
	columnNamesFormatRow += '\n'
	csvFileOutput = colunmsNamesRow + columnNamesFormatRow;
	for (var k=0; k < accumCsvStruct.length; k++)
	{
		setAccumInCsv(true, accumCsvStruct[k]);
		csvFileOutput +=  accumCsvStruct[k].csvFileOutput; 
	}

	utils.saveToFile(settings.filePath + name + "_" + fileName + '_accum.csv', csvFileOutput);
}


function createCsv(name, draInfo, apiVer, lastDayCaption)
{
	if (!draInfo.data.incidentSpecificStats)
		return;

	var csvFileOutput = 'Incident, Open Critical, Open High, Open Medium, Open Low';

	if (apiVer == "1.2")
	{
		csvFileOutput += ', Closed Critical, Closed High, Closed Medium, Closed Low, ' +
			lastDayCaption + ' Opened Critical,' + lastDayCaption + ' Opened High,' +
			lastDayCaption + ' Opened Medium,' + lastDayCaption + ' Opened Low';
	}
	csvFileOutput += '\n';

	for (var i=0; i<draInfo.data.incidentSpecificStats.length; i++)
	{
		csvFileOutput += draInfo.data.incidentSpecificStats[i].name + ',' +
			draInfo.data.incidentSpecificStats[i].openCritStatus + ',' + draInfo.data.incidentSpecificStats[i].openHiStatus + ',' +
			draInfo.data.incidentSpecificStats[i].openMedStatus + ',' + draInfo.data.incidentSpecificStats[i].openLowStatus;
		if (apiVer == "1.2")
		{
			csvFileOutput += ',' + 
					draInfo.data.incidentSpecificStats[i].totalCloseCritical + ',' +
					draInfo.data.incidentSpecificStats[i].totalCloseHi + ',' + 
					draInfo.data.incidentSpecificStats[i].totalCloseMedium + ',' +
					draInfo.data.incidentSpecificStats[i].totalCloseLow	+ ',' +
				   	draInfo.data.incidentSpecificStats[i].lastNDaysOpenedCrit + ',' +
					draInfo.data.incidentSpecificStats[i].lastNDaysOpenedHi + ',' +
					draInfo.data.incidentSpecificStats[i].lastNDaysOpenedMed + ',' +
					draInfo.data.incidentSpecificStats[i].lastNDaysOpenedLow
		}
		csvFileOutput += '\n';
	}

	utils.saveToFile(settings.filePath + name + "_" + fileName + '.csv', csvFileOutput);
}

//DRA incidents stats related functions
function setDraStats(type, ipAddresses, response, draInfoOutput)
{
    //  console.log(response);
	var totalOpen = 0;
	var totalOpenCritical = 0;
	var totalOpenHi = 0;
	var totalOpenMedium = 0;
	var totalOpenLow = 0;

	var lastNDaysOpened = 0;
	var lastNDaysOpenedCrit = 0;
	var lastNDaysOpenedHi = 0;
	var lastNDaysOpenedMedium = 0;
	var lastNDaysOpenedLow = 0;

//Close stats
	var totalClose = 0;
	var totalCloseCritical = 0;
	var totalCloseHi = 0;
	var totalCloseMedium = 0;
	var totalCloseLow = 0;

	var islastNDays = false;
	
	//Break by
	var breakByStats = [];
	var breakByPeriod = settings.accumPeriodInDays * dayInMs;
	var accumulativePeriod = 0;
	var accumPeriodStats;
	var accumData = [];
	var useIncidentInfo = true;

	//If there are no incidents
	if (response.events.length <= 0)
	{
		console.log("No Incidents");
		return;
	}

	var incidentSpecificStats = createIncidentsSpecificStatsArr();

	//Start with sorting
	response.events.sort(function (a,b) {
		if (a.event_time > b.event_time)
			return (1);
		else
			return (-1);
	});
  
	//Set 'present time' as most recent incident - used to debug
	if (settings.useIncidentTimeAsPresent)
	{
		timeNDaysAgo = response.events[response.events.length - 1].event_time - timeNDays;
	}

	// Set initial break period. Start + days
	accumulativePeriod = response.events[0].event_time + breakByPeriod;
	accumPeriodStats = createAccoumulativePeriod(accumulativePeriod);

	for (var i=0; i < response.events.length; i++)
	{
		//If this is per responder, use only if at least one IP in the incident matches the responder IP address coverage
		if (type == 'responder')
		{
			useIncidentInfo = false;
			for (var k=0; k<response.events[i].destination_ip.length && useIncidentInfo == false; k++)
			{
				for (var m=0; m<ipAddresses.length && useIncidentInfo == false; m++)
				{
					if  (response.events[i].destination_ip[k] == ipAddresses[m] || ipAddresses[m] == '*')
					{
						useIncidentInfo = true;
					}
				}
			}
		}

		if (useIncidentInfo == false)
			continue;

		if (islastNDays == false) //When set to true, accumulate for last n days
		{
			if (response.events[i].event_time >= timeNDaysAgo)
			{
				islastNDays = true;
				if (settings.printDebugInfo)
				{
					console.log("************ Start Last N days accumulation from " + (dateTime.create(timeNDaysAgo).format('d-f-Y-H_M_S')));
				}
			}
		}

		//Create new element in accumulative if reache period
		if (response.events[i].event_time >= accumulativePeriod)
		{
			//Push current period
			accumData.push(accumPeriodStats);

			//Create new period stats
			accumulativePeriod += breakByPeriod;
			accumPeriodStats = createAccoumulativePeriod(accumulativePeriod, accumPeriodStats);
		}

		if (response.events[i].status == 'OPEN')
		{
			totalOpen++;
			accumPeriodStats.totalOpen++;
			if (response.events[i].severity == "CRITICAL")
			{
				totalOpenCritical++
				accumPeriodStats.totalOpenCritical++;
			}
			else if (response.events[i].severity == "HIGH")
			{
				totalOpenHi++
				accumPeriodStats.totalOpenHi++;
			}
			else if (response.events[i].severity == "MEDIUM")
			{
				totalOpenMedium++;
				accumPeriodStats.totalOpenMedium++;
			}
			else if (response.events[i].severity == "LOW")
			{
				totalOpenLow++;
				accumPeriodStats.totalOpenLow++;
			}
		}
		else if (response.events[i].status == 'CLOSED')
		{
			totalClose++;
			accumPeriodStats.totalClose++;
			if (response.events[i].severity == "CRITICAL")
			{
				totalCloseCritical++;
				accumPeriodStats.totalCloseCritical++;
			}
			else if (response.events[i].severity == "HIGH")
			{
				totalCloseHi++;
				accumPeriodStats.totalCloseHi++;
			}
			else if (response.events[i].severity == "MEDIUM")
			{
				totalCloseMedium++;
				accumPeriodStats.totalCloseMedium++;
			}
			else if (response.events[i].severity == "LOW")
			{
				totalCloseLow++;
				accumPeriodStats.totalCloseLow++;
			}
		}

		if (islastNDays)
		{
			if (response.events[i].status == 'OPEN') //Currthently only OPEN is relevant for this
			{
				lastNDaysOpened++
				if (response.events[i].severity == "CRITICAL")
					lastNDaysOpenedCrit++
				else if (response.events[i].severity == "HIGH")
					lastNDaysOpenedHi++;
				else if (response.events[i].severity == "MEDIUM")
					lastNDaysOpenedMedium++;
				else if (response.events[i].severity == "LOW")
					lastNDaysOpenedLow++;		
			}				
		}
		if (settings.printDebugInfo)
		{
			console.log("Event id " + response.events[i].id + " Severity " + response.events[i].severity + 
				" Created: " + dateTime.create(response.events[i].event_time).format('d-f-Y-H_M_S'))

		}
		setIncidentTypeSpecificStats(response.events[i], islastNDays, incidentSpecificStats, accumPeriodStats.incidentSpecificStats)
	}
	//Push last period
	accumData.push(accumPeriodStats);


	//If last incident is before current date we need to add more accumulative periods with the same stats
	while (timeNow._created > accumulativePeriod) 
	{
		if (timeNow._created > (accumulativePeriod + breakByPeriod))
			accumulativePeriod += breakByPeriod;
		else
			accumulativePeriod = timeNow._created;

		accumPeriodStats = createAccoumulativePeriod(accumulativePeriod, accumPeriodStats);
		accumData.push(accumPeriodStats);	
	}

	//dateTime.create("((( " + totalOpen + " " + dateTime.create(response.events[0].event_time).format('d-f-Y-H_M_S'))
	draInfoOutput.data = new overAllStats(response.events[0].event_time, totalOpen, totalOpenCritical, totalOpenHi, totalOpenMedium, totalOpenLow,
		lastNDaysOpened, lastNDaysOpenedCrit, lastNDaysOpenedHi, lastNDaysOpenedMedium, lastNDaysOpenedLow, 
		totalClose, totalCloseCritical, totalCloseHi, totalCloseMedium, totalCloseLow,
		incidentSpecificStats, accumData);
}

function setIncidentTypeSpecificStats(incident, islastNDays, incidentSpecificStats, accumPeriodIncidentStats)
{
	var incidentStats;
	var incidentFound = false;
	var openStatus = 0;
	var openCritStatus = 0;
	var openHiStatus = 0;
	var openMedStatus = 0;
	var openLowStatus = 0;
	var lastNDaysOpened = 0;
	var lastNDaysOpenedCrit = 0;
	var lastNDaysOpenedHi = 0;
	var lastNDaysOpenedMed = 0;
	var lastNDaysOpenedLow = 0;

	//Close stats
	var totalClose = 0;
	var totalCloseCritical = 0;
	var totalCloseHi = 0;
	var totalCloseMedium = 0;
	var totalCloseLow = 0;

	//Periodic info
	var periodicIncidentFound = false;
	var periodicIncidentStats;

	for (var i=0; i<incidentSpecificStats.length && incidentFound == false; i++)
	{
		if (incidentSpecificStats[i].type == incident.type_code)
		{
			incidentStats = incidentSpecificStats[i];
			incidentFound = true;
		}
	}

	//Find specific incident - if not found, inform user and do nothing
	for (var i = 0; i < accumPeriodIncidentStats.length && periodicIncidentFound == false; i++)
	{
		if (accumPeriodIncidentStats[i].type == incident.type_code)
		{
			periodicIncidentStats = accumPeriodIncidentStats[i];
			periodicIncidentFound = true;
		}
	}

	if (incident.status == 'OPEN')
	{
		openStatus = 1;
		if (incident.severity == "CRITICAL")
			openCritStatus = 1;
		else if (incident.severity == "HIGH")
			openHiStatus = 1;
		else if (incident.severity == "MEDIUM")
			openMedStatus = 1;
		else if (incident.severity == "LOW")
			openLowStatus = 1;
	}
	else if (incident.status == 'CLOSED')
	{
		totalClose = 1;
		if (incident.severity == "CRITICAL")
			totalCloseCritical = 1;
		else if (incident.severity == "HIGH")
			totalCloseHi = 1;
		else if (incident.severity == "MEDIUM")
			totalCloseMedium = 1;
		else if (incident.severity == "LOW")
			totalCloseLow = 1;
	}
			
	// Last week statistics
	if (islastNDays)
	{
		lastNDaysOpened = 1;
		if (incident.severity == "CRITICAL")
			lastNDaysOpenedCrit = 1;
		else if (incident.severity == "HIGH")
			lastNDaysOpenedHi = 1;
		else if (incident.severity == "MEDIUM")
			lastNDaysOpenedMed = 1;
		else if (incident.severity == "LOW")
			lastNDaysOpenedLow = 1;
	}

	if (!incidentFound)
	{
		var incidentInfo = getIncidentInfo(incident.type_code);
		incidentSpecificStats.push(new incidentTypeSpecificStats(incidentInfo.name, incidentInfo.sortOrder, incident.type_code, 
					openStatus, openCritStatus, openHiStatus, openMedStatus, openLowStatus,
					lastNDaysOpened, lastNDaysOpenedCrit, lastNDaysOpenedHi, lastNDaysOpenedMed, lastNDaysOpenedLow,
					totalClose, totalCloseCritical, totalCloseHi, totalCloseMedium, totalCloseLow));
	}
	else
	{
		incidentStats.totalOpen += openStatus;
		incidentStats.openCritStatus += openCritStatus, 
		incidentStats.openHiStatus += openHiStatus;
		incidentStats.openMedStatus += openMedStatus
		incidentStats.openLowStatus += openLowStatus;

		incidentStats.lastNDaysOpened += lastNDaysOpened;
		incidentStats.lastNDaysOpenedCrit += lastNDaysOpenedCrit;
		incidentStats.lastNDaysOpenedHi += lastNDaysOpenedHi;
		incidentStats.lastNDaysOpenedMed += lastNDaysOpenedMed;
		incidentStats.lastNDaysOpenedLow += lastNDaysOpenedLow;

		incidentStats.totalClose += totalClose;
		incidentStats.totalCloseCritical += totalCloseCritical;
		incidentStats.totalCloseHi += totalCloseHi;
		incidentStats.totalCloseMedium += totalCloseMedium;
		incidentStats.totalCloseLow += totalCloseLow;

		if (periodicIncidentFound)
		{
			periodicIncidentStats.totalOpen += openStatus;
			periodicIncidentStats.openCritStatus += openCritStatus, 
			periodicIncidentStats.openHiStatus += openHiStatus;
			periodicIncidentStats.openMedStatus += openMedStatus
			periodicIncidentStats.openLowStatus += openLowStatus;
	/* Closed incidents is currently irrelevant
			periodicIncidentStats.totalClose += totalClose;
			periodicIncidentStats.totalCloseCritical += totalCloseCritical;
			periodicIncidentStats.totalCloseHi += totalCloseHi;
			periodicIncidentStats.totalCloseMedium += totalCloseMedium;
			periodicIncidentStats.totalCloseLow += totalCloseLow;				
	*/
		}
	}
}

function getIncidentInfo(incidentType)
{
	var incidentsTranslationTable = settings.incidentsTranslationTable;
	var incidentInfo = {"name": incidentType, "sortOrder": 100};
	var typeFound = false;

	for (var i=0; i<incidentsTranslationTable.length && typeFound == false; i++)
	{
		if (incidentsTranslationTable[i].apiType == incidentType)
		{
			incidentInfo = incidentsTranslationTable[i];
			typeFound = true;
		}
	}

	return (incidentInfo);
}


//Objects and "constructors"
function createIncidentsSpecificStatsArr(prevPeriod)
{
	var incidentSpecificStats = [];
	var prevPerInd = 0
	if (settings.reportDbIncidents)
	{
		for (var i=0; i < settings.incidentsTranslationTable.dbIncidets.length; i++)
		{
			if (prevPeriod)
			{
				incidentSpecificStats.push(new incidentTypeSpecificStats(settings.incidentsTranslationTable.dbIncidets[i].name, 
					settings.incidentsTranslationTable.dbIncidets[i].sortOrder, settings.incidentsTranslationTable.dbIncidets[i].apiType, 
					prevPeriod[prevPerInd].totalOpen,prevPeriod[prevPerInd].openCritStatus, prevPeriod[prevPerInd].openHiStatus, 
					prevPeriod[prevPerInd].openMedStatus, prevPeriod[prevPerInd].openLowStatus, 
					0, 0, 0, 0, 0,
					prevPeriod[prevPerInd].totalClose, prevPeriod[prevPerInd].totalCloseCritical, prevPeriod[prevPerInd].totalCloseHi, 
					prevPeriod[prevPerInd].totalCloseMedium, prevPeriod[prevPerInd].totalCloseLow));
					prevPerInd++
			}
			else
			{
				incidentSpecificStats.push(new incidentTypeSpecificStats(settings.incidentsTranslationTable.dbIncidets[i].name, 
					settings.incidentsTranslationTable.dbIncidets[i].sortOrder, settings.incidentsTranslationTable.dbIncidets[i].apiType, 0,
					0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0));				
			}
			
		}
	}
	if (settings.reportFileIncidents)
	{
		for (var i=0; i < settings.incidentsTranslationTable.fileIncidents.length; i++)
		{
			if (prevPeriod)
			{
				incidentSpecificStats.push(new incidentTypeSpecificStats(settings.incidentsTranslationTable.fileIncidents[i].name, 
					settings.incidentsTranslationTable.fileIncidents[i].sortOrder, settings.incidentsTranslationTable.fileIncidents[i].apiType, 
					prevPeriod[prevPerInd].totalOpen,prevPeriod[prevPerInd].openCritStatus, prevPeriod[prevPerInd].openHiStatus, 
					prevPeriod[prevPerInd].openMedStatus, prevPeriod[prevPerInd].openLowStatus, 
					0, 0, 0, 0, 0,
					prevPeriod[prevPerInd].totalClose, prevPeriod[prevPerInd].totalCloseCritical, prevPeriod[prevPerInd].totalCloseHi, 
					prevPeriod[prevPerInd].totalCloseMedium, prevPeriod[prevPerInd].totalCloseLow));
					prevPerInd++
			}
			else
			{
				incidentSpecificStats.push(new incidentTypeSpecificStats(settings.incidentsTranslationTable.fileIncidents[i].name, 
					settings.incidentsTranslationTable.fileIncidents[i].sortOrder, settings.incidentsTranslationTable.fileIncidents[i].apiType, 0,
					0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0));
			}
		}
	}

	return (incidentSpecificStats)
}

function createAccoumulativePeriod(accumulativePeriod, prevPeriod)
{
	var accumPeriodData;
	var incidentSpecificStats = [];
	var overallStats;  
	//Create place holder for all incident types
	overallStats = new overAllStats(0, 0, 0, 0, 0,
		0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 
		incidentSpecificStats);

	//Take info from previous period since this is accumulative, unless first period with no previous
	if (!prevPeriod)
	{
		accumPeriodData = {"period": accumulativePeriod,
			"totalOpen": 0,
			"totalOpenCritical": 0, "totalOpenHi": 0,"totalOpenMedium": 0, "totalOpenLow": 0,
			"totalClose": 0, "totalCloseCritical": 0, "totalCloseHi": 0, "totalCloseMedium": 0, "totalCloseLow": 0,
			"incidentSpecificStats": createIncidentsSpecificStatsArr()}
	}
	else 
	{
		accumPeriodData = {"period": accumulativePeriod,
			"totalOpen": prevPeriod.totalOpen,
			"totalOpenCritical": prevPeriod.totalOpenCritical, "totalOpenHi": prevPeriod.totalOpenHi,
			"totalOpenMedium": prevPeriod.totalOpenMedium, "totalOpenLow": prevPeriod.totalOpenLow,
			"totalClose": prevPeriod.totalClose, "totalCloseCritical": prevPeriod.totalCloseCritical, "totalCloseHi": prevPeriod.totalCloseHi, 
			"totalCloseMedium": prevPeriod.totalCloseMedium, "totalCloseLow": prevPeriod.totalCloseLow,
			"incidentSpecificStats": createIncidentsSpecificStatsArr(prevPeriod.incidentSpecificStats)}		
	}

	return (accumPeriodData);
}


function incidentTypeSpecificStats(name, sortOrder, type, totalOpen, openCritStatus, openHiStatus, openMedStatus, openLowStatus,
	lastNDaysOpened, lastNDaysOpenedCrit, lastNDaysOpenedHi, lastNDaysOpenedMed, lastNDaysOpenedLow,
	totalClose, totalCloseCritical, totalCloseHi, totalCloseMedium, totalCloseLow)
{
	this.name = name;
	this.sortOrder = sortOrder
	this.type = type;
	this.totalOpen = totalOpen;
	this.openCritStatus = openCritStatus;
	this.openHiStatus = openHiStatus;
	this.openMedStatus = openMedStatus;
	this.openLowStatus = openLowStatus;
	this.lastNDaysOpened = lastNDaysOpened;
	this.lastNDaysOpenedCrit = lastNDaysOpenedCrit;
	this.lastNDaysOpenedHi = lastNDaysOpenedHi; 
	this.lastNDaysOpenedMed = lastNDaysOpenedMed
	this.lastNDaysOpenedLow = lastNDaysOpenedLow;
	this.totalClose = totalClose;
	this.totalCloseCritical = totalCloseCritical;
	this.totalCloseHi = totalCloseHi;
	this.totalCloseMedium = totalCloseMedium;
	this.totalCloseLow = totalCloseLow;
}

function overAllStats(firstEventTime, totalOpen, totalOpenCritical, totalOpenHi, totalOpenMedium, totalOpenLow,
	lastNDaysOpened, lastNDaysOpenedCrit, lastNDaysOpenedHi, lastNDaysOpenedMedium, lastNDaysOpenedLow,
	totalClose, totalCloseCritical, totalCloseHi, totalCloseMedium, totalCloseLow, 
	incidentSpecificStats, accumData)
{
	this.firstEventTime = firstEventTime;
	this.totalOpen = totalOpen;
	this.totalOpenCritical = totalOpenCritical;
	this.totalOpenHi = totalOpenHi;
	this.totalOpenMedium = totalOpenMedium;
	this.totalOpenLow = totalOpenLow;
	this.lastNDaysOpened = lastNDaysOpened; 
	this.lastNDaysOpenedCrit = lastNDaysOpenedCrit; 
	this.lastNDaysOpenedHi = lastNDaysOpenedHi;
	this.lastNDaysOpenedMedium = lastNDaysOpenedMedium;
	this.lastNDaysOpenedLow = lastNDaysOpenedLow;
	this.totalClose = totalClose; 
	this.totalCloseCritical = totalCloseCritical; 
	this.totalCloseHi = totalCloseHi;
	this.totalCloseMedium = totalCloseMedium; 
	this.totalCloseLow = totalCloseLow;
	this.incidentSpecificStats = incidentSpecificStats;
	this.accumData = accumData;
}

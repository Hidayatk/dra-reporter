module.exports = Object.freeze({
	//Configuration
	draServerIp: "", // DRA Admin server IP - Mandatory
	draAuthString: "", //Base64 encoding of draUser:draPassword - Mandatory
	
    // Incidents to report
	reportDbIncidents: true, //Report Database incidents
	reportFileIncidents: false,//Report File incidents

	//User summary settings
	reportPerIncidentResponder: true,//Report on each Incidiedent Responder
	reportPerAppOwner: true,//Report on each Application Owner

	//Accumilative settings
	lastNDays: 7, //In days. This is used to provide last n days summary
	saveAccumData: true, //Set to true if you want an accumulative report (as a csv file)
	accumPeriodInDays: 14, //Accumulative period
	
	//File related
	fileName: "DRA-Report", //File name of report
	filePath: "", // Path where files should be saved, path must be previously created. Format must be as this example if you want to save in data directory in the current installed folder - "./data/"
	addTimestamp: true, // Set to true if you want timestamp appended to the filename
	saveReportCsv: true, // Set to true if you want csv files as well as the html file

        
	incidentsTranslationTable : {
		dbIncidets : [
		{
			"apiType": "DB_ACCESS_OUT_OF_HOURS",
			"name": "Database Access at Non-standard Time",
			"sortOrder": 1
		},
		{
			"apiType": "DB_ACCOUNT_ABUSE",
			"name": "Database Service Account Abuse",
			"sortOrder": 2
		},
		{
			"apiType": "EXCESSIVE_DB_RECORD_ACCESS",
			"name": "Excessive Database Record Access",
			"sortOrder": 3
		},
		{
			"apiType": "DB_EXCESSIVE_FAILED_LOGINS",
			"name": "Excessive Failed Logins",
			"sortOrder": 4
		},
		{
			"apiType": "DB_EXCESSIVE_FAILED_LOGINS_APPLICATION_SERVER",
			"name": "Excessive Failed Logins from Application Server",
			"sortOrder": 5
		},
		{
			"apiType": "MULTIPLE_DB_ACCESS",
			"name": "Excessive Multiple Database Access	",
			"sortOrder": 6
		},
		{
			"apiType": "DB_MACHINE_TAKEOVER",
			"name": "Machine Takeover",
			"sortOrder": 7
		},
		{
			"apiType": "SENSITIVE_SYSTEM_TABLE_SCAN",
			"name": "Suspicious Sensitive System Tables Scan",
			"sortOrder": 8
		},
		{
			"apiType": "DB_SUSPICIOUS_APPLICATION_TABLE_ACCESS",
			"name": "Suspicious Application Data Access",
			"sortOrder": 9
		},
		{
			"apiType": "SUSPICIOUS_COMMAND",
			"name": "Suspicious Database Command Execution",
			"sortOrder": 10
		},
		{
			"apiType": "DYNAMIC_SQL",
			"name": "Suspicious Dynamic SQL Activity",
			"sortOrder": 11
		}],
		fileIncidents : [
		{
			"apiType": "EXCESSIVE_FILE_ACCESS",
			"name": "Excessive File Access",
			"sortOrder": 12
		},
		{
			"apiType": "EXCESSIVE_PERSONAL_FILE_ACCESS",
			"name": "Excessive Personal File Access",
			"sortOrder": 13
		},
		{
			"apiType": "SLOW_RATE_FILE_ACCESS",
			"name": "Slow Rate File Access",
			"sortOrder": 14
		},
		{
			"apiType": "SLOW_RATE_PERSONAL_FILE_ACCESS",
			"name": "Slow Rate Personal File Access",
			"sortOrder": 15
		},
		{
			"apiType": "FAM_DPGA",
			"name": "Suspicious File Access",
			"sortOrder": 16
		},
	]},


	printDebugInfo: false,

//Internal usage	
	version: "1.1",
	useIncidentTimeAsPresent: false, //False - use current time, True - uses most recent incident time as if present time
	useOldApiVer: false, //When set to true report will behave as if the old API even if new API is available
	
	saveResponseResults: false, //Save response from DRA in file
	useResponseFromFile: false, // Use saved response files as input to tool (using below names)
	incidentsDataFileName: "incidents_results.txt", //File name used to get and save Incidents data
	permissionsFilePostFix: "permissions_results.txt",	//File postfix used to get and save Permissions data
	incidentResponderFilePrefix: "ir",
	appOwnerFilePrefix: "ao"
});

	

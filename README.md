# dra-reporter
This **nodejs** tool provides the ability to display the number of security incidents over time in Data Risk Analytics (DRA) since the last incident purge period. Output files include an html and csv file with current stats and a csv file with accumulative data that can be used to create graphs.
Also included in this repository is a graphs templates file. For your convenience you can copy information from the accumulative csv file, update graphs accordingly and use them, or create your own.

The information is for all and per Incident responder if configured ([see Active Directory Authorization](https://docs.imperva.com/bundle/v3.0-data-risk-analytics-user-guide/page/63180.htm) page), depending on the configuration of the tool.
This tool uses the [DRA API](https://docs.imperva.com/bundle/v3.1-data-risk-analytics-user-guide/page/75914.htm) to get the relevant information.

**note:** Number of closed incidents will only be displayed on DRA versions equal or greater than v3.1.


# Usage
## Installation
1. Install [nodejs](https://nodejs.org/en/download/)
2. Download the project files from the github repository and save them locally in a directory of your choice (aka project directory).
3. In the project directory open a command prompt and run 'npm install'

If you have a problem to connect machines in your production environment to the internet, consider the following alternative method:
Do steps 1-3 on a machine connected to the Internet, copy all relevant files to a machine in the production environment (that must have nodejs installed on it).
## Configuration
4. In setting.js set the following:
   - **draServerIp** (**mandatory**)- DRA Admin server IP
   - **draUser** (**mandatory**)- DRA User as described in the [DRA Authorization](https://docs.imperva.com/bundle/v3.1-data-risk-analytics-user-guide/page/62776.htm) page
   - **draPassword** (mandatory) - DRA password as described in the [DRA Authorization](https://docs.imperva.com/bundle/v3.1-data-risk-analytics-user-guide/page/62776.htm) page
   - **draAuthString** (mandatory)- Base64 encoding of draUser:draPassword as described in the [DRA Authorization](https://docs.imperva.com/bundle/v3.1-data-risk-analytics-user-guide/page/62776.htm) page
   - **reportDbIncidents** (default true)- *true* Report Database Incidents
   - **reportFileIncidents** (default false)- *true* Report File incidents
   - **reportPerIncidentResponder** (default true) - *true* - Report on each Incident Responder
   - **lastNDays** (default 7) - In days. This is used to provide last n days summary
   - **saveAccumData** (default true)- *true* to get accumulative data (in csv file)
   - **accumPeriodInDays** (default 14) - Accumulative period in days
   - **fileName** (default "DRA-Report") - File name of report
   - **filePath** (default "") - Path where files should be saved, path must be previously created. Format must be as this example if you want to save in data directory in the current installed folder - "./data/"
   - **addTimestamp** (default true) - *true* if you want to have the timestamp attached to the filenames. Without this each time the tool is run the output files will be overridden
   - **saveReportCsv** (default true) - *true* if you want a csv file for your report as well as an html
   - **saveAccumData** (default true)  - *true* If you want an accumulative report as a csv file
   - **incidentsTranslationTable** - Used to configure the incidents based on API type
   
## Run tool
5.  In the project directory run the following command in command line: 
  *node spv*.
6.  Output files can be found in data directory (default - project directory)

# Dependencies
- nodejs
- packages
  - aysnc
  - node-datetime
  - request
  - request-promise

# Contributions & Bug reports
## Contribution
- You can create your own branch and add features, fix bugs.
If you have to merge your changes into the master branch, please reach out to me via mail doron.tzur@imperva.com.
- You can also reach out to me with suggestions which I might implement.

## Reporting Bugs
Please open a Git Issue and include as much information as possible. If possible, provide sample code that illustrates the problem you're seeing. If you're seeing a bug only on a specific repository, please provide a link to it if possible.

Please do not open a Git Issue for help, leave it only for bug reports.


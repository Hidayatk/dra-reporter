# dra-reporter
This **nodejs** tool provides the ability to display the number of security incidents over time in Data Risk Analytics (DRA) since the last incident purge period.
The information is for all and per Incident responder if configured ([see Active Directory Authorization](https://docs.imperva.com/bundle/v3.0-data-risk-analytics-user-guide/page/63180.htm) page), depending on the configuration of the tool.
This tool uses the [DRA API](https://docs.imperva.com/bundle/v3.1-data-risk-analytics-user-guide/page/75914.htm) to get the relevant information.

# Usage
## Installation
1. Install [nodejs](https://nodejs.org/en/download/) 
2. Download the project files from the github repository and save them locally in a directory of your choice (aka project directory).
3. In the project directory open a command prompt and run 'npm install'
## Configuration
4. In setting.js set the following:
   - **draServerIp** (mandatory)- DRA Admin server IP
   - **draUser** (mandatory)- DRA User as described in the [DRA Authorization](https://docs.imperva.com/bundle/v3.1-data-risk-analytics-user-guide/page/62776.htm) page
   - **draPassword** (mandatory) - DRA password as described in the [DRA Authorization](https://docs.imperva.com/bundle/v3.1-data-risk-analytics-user-guide/page/62776.htm) page
   - **draAuthString** (mandatory)- Base64 encoding of draUser:draPassword as described in the [DRA Authorization](https://docs.imperva.com/bundle/v3.1-data-risk-analytics-user-guide/page/62776.htm) page
   - **reportDbIncidents** (default true)- *true* Report Database Incidents
   - **reportFileIncidents** (default false)- *true* Report File incidents
   - **reportPerIncidentResponder** (default true) - *true* - Report on each Incidiedent Responder
   - **lastNDays** (default 7) - In days. This is used to provide last n days summary
   - **fileName** (default "DRA-Report") - File name of report
    - **addTimestamp** (default true) - *true* if you want to have the timestamp attached to the filenames. Without this each time the tool is run the output files will be overridden
   - **saveReportCsv** (default true) - *true* if you want a csv file for your report as well as an html
   - **saveAccumData** (default true)  - *true* If you want an accumulative report as a csv file
   - **accumPeriodInDays** (default 14)- In days. Accumulative period
   - **incidentsTranslationTable** - Used to configure the incidents based on API type
   
## Run tool
5.  In the project directory run the following command in command line: 
  *node spv*.
6.  Output files can be found in project directory

# Dependancies
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

